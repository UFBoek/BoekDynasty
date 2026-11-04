import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const injection=`  return {
 set:(user,state)=>{me=user;league=state;},
 page:page=>{current=page;render();return root.innerHTML;},
 section:section=>{adminSection=section;return commissionerPage();},
 mode:mode=>{draftRoundView=mode;},
 schools:(mode,data)=>{programMode=mode;schoolLeaders=data;leaderSeason='all';},
 results:(games,ap)=>{resultsSelectedDay='2026-11-03';resultsGames=games;resultsAP=ap;resultsAPAsOf='2026-11-03';},
 filter:(scope,conf)=>{resultsScope=scope;resultsConference=conf;}
};
})();`;
const compiled=source.replace('  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();',injection);
assert.notEqual(compiled,source);
const root={innerHTML:'',addEventListener(){}};
const app=new Function('document','location','URLSearchParams','return '+compiled)(
 {querySelector:x=>x==='#app'?root:null,querySelectorAll:()=>[],activeElement:null},
 {search:''},URLSearchParams);
const users=['Boek','Hayden','Leyton','Winston'].map((display_name,i)=>({id:String(i+1),username:'u'+i,display_name,role:i===0?'commissioner':'manager'}));
const programs=['Florida','Duke','Houston','Michigan'].map((name,i)=>({id:String(57+i),name:name+' basketball',abbr:name,conference_id:['23','2','8','7'][i],logo:null}));
const league={users,programs,picks:[],ownership:[],trades:[],trade_items:[],archives:[],archived_rosters:[],season_records:[],waiver_claims:[],roster_transactions:[],
 settings:{conferences:['23','2','8','7'],rounds:3,draft_status:'pending',current_season:'2026-27',league_name:'Boek Dynasty',max_managers:7,scoring:{best_programs:2},trading_enabled:true,waivers_enabled:false,draft_clock_seconds:0,draft_deadline:0},
 draft_order:users.map(x=>x.id),season:'2026-27'};
app.set(users[0],league);
test('full snake board reverses the second round but not manager columns',()=>{
 app.mode('all');
 const html=app.page('draft');
 const picks=[...html.matchAll(/data-pick="(\d+)"/g)].map(x=>Number(x[1]));
 assert.deepEqual(picks,[1,2,3,4,8,7,6,5,9,10,11,12]);
 assert.match(html,/Full board/);
 assert.match(html,/My picks/);
});
test('league overview replaces redundant pick metrics with school logo rosters',()=>{
 const html=app.page('home');
 assert.doesNotMatch(html,/ROSTERED PROGRAMS|DRAFT PICKS/);
 assert.match(html,/league-team-tile/);
 assert.match(html,/BEST BALL FORMAT/);
});
test('standings do not show a redundant schools count',()=>{
 const html=app.page('league');
 assert.doesNotMatch(html,/<th class="numerical">SCHOOLS<\/th>/);
 assert.match(html,/FANTASY POINTS/);
});
test('best ball has its own commissioner control',()=>{
 const html=app.section('general');
 assert.match(html,/id="bestball-count"/);
 assert.match(html,/data-act="save-bestball"/);
});
test('results filters are based on actual AP and conference IDs',()=>{
 const games=[
  {game_id:'401',game_date:'2026-11-03',home_id:'57',away_id:'58',home_name:'Florida',away_name:'Duke',home_score:75,away_score:73,status:'final',home_conference_id:'23',away_conference_id:'2'},
  {game_id:'402',game_date:'2026-11-03',home_id:'59',away_id:'60',home_name:'Houston',away_name:'Michigan',home_score:0,away_score:0,status:'scheduled',home_conference_id:'8',away_conference_id:'7'}
 ];
 const ap=[{program_id:'57',rank:1},...Array.from({length:24},(_,i)=>({program_id:String(100+i),rank:i+2}))];
 app.results(games,ap);
 app.filter('all','all');assert.equal((app.page('results').match(/class="scoreboard-match /g)||[]).length,2);
 app.filter('top25','all');assert.equal((app.page('results').match(/class="scoreboard-match /g)||[]).length,1);
 app.filter('all','8');assert.equal((app.page('results').match(/class="scoreboard-match /g)||[]).length,1);
});

test('mobile navigation presents six usable primary destinations with Standings under More',()=>{
 const html=app.page('home');
 const mobile=html.slice(html.indexOf('<nav class="bottom"'));
 const tabs=[...mobile.matchAll(/data-id="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(tabs,['home','team','results','programs','draft','more']);
 assert.match(app.page('more'),/data-id="league"/);
});
test('program draft, results and standings expose honest contextual visual data',()=>{
 league.ownership=[{program_id:'57',manager_id:'1'}];
 league.picks=[{overall:1,round:1,program_id:'57',manager_id:'1',picked_at:1793710000}];
 const draft=app.page('draft');
 assert.match(draft,/draft-cell-team/);
 assert.match(draft,/SEC/);
 const standings=app.page('league');
 assert.match(standings,/standings-mini-roster/);
 assert.match(standings,/ROSTERED SCHOOLS/);
 const games=[{game_id:'401',game_date:'2026-11-03',home_id:'57',away_id:'58',
   home_name:'Florida',away_name:'Duke',home_score:75,away_score:73,status:'final',
   home_conference_id:'23',away_conference_id:'2'}];
 app.results(games,[]);
 app.filter('all','all');
 assert.match(app.page('results'),/scoreboard-roster-tag is-personal/);
 league.ownership=[];
 league.picks=[];
});

test('Schools directory uses pills, not conference and sorting dropdowns',()=>{
  app.schools('directory',null);
  const html=app.page('programs');
  assert.match(html,/data-act="school-mode"/);
  assert.match(html,/data-id="leaders"/);
  assert.match(html,/data-act="directory-conference"/);
  assert.match(html,/data-act="directory-sort"/);
  assert.doesNotMatch(html,/id="program-conference"/);
  assert.doesNotMatch(html,/id="directory-sort"/);
});
test('Historical Leaders compares school points by season with a searchable table',()=>{
  app.schools('leaders',{seasons:['2021-22','2022-23'],directory:programs,
    rows:[{season:'2021-22',program_id:'57',points:24.5},{season:'2022-23',program_id:'57',points:32},
      {season:'2022-23',program_id:'58',points:17.5}]});
  const html=app.page('programs');
  assert.match(html,/Historical leaders/);
  assert.doesNotMatch(html,/data-featured="leaders"/);
  assert.match(html,/id="leader-search"/);
  assert.match(html,/data-act="leaders-season"/);
  assert.match(html,/Florida basketball/);
  assert.match(html,/56.5/);
  assert.match(html,/school-leader-table/);
  app.schools('directory',null);
});
test('Results exposes touch-friendly conference buttons, not a select menu',()=>{
  const html=app.page('results');
  assert.match(html,/class="scoreboard-conference-strip"/);
  assert.match(html,/data-act="results-conference"/);
  assert.doesNotMatch(html,/id="scoreboard-conference"/);
});
