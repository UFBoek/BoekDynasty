import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../supabase/functions/boek-api/results.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export const DATA_PIPELINE=','const DATA_PIPELINE=');
const directory=[
  ['mid','Mid','MID','3'],['auto','Auto bid','AUT','3'],
  ['pac','Pac-12','PAC','21'],['major','Major','MAJ','23'],
  ['other','Other D1','OTH','1']
];
const pipeline=new Function('PROGRAM_DIRECTORY','NET_NAME_CROSSWALK','HISTORICAL_CONFERENCE_CHAMPIONS',
  'getTorvikRatings','mapTorvikToProgramRanks',source+'\nreturn DATA_PIPELINE;')
  (directory,[],{seasons:[]},()=>{},()=>{});
const season='2024-25';
const seeds=[
  {season,program_id:'mid',award_type:'ncaa_seed',value:12},
  {season,program_id:'auto',award_type:'ncaa_seed',value:12},
  {season,program_id:'pac',award_type:'ncaa_seed',value:12},
  {season,program_id:'major',award_type:'ncaa_seed',value:12},
  {season,program_id:'other',award_type:'ncaa_seed',value:12}
];
const champion={season,program_id:'auto',award_type:'conference_tournament_champion',value:1};
const mock=(n)=>({DB:{prepare(sql){return {bind(){return {all:async()=>({results:
  sql.includes('FROM classified GROUP BY')?[
    {season,program_id:'mid',kind:'ncaa',wins:1,q1:1,q1a:0,q2:0,upset_seed_lines:7,upset_wins:1}
  ]:sql.includes('FROM cbb_awards WHERE')?
    [...seeds,champion,...Array.from({length:n-1},(_,i)=>({
      season,program_id:'placeholder'+i,award_type:'conference_tournament_champion',value:1
    }))]:
  sql.includes('SELECT COUNT(*) AS n FROM cbb_preliminary_rankings')?[{n:0}]:[]})};}}}});

test('only an eligible at-large bid gets +5, stacked with normal NCAA points',async()=>{
 const rows=(await pipeline.historicalLeaders(mock(31),{
   ncaa_seed_9_12:5,ncaa_at_large_bid:5,ncaa_tournament_win:3,
   quad_1_win:1.5,ncaa_upset_per_seed:1
 },'2026-27')).rows;
 const school=id=>rows.find(x=>x.program_id===id&&x.season===season);
 assert.equal(school('mid').points,21.5); // 5 seed +5 at-large +3 win +1.5 Q1 +7 upset
 assert.equal(school('auto').points,5);
 assert.equal(school('pac').points,5);
 assert.equal(school('major').points,5);
 assert.equal(school('other').points,5);
 assert.equal(school('mid').at_large_bid,true);
 assert.equal(school('auto').at_large_bid,false);
 assert.equal(school('mid').breakdown.find(x=>x.key==='ncaa_at_large_bid').points,5);
});

test('missing auto-qualifier records cannot trigger a premature at-large bonus',async()=>{
 const rows=(await pipeline.historicalLeaders(mock(30),{
   ncaa_seed_9_12:5,ncaa_at_large_bid:5
 },'2026-27')).rows;
 const mid=rows.find(x=>x.program_id==='mid'&&x.season===season);
 assert.equal(mid.points,5);
 assert.equal(mid.at_large_bid,false);
});
