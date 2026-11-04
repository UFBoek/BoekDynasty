import postgres from 'npm:postgres@3.4.7';
import apiWorker from './server.js';
import {createD1} from './db.js';
import {DATA_PIPELINE} from './results.js';

// The GitHub Pages site owns the UI. This function only serves the JSON API.
const FRONTEND_ORIGIN = 'https://ufboek.github.io';
const poolUrl = Deno.env.get('SUPABASE_DB_URL');
if(!poolUrl) throw new Error('SUPABASE_DB_URL must be configured in Supabase secrets.');
const pg = postgres(poolUrl,{prepare:false,max:5,idle_timeout:15,connect_timeout:10});
const db = createD1(pg);
const cors = {
  'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':'authorization, content-type, apikey, x-client-info',
  'Access-Control-Max-Age':'600',
  'Vary':'Origin'
};
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
      if(kind==='live')result=eligible?await DATA_PIPELINE.importDay(env,season,today,{job:'live'}):{skipped:'offseason'};
      else if(kind==='recent')result=eligible?await DATA_PIPELINE.backfill(env,season,4):{skipped:'offseason'};
      else if(kind==='upcoming')result=eligible?await DATA_PIPELINE.upcoming(env,season,3):{skipped:'offseason'};
      else if(kind==='ap')result=eligible?await DATA_PIPELINE.syncAPPoll(env,season):{skipped:'offseason'};
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
      return Response.json({ok:true,kind,result},{headers:cors});
    }catch(error){
      console.error('Boek Dynasty scheduled job failed',kind,error);
      return Response.json({error:'Scheduled sync failed.',kind},{status:500,headers:cors});
    }
  }
  original.pathname='/api/'+subpath;
  const forwarded=new Request(original.toString(),request);
  const response=await apiWorker.fetch(forwarded,{DB:db,FRONTEND_ORIGIN});
  const headers=new Headers(response.headers);
  for(const [key,value] of Object.entries(cors)) headers.set(key,value);
  headers.delete('Set-Cookie');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
});
