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
    ['a','a','c','c','b','c','c','b','a']);
  assert.deepEqual(app.future('a'),[1,2,9]);
  assert.deepEqual(app.future('b'),[5,8]);
  assert.deepEqual(app.future('c'),[3,4,6,7]);
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
  assert.doesNotMatch(board,/YOUR DRAFT CAPITAL/);
  assert.match(board,/draft-live-hero my-turn/);
  assert.match(board,/data-act="draft-jump-pool">Draft/);
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
  app.set(members[1],league); // The recipient receives the in-draft offer alert.
  const inDraft=app.draft();
  assert.match(inDraft,/draft-trade-inbox/);
  assert.match(inDraft,/data-act="trade-accept" data-id="trade-1"/);
  assert.match(inDraft,/data-act="trade-decline" data-id="trade-1"/);
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

test('third-round reversal matches the server-authoritative selection order across 20 rounds',()=>{
  const backend=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
  const legacy=readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  const clause=backend.match(/  const reversedDraftRound=round=>[^;]+;/);
  const helper=backend.match(/  const originalPickOwner=\(slot,ids\)=>\{[\s\S]*?\n  \};/);
  assert.ok(clause&&helper,'Server-side draft owner rules must remain extractable for parity testing');
  const serverOwner=new Function('slot','ids',clause[0]+'\n'+helper[0]+'\nreturn originalPickOwner(slot,ids);');
  assert.match(legacy,/reversedDraftRound\(roundIndex\+1\)/);
  const ids=members.map(x=>x.id);
    const prior=league.draft_pick_owners;
  const priorRounds=league.settings.rounds;
  league.draft_pick_owners=[];league.settings.rounds=20;
  try{
    for(let round=1;round<=20;round++){
      const expected=(round===1||(round>=4&&round%2===0))
        ?['a','b','c']:['c','b','a'];
      for(let i=0;i<ids.length;i++){
        const pick=(round-1)*ids.length+i+1;
        assert.equal(serverOwner(pick,ids),app.owner(pick),'Backend/frontend disagree at pick #'+pick);
        assert.equal(app.owner(pick),expected[i],'3RR order mismatch at round '+round+' position '+i);
      }
    }
    assert.deepEqual(app.future('c').slice(0,4),[3,4,7,12]);
  }finally{
    league.settings.rounds=priorRounds;league.draft_pick_owners=prior;
  }
});
