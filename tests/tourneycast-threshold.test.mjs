import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const code=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const engineStart=code.indexOf('  function fpScheduleModel(');
const engineEnd=code.indexOf('\n  function fpIndex(){',engineStart);
const parseStart=code.indexOf('  function parseTourneycastPaste(');
const parseEnd=code.indexOf('  function fpBreakdownHTML(',parseStart);
assert.ok(engineStart>=0&&engineEnd>engineStart&&parseStart>engineStart&&parseEnd>parseStart);
const project=new Function(code.slice(engineStart,engineEnd)+'\nreturn fpScheduleModel;')();
const teams=[
  {id:'45',name:'George Washington Revolutionaries',abbr:'GW',conference_id:'3'},
  {id:'139',name:'Saint Louis Billikens',abbr:'SLU',conference_id:'3'},
  {id:'2670',name:'VCU Rams',abbr:'VCU',conference_id:'3'}
];
const parse=new Function('programs',code.slice(parseStart,parseEnd)+'\nreturn parseTourneycastPaste;')(()=>teams);
const ranks={45:75,139:38,2670:58};
const rules={regular_win:1,quad_1_win:1,quad_1a_win:2,quad_2_win:.5,
  conference_regular_title_mid_major:6,conference_tournament_title_mid_major:6,
  conference_tournament_win:2,ncaa_at_large_bid:3,ncaa_tournament_win:4,
  ncaa_upset_per_seed:1,ncaa_opening_round_win:2,secondary_postseason_win:1,
  national_championship:15,
  ...Object.fromEntries(Array.from({length:16},(_,i)=>['ncaa_seed_'+(i+1),Math.max(5,15-i)]))
};
const games=[
  ['45','139',0,null,null,0,'2027-02-01',0],
  ['139','45',0,null,null,0,'2027-02-04',0],
  ['45','2670',0,null,null,0,'2027-02-06',0]
];
const projectGW=(bid,auto=null,active=true)=>{
  const rows=bid===null?[]:[['45',bid,auto]];
  const forecast=project(teams,ranks,
    {season:'2026-27',games,awards:[],tourneycast:{active,rows,snapshot_date:'2026-11-15'}},
    {program_points:{45:4},program_records:{45:{wins:4,losses:0}}},
    rules);
  return forecast.get('45');
};

test('below threshold uses original published probability',()=>{
  const p=projectGW(.699,.11);
  assert.equal(p.probability.ncaaBid,69.9);
  assert.equal(p.probability.guaranteedByRule,false);
  assert.equal(p.probability.ncaaPublished,69.9);
});

test('exactly 70 percent is a 100 percent assumption',()=>{
  const p=projectGW(.70,.11);
  assert.equal(p.probability.ncaaBid,100);
  assert.equal(p.probability.ncaaPublished,70);
  assert.equal(p.probability.guaranteedByRule,true);
});

test('above threshold guarantees appearance but keeps original sourced percent',()=>{
  const p=projectGW(.75,.25);
  assert.equal(p.probability.ncaaBid,100);
  assert.equal(p.probability.ncaaPublished,75);
  assert.equal(p.probability.tournamentTitle,25);
  assert.equal(p.components.conferenceTournamentTitle,1.5);
});

test('sourced low probability overrides the existing optimistic formula',()=>{
  const p=projectGW(.27,.10);
  assert.equal(p.probability.ncaaBid,27);
  assert.equal(p.probability.source,'Bart Torvik TourneyCast');
});

test('unavailable, stale and absent snapshot do not masquerade as TourneyCast',()=>{
  const missing=projectGW(null),inactive=projectGW(.80,.20,false);
  assert.equal(missing.probability.source,'Model estimate');
  assert.equal(inactive.probability.source,'Model estimate');
  assert.equal(inactive.probability.guaranteedByRule,false);
});

test('CSV importer resolves George Washington and percentages and rejects duplicates',()=>{
  const result=parse('Team,Bid Prob,Auto Prob\nGeorge Washington,69.9%,11%\nSaint Louis,75%,25%\nVCU,50%,30%');
  assert.equal(result.length,3);
  assert.equal(result[0].program_id,'45');
  assert.ok(Math.abs(result[0].bid_prob-.699)<1e-10);
  assert.equal(result[1].bid_prob,.75);
  assert.throws(()=>parse('Team,Bid Prob\nGW,70%\nGeorge Washington,75%'),/Duplicate/);
});

test('no false automatic-bid odds accepted',()=>{
  assert.throws(()=>parse('Team,Bid Prob,Auto Prob\nGeorge Washington,20%,30%\nVCU,50%,20%'),/Automatic bid greater/);
});
