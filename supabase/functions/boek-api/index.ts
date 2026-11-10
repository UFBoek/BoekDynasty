import postgres from 'npm:postgres@3.4.7';
import apiWorker from './server.js';
import {createD1} from './db.js';
import {DATA_PIPELINE} from './results.js';
import {getTorvikRatings} from './ratings.js';
import {createNotificationEngine} from './notifications.js';

// The GitHub Pages site owns the UI. This function only serves the JSON API.
const FRONTEND_ORIGIN = 'https://ufboek.github.io';
const poolUrl = Deno.env.get('SUPABASE_DB_URL');
if(!poolUrl) throw new Error('SUPABASE_DB_URL must be configured in Supabase secrets.');
const pg = postgres(poolUrl,{prepare:false,max:5,idle_timeout:15,connect_timeout:10});
const db = createD1(pg);
const notificationEngine=createNotificationEngine(db);
const cors = {
  'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':'authorization, content-type, apikey, x-client-info',
  'Access-Control-Max-Age':'600',
  'Vary':'Origin'
};

const ACTIVITY_PAGES = new Set(['home','team','results','programs','program-detail','manager-detail','draft','trades','league','scoring','commissioner','settings','more','draft-order','waivers','history','notifications']);
const ACTIVITY_SECTIONS = new Set(['general','programs','draft','scoring','members','data','trades','waivers','seasons','activity','notifications']);
const ACTION_NAMES = {
  'draft/queue':'Updated draft queue','draft/pick':'Selected a draft pick',
  'trade/propose':'Proposed a program/pick trade','trade/respond':'Responded to a program/pick trade','trade/cancel':'Cancelled a trade',
  'roster/add':'Added a program','roster/drop':'Dropped a program',
  'waiver/cancel':'Cancelled a legacy waiver claim','waiver/drop':'Dropped a program',
  'account/profile':'Updated profile','account/password':'Changed password',
  'admin/invite':'Created an invitation','admin/general':'Updated league settings',
  'admin/bestball':'Updated best-ball format','admin/scoring-settings':'Updated scoring settings',
  'admin/settings':'Updated program eligibility','admin/program':'Updated program',
  'admin/draft-control':'Changed draft status','admin/draft-order':'Updated draft order',
  'admin/draft/auto-pick':'Commissioner auto-picked the current draft selection',
  'admin/draft/undo-pick':'Commissioner undid the latest draft selection',
  'admin/race/run':'Finalized draft order race','admin/race/reset':'Reset draft order race',
  'admin/clock':'Updated draft clock','admin/trade-settings':'Updated trade settings',
  'admin/waiver-settings':'Updated waiver settings','admin/waiver/review':'Reviewed waiver claim',
  'admin/season/rollover':'Advanced league season','admin/season/champion':'Updated season champion'
};
const epochNow = () => Math.floor(Date.now()/1000);
async function activityActor(request) {
  const header=request.headers.get('Authorization')||'';
  if(!header.startsWith('Bearer '))return null;
  const token=header.slice(7);
  if(!/^[A-Za-z0-9_-]{25,256}$/.test(token))return null;
  const raw=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
  const tokenHash=Array.from(raw,x=>x.toString(16).padStart(2,'0')).join('');
  return await db.prepare('SELECT u.id,u.username,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?')
    .bind(tokenHash,epochNow()).first();
}
async function saveActivity(userId,kind,label,dedupeSeconds=0) {
  const now=epochNow();
  if(dedupeSeconds>0){
    const previous=await db.prepare('SELECT created_at FROM activity_events WHERE user_id=? AND kind=? AND label=? ORDER BY created_at DESC LIMIT 1')
      .bind(userId,kind,label).first();
    if(previous&&now-Number(previous.created_at)<dedupeSeconds)return;
  }
  await db.prepare('INSERT INTO activity_events(user_id,kind,label,created_at) VALUES(?,?,?,?)')
    .bind(userId,kind,label.slice(0,100),now).run();
}

