import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const injection=`  return {
 set:(user,state)=>{me=user;league=state;standingsData=null;},
 search:query=>{globalSearchQuery=query;return globalSearchDialog();},
 manager:(id,data)=>{selectedManagerId=id;standingsData=data;standingsFetchedAt=Date.now();return managerProfilePage();},
 team:data=>{standingsData=data;return myTeamPage();},
 page:page=>{current=page;render();return root.innerHTML;},
 section:section=>{adminSection=section;return commissionerPage();},
 mode:mode=>{draftRoundView=mode;},
 sortDraft:sort=>{draftSort=sort;draftScope='all';},
 schools:(mode,data)=>{programMode=mode;schoolLeaders=data;leaderSeason='all';},
 results:(games,ap)=>{resultsSelectedDay='2026-11-03';resultsLoadedDay='2026-11-03';resultsSeason=season();resultsGames=games;resultsAP=ap;resultsAPAsOf='2026-11-03';},
 filter:(scope,conf)=>{resultsScope=scope;resultsConference=conf;}
};
})();`;
const compiled=source.replace('  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();',injection);
assert.notEqual(compiled,source);
const root={innerHTML:'',addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
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
 assert.match(html,/My slots/);
});
test('league overview prioritizes games, actionable guidance and compact team rosters',()=>{
 const html=app.page('home');
 assert.doesNotMatch(html,/ROSTERED PROGRAMS|DRAFT PICKS/);
 assert.match(html,/overview-main-grid/);
 assert.match(html,/overview-lower-grid/);
 assert.match(html,/overview-quick-panel/);
 assert.match(html,/league-team-tile/);
 assert.match(html,/overview-activity-panel/);
 assert.match(html,/data-id="team"/);
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
 app.filter('all','all');assert.equal((app.page('results').match(/class="daily-game-card /g)||[]).length,2);
 app.filter('top25','all');assert.equal((app.page('results').match(/class="daily-game-card /g)||[]).length,1);
 app.filter('all','8');assert.equal((app.page('results').match(/class="daily-game-card /g)||[]).length,1);
});

test('mobile navigation presents six usable primary destinations with Standings under More',()=>{
 const html=app.page('home');
 const mobile=html.slice(html.indexOf('<nav class="bottom"'));
 const tabs=[...mobile.matchAll(/data-id="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(tabs,['home','team','results','programs','draft','more']);
 assert.match(app.page('more'),/data-id="league"/);
});
test('More has clear account, league and tools groups',()=>{
 const html=app.page('more');
 assert.match(html,/more-groups/);
 assert.match(html,/Your account/);
 assert.match(html,/League information/);
 assert.match(html,/League tools/);
 assert.match(html,/data-id="settings"/);
 assert.match(html,/data-id="league"/);
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
 assert.match(app.page('results'),/daily-card-mine/);
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
test('draft historical sort shows full-field 5Y ranks on the right, including drafted schools',()=>{
  const years=['2021-22','2022-23','2023-24','2024-25','2025-26'];
  const historyRows=programs.flatMap((p,i)=>years.map(season=>({
    season,program_id:p.id,points:(4-i)*10
  })));
  const oldPicks=league.picks,oldOwnership=league.ownership;
  try{
    // Florida ranks first nationally, but has already been drafted.
    league.picks=[{overall:1,round:1,program_id:'57',manager_id:'1'}];
    league.ownership=[{program_id:'57',manager_id:'1'}];
    app.schools('leaders',{seasons:years,directory:programs,rows:historyRows});
    app.sortDraft('history');
    const html=app.page('draft');
    const grid=html.slice(html.indexOf('<div class="draft-pool-grid">'));
    const card=id=>grid.split('data-program="'+id+'"')[1]?.split('</article>')[0];
    assert.doesNotMatch(grid,/data-program="57"/);
    assert.match(card('58'),/<span class="draft-pool-stat"><strong>#2<\/strong><small>5Y RANK<\/small>/);
    assert.match(card('59'),/<span class="draft-pool-stat"><strong>#3<\/strong><small>5Y RANK<\/small>/);
    app.sortDraft('power');
    assert.match(app.page('draft'),/<small>BART TORVIK<\/small>/);
  }finally{
    app.sortDraft('power');app.schools('directory',null);
    league.picks=oldPicks;league.ownership=oldOwnership;
  }
});

test('draft board keeps pick details and shows compact scouting metrics for drafted schools',()=>{
  const oldPicks=league.picks,oldOwnership=league.ownership;
  try{
    league.picks=[{overall:1,round:1,program_id:'57',manager_id:'1'}];
    league.ownership=[{program_id:'57',manager_id:'1'}];
    app.mode('all');
    const html=app.page('draft');
    assert.match(html,/PICK #1/);
    assert.match(html,/Florida basketball/);
    assert.match(html,/draft-cell-scout/);
    assert.match(html,/<small>TORVIK<\/small>/);
    assert.match(html,/<small>5Y RANK<\/small>/);
    assert.match(html,/<small>ROSTER \$<\/small>/);
    assert.match(html,/~\$27M/);
    assert.match(html,/2026 roster spending is estimated|Roster costs are estimates/);
    assert.match(html,/data-act="draft-board-mode" data-mode="current"/);
    assert.match(html,/data-act="draft-board-mode" data-mode="mine"/);
    assert.match(html,/data-act="open-program" data-id="57"/);
  }finally{
    league.picks=oldPicks;league.ownership=oldOwnership;
    app.mode('all');
  }
});

test('Results exposes touch-friendly conference buttons, not a select menu',()=>{
  const html=app.page('results');
  assert.match(html,/class="daily-conference-tabs"/);
  assert.match(html,/data-act="results-conference"/);
  assert.doesNotMatch(html,/id="scoreboard-conference"/);
});


test('global search finds school profiles, managers and navigation destinations',()=>{
 const school=app.search('florida');
 assert.match(school,/role="dialog"/);
 assert.match(school,/Florida basketball/);
 assert.match(school,/data-act="open-program"/);
 assert.match(app.search('Hayden'),/data-act="open-manager"/);
 assert.match(app.search('Standings'),/data-id="league"/);
 assert.match(app.page('home'),/data-act="search-open"/);
});
test('league manager rosters share My Team design and expose program-level season points',()=>{
  const oldOwnership=league.ownership;
  try{
    league.ownership=[{program_id:'57',manager_id:'1'},{program_id:'58',manager_id:'2'},{program_id:'59',manager_id:'2'}];
    const standings={
      season:'2026-27',program_points:{'57':88.25,'58':11.5,'59':42.5},
      standings:[{manager_id:'1',points:88.25},{manager_id:'2',points:54}]
    };
    const own=app.team(standings);
    assert.match(own,/Explore rosters/);
    assert.match(own,/class="tm-directory-card" data-act="open-manager" data-id="2"/);
    assert.match(own,/Hayden/);
    const other=app.manager('2',standings);
    assert.match(other,/tm-opponent-page/);
    assert.match(other,/tm-masthead/);
    assert.match(other,/SEASON POINTS/);
    assert.match(other,/54/);
    assert.match(other,/2026-27 ROSTER/);
    assert.match(other,/Explore rosters/);
    assert.match(other,/data-act="open-manager" data-id="1"/);
    const table=other.slice(other.indexOf('<table class="tm-table">'));
    assert.ok(table.indexOf('Houston basketball')<table.indexOf('Duke basketball'));
    assert.match(table,/42\.5/);
    assert.match(table,/11\.5/);
    assert.match(other,/data-act="open-program"/);
    assert.match(other,/data-id="team"/);
    assert.doesNotMatch(other,/LEAGUE TITLES|OWNED PROGRAMS|LEAGUE RANK|No archived seasons/);
  }finally{
    league.ownership=oldOwnership;
  }
});
test('league rosters handle a pending startup draft cleanly',()=>{
  const oldOwnership=league.ownership;
  try{
    league.ownership=[];
    const own=app.team(null);
    assert.match(own,/Explore rosters/);
    const other=app.manager('2',null);
    assert.match(other,/Awaiting the draft/);
    assert.match(other,/Draft pending/);
    assert.match(other,/data-id="1"/);
    assert.doesNotMatch(other,/NaN/);
  }finally{
    league.ownership=oldOwnership;
  }
});


test('My Team presents only season score, ranked programs and collapsible management',()=>{
  const oldOwnership=league.ownership,oldStatus=league.settings.draft_status;
  const oldWaivers=league.settings.waivers_enabled,oldBest=league.settings.scoring.best_programs;
  try{
    league.ownership=[{program_id:'57',manager_id:'1'},{program_id:'58',manager_id:'1'}];
    league.settings.draft_status='finished';league.settings.waivers_enabled=true;
    league.settings.scoring.best_programs=1;
    const html=app.team({season:'2026-27',
      program_points:{'57':12.25,'58':40.5},
      standings:[{manager_id:'1',points:40.5,counted_programs:1,counted_program_ids:['58']}]});
    const table=html.slice(html.indexOf('<table class="tm-table">'));
    assert.match(html,/tm-masthead/);
    assert.match(html,/SEASON POINTS/);
    assert.match(html,/tm-score/);
    assert.match(html,/40\.5/);
    assert.doesNotMatch(html,/OWNED PROGRAMS|CURRENTLY COUNTING|LEAGUE TITLES|Counting programs/);
    assert.match(table,/Duke basketball/);
    assert.match(table,/Florida basketball/);
    assert.ok(table.indexOf('Duke basketball')<table.indexOf('Florida basketball'));
    assert.match(table,/40\.5/);
    assert.match(table,/12\.25/);
    assert.doesNotMatch(table,/COUNTING|RESERVE|BEST BALL/);
    assert.match(html,/<details class="tm-transactions">/);
    assert.doesNotMatch(html,/<details class="tm-transactions" open/);
    assert.match(html,/data-id="trades"/);
    assert.match(html,/data-id="waivers"/);
    assert.doesNotMatch(html,/team-program-grid|data-act="team-drop"/);
  }finally{
    league.ownership=oldOwnership;league.settings.draft_status=oldStatus;
    league.settings.waivers_enabled=oldWaivers;league.settings.scoring.best_programs=oldBest;
  }
});
