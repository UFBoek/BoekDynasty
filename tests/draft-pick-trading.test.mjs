import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

// Exercise the production draft/trade UI's real helper logic, not a second snake implementation.
const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const tail="  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();";
const injected="  return {\n"
 +"    set:(user,data)=>{me=user;league=data;},\n"
 +"    owner:(n)=>draftOwner(n),\n"
 +"    future:id=>futureDraftPicks(id),\n"
 +"    current:()=>nextManager(),\n"
 +"    trades:()=>tradesPage(),\n"
 +"    draft:()=>draftPage()\n"
 +"  };\n})();";
assert.ok(client.includes(tail),'The production client startup marker changed.');
const root={innerHTML:'',addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
const app=new Function('document','location','URLSearchParams','return '+client.replace(tail,injected))(
  {querySelector:s=>s==='#app'?root:null,querySelectorAll:()=>[],activeElement:null},
  {search:''},URLSearchParams
);
const members=[
  {id:'a',display_name:'Alpha',username:'alpha',role:'commissioner'},
  {id:'b',display_name:'Bravo',username:'bravo',role:'manager'},
  {id:'c',display_name:'Charlie',username:'charlie',role:'manager'}
];
const league={
  users:members,programs:[],picks:[],ownership:[],trades:[],trade_items:[],
  draft_pick_owners:[{overall:2,owner_manager_id:'a'},{overall:6,owner_manager_id:'c'}],
  draft_pick_trade_items:[],draft_order:members.map(m=>m.id),
  settings:{rounds:3,draft_order:members.map(m=>m.id),draft_status:'live',
    trading_enabled:true,conferences:[],draft_clock_seconds:0,draft_deadline:0,
    scoring:{best_programs:2},max_managers:3},
  archives:[],archived_rosters:[],season_records:[],waiver_claims:[],roster_transactions:[],
  season:'2026-27'
};
app.set(members[0],league);

test('snake slots remain fixed while traded picks follow their current owners',()=>{
  assert.deepEqual(Array.from({length:9},(_,i)=>app.owner(i+1)),
    ['a','a','c','c','b','c','a','b','c']);
  assert.deepEqual(app.future('a'),[1,2,7]);
  assert.deepEqual(app.future('b'),[5,8]);
  assert.deepEqual(app.future('c'),[3,4,6,9]);
});

test('traded current pick is selected by the new owner during a live draft',()=>{
  league.picks=[{overall:1,round:1,manager_id:'a',program_id:'1'}];
  app.set(members[0],league);
  const current=app.current();
  assert.equal(current.id,'a');
  assert.equal(league.picks.length+1,2);
  const board=app.draft();
  assert.match(board,/draft-pick-owner-label/);
  assert.match(board,/⇄ Alpha/);
  assert.match(board,/YOUR DRAFT CAPITAL/);
  league.picks=[];
});

test('trade desk supports unused selections on both sides and records transferred picks',()=>{
  const html=app.trades();
  assert.match(html,/Unused draft picks/);
  assert.match(html,/name="trade-give-pick" value="2"/);
  assert.match(html,/name="trade-receive-pick" value="5"/);
  league.trades=[{id:'trade-1',from_manager_id:'a',to_manager_id:'b',status:'pending'}];
  league.draft_pick_trade_items=[{trade_id:'trade-1',overall:2,from_manager_id:'a',to_manager_id:'b'}];
  assert.match(app.trades(),/Pick #2 \(R1\)/);
  assert.match(app.trades(),/Cancel offer/);
});

test('backend serializes pick selection against trade acceptance and validates assets',()=>{
  const backend=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
  const db=readFileSync(new URL('../supabase/functions/boek-api/db.js',import.meta.url),'utf8');
  assert.match(db,/pg\.begin\(async tx=>callback\(createD1\(tx\)\)\)/);
  assert.match(backend,/if\(path==='draft\/pick'\)\{[\s\S]*?env\.DB\.transaction/);
  assert.match(backend,/if\(path==='trade\/respond'\)\{[\s\S]*?env\.DB\.transaction/);
  assert.match(backend,/FOR UPDATE/);
  assert.match(backend,/currentPickOwner\(overall,inv\.ids,inv\.owners\)/);
  assert.match(backend,/draft_pick_trade_items/);
  assert.match(backend,/A pick has been used or changed owners/);
});
