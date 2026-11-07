import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../src/results.js',import.meta.url),'utf8');
const crosswalk=JSON.parse(readFileSync(new URL('../data/net-name-crosswalk-2027.json',import.meta.url),'utf8')).teams;
const programs=crosswalk.map(x=>[x[0],x[2],x[3],'23']);
const historicalConferences=JSON.parse(readFileSync(new URL('../data/historical-conference-2022-2026.json',import.meta.url),'utf8'));
const pipeline=new Function('PROGRAM_DIRECTORY','NET_NAME_CROSSWALK','HISTORICAL_CONFERENCE_CHAMPIONS',source+'\nreturn DATA_PIPELINE;')(programs,crosswalk,historicalConferences);

const game={
  id:'401234567',date:'2026-11-04T00:30:00Z',name:'Florida Gators at Duke Blue Devils',
  season:{type:2},status:{type:{name:'STATUS_FINAL',state:'post',completed:true,shortDetail:'Final'}},
  competitions:[{neutralSite:false,conferenceCompetition:false,competitors:[
    {homeAway:'home',team:{id:'150',displayName:'Duke Blue Devils'},score:'74'},
    {homeAway:'away',team:{id:'57',displayName:'Florida Gators'},score:'78'}
  ]}]
};

test('ESPN ID matching and Eastern date conversion',()=>{
  const output=pipeline.parseEvent(game,'2026-11-03','2026-27');
  assert.equal(output.row[0],game.id);
  assert.equal(output.row[2],'2026-11-03');
  assert.equal(output.row[8],74);
  assert.equal(output.row[9],78);
  assert.equal(output.row[10],'final');
  assert.equal(output.row[12],0);
  assert.ok(output.hash);
});

test('final games without scores do not become wins or losses',()=>{
  const missing=structuredClone(game);
  missing.competitions[0].competitors[0].score='';
  assert.equal(pipeline.parseEvent(missing,'2026-11-03','2026-27'),null);
});

test('unrecognized ESPN opponents are retained for full game coverage',()=>{
  const unknown=structuredClone(game);
  unknown.competitions[0].competitors.forEach(p=>{p.team.id='99999'+p.team.id;});
  assert.equal(pipeline.parseEvent(unknown,'2026-11-03','2026-27')?.row[0],game.id);
});

test('updated scores alter the content hash for idempotent storage',()=>{
  const changed=structuredClone(game);
  changed.competitions[0].competitors[1].score='80';
  assert.notEqual(pipeline.parseEvent(game,'2026-11-03','2026-27').hash,pipeline.parseEvent(changed,'2026-11-03','2026-27').hash);
});

test('quadrant home/neutral/away thresholds',()=>{
  assert.deepEqual([pipeline.quadrant(30,'home'),pipeline.quadrant(31,'home'),pipeline.quadrant(50,'neutral'),pipeline.quadrant(75,'away'),pipeline.quadrant(76,'away')],[1,2,1,1,2]);
  assert.equal(pipeline.isQ1A(15,'home'),true);
  assert.equal(pipeline.isQ1A(16,'home'),false);
  assert.equal(pipeline.isQ1A(25,'neutral'),true);
  assert.equal(pipeline.isQ1A(40,'away'),true);
});

test('historical seasons and date boundaries do not mix',()=>{
  assert.equal(pipeline.seasonOf('2026-11-03'),'2026-27');
  assert.equal(pipeline.seasonOf('2027-03-15'),'2026-27');
  assert.equal(pipeline.dayInSeason('2026-27','2027-11-03'),false);
  assert.equal(pipeline.shiftDay('2027-01-01',-1),'2026-12-31');
});

test('ESPN schedule query requests all Division I games',()=>{
  const url=pipeline.scoreboardUrls('2026-11-03')[0];
  assert.match(url,/groups=50/);
  assert.match(url,/limit=500/);
  assert.match(url,/dates=20261103/);
});

test('separate ESPN postseason groups include NCAA, CBI and CIT',()=>{
  assert.deepEqual(pipeline.groupsForDay('2026-11-03'),[50]);
  assert.deepEqual(pipeline.groupsForDay('2027-03-20'),[50,100]);
  assert.deepEqual(pipeline.groupsForDay('2027-03-20',true),[50,100,55,56]);
});

