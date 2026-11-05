import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// Test the production Supabase scoring engine, not the older D1 compatibility source.
const source=readFileSync(new URL('../supabase/functions/boek-api/results.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export const DATA_PIPELINE=','const DATA_PIPELINE=');
const directory=[
  ['mid','Test Mid Major','MID','3'],
  ['pac','Test Pac-12','PAC','21'],
  ['power','Test Major','PWR','23'],
  ['other','Test Other','OTH','1']
];
const pipeline=new Function('PROGRAM_DIRECTORY','NET_NAME_CROSSWALK','HISTORICAL_CONFERENCE_CHAMPIONS',
  'getTorvikRatings','mapTorvikToProgramRanks',source+'\nreturn DATA_PIPELINE;')
  (directory,[],{seasons:[]},()=>{},()=>{});

const season='2024-25';
const pointsBySchool=[
  {program_id:'mid',upset_seed_lines:7,upset_wins:1},
  {program_id:'pac',upset_seed_lines:13,upset_wins:2},
  {program_id:'power',upset_seed_lines:7,upset_wins:1},
  {program_id:'other',upset_seed_lines:8,upset_wins:1}
].map(x=>({season,kind:'ncaa',wins:1,q1:0,q1a:0,q2:0,...x}));
const env={DB:{prepare(sql){
  return {bind(){return {all:async()=>({results:
    sql.includes('FROM classified GROUP BY')?pointsBySchool:
    sql.includes('SELECT COUNT(*) AS n FROM cbb_preliminary_rankings')?[{n:0}]:
    []})};}};
}}};

test('uncapped seed-line upset points apply to all eligible non-power programs except Gonzaga',async()=>{
  const r=await pipeline.historicalLeaders(env,{ncaa_tournament_win:3,ncaa_upset_per_seed:1},'2026-27');
  const find=id=>r.rows.find(x=>x.program_id===id&&x.season===season);
  assert.equal(find('mid').points,10); // 3 NCAA win + (12 seed beating a 5 seed) 7
  assert.equal(find('pac').points,16); // 3 NCAA win + 13 seed lines, uncapped
  assert.equal(find('power').points,3);
  assert.equal(find('other').points,11);
  assert.equal(find('mid').breakdown.find(x=>x.key==='ncaa_upset_per_seed').points,7);
  assert.equal(find('pac').upset_wins,2);
});

test('the production SQL awards only genuine NCAA upsets with both seeds present',()=>{
  assert.match(source,/kind IN \('ncaa','first_four'\) AND winner_seed>loser_seed/);
  assert.match(source,/loser_seed\.award_type='ncaa_seed'/);
  assert.match(source,/POWER_CONFERENCES=new Set\(\['2','4','7','8','23'\]\)/);
  assert.match(source,/INELIGIBLE_BONUS_PROGRAMS=new Set\(\['2250'\]\)/);
});
