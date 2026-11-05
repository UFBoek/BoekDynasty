import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const startup='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
const testHook=[
 '  return {',
 '  set:(user,state)=>{me=user;league=state;},',
 '  page:page=>{current=page;render();return root.innerHTML;},',
 '  race:()=>raceState,',
 '  playback:()=>startDraftRacePlayback(false)',
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
const race={id:'race-123',order:['1','2','4','3'],lanes:['1','2','3','4'],
  started_at:Math.floor(Date.now()/1000),duration_ms:9400,stagger_ms:460};
const league={users,programs:[],picks:[],ownership:[],trades:[],trade_items:[],archives:[],season_records:[],
  waiver_claims:[],roster_transactions:[],draft_order:users.map(u=>u.id),season:'2026-27',
  settings:{draft_status:'pending',rounds:16,league_name:'Boek Dynasty',max_managers:8,
    conferences:['23'],scoring:{best_programs:8},draft_race:null}};
app.set(users[0],league);

test('More links to official race and commissioner alone has start control',()=>{
  assert.match(app.page('more'),/data-id="draft-order"/);
  const page=app.page('draft-order');
  assert.match(page,/DRAFT ORDER REVEAL/);
  assert.match(page,/data-act="race-start"/);
  assert.match(page,/Run race/);
  assert.doesNotMatch(page,/Run fair race|Watch scripted showcase|equal chance|Chance of 1st/);
  assert.equal((page.match(/class="race-runner"/g)||[]).length,4);
  app.set(users[1],league);
  const manager=app.page('draft-order');
  assert.doesNotMatch(manager,/data-act="race-start"/);
  assert.match(manager,/Waiting for the commissioner/);
  app.set(users[0],league);
});

test('stored race determines official finish and replay is for every manager',()=>{
  league.settings.draft_race=race;
  league.draft_order=race.order;
  app.set(users[1],league);
  const page=app.page('draft-order');
  assert.match(page,/OFFICIAL RESULTS/);
  assert.match(page,/Replay race/);
  assert.doesNotMatch(page,/data-act="race-start"/);
  const positions=[...page.matchAll(/race-result-rank">(\d)<\/span>[\s\S]*?race-result-name">([^<]+)/g)]
    .map(m=>m[2]).slice(0,4);
  assert.deepEqual(positions,['Boek','Winston','Leyton','Hayden']);
  assert.match(page,/commissioner-set draft order/);
});

test('replay uses the stored timeline and can be started by managers',()=>{
  const oldWindow=globalThis.window,oldCancel=globalThis.cancelAnimationFrame;
  const oldRequest=globalThis.requestAnimationFrame,oldPerformance=globalThis.performance;
  try{
    globalThis.cancelAnimationFrame=()=>{};
    globalThis.requestAnimationFrame=()=>1;
    globalThis.performance={now:()=>1000};
    app.playback();
    assert.equal(app.race().phase,'playing');
    assert.deepEqual(app.race().order,race.order);
    assert.match(root.innerHTML,/Restart replay/);
  }finally{
    globalThis.window=oldWindow;
    globalThis.cancelAnimationFrame=oldCancel;
    globalThis.requestAnimationFrame=oldRequest;
    globalThis.performance=oldPerformance;
  }
  app.set(users[0],league);
});