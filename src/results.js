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
      q(env,"SELECT snapshot_date AS day,stored_count AS total FROM cbb_net_snapshots WHERE season=? AND status='complete' ORDER BY snapshot_date DESC LIMIT 1",season).first(),
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
    const rows=await q(env,"SELECT program_id,net_rank,snapshot_date FROM cbb_net_rankings WHERE season=? AND snapshot_date=(SELECT snapshot_date FROM cbb_net_snapshots WHERE season=? AND status='complete' ORDER BY snapshot_date DESC LIMIT 1)",season,season).all();
    return rows.results||[];
  };
  // All games on a requested date, so the Results browser never truncates a busy slate.
  const gamesByDate=async(env,season,date)=>{
    if(!dayInSeason(season,date))throw new Error('Choose a valid date during this basketball season.');
    const found=await q(env,"SELECT game_id,game_date,start_utc,home_id,away_id,home_name,away_name,home_score,away_score,status,status_detail,neutral_site,conference_game,season_type,tournament_tag FROM cbb_games WHERE season=? AND game_date=? ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'final' THEN 2 ELSE 3 END,start_utc ASC LIMIT 1000",season,date).all();
    return found.results||[];
  };
  const apPoll=async(env,season)=>{
    const found=await q(env,"SELECT snapshot_date,program_id,ap_rank,source FROM cbb_ap_rankings WHERE season=? AND snapshot_date=(SELECT MAX(snapshot_date) FROM cbb_ap_rankings WHERE season=?) ORDER BY ap_rank",season,season).all();
    return found.results||[];
  };
  const parseOfficialAP=(payload)=>{
    const rows=payload?.data||payload?.rankings||payload?.records;
    if(!Array.isArray(rows))throw new Error('NCAA API did not provide a ranked AP poll table.');
    const aliases={'southern cal':'30','southern california':'30','st john s':'2599',
      'saint john s':'2599','connecticut':'41','miami fl':'2390','miami florida':'2390',
      'michigan state':'127','michigan st':'127','texas tech':'2641','iowa state':'66'};
    const normalizedName=v=>netKey(String(v||'').replace(/\s*\(\d+\)\s*$/,''));
    const mapped=rows.slice(0,25).map((item,index)=>{
      const rank=Number(item.RANK??item.rank??item.Rank);
      const name=normalizedName(item.SCHOOL??item.school??item.team??item.Team??'');
      const id=aliases[name]||netNames.get(name);
      if(!id||!teamIds.has(id)||!Number.isInteger(rank)||rank<1||rank>25)
        throw new Error('Unmatched NCAA AP school: '+name+' (#'+rank+')');
      return {id,rank};
    });
    if(mapped.length!==25||new Set(mapped.map(x=>x.id)).size!==25||
       new Set(mapped.map(x=>x.rank)).size!==25)
      throw new Error('NCAA AP source returned fewer than 25 distinct ranked programs.');
    return mapped;
  };
  async function syncAPPoll(env,season,fetchFn=fetch){
    const day=localDay(),year=Number(season.slice(0,4))+1;
    const uri='https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings?groups=50&season='+year;
    const runId=crypto.randomUUID();
    await q(env,"INSERT INTO cbb_sync_runs(id,job,season,target_date,source,status) VALUES(?,'ap-poll',?,?,'espn-site-v2','running')",runId,season,day).run();
    try{
      let ranks=null,provider='',issues=[];
      try{
        const res=await fetchFn(uri,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
        if(!res.ok)throw new Error('ESPN AP poll HTTP '+res.status);
        const payload=await res.json();
        const candidates=payload.rankings||[];
        const poll=candidates.find(p=>/\bAP\b/i.test(p.name||'')||String(p.type||'').toLowerCase()==='ap');
        if(!poll||!Array.isArray(poll.ranks))throw new Error('AP Top 25 absent in ESPN response');
        const declaredYear=Number(payload.season?.year||payload.season?.endYear||0);
        if(declaredYear&&declaredYear!==year)throw new Error('ESPN AP poll is from the wrong season');
        ranks=poll.ranks.map(row=>({id:String(row.team?.id||''),rank:Number(row.current)}))
          .filter(row=>teamIds.has(row.id)&&Number.isInteger(row.rank)&&row.rank>=1&&row.rank<=25);
        if(ranks.length!==25||new Set(ranks.map(x=>x.rank)).size!==25||new Set(ranks.map(x=>x.id)).size!==25)
          throw new Error('ESPN AP poll incomplete');
        provider='ESPN AP rankings';
      }catch(e){issues.push(err(e));ranks=null;}
      if(!ranks){
        try{
          const url='https://ncaa-api.henrygd.me/rankings/basketball-men/d1/di-mens-basketball-associated-press';
          const res=await fetchFn(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
          if(!res.ok)throw new Error('NCAA poll HTTP '+res.status);
          const payload=await res.json();
          ranks=parseOfficialAP(payload);
          provider='NCAA Associated Press poll';
        }catch(e){issues.push(err(e));}
      }
      if(!ranks)throw new Error('AP sources unavailable: '+issues.join(' | '));
      const previous=await q(env,"SELECT COUNT(*) AS n FROM cbb_ap_rankings WHERE season=? AND snapshot_date=?",season,day).first();
      if(previous?.n===25){
        await q(env,"UPDATE cbb_sync_runs SET status='ok',received=25,matched=25,changed=0,finished_at=unixepoch() WHERE id=?",runId).run();
        return {date:day,count:25,duplicate:true};
      }
      const ops=[q(env,'DELETE FROM cbb_ap_rankings WHERE season=? AND snapshot_date=?',season,day),...ranks.map(x=>q(env,'INSERT INTO cbb_ap_rankings(season,snapshot_date,program_id,ap_rank,source) VALUES(?,?,?,?,?)',season,day,x.id,x.rank,provider))];
      await env.DB.batch(ops);
      await q(env,"UPDATE cbb_sync_runs SET status='ok',received=25,matched=25,changed=25,finished_at=unixepoch() WHERE id=?",runId).run();
      return {date:day,count:25};
    }catch(e){
      await q(env,"UPDATE cbb_sync_runs SET status='error',error_text=?,finished_at=unixepoch() WHERE id=?",err(e),runId).run().catch(()=>{});
      throw e;
    }
  }
  const recentGames=async(env,season,limit=60)=>{
    const rows=await q(env,"SELECT game_id,game_date,start_utc,home_id,away_id,home_name,away_name,home_score,away_score,status,status_detail,neutral_site,conference_game,season_type,tournament_tag FROM cbb_games WHERE season=? ORDER BY game_date DESC,start_utc DESC LIMIT ?",season,Math.min(100,Math.max(1,limit))).all();
    return rows.results||[];
  };
  // Historical dynasty score PREVIEW: earned points from recorded wins and verified
  // commissioner achievement inputs. Never equate an unimported season with zero.
  async function programHistory(env,id,scoring,currentSeason){
    const latestYear=Number(currentSeason.slice(0,4)),startYear=2021;
    const games=(await q(env,`SELECT season,game_date,home_id,away_id,home_score,away_score,
      status,season_type,tournament_tag,neutral_site
      FROM cbb_games WHERE (home_id=? OR away_id=?) AND season>=? AND season<=?
      ORDER BY season DESC,game_date DESC`,id,id,'2021-22',currentSeason).all()).results||[];
    const awards=(await q(env,`SELECT season,award_type,value FROM cbb_awards WHERE program_id=?
      AND season>=? AND season<=?`,id,'2021-22',currentSeason).all()).results||[];
    const net=(await q(env,`SELECT r.season,r.program_id,r.net_rank
      FROM cbb_net_rankings r JOIN cbb_net_snapshots s
      ON r.season=s.season AND r.snapshot_date=s.snapshot_date
      WHERE s.status='complete' AND r.season>=? AND r.season<=?
        AND s.snapshot_date=(SELECT MAX(snapshot_date) FROM cbb_net_snapshots
          WHERE season=r.season AND status='complete')`,'2021-22',currentSeason).all()).results||[];
    const netBySeason=new Map();
    for(const r of net){
      if(!netBySeason.has(r.season))netBySeason.set(r.season,new Map());
      netBySeason.get(r.season).set(String(r.program_id),Number(r.net_rank));
    }
    const periods=[];
    const weight=(key)=>Number(scoring?.[key]||0);
    for(let y=latestYear;y>=startYear;y--){
      const label=y+'-'+String((y+1)%100).padStart(2,'0');
      const seasonGames=games.filter(g=>g.season===label);
      const completed=seasonGames.filter(g=>g.status==='final'&&
        g.home_score!==null&&g.away_score!==null);
      const wins=completed.filter(g=>{
        const home=String(g.home_id)===String(id);
        return home?g.home_score>g.away_score:g.away_score>g.home_score;
      });
      const losses=completed.length-wins.length;
      const regularWins=wins.filter(g=>Number(g.season_type)===2&&!g.tournament_tag);
      const honors=awards.filter(a=>a.season===label);
      const ranks=netBySeason.get(label);
      let earned=regularWins.length*weight('regular_win');
      let q1=0,q1a=0,q2=0;
      if(ranks?.size>=350){
        for(const g of wins){
          if(Number(g.season_type)!==2||g.tournament_tag)continue;
          const home=String(g.home_id)===String(id);
          const opponent=String(home?g.away_id:g.home_id);
          const rank=ranks.get(opponent);
          if(!rank)continue;
          const venue=g.neutral_site?'neutral':home?'home':'away';
          const quad=quadrant(rank,venue);
          if(quad===1){q1++;earned+=weight('quad_1_win');if(isQ1A(rank,venue)){q1a++;earned+=weight('quad_1a_extra');}}
          if(quad===2){q2++;earned+=weight('quad_2_win');}
        }
      }
      const awardValue=(kind)=>honors.filter(a=>a.award_type===kind)
        .reduce((total,a)=>total+Number(a.value||0),0);
      if(awardValue('conference_regular_champion'))earned+=weight('conference_regular_title');
      if(awardValue('conference_tournament_champion'))earned+=weight('conference_tournament_title');
      const seed=awardValue('ncaa_seed');
      if(seed>0){
        earned+=seed<=4?weight('ncaa_seed_1_4'):seed<=8?weight('ncaa_seed_5_8'):
          seed<=12?weight('ncaa_seed_9_12'):weight('ncaa_seed_13_16');
      }
      const verifiedNCAA=wins.filter(g=>g.tournament_tag==='ncaa');
      const manualNCAA=honors.some(a=>a.award_type==='ncaa_wins');
      const ncaaWins=manualNCAA?awardValue('ncaa_wins'):verifiedNCAA.length;
      if(ncaaWins>0)earned+=ncaaWins*weight('ncaa_tournament_win');
      if(awardValue('national_champion'))earned+=weight('national_championship');
      const have=completed.length>0||honors.length>0;
      periods.push({season:label,points:have?Math.round(earned*100)/100:null,
        status:have?'partial':'unavailable',games:completed.length,wins:wins.length,
        losses,regular_wins:regularWins.length,q1,q1a,q2,
        net_verified:!!(ranks&&ranks.size>=350),ncaa_wins:ncaaWins,
        awards_verified:honors.length,
        note:have?'Verified components only; not a final fantasy total.':'Historical game and award data not yet imported.'});
    }
    return {program_id:String(id),current_season:currentSeason,seasons:periods,
      source:'ESPN game results, dated NET snapshots, commissioner-verified awards',
      complete:false};
  }
  // Fair, idempotent historical backfill: each pass advances across every
  // requested year instead of exhausting 2025-26 before 2021-22 begins.
  // The coverage table is the cursor, so retries and deployments are safe.
  async function backfillHistory(env,limit=8){
    if(!Number.isInteger(limit)||limit<1||limit>12)throw new Error('Historical backfill must be 1–12 dates.');
    const years=[2025,2024,2023,2022,2021];
    const covered=(await q(env,`SELECT season,game_date,source_group FROM cbb_game_coverage
      WHERE season>='2021-22' AND season<='2025-26'`).all()).results||[];
    const checked=new Set(covered.map(row=>row.season+'|'+row.game_date+'|'+row.source_group));
    const recentErrors=(await q(env,`SELECT season,target_date,COUNT(*) AS tries,MAX(started_at) AS last_try
      FROM cbb_sync_runs WHERE job='historical' AND status='error'
      GROUP BY season,target_date`).all()).results||[];
    const attempts=new Map(recentErrors.map(row=>[row.season+'|'+row.target_date,row]));
    const selected=new Set(),targets=[],now=Math.floor(Date.now()/1000);
    for(let step=0;step<limit;step++){
      let candidate=null;
      for(let pass=0;pass<years.length&&!candidate;pass++){
        const y=years[(step+pass)%years.length];
        const season=y+'-'+String((y+1)%100).padStart(2,'0');
        for(let day=y+'-11-01';day<=(y+1)+'-04-15';day=shiftDay(day,1)){
          const key=season+'|'+day;
          if(selected.has(key)||groupsForDay(day).every(g=>checked.has(key+'|'+g)))continue;
          const failure=attempts.get(key);
          if(failure&&Number(failure.tries)>=3&&now-Number(failure.last_try)<86400)continue;
          candidate={season,day};
          selected.add(key);
          break;
        }
      }
      if(!candidate)break;
      targets.push(candidate);
    }
    const imported=[];
    for(const target of targets){
      try{imported.push({ok:true,season:target.season,...await importDay(env,target.season,target.day,{job:'historical'})});}
      catch(e){imported.push({ok:false,season:target.season,date:target.day,error:err(e)});}
    }
    return {requested:targets.length,results:imported};
  }
  async function historicalProgress(env){
    const rows=(await q(env,`SELECT season,COUNT(DISTINCT game_date) AS checked_dates,
      SUM(CASE WHEN source_group=50 THEN event_count ELSE 0 END) AS primary_events
      FROM cbb_game_coverage WHERE season>='2021-22' AND season<='2025-26'
      GROUP BY season ORDER BY season`).all()).results||[];
    return ['2021-22','2022-23','2023-24','2024-25','2025-26'].map(season=>{
      const row=rows.find(r=>r.season===season)||{};
      return {season,checked_dates:Number(row.checked_dates||0),primary_events:Number(row.primary_events||0)};
    });
  }
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
      const detected=new Date(provenance);
      const dated=!Number.isNaN(detected.getTime())?detected.toISOString().slice(0,10):null;
      if(dated&&dated<seasonStart+'-11-01')
        throw new Error('NCAA NET source was last updated before this basketball season.');
      const year=(provenance.match(/20\d{2}/)||[])[0];
      if(year&&Number(year)<Number(seasonStart))
        throw new Error('NCAA NET source is still displaying the previous season.');
    }
    // An old NET page can remain visible into December. Last-season final
    // records (20+ games) are impossible during the new season's first NET release.
    const recordTotals=rows.map(item=>String(item.RECORD||item.Record||item.record||'').match(/^(\d+)-(\d+)$/))
      .filter(Boolean).map(x=>Number(x[1])+Number(x[2]));
    if(recordTotals.length>=100&&recordTotals.filter(n=>n>=20).length>recordTotals.length/5)
      throw new Error('NCAA NET data appears to be from a completed prior season.');
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
    const previous=await q(env,"SELECT status,stored_count AS n FROM cbb_net_snapshots WHERE season=? AND snapshot_date=?",season,day).first();
    if(previous?.status==='complete'&&previous.n===parsed.length)
      return {date:day,count:previous.n,duplicate:true};
    // Previous write may have stopped halfway; remove only the incomplete date,
    // then rebuild and make the new data visible after every row is saved.
    await env.DB.batch([
      q(env,'DELETE FROM cbb_net_rankings WHERE season=? AND snapshot_date=?',season,day),
      q(env,'DELETE FROM cbb_net_details WHERE season=? AND snapshot_date=?',season,day),
      q(env,"INSERT INTO cbb_net_snapshots(season,snapshot_date,expected_count,stored_count,source,status) VALUES(?,?,?,?,?,'loading') ON CONFLICT(season,snapshot_date) DO UPDATE SET expected_count=excluded.expected_count,stored_count=0,source=excluded.source,status='loading',updated_at=unixepoch()",season,day,parsed.length,0,source)
    ]);
    try{
      for(let i=0;i<parsed.length;i+=45){
        await env.DB.batch(parsed.slice(i,i+45).flatMap(x=>[
          q(env,'INSERT INTO cbb_net_rankings(season,snapshot_date,program_id,net_rank,source) VALUES(?,?,?,?,?)',season,day,x.id,x.rank,source),
          q(env,'INSERT INTO cbb_net_details(season,snapshot_date,program_id,raw_json,source) VALUES(?,?,?,?,?)',season,day,x.id,JSON.stringify(x.raw).slice(0,2500),source)
        ]));
      }
      const [ranksCount,detailsCount]=await Promise.all([
        q(env,'SELECT COUNT(*) AS n FROM cbb_net_rankings WHERE season=? AND snapshot_date=?',season,day).first(),
        q(env,'SELECT COUNT(*) AS n FROM cbb_net_details WHERE season=? AND snapshot_date=?',season,day).first()
      ]);
      if(ranksCount?.n!==parsed.length||detailsCount?.n!==parsed.length)
        throw new Error('NET snapshot validation failed: not all source records were stored.');
      await q(env,"UPDATE cbb_net_snapshots SET status='complete',stored_count=?,updated_at=unixepoch() WHERE season=? AND snapshot_date=?",parsed.length,season,day).run();
      return {date:day,count:parsed.length};
    }catch(e){
      await q(env,"UPDATE cbb_net_snapshots SET status='error',updated_at=unixepoch() WHERE season=? AND snapshot_date=?",season,day).run().catch(()=>{});
      throw e;
    }
  }
  // Warren Nolan keeps final, season-specific NET tables for past seasons.
  // Do not use current-season NET for historical quadrants.
  const archivedNetAliases={
    'saint mary s college':'Saint Mary\'s','north carolina st':'NC State',
    'north carolina state':'NC State','saint john s':'St John\'s',
    'uncw':'UNC Wilmington','uncg':'UNC Greensboro','unc asheville':'UNC Asheville',
    'cal st northridge':'CSU Northridge','cal state northridge':'CSU Northridge',
    'loyola marymount':'LMU','loyola marymount university':'LMU',
    'loyola chicago':'Loyola Chicago','university of charleston':'Charleston',
    'charleston':'Charleston','saint bonaventure':'St Bonaventure',
    'saint joseph s':'St Joseph\'s','university of texas arlington':'UT Arlington',
    'uta':'UT Arlington','georgia southern':'GA Southern',
    'southeastern louisiana':'SE Louisiana','siu edwardsville':'SIUE',
    'south florida':'South Florida','mount saint mary s':'Mount St Marys',
    'california state bakersfield':'CSU Bakersfield','cal st bakersfield':'CSU Bakersfield',
    'tennessee martin':'UT Martin','texas a and m corpus christi':'Texas A&M-CC',
    'saint peter s':'Saint Peter\'s','miami fl':'Miami',
    'miami ohio':'Miami OH','saint thomas':'St Thomas','st thomas':'St Thomas',
    'california baptist':'California Baptist','saint francis pa':'Saint Francis',
    'massachusetts lowell':'UMass Lowell','umass lowell':'UMass Lowell',
    'university of texas rio grande valley':'UT Rio Grande Valley',
    'southern illinois':'S Illinois','western carolina':'W Carolina',
    'north carolina central':'NC Central','south carolina state':'SC State',
    'south carolina upstate':'SC Upstate'
  };
  const textOnly=markup=>String(markup||'').replace(/<[^>]*>/g,' ')
    .replace(/&amp;/gi,'&').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"')
    .replace(/\s+/g,' ').trim();
  function parseArchivedNet(html,season){
    if(!/^202[1-5]-\d\d$/.test(season)||!html.includes('NET Rankings'))
      throw new Error('Historical NET archive season or page is invalid.');
    const mapped=[],missing=[],usedIds=new Set(),usedRanks=new Set();
    for(const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>textOnly(m[1]));
      if(cells.length<3||!/^\d+-\d+$/.test(cells[1]))continue;
      const rank=Number(cells[2]),school=cells[0];
      if(!Number.isInteger(rank)||rank<1||rank>400)continue;
      const key=netKey(school),id=netNames.get(key)||netNames.get(netKey(archivedNetAliases[key]||''));
      if(!id||!teamIds.has(id)||usedIds.has(id)||usedRanks.has(rank)){
        missing.push({school,rank});continue;
      }
      usedIds.add(id);usedRanks.add(rank);
      mapped.push({program_id:id,net_rank:rank,raw:{SCHOOL:school,RANK:rank,archive:season}});
    }
    if(mapped.length<350||!usedRanks.has(1))
      throw new Error('Historical NET archive mapped only '+mapped.length+' teams for '+season+
        '; missing: '+missing.slice(0,8).map(x=>x.school).join(', '));
    return {records:mapped,unmatched:missing};
  }
  async function syncArchivedNet(env,season,fetchFn=fetch){
    if(!/^202[1-5]-\d\d$/.test(season)||Number(season.slice(0,4))>2025)
      throw new Error('Historical NET is limited to completed 2021–22 through 2025–26 seasons.');
    const existing=await q(env,"SELECT status,stored_count FROM cbb_net_snapshots WHERE season=? AND status='complete' ORDER BY snapshot_date DESC LIMIT 1",season).first();
    if(existing&&Number(existing.stored_count)>=350)return {season,duplicate:true,count:existing.stored_count};
    const year=Number(season.slice(0,4))+1;
    const url='https://www.warrennolan.com/basketball/'+year+'/net';
    const runId=crypto.randomUUID();
    await q(env,"INSERT INTO cbb_sync_runs(id,job,season,target_date,source,status) VALUES(?,'historical-net',?,?,'warrennolan-archive','running')",runId,season,year+'-04-15').run();
    try{
      const response=await fetchFn(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Historical NET archive HTTP '+response.status);
      const html=await response.text();
      const parsed=parseArchivedNet(html,season);
      const result=await saveNet(env,season,year+'-04-15',parsed.records,'Warren Nolan archived '+year+' final NET (season-end reference date)');
      await q(env,"UPDATE cbb_sync_runs SET status='ok',received=?,matched=?,changed=?,finished_at=unixepoch() WHERE id=?",parsed.records.length,parsed.records.length,result.duplicate?0:parsed.records.length,runId).run();
      return {season,...result,unmatched_count:parsed.unmatched.length};
    }catch(e){
      await q(env,"UPDATE cbb_sync_runs SET status='error',error_text=?,finished_at=unixepoch() WHERE id=?",err(e),runId).run().catch(()=>{});
      throw e;
    }
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
      // Keep the feed active overnight: late games and corrections can post
      // after midnight, and never rely on a "quiet hours" assumption.
      const live=await importDay(env,season,day,{job:'live'});
      return {live};
    }
    if(cron==='*/5 * * * *'){
      return {historical:await backfillHistory(env,8)};
    }
    if(cron==='45 9 * * *'){
      const years=['2021-22','2022-23','2023-24','2024-25','2025-26'];
      const report=[];
      for(const historicalSeason of years){
        try{report.push({ok:true,...await syncArchivedNet(env,historicalSeason)});}
        catch(e){report.push({season:historicalSeason,ok:false,error:err(e)});}
      }
      return {archiveNet:report};
    }
    if(cron==='15 10 * * *'){
      const reconciled=await backfill(env,season,7);
      const future=await upcoming(env,season,3);
      const repaired=await fillMissing(env,season,4);
      let ap;
      try{ap=await syncAPPoll(env,season);}catch(e){ap={error:err(e)};}
      // NCAA NET is not issued until December, and the NCAA public proxy may
      // legitimately show last season's rankings before the new release.
      if(day<season.slice(0,4)+'-12-08')
        return {games:reconciled,upcoming:future,repaired,ap,net:{skipped:'NET has not started'}};
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
        if(feed.skipped)return {games:reconciled,upcoming:future,repaired,ap,net:{skipped:feed.skipped}};
        const result=await saveNet(env,season,feed.date,feed.records,feed.source);
        await q(env,"UPDATE cbb_sync_runs SET status='ok',received=?,matched=?,changed=?,finished_at=unixepoch() WHERE id=?",result.count,result.count,result.duplicate?0:result.count,id).run();
        return {games:reconciled,upcoming:future,repaired,ap,net:result};
      }catch(e){
        await q(env,"UPDATE cbb_sync_runs SET status='error',error_text=?,finished_at=unixepoch() WHERE id=?",err(e),id).run().catch(()=>{});
        return {games:reconciled,upcoming:future,repaired,ap,net:{error:err(e)}};
      }
    }
    return {skipped:'unknown-cron'};
  }

  return {localDay,seasonOf,dayInSeason,shiftDay,scoreboardUrls,groupsForDay,parseEvent,fetchScoreboard,importDay,backfill,upcoming,coverage,fillMissing,status,records,netRanks,recentGames,gamesByDate,apPoll,syncAPPoll,parseOfficialAP,programHistory,backfillHistory,historicalProgress,programGames,saveNet,parseArchivedNet,syncArchivedNet,parseNCAANet,fetchOfficialNet,seasonQuadrants,quadrant,isQ1A,scheduled};
})();
