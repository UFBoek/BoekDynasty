import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const backend = get('supabase/functions/boek-api/index.ts');
const frontend = get('src/client.js');
const css = get('src/style.css');
const migration = get('supabase/migrations/20261104000006_activity_monitor.sql');

test('only a commissioner can read activity, including all members',()=>{
  const route=backend.slice(backend.indexOf("if(subpath==='admin/activity')"),backend.indexOf("if(subpath==='data/ratings')"));
  assert.match(route,/activityActor\(request\)/);
  assert.match(route,/actor\.role!=='commissioner'/);
  assert.match(route,/\{status:403/);
  assert.match(route,/ORDER BY e\.created_at DESC,e\.id DESC LIMIT 180/);
});
test('every heartbeat is verified against an actual unexpired manager session',()=>{
  assert.match(backend,/FROM sessions s JOIN users u ON u\.id=s\.user_id WHERE s\.token_hash=\? AND s\.expires_at>\?/);
  assert.match(backend,/if\(!ACTIVITY_PAGES\.has\(page\)\)/);
  assert.match(backend,/body\?\.navigation===true/);
  assert.match(backend,/saveActivity\(actor\.id,'page'/);
});
test('only successful account actions are audited without secrets or raw request bodies',()=>{
  assert.match(backend,/request\.method==='POST'&&response\.ok/);
  assert.match(backend,/saveActivity\(actor\.id,'action',label/);
  assert.doesNotMatch(backend,/INSERT INTO activity_events[^\n]*password/i);
  assert.doesNotMatch(migration,/ip_address|user_agent|password_hash/i);
});
test('RLS prevents direct table access through public Supabase roles',()=>{
  for(const t of ['activity_presence','activity_events']){
    assert.match(migration,new RegExp('ALTER TABLE public\\.'+t+' ENABLE ROW LEVEL SECURITY'));
    assert.match(migration,new RegExp('REVOKE ALL ON public\\.'+t+' FROM anon, authenticated'));
  }
});
test('dashboard is commissioner-only with filters and responsive presence UI',()=>{
  assert.match(frontend,/if\(me\.role!=='commissioner'\)return '';/);
  assert.match(frontend,/\['activity','Activity','Visits & actions'\]/);
  assert.match(frontend,/function activityMonitorPage\(\)/);
  assert.match(frontend,/id="activity-range"/);
  assert.match(frontend,/id="activity-member"/);
  assert.match(frontend,/function pingActivity\(force=false\)/);
  assert.match(css,/\.activity-metrics/);
  assert.match(css,/@media \(max-width:560px\)/);
});
