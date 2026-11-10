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
 standings:(data)=>{standingsData=data;standingsFetchedAt=Date.now();},
 expandLeague:(id)=>{leagueExpandedManager=String(id);},
 filter:(scope,conf)=>{resultsScope=scope;resultsConference=conf;},
 queue:(ids)=>{draftWatchlist=ids.map(String);},
 overviewGames:(games)=>{overviewGamesDay=resultsToday();overviewGames=games;}
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
test('3RR draft board reverses rounds two and three without moving manager columns',()=>{
 app.mode('all');
 const html=app.page('draft');
 const picks=[...html.matchAll(/data-pick="(\d+)"/g)].map(x=>Number(x[1]));
 assert.deepEqual(picks,[1,2,3,4,8,7,6,5,12,11,10,9]);
 assert.match(html,/Full board/);
 assert.match(html,/My slots/);
 assert.match(html,/3RR order/);
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
test('Results offers only Owned Schools and Owner vs Owner, excluding self-owned matchups',()=>{
 const oldOwnership=league.ownership;
 try{
  league.ownership=[{program_id:'57',manager_id:'1'},{program_id:'59',manager_id:'2'},{program_id:'60',manager_id:'1'}];
  const games=[
   {game_id:'401',game_date:'2026-11-03',home_id:'57',away_id:'58',home_name:'Florida',away_name:'Duke',home_score:75,away_score:73,status:'final',home_conference_id:'23',away_conference_id:'2'},
   {game_id:'402',game_date:'2026-11-03',home_id:'59',away_id:'60',home_name:'Houston',away_name:'Michigan',home_score:null,away_score:null,status:'scheduled',home_conference_id:'8',away_conference_id:'7'},
   {game_id:'403',game_date:'2026-11-03',home_id:'58',away_id:'60',home_name:'Duke',away_name:'Michigan',home_score:null,away_score:null,status:'scheduled',home_conference_id:'2',away_conference_id:'7'},
   {game_id:'404',game_date:'2026-11-03',home_id:'901',away_id:'902',home_name:'Outside ranked school',away_name:'Outside school',home_score:88,away_score:81,status:'final',home_conference_id:'999',away_conference_id:'999'},
   {game_id:'405',game_date:'2026-11-03',home_id:'57',away_id:'60',home_name:'Florida',away_name:'Michigan',home_score:65,away_score:64,status:'final',home_conference_id:'23',away_conference_id:'7'}
  ];
  app.results(games,[]);
  const gameCount=()=> (app.page('results').match(/class="daily-game-card /g)||[]).length;
  app.filter('owned','all');
  const html=app.page('results');
  assert.deepEqual([...html.matchAll(/data-act="results-scope" data-scope="([^"]+)"/g)].map(m=>m[1]),['owned','owners']);
  assert.match(html,/Owned Schools/);
  assert.match(html,/Owner vs Owner/);
  assert.doesNotMatch(html,/My Roster|All League Schools/);
  assert.equal(gameCount(),4,'Owned Schools includes any rostered school, even against unowned opponents');
  app.filter('owners','all');
  assert.equal(gameCount(),1,'Only different-manager matchups qualify');
  assert.match(app.page('results'),/Houston/);
  app.filter('owners','8');assert.equal(gameCount(),1,'Conference filters still work with owner matchups');
  app.filter('owners','23');assert.equal(gameCount(),0,'Same-owner games are not counted as owner matchups');
 }finally{league.ownership=oldOwnership;app.filter('owned','all');}
});

test('overview and results never display a draft-queue game view',()=>{
 const oldOwnership=league.ownership;
 try{
  league.ownership=[{program_id:'57',manager_id:'1'}];
  app.queue(['59']);
  app.overviewGames([
   {game_id:'401',home_id:'57',away_id:'58',home_name:'Florida',away_name:'Duke',status:'scheduled'},
   {game_id:'402',home_id:'59',away_id:'60',home_name:'Houston',away_name:'Michigan',status:'scheduled'}
  ]);
  const overview=app.page('home');
  assert.equal((overview.match(/class="overview-game-card/g)||[]).length,1);
  assert.doesNotMatch(overview,/My queue games|IN QUEUE|results-track-queue/);
  const results=app.page('results');
  assert.doesNotMatch(results,/data-scope="queue"|MY QUEUE/);
  assert.doesNotMatch(app.page('draft'),/data-act="results-track-queue"/);
 }finally{league.ownership=oldOwnership;app.queue([]);app.overviewGames([]);}
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
 assert.match(standings,/>PROGRAMS<\/th>/);
 const games=[{game_id:'401',game_date:'2026-11-03',home_id:'57',away_id:'58',
   home_name:'Florida',away_name:'Duke',home_score:75,away_score:73,status:'final',
   home_conference_id:'23',away_conference_id:'2'}];
 app.results(games,[]);
 app.filter('owned','all');
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
    assert.match(card('58'),/<span class="draft-pool-stat"><strong>#2<\/strong><small>LAST 5 YEARS<\/small>/);
    assert.match(card('59'),/<span class="draft-pool-stat"><strong>#3<\/strong><small>LAST 5 YEARS<\/small>/);
    assert.match(card('58'),/<small>LAST 5 YEARS<\/small><strong>#2<\/strong>/);
    assert.match(card('59'),/<small>LAST 5 YEARS<\/small><strong>#3<\/strong>/);
    assert.doesNotMatch(card('58'),/5\/5 seasons|5Y AVG|draft-pool-history/);
    app.sortDraft('power');
    const powerHtml=app.page('draft');
    assert.match(powerHtml,/<small>BART TORVIK<\/small>/);
    assert.match(powerHtml.slice(powerHtml.indexOf('data-program="58"')).split('</article>')[0],/<small>LAST 5 YEARS<\/small><strong>#2<\/strong>/);
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
    assert.match(html,/<small>LAST 5 YEARS<\/small>/);
    assert.match(html,/<small>ROSTER \$<\/small>/);
    assert.match(html,/\$25M\+/);
    assert.match(html,/2026 roster spending is estimated|Roster costs are estimates/);
    assert.match(html,/data-act="draft-board-mode" data-mode="current"/);
    assert.match(html,/data-act="draft-board-mode" data-mode="mine"/);
    assert.match(html,/data-act="open-program" data-id="57"/);
  }finally{
    league.picks=oldPicks;league.ownership=oldOwnership;
    app.mode('all');
  }
});

test('model-only schools show N/A for financial rank and cost across draft views',()=>{
  const modelSchool={id:'2439',name:'UNLV basketball',abbr:'UNLV',conference_id:'23',logo:null};
  const originalPrograms=league.programs,originalPicks=league.picks,originalOwnership=league.ownership;
  try{
    league.programs=[...originalPrograms,modelSchool];
    league.picks=[];league.ownership=[];
    app.sortDraft('cost');
    const html=app.page('draft');
    const cards=html.slice(html.indexOf('<div class="draft-pool-grid">'));
    const modelCard=cards.split('data-program="2439"')[1]?.split('</article>')[0];
    assert.ok(modelCard,'model-only school should appear in draft pool');
    assert.doesNotMatch(modelCard,/draft-pool-financial-rank|\$ RANK/);
    assert.match(modelCard,/draft-pool-financial-cost is-unreported"><strong>N\/A<\/strong>/);
    assert.match(modelCard,/<small>EST\. COST<\/small>/);
    assert.match(modelCard,/Independent model only/);
    assert.doesNotMatch(modelCard,/\$5\.9M|#93<\/strong>/);
    // Florida has a separately reported CBS valuation north of $25M.
    const florida=cards.split('data-program="57"')[1]?.split('</article>')[0];
    assert.doesNotMatch(florida,/draft-pool-financial-rank|\$ RANK/);
    assert.match(florida,/\$25M\+/);
    league.picks=[{overall:1,round:1,program_id:'2439',manager_id:'1'}];
    league.ownership=[{program_id:'2439',manager_id:'1'}];
    const board=app.page('draft');
    const pickedCell=board.split('data-pick="1"')[1]?.split('</div></div>')[0]||'';
    assert.match(board,/UNLV basketball/);
    assert.match(board,/is-unreported/);
    assert.match(board,/<small>ROSTER \$<\/small><b>N\/A<\/b>/);
    assert.doesNotMatch(board,/\$5\.9M/);
  }finally{
    league.programs=originalPrograms;league.picks=originalPicks;league.ownership=originalOwnership;
    app.sortDraft('power');
  }
});

test('CBS $20M+ tier reports only the published threshold across draft views',()=>{
  const duke={id:'150',name:'Duke Blue Devils',abbr:'Duke',conference_id:'2',logo:null};
  const illinois={id:'356',name:'Illinois Fighting Illini',abbr:'Illinois',conference_id:'2',logo:null};
  const prevPrograms=league.programs,prevPicks=league.picks,prevOwnership=league.ownership;
  try{
    league.programs=[...prevPrograms,duke,illinois];
    league.picks=[];league.ownership=[];
    app.sortDraft('cost');
    const html=app.page('draft');
    const pool=html.slice(html.indexOf('<div class="draft-pool-grid">'));
    for(const id of ['150','356']){
      const card=pool.split('data-program="'+id+'"')[1]?.split('</article>')[0];
      assert.ok(card,'CBS tier school '+id+' must be eligible');
      assert.match(card,/<strong>\$20M\+<\/strong><small>EST. COST<\/small>/);
      assert.match(card,/CBS spending tier: \$20M\+/);
      assert.doesNotMatch(card,/\$2[1-9]M|~\$20M|~\$27M/);
    }
    const florida=pool.split('data-program="57"')[1]?.split('</article>')[0];
    assert.match(florida,/<strong>\$25M\+<\/strong><small>EST. COST<\/small>/);
    league.picks=[{overall:1,round:1,program_id:'150',manager_id:'1'}];
    league.ownership=[{program_id:'150',manager_id:'1'}];
    const draft=app.page('draft');
    assert.match(draft,/<small>ROSTER \$<\/small><b>\$20M\+<\/b>/);
    assert.doesNotMatch(draft,/~\$27M/);
  }finally{
    league.programs=prevPrograms;league.picks=prevPicks;league.ownership=prevOwnership;
    app.sortDraft('power');
  }
});

test('Results exposes touch-friendly conference buttons, not a select menu',()=>{
  const html=app.page('results');
  assert.match(html,/class="daily-conference-tabs"/);
  assert.match(html,/data-act="results-conference"/);
  assert.match(html,/data-id="mid-major"[^>]*>Mid-Major<\/button><button[^>]*data-id="power"[^>]*>Power Conferences<\/button>/);
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

test('Schools index is a compact scouting table with full search, filter and profile actions',()=>{
  const oldOwnership=league.ownership;
  try{
    league.ownership=[{program_id:'57',manager_id:'1'}];
    const years=['2021-22','2022-23','2023-24','2024-25','2025-26'];
    app.schools('directory',{seasons:years,rows:years.map((season,i)=>({season,program_id:'57',points:10+i*3}))});
    const html=app.page('programs');
    assert.match(html,/class="schools-masthead"/);
    assert.match(html,/class="directory-table"/);
    assert.match(html,/directory-school-identity/);
    assert.match(html,/2026 ROSTER \$/);
    assert.match(html,/data-act="directory-conference"/);
    assert.match(html,/data-act="directory-ownership"/);
    assert.match(html,/data-act="directory-sort"/);
    assert.match(html,/data-act="directory-letter"/);
    assert.match(html,/data-act="open-program"/);
    assert.match(html,/data-act="open-manager"/);
    assert.match(html,/program-dir-open/);
    assert.match(html,/RANK #1/);
    assert.match(html,/\$25M\+/);
    assert.doesNotMatch(html,/>#0<\/b>/,'Missing Torvik rankings must never appear as #0');
    assert.match(html,/id="program-search"/);
    assert.match(html,/id="program-results"/);
    assert.match(html,/id="directory-load"/);
  }finally{
    league.ownership=oldOwnership;
    app.schools('directory',null);
  }
});


test('Results game center groups matchups and retains ranking, quadrant and navigation',()=>{
 const oldOwnership=league.ownership;
 league.ownership=[{program_id:'57',manager_id:'1'},{program_id:'59',manager_id:'2'}];
 try{
 const games=[
  {game_id:'401',game_date:'2026-11-03',home_id:'57',away_id:'58',home_name:'Florida',away_name:'Duke',home_score:75,away_score:73,status:'final',home_net:4,away_net:12,home_quad:1,away_quad:1,home_record:{wins:1,losses:0},away_record:{wins:0,losses:1},home_conference_id:'23',away_conference_id:'2'},
  {game_id:'402',game_date:'2026-11-03',home_id:'59',away_id:'60',home_name:'Houston',away_name:'Michigan',home_score:null,away_score:null,status:'scheduled',home_net:8,away_net:19,home_conference_id:'8',away_conference_id:'7'}
 ];
 app.results(games,[]);
 app.filter('owned','all');
 const html=app.page('results');
 assert.match(html,/results-page-head/);
 assert.match(html,/daily-scoreboard-group/);
 assert.match(html,/Completed games/);
 assert.match(html,/daily-team-net/);
 assert.match(html,/daily-quad q1/);
 for(const action of ['results-scope','results-status','results-conference','results-shift','results-today']){
  assert.ok(html.includes('data-act="'+action+'"'),action);
 }
 assert.match(html,/Box score/);
 assert.equal((html.match(/class="daily-game-card /g)||[]).length,2);
 }finally{league.ownership=oldOwnership;}
});
test('My Team v4 keeps scoring and actions while adding compact scouting columns',()=>{
  const oldOwnership=league.ownership,oldStatus=league.settings.draft_status;
  try{
    league.ownership=[{program_id:'57',manager_id:'1'},{program_id:'58',manager_id:'1'}];
    league.settings.draft_status='pending';
    const html=app.team({season:'2026-27',program_points:{'57':12.25,'58':40.5},
      standings:[{manager_id:'1',points:52.75,counted_programs:2,counted_program_ids:['57','58']}]});
    const table=html.slice(html.indexOf('<table class="tm-table">'));
    assert.match(html,/my-team-page tm-v3 tm-v4/);
    assert.match(html,/FRANCHISE HQ/);
    assert.match(html,/SEASON POINTS/);
    assert.match(html,/52\.75/);
    assert.ok(html.indexOf('tm-roster"')<html.indexOf('class="tm-directory"'),
      'The owned roster should precede the league switcher');
    assert.match(table,/BART TORVIK/);
    assert.match(table,/5Y RANK/);
    assert.match(table,/class="tm-stat-rank"/);
    assert.match(table,/class="tm-stat-rank tm-historical-rank"/);
    assert.ok(table.indexOf('Duke basketball')<table.indexOf('Florida basketball'));
    for(const action of ['open-program','open-manager','tab'])assert.match(html,new RegExp('data-act="'+action+'"'));
    assert.match(html,/class="tm-transactions"/);
    assert.doesNotMatch(html,/<details class="tm-transactions" open/);
    assert.match(html,/data-id="draft"/);
    assert.match(html,/data-id="programs"/);
    assert.match(html,/data-id="settings"/);
    assert.match(html,/data-id="trades"/);
    assert.match(html,/data-id="waivers"/);
    assert.doesNotMatch(html,/CURRENTLY COUNTING|OWNED PROGRAMS|LEAGUE TITLES/);
  }finally{league.ownership=oldOwnership;league.settings.draft_status=oldStatus;}
});


test('League standings show ranked totals, ties, lead gaps and verified program contribution details',()=>{
 const previousOwnership=league.ownership,previousBest=league.settings.scoring.best_programs;
 try{
  league.settings.scoring.best_programs=2;
  league.ownership=[{program_id:'57',manager_id:'1'},{program_id:'58',manager_id:'1'},
   {program_id:'59',manager_id:'2'},{program_id:'60',manager_id:'3'}];
  app.standings({season:'2026-27',best_programs:2,as_of:1790000000,quadrant_source:'torvik',
   program_points:{'57':22.5,'58':4.5,'59':20,'60':20},
   standings:[{manager_id:'1',points:27,counted_programs:2,counted_program_ids:['57','58']},
    {manager_id:'2',points:20,counted_programs:1,counted_program_ids:['59']},
    {manager_id:'3',points:20,counted_programs:1,counted_program_ids:['60']},
    {manager_id:'4',points:0,counted_programs:0,counted_program_ids:[]}]});
  let html=app.page('league');
  assert.match(html,/league-race-strip/);
  assert.match(html,/>PROGRAMS<\/th>/);
  assert.match(html,/FANTASY POINTS/);
  assert.match(html,/standings-mini-roster/);
  assert.match(html,/T02/);
  assert.match(html,/−7/);
  assert.match(html,/LEADER/);
  assert.match(html,/Bart Torvik · provisional/);
  assert.match(html,/data-act="league-refresh"/);
  assert.match(html,/data-act="league-toggle-details"/);
  assert.match(html,/aria-expanded="false"/);
  app.expandLeague('1');
  html=app.page('league');
  assert.match(html,/league-breakdown-row/);
  assert.match(html,/COUNTING IN BEST BALL/);
  assert.match(html,/Florida basketball/);
  assert.match(html,/Duke basketball/);
  assert.match(html,/22\.5/);
  assert.match(html,/data-act="open-program"/);
  assert.match(html,/aria-expanded="true"/);
 }finally{app.expandLeague('');app.standings(null);
   league.ownership=previousOwnership;league.settings.scoring.best_programs=previousBest;}
});

test('League preseason never fabricates a leader or point ranking',()=>{
 const previousOwnership=league.ownership;
 try{
  league.ownership=[];
  app.standings({season:'2026-27',best_programs:2,quadrant_source:'pending',program_points:{},
   standings:users.map(u=>({manager_id:u.id,points:0,counted_programs:0,counted_program_ids:[]}))});
  const html=app.page('league');
  assert.match(html,/PRESEASON/);
  assert.match(html,/Awaiting first points/);
  assert.match(html,/Awaiting draft/);
  assert.doesNotMatch(html,/class="league-standing-rank is-first"/);
  assert.match(html,/HOW RANKINGS WORK/);
 }finally{app.standings(null);league.ownership=previousOwnership;}
});
test('Results Game Center layout CSS covers masthead, counts, conference filters and group headers',()=>{
  const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
  const previousOwnership=league.ownership;
  league.ownership=[{program_id:'57',manager_id:'1'}];
  try{
  const page=app.page('results');
  const selectors=['results-page-head','results-page-overline','results-summary','daily-conference-bar',
    'daily-conference-tabs','daily-board-content','daily-scoreboard-group','daily-group-heading','daily-group-count'];
  for(const name of selectors){
    assert.ok(page.includes('class="'+name)||page.includes('class="'+name+' '),name+' must appear in Results markup');
    assert.ok(css.includes('.'+name+'{')||css.includes('.'+name+' '),name+' must be styled');
  }
  assert.match(css,/\.results-page-head\s*\{display:flex/);
  assert.match(css,/\.results-summary\s*\{display:grid/);
  assert.match(css,/\.daily-results \.daily-group-heading\s*\{display:flex/);
  assert.match(css,/@media\(max-width:580px\)/);
  }finally{league.ownership=previousOwnership;}
});


test('front office preserves pending trades and supports instant Add / Drop with legacy claim history',()=>{
 const state={
  ...league,
  settings:{...league.settings,draft_status:'finished',trading_enabled:true,waivers_enabled:true},
  ownership:[{program_id:'57',manager_id:'1'},{program_id:'58',manager_id:'2'}],
  trades:[{id:'offer-1',from_manager_id:'2',to_manager_id:'1',status:'pending',offered_at:12345}],
  trade_items:[
   {trade_id:'offer-1',from_manager_id:'2',to_manager_id:'1',program_id:'58'},
   {trade_id:'offer-1',from_manager_id:'1',to_manager_id:'2',program_id:'57'}
  ],
  draft_pick_trade_items:[],
  waiver_claims:[{id:'claim-1',manager_id:'1',program_id:'59',drop_program_id:'57',status:'pending',created_at:12345}]
 };
 app.set(users[0],state);
 try{
  const team=app.page('team');
  assert.match(team,/tm-frontoffice/);
  assert.match(team,/tm-inbox-preview/);
  assert.match(team,/Trade offer from Hayden/);
  assert.match(team,/data-act="trade-accept" data-id="offer-1"/);
  assert.match(team,/data-act="trade-decline" data-id="offer-1"/);
  assert.match(team,/data-id="waivers"/);

  const trades=app.page('trades');
  assert.match(trades,/txn-inbox/);
  assert.ok(trades.indexOf('id="txn-inbox-title"')<trades.indexOf('id="trade-proposal"'));
  assert.match(trades,/YOU RECEIVE/);
  assert.match(trades,/YOU SEND/);
  assert.match(trades,/Duke basketball/);
  assert.match(trades,/Florida basketball/);
  assert.match(trades,/data-act="trade-propose"/);

  const waivers=app.page('waivers');
  assert.match(waivers,/txn-waiver-list/);
  assert.match(waivers,/data-act="waiver-cancel" data-id="claim-1"/);
  assert.match(waivers,/data-act="roster-add"/);
  assert.match(waivers,/data-act="roster-drop"/);
  assert.match(waivers,/No claims or commissioner approvals/);
  assert.doesNotMatch(waivers,/data-act="waiver-claim"/);
  const more=app.page('more');
  assert.match(more,/more-trade-alert/);
 }finally{
  app.set(users[0],league);
 }
});

test('trade scouting uses season standings and preserves missing values without invented rankings',()=>{
 const original=league.ownership;
 league.ownership=[{program_id:'57',manager_id:'1'},{program_id:'58',manager_id:'2'}];
 app.set(users[0],league);
 app.standings({season:'2026-27',program_points:{57:12.5,58:7},standings:[{manager_id:'1',points:12.5},{manager_id:'2',points:7}]});
 const html=app.page('trades');
 assert.match(html,/td-comparison/);
 assert.match(html,/2026-27 PTS<\/dt><dd>12.5/);
 assert.match(html,/Bart Torvik<\/dt><dd>—/);
 assert.match(html,/5Y avg pts/);
 assert.match(html,/<strong>12.5<\/strong><span>Best-ball points/);
 assert.match(html,/aria-label="Search your programs"/);
 assert.match(html,/id="trade-package-receive"/);
 assert.match(html,/data-act="trade-clear"/);
 app.standings({season:'2025-26',program_points:{57:999},standings:[]});
 assert.doesNotMatch(app.page('trades'),/<dd>999<\/dd>/);
 league.ownership=original;
});