test('NCAA tournament tag is determined from NCAA group 100',()=>{
  const event=structuredClone(game);
  event.__sourceGroup=100;
  assert.equal(pipeline.parseEvent(event,'2026-11-03','2026-27').row[16],'ncaa');
});

test('NCAA NET crosswalk maps all 365 verified ESPN short school names',()=>{
  const rows=crosswalk.map((school,i)=>({SCHOOL:school[1],RANK:String(i+1)}));
  const mapped=pipeline.parseNCAANet({data:rows},'2026-27');
  assert.equal(mapped.length,365);
  assert.equal(new Set(mapped.map(r=>r.program_id)).size,365);
});

test('NCAA NET refuses stale season and unmatched school names',()=>{
  const rows=crosswalk.map((school,i)=>({SCHOOL:school[1],RANK:i+1}));
  assert.throws(()=>pipeline.parseNCAANet({data:rows,updated:'2025-03-01'},'2026-27'),/previous season/);
  rows[12].SCHOOL='Completely Unknown College';
  assert.throws(()=>pipeline.parseNCAANet({data:rows},'2026-27'),/crosswalk incomplete/);
});

test('ESPN group feed never treats failed required postseason group as complete',async()=>{
  const day='2027-03-20';
  const fixture=structuredClone(game);
  fixture.date='2027-03-20T17:30:00Z';
  const fn=async url=>({
    ok:!url.includes('groups=100'),
    status:503,
    json:async()=>({events:[fixture]})
  });
  await assert.rejects(pipeline.fetchScoreboard(day,fn),/group 100 failed/);
});

test('historical NET parser validates complete season-specific school rankings',()=>{
  const html='<h1>NET Rankings</h1><table>'+
    crosswalk.map((school,i)=>'<tr><td><a href="/team">'+school[1]+'</a></td><td>22-10</td><td>'+(i+1)+'</td><td>0</td></tr>').join('')+
    '</table>';
  const parsed=pipeline.parseArchivedNet(html,'2025-26');
  assert.equal(parsed.records.length,365);
  assert.equal(parsed.unmatched.length,0);
  assert.throws(()=>pipeline.parseArchivedNet('<h1>NET Rankings</h1><table><tr><td>Duke</td><td>20-12</td><td>1</td></tr></table>','2025-26'),/only 1 teams/);
});

test('historical backfill advances all five seasons rather than starving older years',async()=>{
  const mockFetch=async()=>({ok:true,json:async()=>({events:[]})});
  const mock=new Function('PROGRAM_DIRECTORY','NET_NAME_CROSSWALK','fetch',source+'\nreturn DATA_PIPELINE;')
    (programs,crosswalk,mockFetch);
  const env={DB:{
    prepare(sql){return {bind(){return {
      all:async()=>({results:[]}),
      first:async()=>({n:0}),
      run:async()=>({meta:{changes:1}})
    };}}},
    batch:async statements=>statements.map(()=>({meta:{changes:1}}))
  }};
  const outcome=await mock.backfillHistory(env,5);
  assert.deepEqual(outcome.results.map(row=>row.season),['2025-26','2024-25','2023-24','2022-23','2021-22']);
  assert.ok(outcome.results.every(row=>row.ok));
});

test('quadrant locations use actual winner venue, not home label at neutral sites',()=>{
  assert.equal(pipeline.venueFor(1,true),'neutral');
  assert.equal(pipeline.venueFor(1,false),'neutral');
  assert.equal(pipeline.venueFor(0,true),'home');
  assert.equal(pipeline.venueFor(0,false),'away');
  assert.equal(pipeline.quadrant(40,pipeline.venueFor(0,true)),2);
  assert.equal(pipeline.quadrant(40,pipeline.venueFor(0,false)),1);
  assert.equal(pipeline.quadrant(40,pipeline.venueFor(1,true)),1);
  assert.equal(pipeline.isQ1A(40,pipeline.venueFor(0,false)),true);
  assert.equal(pipeline.isQ1A(40,pipeline.venueFor(0,true)),false);
});

