import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../src/results.js',import.meta.url),'utf8');
const programs=[['57','Florida Gators','FLA','23'],['150','Duke Blue Devils','DUKE','2']];
const pipeline=new Function('PROGRAM_DIRECTORY',source+'\nreturn DATA_PIPELINE;')(programs);

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

test('unknown ESPN team IDs and missing home/away are rejected',()=>{
  const unknown=structuredClone(game);
  unknown.competitions[0].competitors.forEach(p=>{p.team.id='99999'+p.team.id;});
  assert.equal(pipeline.parseEvent(unknown,'2026-11-03','2026-27'),null);
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
