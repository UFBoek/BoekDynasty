/* ESPNs site-v2 scoreboard is the primary game source. No scoring is computed here. */
const DATA_PIPELINE=(()=>{
  const teamIds=new Set(PROGRAM_DIRECTORY.map(x=>String(x[0])));
  const q=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
  const err=e=>String(e?.message||e||'Unknown error').slice(0,300).replace(/[\r\n]/g,' ');
  const validDate=d=>/^20\d\d-\d\d-\d\d$/.test(d)&&!isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().startsWith(d);
  const localDay=(date=new Date())=>{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const v=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    return v.year+'-'+v.month+'-'+v.day;
  };
  const seasonOf=day=>{const y=Number(day.slice(0,4)),m=Number(day.slice(5,7)),first=m>=7?y:y-1;return first+'-'+String((first+1)%100).padStart(2,'0');};
  const dayInSeason=(season,day)=>validDate(day)&&seasonOf(day)===season;
  const shiftDay=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const safeScore=x=>{const v=typeof x==='object'&&x!==null?x.value??x.displayValue:x;if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isInteger(n)&&n>=0&&n<=250?n:null;};
  const fingerprint=row=>{let h=2166136261,text=JSON.stringify(row);for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
  const parseEvent=(ev,day,season)=>{
    const c=ev?.competitions?.[0],teams=c?.competitors||[];
    if(!ev?.id||teams.length!==2)return null;
    const home=teams.find(t=>t.homeAway==='home'),away=teams.find(t=>t.homeAway==='away');
    if(!home||!away)return null;
    const hId=String(home.team?.id||''),aId=String(away.team?.id||'');
    if(!hId||!aId||hId===aId||(!teamIds.has(hId)&&!teamIds.has(aId)))return null;
    const utc=ev.date||c.date||null;
    const gameDay=utc&&!isNaN(new Date(utc).getTime())?localDay(new Date(utc)):day;
    if(!dayInSeason(season,gameDay))return null;
    const st=ev.status?.type||c.status?.type||{},name=String(st.name||'').toLowerCase(),state=String(st.state||'').toLowerCase();
    let phase=st.completed||state==='post'||name.includes('final')?'final':state==='in'||name.includes('progress')?'live':'scheduled';
    if(name.includes('cancel'))phase='cancelled';
    if(name.includes('postpon'))phase='postponed';
    const hs=safeScore(home.score),as=safeScore(away.score);
    if(phase==='final'&&(hs===null||as===null))return null;
    const title=String(ev.name||ev.shortName||'').slice(0,140);
    const notes=(c.notes||[]).map(x=>x.headline||x.text||'').join(' ').slice(0,200);
    const note=(title+' '+notes).toLowerCase();
    const tag=/ncaa (men.s )?(basketball )?tournament|march madness|first four/.test(note)?'ncaa':/\bconference tournament\b|\b(acc|sec|big ten|big 12|big east|pac-12|mountain west|wcc|atlantic 10|american) tournament\b/.test(note)?'conference':null;
    const row=[String(ev.id).slice(0,80),season,gameDay,utc,hId,aId,
      String(home.team?.displayName||home.team?.name||'Home').slice(0,100),String(away.team?.displayName||away.team?.name||'Away').slice(0,100),
      hs,as,phase,String(st.shortDetail||st.detail||st.description||'').slice(0,140),
      c.neutralSite===true?1:0,c.conferenceCompetition===true?1:0,Number(ev.season?.type)||null,title,tag,'espn-scoreboard'];
    return {row,hash:fingerprint(row)};
  };
  const scoreboardUrls=day=>{
    const k=day.replace(/-/g,'');
    return ['https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates='+k+'&groups=50&limit=500',
      'https://cdn.espn.com/core/mens-college-basketball/scoreboard?xhr=1&dates='+k+'&groups=50&limit=500'];
  };
  const fetchScoreboard=async(day,fetchFn=fetch)=>{
    const errors=[];
    for(const url of scoreboardUrls(day)){
      try{
        const res=await fetchFn(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
        if(!res.ok){errors.push(new URL(url).hostname+' HTTP '+res.status);continue;}
        const body=await res.json(),events=body.events||body.content?.sbData?.events||body.page?.content?.sbData?.events;
        if(!Array.isArray(events)){errors.push('Unexpected response from '+new URL(url).hostname);continue;}
        if(events.length>=500){errors.push('500-game limit reached');continue;}
        return {events,host:new URL(url).hostname};
      }catch(e){errors.push(new URL(url).hostname+' '+err(e));}
    }
    throw new Error('Scoreboard failed: '+errors.join(' | '));
  };
  const INSERT=`INSERT INTO cbb_games(game_id,season,game_date,start_utc,home_id,away_id,home_name,away_name,home_score,away_score,status,status_detail,neutral_site,conference_game,season_type,event_name,tournament_tag,source,content_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(game_id) DO UPDATE SET season=excluded.season,game_date=excluded.game_date,start_utc=excluded.start_utc,home_id=excluded.home_id,away_id=excluded.away_id,
    home_name=excluded.home_name,away_name=excluded.away_name,home_score=excluded.home_score,away_score=excluded.away_score,status=excluded.status,
    status_detail=excluded.status_detail,neutral_site=excluded.neutral_site,conference_game=excluded.conference_game,season_type=excluded.season_type,
    event_name=excluded.event_name,tournament_tag=excluded.tournament_tag,source=excluded.source,content_hash=excluded.content_hash,updated_at=unixepoch()
    WHERE cbb_games.content_hash<>excluded.content_hash`;
  async function importDay(env,season,day,options={}){
    if(!dayInSeason(season,day))throw new Error('Date is outside the selected season.');
    const id=crypto.randomUUID(),job=options.job||'scoreboard';
    await q(env,"INSERT INTO cbb_sync_runs(id,job,season,target_date,source,status) VALUES(?,?,?,?,?,'running')",id,job,season,day,'espn-scoreboard').run();
    let received=0,matched=0,changed=0;
    try{
      const feed=options.payload?{events:options.payload.events,host:'manual'}:await fetchScoreboard(day,options.fetchFn);
      if(!Array.isArray(feed.events)||feed.events.length>=500)throw new Error('Invalid or oversized scoreboard.');
      received=feed.events.length;
      const rows=feed.events.map(x=>parseEvent(x,day,season)).filter(Boolean);matched=rows.length;
      for(let k=0;k<rows.length;k+=60){
        const batch=await env.DB.batch(rows.slice(k,k+60).map(x=>q(env,INSERT,...x.row,x.hash)));
        changed+=batch.reduce((n,r)=>n+Number(r.meta?.changes||0),0);
      }
      await q(env,"UPDATE cbb_sync_runs SET status='ok',received=?,matched=?,changed=?,finished_at=unixepoch() WHERE id=?",received,matched,changed,id).run();
      return {date:day,received,matched,changed,provider:feed.host};
    }catch(e){
      await q(env,"UPDATE cbb_sync_runs SET status='error',received=?,matched=?,changed=?,error_text=?,finished_at=unixepoch() WHERE id=?",received,matched,changed,err(e),id).run().catch(()=>{});
      throw e;
    }
  }
  async function backfill(env,season,days=7){
    if(!Number.isInteger(days)||days<1||days>14)throw new Error('Backfill must be 1–14 days.');
    const results=[],today=localDay();
    for(let i=days-1;i>=0;i--){
      const day=shiftDay(today,-i);
      if(!dayInSeason(season,day))continue;
      try{results.push({ok:true,...await importDay(env,season,day,{job:'reconcile'})});}
      catch(e){results.push({date:day,ok:false,error:err(e)});}
    }
    return results;
  }
  /* EXTRA_API */
  return {localDay,seasonOf,dayInSeason,shiftDay,scoreboardUrls,parseEvent,fetchScoreboard,importDay,backfill /* EXTRA_EXPORTS */};
})();