test('historical points stack seeds, conference titles, NCAA wins and First Four separately',async()=>{
  const team='57',season='2024-25';
  const games=[
    {season,game_date:'2025-01-15',home_id:'57',away_id:'150',home_score:75,away_score:70,status:'final',season_type:2,tournament_tag:null,neutral_site:0},
    {season,game_date:'2025-02-15',home_id:'248',away_id:'57',home_score:75,away_score:78,status:'final',season_type:2,tournament_tag:null,neutral_site:0},
    {season,game_date:'2025-02-27',home_id:'57',away_id:'130',home_score:78,away_score:70,status:'final',season_type:2,tournament_tag:null,neutral_site:1},
    {season,game_date:'2025-03-20',home_id:'57',away_id:'150',home_score:81,away_score:68,status:'final',season_type:3,tournament_tag:'ncaa',neutral_site:1}
  ];
  const awards=['conference_regular_champion','conference_tournament_champion','national_champion'].map(award_type=>({season,award_type,value:1})).concat([{season,award_type:'ncaa_seed',value:11}]);
  const net=Array.from({length:350},(_,i)=>({season,program_id:String(1000+i),net_rank:i+1}));
  net[0].program_id='150';net[0].net_rank=20;
  net[1].program_id='248';net[1].net_rank=40;
  net[2].program_id='130';net[2].net_rank=30;
  const env={DB:{prepare(sql){return {bind(){return {all:async()=>({results:
    sql.includes('FROM cbb_games WHERE')?games:
    sql.includes('FROM cbb_ncaa_results WHERE')?[{season,opening_round:1},{season,opening_round:0},{season,opening_round:0}]:
    sql.includes('FROM cbb_awards WHERE')?awards:
    sql.includes('FROM cbb_net_rankings r JOIN')?net:[]})};}}}}};
  const scoring={regular_win:1,quad_1_win:1.5,quad_1a_extra:1,quad_2_win:0.5,
    conference_regular_title:8,conference_tournament_title:8,ncaa_seed_9_12:5,
    ncaa_tournament_win:3,ncaa_opening_round_win:2,national_championship:15};
  const report=await pipeline.programHistory(env,team,scoring,'2026-27');
  const year=report.seasons.find(x=>x.season===season);
  assert.equal(year.regular_wins,3);
  assert.equal(year.q1,3);
  assert.equal(year.q1a,1);
  assert.equal(year.q2,0);
  assert.equal(year.ncaa_wins,2);
  assert.equal(year.opening_round_wins,1);
  assert.equal(year.points,52.5);
  assert.equal(year.status,'partial');
});

test('verified conference champions score immediately while D1 archival writes are quota-blocked',async()=>{
  const entry=historicalConferences.seasons.find(x=>x.season==='2025-26');
  const winner=entry.winners[0];
  const env={DB:{prepare(){return {bind(){return {all:async()=>({results:[]})};}}}}};
  const profile=await pipeline.programHistory(env,winner.id,{conference_regular_title:8},'2026-27');
  const season=profile.seasons.find(x=>x.season==='2025-26');
  assert.equal(season.points,8);
  assert.equal(season.status,'partial');
  const leaders=await pipeline.historicalLeaders(env,{conference_regular_title:8},'2026-27');
  assert.equal(leaders.rows.find(x=>x.season==='2025-26'&&x.program_id===winner.id)?.points,8);
});

test('ESPN individual game summary recovers a missed final with verified event ID',async()=>{
  const fixture=structuredClone(game);
  const competition={...fixture.competitions[0],date:fixture.date,status:fixture.status};
  const summary={header:{id:fixture.id,competitions:[competition],season:{type:2}}};
  const fetchFn=async()=>({ok:true,json:async()=>summary});
  const recovered=await pipeline.fetchGameSummary(fixture.id,fetchFn);
  assert.equal(pipeline.parseEvent(recovered,'2026-11-03','2026-27').row[10],'final');
  assert.equal(recovered.id,fixture.id);
});
test('ESPN individual game summary rejects mismatched or unverified events',async()=>{
  const competition={...game.competitions[0],status:game.status};
  await assert.rejects(pipeline.fetchGameSummary(game.id,async()=>({ok:true,json:async()=>({
    header:{id:'401999999',competitions:[competition]}
  })})),/different event ID/);
});
