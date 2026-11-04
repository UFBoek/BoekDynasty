import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const marker="  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();";
const injection="  return {setup:(user,state)=>{me=user;league=state;selectedProgramId='57';selectedProgramSeason='2026-27';programProfileTab='overview';},report:result=>{programResultCache['57']=result;},tab:name=>{programProfileTab=name;return programProfilePage();},year:name=>{selectedProgramSeason=name;return programProfilePage();},quadValue:(q,a)=>quadWinBonus(q,a),scoringView:()=>scoringPage()};\n})();";
const compiled=source.replace(marker,injection);
assert.notEqual(compiled,source,'startup hook must be found');
const root={innerHTML:'',addEventListener(){}};
const app=new Function('document','location','URLSearchParams','return '+compiled)(
  {querySelector:query=>query==='#app'?root:null,querySelectorAll:()=>[],activeElement:null},
  {search:''},URLSearchParams
);
const user={id:'1',display_name:'Boek',username:'boek',role:'commissioner'};
const state={
  users:[user],
  programs:[{id:'57',name:'Florida',abbr:'UF',conference_id:'23',logo:null}],
  ownership:[{program_id:'57',manager_id:'1'}],
  picks:[{overall:1,round:1,program_id:'57',manager_id:'1'}],
  season:'2026-27',settings:{rounds:16,scoring:{best_programs:8,quad_1_win:1.5,quad_1a_win:2.5,quad_2_win:0.5}},
  trades:[],trade_items:[],roster_transactions:[],archived_rosters:[]
};
app.setup(user,state);
app.report({
  season:'2026-27',ranking_source:'torvik',net:{net_rank:14},
  record:{played:2,wins:2,losses:0},
  history:{seasons:[
    {season:'2026-27',status:'partial',points:24,rank:7,rank_total:125,
      wins:2,losses:0,games:2,regular_wins:2,q1:1,q2:0,
      breakdown:[{label:'Regular season wins',count:2,rate:5,points:10},
                 {label:'Q1 bonus',count:1,rate:14,points:14}]},
    {season:'2025-26',status:'complete',points:70,rank:3,rank_total:125,
      wins:30,losses:5,games:35,regular_wins:25,q1:10,q2:8,
      breakdown:[{label:'NCAA Tournament wins',count:4,rate:8,points:32}]}
  ]},games:[]
});

test('profile opens with compact summary and does not dump all sections onto the overview',()=>{
  const html=app.tab('overview');
  assert.match(html,/<h1>Florida<\/h1>/);
  assert.match(html,/Dynasty owner/);
  assert.match(html,/2026-27 POINTS/);
  assert.match(html,/PROGRAM RANK/);
  assert.match(html,/#7 \/ 125/);
  assert.match(html,/Full scoring breakdown/);
  assert.match(html,/Recent results/);
  assert.doesNotMatch(html,/program-full-schedule/);
  assert.doesNotMatch(html,/pp-history-list/);
  assert.doesNotMatch(html,/pp-ratings-grid/);
  assert.equal((html.match(/role="tab"/g)||[]).length,4);
});
test('history shows annual rank, record, points, and complete itemized scoring',()=>{
  const html=app.tab('history');
  assert.match(html,/Season history/);
  assert.match(html,/2021-22/);
  assert.match(html,/2025-26/);
  assert.match(html,/#3 \/ 125/);
  assert.match(html,/COMPLETE POINT BREAKDOWN/);
  assert.match(html,/2 × 5 pts/);
  assert.match(html,/data-act="view-historical-rank"/);
  const prior=app.year('2025-26');
  assert.match(prior,/NCAA Tournament wins/);
  assert.match(prior,/70 <small>pts<\/small>/);
});
test('schedule and analytics remain available independently',()=>{
  app.year('2026-27');
  const schedule=app.tab('schedule');
  assert.match(schedule,/program-full-schedule/);
  assert.match(schedule,/program-schedule-tabs/);
  assert.match(schedule,/Refresh schedule/);
  const ratings=app.tab('ratings');
  assert.match(ratings,/Power ratings/);
  assert.match(ratings,/pp-rating-seasons/);
  assert.match(ratings,/data-act="view-ratings"/);
  assert.doesNotMatch(ratings,/program-full-schedule/);
});

test('Q1A is a standalone 2.5-point win, not an extra Q1 bonus',()=>{
  assert.equal(app.quadValue(1,true),2.5);
  assert.equal(app.quadValue(1,false),1.5);
  assert.equal(app.quadValue(2,false),0.5);
  const html=app.scoringView();
  assert.match(html,/Quad 1A win/);
  assert.match(html,/does not stack with Q1/);
  assert.doesNotMatch(html,/Extra Quad 1A win bonus/);
});