Deno.serve(async (request)=>{
  const origin=request.headers.get('Origin');
  if(origin && origin!==FRONTEND_ORIGIN)
    return new Response(JSON.stringify({error:'Invalid request origin.'}),{status:403,headers:{'Content-Type':'application/json'}});
  if(request.method==='OPTIONS')
    return new Response(null,{status:204,headers:cors});
  const original=new URL(request.url);
  // Supabase routes /functions/v1/boek-api/<path>, while the source API uses /api/<path>.
  const marker='/boek-api/';
  const at=original.pathname.indexOf(marker);
  const subpath=at===-1?'':original.pathname.slice(at+marker.length);
  if(!subpath||subpath.includes('..')||subpath.length>250)
    return new Response(JSON.stringify({error:'Unknown API route.'}),{status:404,headers:{...cors,'Content-Type':'application/json'}});

  // Notification routes are authenticated by the same hashed bearer session as every league action.
  if(subpath.startsWith('notifications/')||subpath.startsWith('admin/notifications')){
    const actor=await activityActor(request);
    const result=await notificationEngine.route(subpath,request,actor,original);
    const headers=new Headers(result.headers);
    for(const [key,value] of Object.entries(cors))headers.set(key,value);
    return new Response(result.body,{status:result.status,headers});
  }
  if(subpath==='activity/ping'){
    if(request.method!=='POST')return Response.json({error:'Method not allowed.'},{status:405,headers:cors});
    const actor=await activityActor(request);
    if(!actor)return Response.json({error:'Sign in required.'},{status:401,headers:cors});
    const body=await request.json().catch(()=>null);
    const page=String(body?.page||'');
    if(!ACTIVITY_PAGES.has(page))return Response.json({error:'Invalid page.'},{status:400,headers:cors});
    const context=page==='commissioner'&&ACTIVITY_SECTIONS.has(String(body?.context||''))?String(body.context):'';
    const now=epochNow();
    await db.prepare("INSERT INTO activity_presence(user_id,last_seen,last_page,last_context) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen=excluded.last_seen,last_page=excluded.last_page,last_context=excluded.last_context WHERE activity_presence.last_seen < excluded.last_seen - 20 OR activity_presence.last_page <> excluded.last_page OR activity_presence.last_context <> excluded.last_context")
      .bind(actor.id,now,page,context).run();
    if(body?.navigation===true){
      const label=page==='commissioner'?'Commissioner / '+(context||'general'):page;
      await saveActivity(actor.id,'page',label,30);
    }
    return Response.json({ok:true},{headers:{...cors,'Cache-Control':'no-store'}});
  }
  if(subpath==='admin/activity'){
    if(request.method!=='GET')return Response.json({error:'Method not allowed.'},{status:405,headers:cors});
    const actor=await activityActor(request);
    if(!actor)return Response.json({error:'Sign in required.'},{status:401,headers:cors});
    if(actor.role!=='commissioner')return Response.json({error:'Commissioner access required.'},{status:403,headers:cors});
    const period=String(original.searchParams.get('range')||'7d');
    const windowSeconds=({'24h':86400,'7d':604800,'30d':2592000})[period];
    if(!windowSeconds)return Response.json({error:'Invalid activity range.'},{status:400,headers:cors});
    const now=epochNow(),since=now-windowSeconds;
    const [membersQuery,eventsQuery]=await Promise.all([
      db.prepare("SELECT u.id,u.username,u.display_name,u.role,p.last_seen,p.last_page,p.last_context, (SELECT count(*)::integer FROM activity_events e WHERE e.user_id=u.id AND e.kind='page' AND e.created_at>=?) AS page_views, (SELECT count(*)::integer FROM activity_events e WHERE e.user_id=u.id AND e.kind='action' AND e.created_at>=?) AS actions FROM users u LEFT JOIN activity_presence p ON p.user_id=u.id ORDER BY COALESCE(p.last_seen,0) DESC,u.display_name")
        .bind(since,since).all(),
      db.prepare('SELECT e.id,e.user_id,e.kind,e.label,e.created_at,u.username,u.display_name FROM activity_events e JOIN users u ON u.id=e.user_id WHERE e.created_at>=? ORDER BY e.created_at DESC,e.id DESC LIMIT 180')
        .bind(since).all()
    ]);
    const members=membersQuery.results||[],events=eventsQuery.results||[];
    return Response.json({now,range:period,members,events,summary:{
      active:members.filter(m=>Number(m.last_seen||0)>=now-300).length,
      visited_today:members.filter(m=>Number(m.last_seen||0)>=now-86400).length,
      views:members.reduce((a,m)=>a+Number(m.page_views||0),0),
      actions:members.reduce((a,m)=>a+Number(m.actions||0),0)
    }},{headers:{...cors,'Cache-Control':'no-store'}});
  }

  if(subpath==='data/ratings'){
    if(request.method!=='GET')return Response.json({error:'Method not allowed.'},{status:405,headers:cors});
    const year=Number(original.searchParams.get('year'));
    if(!Number.isInteger(year)||year<2022||year>2027)
      return Response.json({error:'Choose a season from 2021–22 through 2026–27.'},{status:400,headers:cors});
    try{
      const ratings=await getTorvikRatings(year);
      return Response.json(ratings,{headers:{...cors,'Cache-Control':'public, max-age=900','X-Content-Type-Options':'nosniff'}});
    }catch(error){
      return Response.json({error:'T-Rank ratings unavailable: '+String(error?.message||error),source:'Bart Torvik',season:year},{status:503,headers:{...cors,'Cache-Control':'no-store'}});
    }
  }
  if(subpath==='cron'){
    if(request.method!=='POST')
      return Response.json({error:'Method not allowed.'},{status:405,headers:cors});
    const secret=request.headers.get('x-job-token')||'';
    if(secret.length!==64 || !/^[a-f0-9]{64}$/i.test(secret))
      return Response.json({error:'Forbidden.'},{status:403,headers:cors});
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)));
    const actual=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
    const saved=(await db.prepare("SELECT value FROM settings WHERE key='scheduled_job_token_hash'").first())?.value||'';
    let mismatch=saved.length!==actual.length?1:0;
    for(let i=0;i<actual.length;i++) mismatch|=actual.charCodeAt(i)^(saved.charCodeAt(i)||0);
    if(mismatch) return Response.json({error:'Forbidden.'},{status:403,headers:cors});
    let body;try{body=await request.json();}catch{return Response.json({error:'Invalid task.'},{status:400,headers:cors});}
    const kind=String(body?.kind||'');
    const env={DB:db};
    try{
      const today=DATA_PIPELINE.localDay();
      const season=(await db.prepare("SELECT value FROM settings WHERE key='current_season'").first())?.value||DATA_PIPELINE.seasonOf(today);
      const eligible=[11,12,1,2,3,4].includes(Number(today.slice(5,7)))&&DATA_PIPELINE.dayInSeason(season,today);
      let result;
      if(kind==='live-fast'){
        if(!eligible)result={skipped:'offseason'};
        else{
          // The high-frequency path intentionally avoids slow repairs, schedule
          // discovery and notification retries. Those stay on their own jobs.
          result=await DATA_PIPELINE.importDay(env,season,today,{job:'live-fast'});
        }
      }
      else if(kind==='live'){
        if(!eligible)result={skipped:'offseason'};
        else{
          const scoreboard=await DATA_PIPELINE.importDay(env,season,today,{job:'live'});
          const details=await DATA_PIPELINE.repairUnfinishedGames(env,season,18)
            .catch(error=>({error:String(error?.message||error)}));
          const teamSchedules=await DATA_PIPELINE.fillSparseTeamSchedules(env,season,3)
            .catch(error=>({error:String(error?.message||error)}));
          result={scoreboard,details,teamSchedules};
        }
      }
      else if(kind==='recent'){
        // Reconcile the scoreboard and separately recover individual finished
        // events omitted by ESPN's sometimes-incomplete daily group feed.
        const reconciled=eligible?await DATA_PIPELINE.backfill(env,season,4):{skipped:'offseason'};
        const details=eligible?await DATA_PIPELINE.repairUnfinishedGames(env,season,30)
          .catch(error=>({error:String(error?.message||error)})):{skipped:'offseason'};
        const repaired=await DATA_PIPELINE.repairInterrupted(env,2);
        result={reconciled,details,repaired};
      }
      else if(kind==='upcoming')result=eligible?await DATA_PIPELINE.upcoming(env,season,3):{skipped:'offseason'};
      else if(kind==='ap')result=eligible?await DATA_PIPELINE.syncAPPoll(env,season):{skipped:'offseason'};
       else if(kind==='torvik')result=eligible?await DATA_PIPELINE.syncPreliminaryTorvik(env,season):{skipped:'offseason'};
      else if(kind==='net'){
        if(!eligible||today<season.slice(0,4)+'-12-08')result={skipped:'NET not released'};
        else{const feed=await DATA_PIPELINE.fetchOfficialNet(today,season);result=feed.skipped?feed:await DATA_PIPELINE.saveNet(env,season,feed.date,feed.records,feed.source);}
      }
      else if(kind==='history')result=await DATA_PIPELINE.backfillHistory(env,4);
      else if(kind==='history-range'){
        // Partition historical coverage into disjoint, short windows. Existing
        // coverage is checked before each import, so retries are idempotent.
        const archived=['2021-22','2022-23','2023-24','2024-25','2025-26'];
        const targetSeason=String(body?.season||'');
        const first=String(body?.start||''),last=String(body?.end||'');
        const from=Date.parse(first+'T12:00:00Z'),to=Date.parse(last+'T12:00:00Z');
        const span=(to-from)/86400000;
        if(!archived.includes(targetSeason)||!DATA_PIPELINE.dayInSeason(targetSeason,first)||
          !DATA_PIPELINE.dayInSeason(targetSeason,last)||
          first<targetSeason.slice(0,4)+'-11-01'||
          last>(Number(targetSeason.slice(0,4))+1)+'-04-15'||
          !Number.isInteger(span)||span<0||span>15)
          return Response.json({error:'Invalid historical import range (maximum 16 dates).'},{status:400,headers:cors});
        const coverage=(await db.prepare('SELECT game_date,source_group FROM cbb_game_coverage WHERE season=? AND game_date BETWEEN ? AND ?')
          .bind(targetSeason,first,last).all()).results||[];
        const scanned=new Map();
        for(const item of coverage){
          const set=scanned.get(item.game_date)||new Set();
          set.add(Number(item.source_group));
          scanned.set(item.game_date,set);
        }
        const rows=[];let skipped=0,changed=0,failed=0;
        for(let date=first;date<=last;date=DATA_PIPELINE.shiftDay(date,1)){
          const expected=DATA_PIPELINE.groupsForDay(date);
          if(expected.every(group=>scanned.get(date)?.has(group))){skipped++;continue;}
          try{
            const done=await DATA_PIPELINE.importDay(env,targetSeason,date,{job:'historical-audit'});
            changed+=Number(done.changed||0);
            rows.push({date,ok:true,received:done.received,changed:done.changed});
          }catch(error){
            failed++;
            rows.push({date,ok:false,error:String(error?.message||error).slice(0,180)});
          }
        }
        result={season:targetSeason,start:first,end:last,skipped,processed:rows.length,changed,failed,days:rows};
      }

      else if(kind==='site-import-queued'){
        // pg_net must finish downloading before this function is invoked.
        // Calling pg_net from another pg_net-triggered function deadlocks its worker.
        const entries=Array.isArray(body?.entries)?body.entries:[];
        if(!entries.length||entries.length>8)
          return Response.json({error:'Choose 1–8 prepared dates.'},{status:400,headers:cors});
        const output=[];let changed=0,failed=0;
        for(const entry of entries){
          const siteSeason=String(entry?.season||''),day=String(entry?.day||'');
          const requests=Array.isArray(entry?.groups)?entry.groups:[];
          const required=DATA_PIPELINE.groupsForDay(day);
          if(!['2021-22','2022-23','2023-24','2024-25','2025-26'].includes(siteSeason)||
             !DATA_PIPELINE.dayInSeason(siteSeason,day)||
             !requests.length||requests.length!==required.length||
             required.some(g=>!requests.some(x=>Number(x.group)===g))||
             requests.some(x=>!Number.isSafeInteger(Number(x.id))||Number(x.id)<=0))
            return Response.json({error:'Invalid queued ESPN date.'},{status:400,headers:cors});
          const events=new Map(),sources=[];
          try{
            for(const request of requests){
              const response=await db.prepare('SELECT status_code,content,error_msg FROM net._http_response WHERE id=?')
                .bind(Number(request.id)).first();
              if(!response)throw new Error('Official ESPN response not ready or expired');
              if(Number(response.status_code)!==200)
                throw new Error('ESPN site HTTP '+response.status_code+' '+String(response.error_msg||'').slice(0,80));
              const feed=JSON.parse(response.content);
              if(!Array.isArray(feed.events)||feed.events.length>=1000)
                throw new Error('Invalid official ESPN event list');
              sources.push({group:Number(request.group),count:feed.events.length,host:'site.api.espn.com'});
              for(const event of feed.events){
                if(event?.id)events.set(String(event.id),{...event,__sourceGroup:Number(request.group)});
              }
            }
            const done=await DATA_PIPELINE.importDay(env,siteSeason,day,{
              job:'historical-site',payload:{events:[...events.values()],host:'site.api.espn.com',sources}
            });
            changed+=Number(done.changed||0);
            output.push({season:siteSeason,day,ok:true,received:done.received,changed:done.changed,groups:sources.map(x=>[x.group,x.count])});
            for(const request of requests){
              try{await db.prepare('DELETE FROM net._http_response WHERE id=?').bind(Number(request.id)).run();}catch{}
            }
          }catch(error){
            failed++;
            output.push({season:siteSeason,day,ok:false,error:String(error?.message||error).slice(0,160)});
          }
        }
        result={processed:output.length,changed,failed,days:output};
      }
      else if(kind==='postseason')result=await DATA_PIPELINE.priorityPostseason(env,2);
      else if(kind==='ncaa')result=await DATA_PIPELINE.reconcileNCAA2026(env);
      else if(kind==='titles')result=await DATA_PIPELINE.backfillHistoricalConferences(env);
      else if(kind==='archive-net')result=await DATA_PIPELINE.backfillArchivedNet(env);
      else if(kind==='verify-leaders'){
        const raw=(await db.prepare("SELECT value FROM settings WHERE key='scoring_rules'").first())?.value;
        let rules={};try{rules=JSON.parse(raw||'{}');}catch{}
        const leaders=await DATA_PIPELINE.historicalLeaders(env,rules,season);
        result={seasons:leaders.seasons,archive_complete:leaders.archive_complete,
          verified_seasons:leaders.verified_seasons,programSeasons:leaders.rows.length,
          distinctPrograms:new Set(leaders.rows.map(x=>x.program_id)).size,
          withWins:leaders.rows.filter(x=>x.regular_wins>0).length,
          pointsNonzero:leaders.rows.filter(x=>x.points>0).length};
      }
      else if(kind==='verify-scoring'){
        const settingsRows=(await db.prepare("SELECT key,value FROM settings WHERE key IN ('scoring_rules','conferences')").all()).results||[];
        const prefs=Object.fromEntries(settingsRows.map(x=>[x.key,x.value]));
        const rules=JSON.parse(prefs.scoring_rules||'{}');
        const allowed=JSON.parse(prefs.conferences||'[]');
        const all=await DATA_PIPELINE.historicalLeaders(env,rules,season);
        const filtered=await DATA_PIPELINE.historicalLeaders(env,rules,season,allowed);
        const invalid=all.rows.filter(row=>{
          const sum=(row.breakdown||[]).reduce((total,part)=>total+part.points,0);
          return Math.abs(sum-row.points)>0.001||row.q1a>row.q1;
        });
        const outside=filtered.directory.filter(x=>!allowed.includes(x.conference_id));
        const sampleID='57';
        const profile=await DATA_PIPELINE.programHistory(env,sampleID,rules,season);
        const sourceMap=new Map(all.rows.filter(x=>x.program_id===sampleID).map(x=>[x.season,x]));
        const profileDeltas=profile.seasons.filter(x=>sourceMap.has(x.season))
          .filter(x=>Math.abs((x.points||0)-(sourceMap.get(x.season).points||0))>0.001);
        if(invalid.length||outside.length||profileDeltas.length)
          throw new Error('Historical scoring audit failed: '+invalid.length+' points, '+
            outside.length+' conferences, '+profileDeltas.length+' profile mismatches');
        const bySeason={};
        for(const row of all.rows){
          const key=row.season,summary=bySeason[key]||(bySeason[key]={
            programs:0,regularWins:0,conferenceWins:0,ncaaWins:0,firstFourWins:0,
            quad1:0,quad1a:0,quad2:0,totalPoints:0
          });
          summary.programs++;summary.regularWins+=row.regular_wins;
          summary.conferenceWins+=row.conference_tournament_wins;
          summary.ncaaWins+=row.ncaa_wins;summary.firstFourWins+=row.opening_round_wins;
          summary.quad1+=row.q1;summary.quad1a+=row.q1a;summary.quad2+=row.q2;
          summary.totalPoints+=row.points;
        }
        result={rules,eligiblePrograms:filtered.directory.length,
          eligibleSchoolSeasons:filtered.rows.length,scoredSchoolSeasons:all.rows.length,
          brokenRows:invalid.length,profileMismatches:profileDeltas.length,
          excludedConferences:outside.length,bySeason,
          sample:profile.seasons.filter(x=>x.season==='2024-25').map(x=>({
            season:x.season,points:x.points,breakdown:x.breakdown
          }))};
      }
      else if(kind==='verify-quads'){
        const quads=await DATA_PIPELINE.seasonQuadrants(env,season);
        result={season,netSnapshot:quads.snapshot_date,
          programsWithQuadrantWins:Object.keys(quads.by_program).length};
      }

      else return Response.json({error:'Unknown task.'},{status:400,headers:cors});
      // Retry already-created notifications only. Do not generate a new draft
      // on-clock alert just because a scheduled data sync runs.
      if(kind==='live'||kind==='recent')await notificationEngine.flush(12).catch(error=>
        console.warn('Push retry skipped:',String(error?.message||error)));
      return Response.json({ok:true,kind,result},{headers:cors});
    }catch(error){
      console.error('Boek Dynasty scheduled job failed',kind,error);
      return Response.json({error:'Scheduled sync failed.',kind},{status:500,headers:cors});
    }
  }
  // Inspect only the small set of mutations that generate league alerts.
  // Clone before constructing the forwarded Request to preserve the request body.
  const actionable=['trade/propose','trade/respond','trade/cancel','draft/pick','admin/draft-control','admin/draft/auto-pick'].includes(subpath);
  const notificationBody=actionable&&request.method==='POST'
    ?await request.clone().json().catch(()=>null):null;
  const autoPickPreview=subpath==='admin/draft/auto-pick'&&notificationBody?.preview===true;
  const undoPickPreview=subpath==='admin/draft/undo-pick'&&notificationBody?.preview===true;
  original.pathname='/api/'+subpath;
  const forwarded=new Request(original.toString(),request);
  const response=await apiWorker.fetch(forwarded,{DB:db,FRONTEND_ORIGIN});
  if(actionable&&response.ok&&notificationBody&&!autoPickPreview){
    try{
      const actor=await activityActor(request);
      await notificationEngine.onMutation(subpath,actor,notificationBody,response);
    }catch(error){
      // A notification failure must never invalidate a completed draft pick or trade.
      console.error('Notification delivery failed',String(error?.message||error));
    }
  }
  // Audit only successful, authenticated mutations. Never store request bodies, tokens or IP addresses.
  if(request.method==='POST'&&response.ok&&!autoPickPreview&&!undoPickPreview){
    try{
      if(subpath==='login'||subpath==='join'||subpath==='setup'){
        const result=await response.clone().json().catch(()=>null);
        if(result?.user?.id)await saveActivity(result.user.id,'login',subpath==='login'?'Signed in':subpath==='join'?'Joined the league':'Created commissioner account');
      }else if(subpath!=='logout'&&!subpath.startsWith('data/')){
        const label=ACTION_NAMES[subpath]||(subpath.startsWith('admin/')?'Commissioner: '+subpath.slice(6).replace(/[-/]/g,' '):'');
        if(label){
          const actor=await activityActor(request);
          if(actor)await saveActivity(actor.id,'action',label,subpath==='draft/queue'?90:0);
        }
      }
    }catch(err){console.warn('Activity logging failed',String(err?.message||err));}
  }
  const headers=new Headers(response.headers);
  for(const [key,value] of Object.entries(cors)) headers.set(key,value);
  headers.delete('Set-Cookie');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
});
