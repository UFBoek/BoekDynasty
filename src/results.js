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
    if(!hId||!aId||hId===aId)return null; // store unmatched ESPN opponents for complete Division I coverage
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
    const tag=ev.__sourceGroup===100||/ncaa (men.s )?(basketball )?tournament|march madness|first four/.test(note)?'ncaa':/\bconference tournament\b|\b(acc|sec|big ten|big 12|big east|pac-12|mountain west|wcc|atlantic 10|american) tournament\b/.test(note)?'conference':null;
    const row=[String(ev.id).slice(0,80),season,gameDay,utc,hId,aId,
      String(home.team?.displayName||home.team?.name||'Home').slice(0,100),String(away.team?.displayName||away.team?.name||'Away').slice(0,100),
      hs,as,phase,String(st.shortDetail||st.detail||st.description||'').slice(0,140),
      c.neutralSite===true?1:0,c.conferenceCompetition===true?1:0,Number(ev.season?.type)||null,title,tag,'espn-scoreboard'];
    return {row,hash:fingerprint(row)};
  };
  // Group 50 is Division I / NIT, but ESPN also uses group 100 for NCAA
  // Tournament games. CBI/CIT are isolated in groups 55/56.
  const groupsForDay=(day,includeSecondary=false)=>{
    const month=Number(day.slice(5,7));
    if(month!==3&&month!==4)return [50];
    return includeSecondary?[50,100,55,56]:[50,100];
  };
  const scoreboardUrls=(day,group=50)=>{
    const date=day.replace(/-/g,'');
    return [
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates='+date+'&groups='+group+'&limit=1000',
      'https://cdn.espn.com/core/mens-college-basketball/scoreboard?xhr=1&date='+date+'&groups='+group+'&limit=1000'
    ];
  };
  const fetchGroup=async(day,group,fetchFn=fetch)=>{
    const errors=[];
    for(const url of scoreboardUrls(day,group)){
      try{
        const res=await fetchFn(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
        if(!res.ok){errors.push(new URL(url).hostname+' HTTP '+res.status);continue;}
        const body=await res.json();
        const events=body.events||body.content?.sbData?.events||body.page?.content?.sbData?.events;
        if(!Array.isArray(events)){errors.push('Unexpected response from '+new URL(url).hostname);continue;}
        if(events.length>=1000){errors.push('1000-game limit reached for group '+group);continue;}
        return {events,host:new URL(url).hostname,group};
      }catch(e){errors.push(new URL(url).hostname+' '+err(e));}
    }
    throw new Error('ESPN group '+group+' failed: '+errors.join(' | '));
  };
  const fetchScoreboard=async(day,fetchFn=fetch,includeSecondary=false)=>{
    const groups=groupsForDay(day,includeSecondary),all=new Map(),sources=[];
    // A failed required group marks the day as incomplete instead of silently
    // presenting an incomplete slate as a successful import.
    for(const group of groups){
      const result=await fetchGroup(day,group,fetchFn);
      sources.push({group,host:result.host,count:result.events.length});
      for(const event of result.events){
        if(event?.id)all.set(String(event.id),{...event,__sourceGroup:group});
      }
    }
    return {events:[...all.values()],sources,host:sources.map(s=>s.host).join(', ')};
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
      const feed=options.payload?{events:options.payload.events,host:'manual',sources:[]} :await fetchScoreboard(day,options.fetchFn,options.includeSecondary===true);
      if(!Array.isArray(feed.events)||feed.events.length>=500)throw new Error('Invalid or oversized scoreboard.');
      received=feed.events.length;
      const rows=feed.events.map(x=>parseEvent(x,day,season)).filter(Boolean);matched=rows.length;
      for(let k=0;k<rows.length;k+=60){
        const batch=await env.DB.batch(rows.slice(k,k+60).map(x=>q(env,INSERT,...x.row,x.hash)));
        changed+=batch.reduce((n,r)=>n+Number(r.meta?.changes||0),0);
      }
      // Persist per-group coverage, including genuine empty dates. This lets
      // reconciliation distinguish a checked date from a missing date.
      if(feed.sources?.length){
        await env.DB.batch(feed.sources.map(source=>q(env,`INSERT INTO cbb_game_coverage(season,game_date,source_group,event_count,matched_count,provider,fetched_at)
          VALUES(?,?,?,?,?,?,unixepoch()) ON CONFLICT(season,game_date,source_group)
          DO UPDATE SET event_count=excluded.event_count,matched_count=excluded.matched_count,
          provider=excluded.provider,fetched_at=unixepoch()`,season,day,source.group,source.count,
          matched,source.host)));
      }
      await q(env,"UPDATE cbb_sync_runs SET status='ok',received=?,matched=?,changed=?,finished_at=unixepoch() WHERE id=?",received,matched,changed,id).run();
      return {date:day,received,matched,changed,provider:feed.host,groups:feed.sources||[]};
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
      try{results.push({ok:true,...await importDay(env,season,day,{job:'reconcile',includeSecondary:true})});}
      catch(e){results.push({date:day,ok:false,error:err(e)});}
    }
    return results;
  }
  async function upcoming(env,season,days=3){
    if(!Number.isInteger(days)||days<1||days>7)throw new Error('Upcoming window must be 1–7 days.');
    const results=[],today=localDay();
    for(let i=1;i<=days;i++){
      const day=shiftDay(today,i);
      if(!dayInSeason(season,day))continue;
      try{results.push({ok:true,...await importDay(env,season,day,{job:'schedule',includeSecondary:true})});}
      catch(e){results.push({date:day,ok:false,error:err(e)});}
    }
    return results;
  }
  async function coverage(env,season){
    const dates=(await q(env,"SELECT game_date,source_group,event_count,fetched_at FROM cbb_game_coverage WHERE season=? ORDER BY game_date DESC",season).all()).results||[];
    const seen=new Map();
    for(const d of dates){
      const a=seen.get(d.game_date)||new Set();
      a.add(Number(d.source_group));seen.set(d.game_date,a);
    }
    const today=localDay(),first=season.slice(0,4)+'-11-01',end=seasonOf(today)===season?today:season.slice(0,4).replace(/\d{4}/,x=>String(Number(x)+1))+'-04-30';
    const missing=[],checked=[],empty=[];
    for(let date=first;date<=end;date=shiftDay(date,1)){
      if(!dayInSeason(season,date))break;
      const expected=groupsForDay(date),found=seen.get(date)||new Set();
      if(expected.every(group=>found.has(group))){
        checked.push(date);
        if(dates.filter(d=>d.game_date===date&&expected.includes(d.source_group)).every(d=>d.event_count===0))empty.push(date);
      }else missing.push({date,groups:expected.filter(group=>!found.has(group))});
    }
    return {season,checked_dates:checked.length,missing_dates:missing.length,
      empty_dates:empty.length,missing_samples:missing.slice(0,15),empty_samples:empty.slice(-10),
      monitored_from:first,monitored_through:end};
  }
  async function fillMissing(env,season,days=4){
    if(!Number.isInteger(days)||days<1||days>6)throw new Error('Missing-date repair limited to 1–6 days.');
    const report=await coverage(env,season);
    const result=[];
    for(const item of report.missing_samples.slice(0,days)){
      try{result.push({ok:true,...await importDay(env,season,item.date,{job:'gap-repair',includeSecondary:true})});}
      catch(e){result.push({date:item.date,ok:false,error:err(e)});}
    }
    return result;
  }
  const status=async(env,season)=>{
    const [games,runs,net,awards,opt,health]=await Promise.all([
      q(env,"SELECT COUNT(*) AS n,SUM(CASE WHEN status='final' THEN 1 ELSE 0 END) AS final_count,MAX(updated_at) AS last_change FROM cbb_games WHERE season=?",season).first(),
      q(env,'SELECT id,job,target_date,source,status,received,matched,changed,error_text,started_at,finished_at FROM cbb_sync_runs WHERE season=? ORDER BY started_at DESC LIMIT 20',season).all(),
      q(env,"SELECT MAX(snapshot_date) AS day,COUNT(*) AS total FROM cbb_net_rankings WHERE season=? AND snapshot_date=(SELECT MAX(snapshot_date) FROM cbb_net_rankings WHERE season=?)",season,season).first(),
      q(env,'SELECT COUNT(*) AS n FROM cbb_awards WHERE season=?',season).first(),
      q(env,"SELECT value FROM settings WHERE key='results_auto_sync'").first(),
      coverage(env,season)
    ]);
    return {season,game_count:games?.n||0,final_games:games?.final_count||0,last_game_change:games?.last_change||null,
      net_date:net?.day||null,net_count:net?.total||0,awards_count:awards?.n||0,auto_enabled:opt?.value!=='0',coverage:health,recent_runs:runs.results||[]};
  };
  const records=async(env,season)=>{
    const rows=await q(env,`SELECT program_id,SUM(w) AS wins,SUM(1-w) AS losses,COUNT(*) AS played FROM (
      SELECT home_id AS program_id,CASE WHEN home_score>away_score THEN 1 ELSE 0 END AS w
      FROM cbb_games WHERE season=? AND status='final' AND home_score IS NOT NULL AND away_score IS NOT NULL AND home_score<>away_score
      UNION ALL
      SELECT away_id AS program_id,CASE WHEN away_score>home_score THEN 1 ELSE 0 END AS w
      FROM cbb_games WHERE season=? AND status='final' AND home_score IS NOT NULL AND away_score IS NOT NULL AND home_score<>away_score
    ) GROUP BY program_id`,season,season).all();
    return rows.results||[];
  };
  const netRanks=async(env,season)=>{
    const rows=await q(env,"SELECT program_id,net_rank,snapshot_date FROM cbb_net_rankings WHERE season=? AND snapshot_date=(SELECT MAX(snapshot_date) FROM cbb_net_rankings WHERE season=?)",season,season).all();
    return rows.results||[];
  };
  const recentGames=async(env,season,limit=60)=>{
    const rows=await q(env,"SELECT game_id,game_date,start_utc,home_id,away_id,home_name,away_name,home_score,away_score,status,status_detail,neutral_site,conference_game,season_type,tournament_tag FROM cbb_games WHERE season=? ORDER BY game_date DESC,start_utc DESC LIMIT ?",season,Math.min(100,Math.max(1,limit))).all();
    return rows.results||[];
  };
  const programGames=async(env,season,id)=>{
    const rows=await q(env,"SELECT game_id,game_date,start_utc,home_id,away_id,home_name,away_name,home_score,away_score,status,status_detail,neutral_site,conference_game,season_type,tournament_tag FROM cbb_games WHERE season=? AND (home_id=? OR away_id=?) ORDER BY game_date DESC,start_utc DESC LIMIT 70",season,id,id).all();
    return rows.results||[];
  };
  const netKey=value=>String(value||'')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ').replace(/\bst[.]?\b/g,'saint')
    .replace(/\bstate\b/g,'st').replace(/\buniversity\b/g,'')
    .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const netNames=(()=>{
    const map=new Map();
    for(const [id,short,full,abbr] of NET_NAME_CROSSWALK){
      for(const alias of [short,full,abbr]){
        const key=netKey(alias);
        if(!key)continue;
        const existing=map.get(key);
        if(!existing)map.set(key,String(id));
        else if(existing!==String(id))map.set(key,null); // ambiguous: never guess
      }
    }
    // NCAA sometimes uses institutional names instead of ESPN display names.
    const preferred={
      'connecticut':'UConn','albany':'UAlbany','central connecticut':'C Connecticut',
      'miami florida':'Miami','miami fl':'Miami','miami ohio':'Miami OH',
      'saint johns':'St. John\'s','st johns ny':'St. John\'s',
      'sam houston state':'Sam Houston','tennessee martin':'UT Martin',
      'texas a and m corpus christi':'Texas A&M-CC',
      'texas a m corpus christi':'Texas A&M-CC'
    };
    for(const [alias,target] of Object.entries(preferred)){
      const id=map.get(netKey(target));
      if(id)map.set(netKey(alias),id);
    }
    return map;
  })();
  const parseNCAANet=(payload,season)=>{
    const rows=payload?.data||payload?.rankings||payload?.records;
    if(!Array.isArray(rows)||rows.length<350||rows.length>400)throw new Error('NCAA rankings source did not return a complete Division I list.');
    const seasonStart=season.slice(0,4);
    const provenance=String(payload.updatedAt||payload.updated||payload.lastUpdated||payload.date||'');
    if(provenance){
      const year=(provenance.match(/20\d{2}/)||[])[0];
      if(year&&Number(year)<Number(seasonStart))throw new Error('NCAA NET source is still displaying the previous season.');
    }
    const matched=[],missing=[],used=new Set();
    for(const item of rows){
      const rawName=String(item.SCHOOL||item.School||item.school||item.team||item.Team||item.team_name||'');
      const rank=Number(item.RANK??item.Rank??item.rank??item.NET??item.net_rank);
      const id=netNames.get(netKey(rawName));
      if(!id||!Number.isInteger(rank)||rank<1||rank>400||used.has(id)){
        missing.push({school:rawName,rank});continue;
      }
      used.add(id);
      matched.push({program_id:id,net_rank:rank,raw:item});
    }
    if(missing.length||matched.length!==rows.length)
      throw new Error('NET name crosswalk incomplete ('+matched.length+'/'+rows.length+
        '). Unmatched: '+missing.slice(0,6).map(x=>x.school).join(', ')+'. Review mappings before importing.');
    return matched;
  };
  async function fetchOfficialNet(day,season,fetchFn=fetch){
    const year=Number(day.slice(0,4)),month=Number(day.slice(5,7));
    if((year===Number(season.slice(0,4))&&month<12)||day<season.slice(0,4)+'-12-08')
      return {skipped:'NET is not released until December; prior season data is forbidden'};
    const url='https://ncaa-api.henrygd.me/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings';
    const response=await fetchFn(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('NCAA NET rankings HTTP '+response.status);
    const body=await response.json();
    return {records:parseNCAANet(body,season),date:day,source:'NCAA NET via open-source NCAA API'};
  }
  async function saveNet(env,season,day,rows,source='NCAA NET / commissioner verified'){
    if(!dayInSeason(season,day))throw new Error('Ranking snapshot date is outside the season.');
    if(!Array.isArray(rows)||rows.length<350||rows.length>400)throw new Error('NET import must cover at least 350 current Division I teams.');
    const ids=new Set(),ranks=new Set();
    const parsed=rows.map(x=>({id:String(x.program_id||x.team_id||''),rank:Number(x.net_rank??x.rank),raw:x.raw||x}));
    for(const x of parsed){
      if(!teamIds.has(x.id)||!Number.isInteger(x.rank)||x.rank<1||x.rank>400||ids.has(x.id)||ranks.has(x.rank))
        throw new Error('NET records must contain unique, known ESPN IDs and unique NET rankings.');
      ids.add(x.id);ranks.add(x.rank);
    }
    if(!ranks.has(1))throw new Error('NET list is missing ranking #1.');
    const old=await q(env,'SELECT COUNT(*) AS n FROM cbb_net_rankings WHERE season=? AND snapshot_date=?',season,day).first();
    if(old?.n)return {date:day,count:old.n,duplicate:true};
    for(let i=0;i<parsed.length;i+=45){
      await env.DB.batch(parsed.slice(i,i+45).flatMap(x=>[
        q(env,'INSERT INTO cbb_net_rankings(season,snapshot_date,program_id,net_rank,source) VALUES(?,?,?,?,?)',season,day,x.id,x.rank,source),
        q(env,'INSERT INTO cbb_net_details(season,snapshot_date,program_id,raw_json,source) VALUES(?,?,?,?,?)',season,day,x.id,JSON.stringify(x.raw).slice(0,2500),source)
      ]));
    }
    return {date:day,count:parsed.length};
  }
  const quadrant=(rank,site)=>{
    if(!Number.isInteger(rank)||rank<1)return null;
    const t=site==='home'?[30,75,160]:site==='away'?[75,135,240]:[50,100,200];
    return rank<=t[0]?1:rank<=t[1]?2:rank<=t[2]?3:4;
  };
  const isQ1A=(rank,site)=>Number.isInteger(rank)&&rank>0&&rank<=(site==='home'?15:site==='away'?40:25);
  async function seasonQuadrants(env,season){
    const [games,rankings]=await Promise.all([
      q(env,"SELECT home_id,away_id,home_score,away_score,neutral_site FROM cbb_games WHERE season=? AND status='final' AND home_score IS NOT NULL AND away_score IS NOT NULL AND home_score<>away_score",season).all(),
      netRanks(env,season)
    ]);
    const rankMap=new Map(rankings.map(x=>[x.program_id,Number(x.net_rank)])),out={};
    for(const g of games.results||[]){
      const win=g.home_score>g.away_score?g.home_id:g.away_id,opp=win===g.home_id?g.away_id:g.home_id;
      const rank=rankMap.get(opp),site=g.neutral_site?'neutral':win===g.home_id?'home':'away',quad=quadrant(rank,site);
      if(!quad||!teamIds.has(opp))continue;
      const rec=out[win]||(out[win]={q1:0,q1a:0,q2:0,q3:0,q4:0});
      rec['q'+quad]++;if(quad===1&&isQ1A(rank,site))rec.q1a++;
    }
    return {snapshot_date:rankings[0]?.snapshot_date||null,by_program:out};
  }
  async function scheduled(env,cron){
    const pairs=(await q(env,"SELECT key,value FROM settings WHERE key IN ('current_season','results_auto_sync')").all()).results||[];
    const settings=Object.fromEntries(pairs.map(x=>[x.key,x.value]));
    if(settings.results_auto_sync==='0')return {skipped:'disabled'};
    const day=localDay(),season=settings.current_season||seasonOf(day),month=Number(day.slice(5,7));
    if(![11,12,1,2,3,4].includes(month)||!dayInSeason(season,day))return {skipped:'offseason'};
    if(cron==='*/15 * * * *'){
      const localHour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hour12:false}).format(new Date()));
      if(localHour>=3&&localHour<10)return {skipped:'outside-games-window'};
      return importDay(env,season,day,{job:'live'});
    }
    if(cron==='15 10 * * *'){
      const reconciled=await backfill(env,season,7);
      const future=await upcoming(env,season,3);
      const repaired=await fillMissing(env,season,4);
      // NCAA NET is not issued until December, and the NCAA public proxy may
      // legitimately show last season's rankings before the new release.
      if(day<season.slice(0,4)+'-12-08')
        return {games:reconciled,upcoming:future,repaired,net:{skipped:'NET has not started'}};
      const id=crypto.randomUUID(),source=env.NET_FEED_URL?'configured-net-feed':'NCAA NET official rankings proxy';
      await q(env,"INSERT INTO cbb_sync_runs(id,job,season,target_date,source,status) VALUES(?,'net',?,?,?,'running')",id,season,day,source).run();
      try{
        let feed;
        if(env.NET_FEED_URL){
          const response=await fetch(env.NET_FEED_URL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
          if(!response.ok)throw new Error('Configured NET feed HTTP '+response.status);
          const payload=await response.json();
          if(!Array.isArray(payload.records))throw new Error('NET feed must return {date,records:[{program_id,net_rank}]}');
          feed={date:String(payload.date||day),records:payload.records,source:'configured-verified-net-feed'};
        }else feed=await fetchOfficialNet(day,season);
        if(feed.skipped)return {games:reconciled,upcoming:future,repaired,net:{skipped:feed.skipped}};
        const result=await saveNet(env,season,feed.date,feed.records,feed.source);
        await q(env,"UPDATE cbb_sync_runs SET status='ok',received=?,matched=?,changed=?,finished_at=unixepoch() WHERE id=?",result.count,result.count,result.duplicate?0:result.count,id).run();
        return {games:reconciled,upcoming:future,repaired,net:result};
      }catch(e){
        await q(env,"UPDATE cbb_sync_runs SET status='error',error_text=?,finished_at=unixepoch() WHERE id=?",err(e),id).run().catch(()=>{});
        return {games:reconciled,upcoming:future,repaired,net:{error:err(e)}};
      }
    }
    return {skipped:'unknown-cron'};
  }

  return {localDay,seasonOf,dayInSeason,shiftDay,scoreboardUrls,groupsForDay,parseEvent,fetchScoreboard,importDay,backfill,upcoming,coverage,fillMissing,status,records,netRanks,recentGames,programGames,saveNet,parseNCAANet,fetchOfficialNet,seasonQuadrants,quadrant,isQ1A,scheduled};
})();
