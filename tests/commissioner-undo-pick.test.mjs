import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../supabase/functions/boek-api/index.ts',import.meta.url),'utf8');

test('Undo is displayed in commissioner Draft controls with the latest pick details',()=>{
  const panel=client.slice(client.indexOf("panelHeading('Draft controls')"),client.indexOf("}else if(adminSection==='programs')"));
  assert.match(panel,/data-act="admin-undo-pick"/);
  assert.match(panel,/lastPick\.overall/);
  assert.match(panel,/lastSchool\?\.name/);
  assert.match(panel,/lastManager\?\.display_name/);
  assert.match(client,/const canUndo=!!lastPick&&\['live','paused','finished'\]/);
});

test('Undo requires explicit preview and confirmation before POST',()=>{
  const action=client.slice(client.indexOf("}else if(act==='admin-undo-pick'){"),client.indexOf("}else if(act==='admin-auto-pick'){"));
  assert.ok(action.indexOf("preview:true")<action.indexOf('window.confirm('));
  assert.ok(action.indexOf('window.confirm(')<action.indexOf('expected_pick_id:'));
  assert.match(action,/expected_overall:selected\.overall/);
  assert.match(action,/expected_program_id:selected\.program_id/);
  assert.match(action,/expected_manager_id:selected\.manager_id/);
});

test('Commissioner authorization and exact-last-selection check precede deletion',()=>{
  const gate=server.indexOf("if(user.role!=='commissioner')return failure('Commissioner access required.',403)");
  const action=server.slice(server.indexOf("if(path==='admin/draft/undo-pick'){"),server.indexOf("if(path==='admin/draft/auto-pick'){"));
  assert.ok(gate>=0&&gate<server.indexOf("if(path==='admin/draft/undo-pick'){"));
  assert.match(action,/data\.preview===true/);
  assert.match(action,/env\.DB\.transaction/);
  assert.match(action,/FOR UPDATE/);
  assert.match(action,/last\.overall\)!==overall/);
  assert.match(action,/last\.id\)!==pickId/);
  assert.match(action,/last\.program_id\)!==programId/);
  assert.match(action,/last\.manager_id\)!==managerId/);
  assert.match(action,/picked!==overall/);
  assert.ok(action.indexOf('picked!==overall')<action.indexOf('DELETE FROM picks'));
});

test('Ownership, trade safety, clock and finished-state transitions are consistent',()=>{
  const action=server.slice(server.indexOf("if(path==='admin/draft/undo-pick'){"),server.indexOf("if(path==='admin/draft/auto-pick'){"));
  assert.match(action,/owned\?\.manager_id!==managerId/);
  assert.match(action,/trade_items ti JOIN trades/);
  assert.match(action,/DELETE FROM program_owners WHERE program_id=\? AND manager_id=\?/);
  assert.match(action,/DELETE FROM picks WHERE id=\? AND overall=\? AND manager_id=\? AND program_id=\?/);
  assert.match(action,/removedOwner\.meta\?\.changes/);
  assert.match(action,/removedPick\.meta\?\.changes/);
  assert.match(action,/settings\.draft_status==='finished'/);
  assert.match(action,/SET value='live' WHERE key='draft_status'/);
  assert.match(action,/settings\.draft_status==='paused'/);
  assert.match(action,/draft_deadline/);
});

test('Undo preview is excluded from commissioner activity audit',()=>{
  assert.match(index,/admin\/draft\/undo-pick/);
  assert.match(index,/undoPickPreview/);
  assert.match(index,/!undoPickPreview/);
});
