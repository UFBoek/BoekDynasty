import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../src/results.js',import.meta.url),'utf8');
const crosswalk=JSON.parse(readFileSync(new URL('../data/net-name-crosswalk-2027.json',import.meta.url),'utf8')).teams;
const programs=crosswalk.map(x=>[x[0],x[2],x[3],'23']);
const pipeline=new Function('PROGRAM_DIRECTORY','NET_NAME_CROSSWALK',source+'\nreturn DATA_PIPELINE;')(programs,crosswalk);

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
  assert.match(url,/limit=1000/);
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
