import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../supabase/functions/boek-api/index.ts',import.meta.url),'utf8');
const notifications=readFileSync(new URL('../supabase/functions/boek-api/notifications.js',import.meta.url),'utf8');

test('Commissioner auto-pick is available only in Draft controls while live',()=>{
  const panel=client.slice(client.indexOf("panelHeading('Draft controls')"),client.indexOf("}else if(adminSection==='programs')"));
  assert.match(panel,/data-act="admin-auto-pick"/);
  assert.match(panel,/settings\.draft_status!=='live'/);
  assert.match(panel,/on-clock manager/);
  assert.match(panel,/saved queue/);
});
test('Autopick prioritizes eligible undrafted queued schools, then Torvik ranking',()=>{
  const candidate=server.slice(server.indexOf('async function autoPickChoice'),server.indexOf('const parseDraftQueue=row'));
  assert.match(candidate,/currentPickOwner\(overall,inv\.ids,inv\.owners\)/);
  assert.match(candidate,/eligibleProgram\(s,settings\)/);
  assert.match(candidate,/!used\.has\(String\(s\.id\)\)/);
  assert.match(candidate,/parseDraftQueue\(queue\)\.items/);
  assert.ok(candidate.indexOf('parseDraftQueue(queue).items')<candidate.indexOf('cbb_preliminary_rankings'));
  assert.match(candidate,/ORDER BY rank,program_id/);
});
test('Autopick uses preview and stale pick protection inside a transaction',()=>{
  const action=client.slice(client.indexOf("}else if(act==='admin-auto-pick'){"),client.indexOf("}else if(act==='start'){"));
  assert.ok(action.indexOf("preview:true")<action.indexOf("window.confirm("));
  assert.ok(action.indexOf("window.confirm(")<action.indexOf("expected_overall:"));
  const endpoint=server.slice(server.indexOf("if(path==='admin/draft/auto-pick'){"),server.indexOf("if(path==='admin/clock'){"));
  assert.match(endpoint,/if\(data\.preview===true\)/);
  assert.match(endpoint,/env\.DB\.transaction/);
  assert.match(endpoint,/FOR UPDATE/);
  assert.match(endpoint,/selection\.overall!==expectedOverall/);
  assert.match(endpoint,/selection\.manager_id!==expectedManager/);
  assert.match(endpoint,/selection\.program_id!==expectedProgram/);
  assert.ok(endpoint.indexOf('expectedProgram')<endpoint.indexOf('INSERT INTO picks'));
  assert.match(endpoint,/draft_deadline/);
  assert.match(endpoint,/draft_pick_trade_items/);
  const gate=server.indexOf("if(user.role!=='commissioner')return failure('Commissioner access required.',403)");
  assert.ok(gate>=0&&gate<server.indexOf("if(path==='admin/draft/auto-pick'){"));
});
test('Notifications use the auto-pick route and do not fire for previews',()=>{
  assert.match(index,/admin\/draft\/auto-pick/);
  assert.match(index,/!autoPickPreview/);
  assert.match(notifications,/path==='draft\/pick'\|\|path==='admin\/draft\/auto-pick'/);
});
