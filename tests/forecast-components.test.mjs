import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const start=client.indexOf('  function fpScheduleModel(');
const end=client.indexOf('\n  function fpIndex(){',start);
assert.ok(start>=0&&end>start,'Expected component forecast engine in the main client');
const model=new Function(client.slice(start,end)+'\nreturn fpScheduleModel;')();
const teams=[
  {id:'235',name:'Memphis',conference_id:'62'},
  {id:'2724',name:'Wichita',conference_id:'62'},
  {id:'58',name:'South Florida',conference_id:'62'},
  {id:'202',name:'Tulsa',conference_id:'62'},
  {id:'151',name:'East Carolina',conference_id:'62'},
  {id:'242',name:'Rice',conference_id:'62'},
  {id:'97',name:'Louisville',conference_id:'2'}
];
const ranks={235:78,2724:77,58:98,202:113,151:170,242:220,97:19};
const rules={regular_win:1,quad_1a_win:2,quad_1_win:1,quad_2_win:.5,
  conference_regular_title:8,conference_tournament_title:8,
  conference_regular_title_mid_major:6,conference_tournament_title_mid_major:6,
  conference_tournament_win:2,ncaa_at_large_bid:3,
  ncaa_tournament_win:4,ncaa_upset_per_seed:1,ncaa_opening_round_win:2,
  national_championship:15,secondary_postseason_win:1,
  ...Object.fromEntries(Array.from({length:16},(_,i)=>['ncaa_seed_'+(i+1),Math.max(5,16-i)]))
};
const final=['97','235',1,76,80,0,'2026-11-02',0];
const games=[
  final,
  ['235','2724',0,null,null,0,'2027-01-15',0],
  ['2724','235',0,null,null,0,'2027-02-15',0],
  ['235','58',0,null,null,0,'2027-01-20',0],
  ['235','151',0,null,null,0,'2027-02-22',0],
  ['202','235',0,null,null,0,'2027-03-01',0],
  ['242','235',0,null,null,0,'2027-03-03',0],
  ['58','2724',0,null,null,0,'2027-02-01',0],
  ['2724','151',0,null,null,0,'2027-02-05',0]
];
const run=({earned=6.5,gameRows=games,awardRows=[],rulebook=rules,ratings=ranks}={})=>
  model(teams,ratings,{season:'2026-27',games:gameRows,awards:awardRows},
    {program_points:{235:earned},program_records:{235:{wins:1,losses:0}}},rulebook).get('235');

test('every forecast has a component ledger and respects verified earned points',()=>{
  const t=run();
  assert.ok(t.points>t.earned);
  assert.ok(t.components.regularWins>0);
  assert.ok(t.components.conferenceTournamentWins>0);
  assert.ok(t.components.ncaaSeeding>0);
  assert.ok(t.probability.regularTitle>=0&&t.probability.regularTitle<=100);
  assert.ok(t.probability.tournamentTitle>=0&&t.probability.tournamentTitle<=100);
  assert.equal(t.remaining,6);
});

test('more earned points add exactly without reprojecting already-final games',()=>{
  const a=run({earned:6.5}),b=run({earned:9});
  assert.equal(b.points-a.points,2.5);
  assert.equal(a.components.regularWins,b.components.regularWins);
});

test('both conference championship bonuses independently contribute',()=>{
  const a=run();
  const b=run({rulebook:{...rules,conference_regular_title_mid_major:0}});
  const c=run({rulebook:{...rules,conference_tournament_title_mid_major:0}});
  assert.ok(a.points>b.points);
  assert.ok(a.points>c.points);
  assert.ok(a.components.conferenceRegularTitle>0);
  assert.ok(a.components.conferenceTournamentTitle>0);
});

test('award confirmation never counts conference titles or NCAA seed twice',()=>{
  const t=run({awardRows:[
    ['235','conference_regular_champion',1],
    ['235','conference_tournament_champion',1],
    ['235','ncaa_seed',11]
  ],earned:30});
  assert.equal(t.components.conferenceRegularTitle,0);
  assert.equal(t.components.conferenceTournamentTitle,0);
  assert.equal(t.components.ncaaSeeding,0);
});

test('after an NCAA elimination future NCAA tournament wins are zero',()=>{
  const t=run({
    gameRows:[...games,['235','97',1,63,70,1,'2027-03-20',2]],
    awardRows:[['235','ncaa_seed',10]]
  });
  assert.equal(t.components.ncaaWins,0);
  assert.equal(t.components.ncaaQuads,0);
  assert.equal(t.components.ncaaUpsets,0);
});

test('future conference games are inferred by conference membership, not the ESPN flag',()=>{
  const t=run();
  assert.ok(t.probability.regularTitle>0);
  assert.ok(t.probability.tournamentTitle>0);
});
