import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/client.js', import.meta.url),'utf8');
const startup='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
const testHook=[
 '  return {',
 '  set:(user,state)=>{me=user;league=state;},',
 '  page:page=>{current=page;render();return root.innerHTML;},',
 '  fair:()=>fairRaceOrder(),',
 '  start:mode=>startDraftRace(mode),',
 '  race:()=>raceState',
 '};',
 '})();'
].join('\n');
const compiled=source.replace(startup,testHook);
assert.notEqual(compiled,source,'Startup hook must match');
const root={innerHTML:'',addEventListener(){},querySelector(){return null;}};
const documentStub={querySelector:x=>x==='#app'?root:null,querySelectorAll:()=>[],activeElement:null};
const app=new Function('document','location','URLSearchParams','return '+compiled)(
  documentStub,{search:''},URLSearchParams);
const users=['Boek','Winston','Hayden','Leyton'].map((display_name,i)=>({
  id:String(i+1),display_name,username:display_name.toLowerCase(),role:i===0?'commissioner':'manager'
}));
const league={users,programs:[],picks:[],ownership:[],trades:[],trade_items:[],archives:[],season_records:[],
  waiver_claims:[],roster_transactions:[],draft_order:users.map(u=>u.id),season:'2026-27',
  settings:{draft_status:'pending',rounds:16,league_name:'Boek Dynasty',max_managers:8,
    conferences:['23'],scoring:{best_programs:8}}};
app.set(users[0],league);

test('More links to a dedicated horse-race Draft Order page',()=>{
  assert.match(app.page('more'),/data-id="draft-order"/);
  const page=app.page('draft-order');
  assert.match(page,/Draft lottery horse race/);
  assert.match(page,/Run fair race/);
  assert.match(page,/Watch scripted showcase/);
  assert.match(page,/25\.0%/);
  assert.match(page,/Current official draft order/);
  assert.equal((page.match(/class="race-runner"/g)||[]).length,4);
});

test('each fair draw is a shuffle of exactly the registered managers',()=>{
  const expected=users.map(u=>u.id).sort();
  const firstPicks=new Set();
  for(let sample=0;sample<100;sample++){
    const draw=app.fair();
    assert.deepEqual(draw.slice().sort(),expected);
    firstPicks.add(draw[0]);
  }
  assert.ok(firstPicks.size>1,'draw should not always select the same owner');
});

test('the fixed Boek/Winston showcase is separate from the real draw',()=>{
  const oldWindow=globalThis.window;
  const oldCancel=globalThis.cancelAnimationFrame;
  const oldRequest=globalThis.requestAnimationFrame;
  try{
    globalThis.window={matchMedia:()=>({matches:true})};
    globalThis.cancelAnimationFrame=()=>{};
    globalThis.requestAnimationFrame=()=>1;
    app.page('draft-order');
    app.start('showcase');
    assert.equal(app.race().mode,'showcase');
    assert.deepEqual(app.race().order.slice(0,2),['1','2']);
    assert.match(root.innerHTML,/Watch scripted showcase/);
    assert.doesNotMatch(root.innerHTML,/Publish official draft order/);
  }finally{
    globalThis.window=oldWindow;
    globalThis.cancelAnimationFrame=oldCancel;
    globalThis.requestAnimationFrame=oldRequest;
  }
});