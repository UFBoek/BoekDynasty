import postgres from 'npm:postgres@3.4.7';
import apiWorker from './server.js';
import {createD1} from './db.js';

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
  original.pathname='/api/'+subpath;
  const forwarded=new Request(original.toString(),request);
  const response=await apiWorker.fetch(forwarded,{DB:db,FRONTEND_ORIGIN});
  const headers=new Headers(response.headers);
  for(const [key,value] of Object.entries(cors)) headers.set(key,value);
  headers.delete('Set-Cookie');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
});
