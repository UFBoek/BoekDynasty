import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../supabase/functions/boek-api/results.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export const DATA_PIPELINE=','const DATA_PIPELINE=');
const teams=[
  ['2250','Gonzaga Bulldogs','GONZ','21'],
  ['pac','Pac-12 school','PAC','21'],
  ['mid','Mid-major school','MID','3'],
  ['power','Power school','PWR','23'],
  ['auto','Automatic qualifier','AUT','21']
];
const pipeline=new Function('PROGRAM_DIRECTORY','NET_NAME_CROSSWALK','HISTORICAL_CONFERENCE_CHAMPIONS',
  'getTorvikRatings','mapTorvikToProgramRanks',source+'\nreturn DATA_PIPELINE;')
  (teams,[],{seasons:[]},()=>{},()=>{});

const season='2024-25';
const fixture=()=>({
  awards:[
    ...teams.map(([program_id])=>({season,program_id,award_type:'ncaa_seed',value:9})),
    ...Array.from({length:30},(_,i)=>({season,program_id:'placeholder'+i,award_type:'conference_tournament_champion',value:1})),
    {season,program_id:'auto',award_type:'conference_tournament_champion',value:1}
  ],
  games:teams.map(([program_id])=>({season,program_id,kind:'ncaa',wins:1,q1:0,q1a:0,q2:0,upset_seed_lines:7,upset_wins:1}))
});
const mock=({awards,games})=>({DB:{prepare(sql){return {bind(){return {all:async()=>({results:
  sql.includes('FROM classified GROUP BY')?games:
  sql.includes('FROM cbb_awards WHERE')?awards:
  sql.includes('SELECT COUNT(*) AS n FROM cbb_preliminary_rankings')?[{n:0}]:[]})};}}}}});

test('Pac-12 and mid-major schools earn both bonuses, Gonzaga earns neither',async()=>{
  const scored=await pipeline.historicalLeaders(mock(fixture()),{
    ncaa_seed_9_12:5,ncaa_tournament_win:3,ncaa_at_large_bid:5,ncaa_upset_per_seed:1
  },'2026-27');
  const school=id=>scored.rows.find(r=>r.program_id===id && r.season===season);
  assert.equal(school('pac').points,20); // 5 seed + 3 win + 5 at-large + 7 upset
  assert.equal(school('mid').points,20);
  assert.equal(school('2250').points,8); // Gonzaga: only seed + win
  assert.equal(school('power').points,8);
  assert.equal(school('auto').points,15); // automatic qualifier: no at-large + 7 upset
  assert.equal(school('2250').at_large_bid,false);
  assert.equal(school('2250').upset_seed_lines,0);
  assert.equal(school('pac').at_large_bid,true);
  assert.equal(school('pac').upset_seed_lines,7);
});
