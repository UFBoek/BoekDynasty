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
      else if(kind==='postseason')result=await DATA_PIPELINE.priorityPostseason(env,2);
      else if(kind==='ncaa')result=await DATA_PIPELINE.reconcileNCAA2026(env);
      else if(kind==='titles')result=await DATA_PIPELINE.backfillHistoricalConferences(env);
      else if(kind==='archive-net')result=await DATA_PIPELINE.backfillArchivedNet(env);
      else if(kind==='verify-leaders'){
        const raw=(await db.prepare("SELECT value FROM settings WHERE key='scoring_rules'").first())?.value;
        let rules={};try{rules=JSON.parse(raw||'{}');}catch{}
        const leaders=await DATA_PIPELINE.historicalLeaders(env,rules,season);
        result={seasons:leaders.seasons,programSeasons:leaders.rows.length,
          distinctPrograms:new Set(leaders.rows.map(x=>x.program_id)).size,
          withWins:leaders.rows.filter(x=>x.regular_wins>0).length,
          pointsNonzero:leaders.rows.filter(x=>x.points>0).length};
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
