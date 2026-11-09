import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const end='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
assert.ok(source.includes(end),'Client startup hook should remain stable');
const stub='  return {matchesConferenceFilter,isMidMajorMenuConference,eligibleConferenceIds,conferenceMenuGroups,midMajorConferenceIds,powerConferenceIds,conferenceGroups,midMajorOption,powerOption,rankingTools,rankingEligible,poolVisible,programsPage,setLeague:v=>{league=v;poolDraftConfs=null;poolDraftSchools=null;},setPoolConferenceFilter:v=>{poolConferenceFilter=v;}};\n})();';
const root={innerHTML:'',addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
const document={querySelector:q=>q==='#app'?root:null,querySelectorAll:()=>[],activeElement:null};
const api=new Function('document','window','navigator','location','URLSearchParams',
  'return '+source.replace(end,stub))(document,{matchMedia:()=>({matches:false})},
  {userAgent:'node-test'},{search:'',pathname:'/'},URLSearchParams);

const majors=['23','2','7','8','4','21'];
test('the Mid-Major category includes all non-major conferences',()=>{
  const [major,multiBid,other]=api.conferenceGroups;
  const ids=[...major.ids,...multiBid.ids,...other.ids];
  assert.equal(new Set(ids).size,ids.length,'conferences are assigned to exactly one section');
  assert.equal(api.midMajorConferenceIds.size,multiBid.ids.length+other.ids.length);
  for(const id of ids){
    assert.equal(api.midMajorConferenceIds.has(id),!majors.includes(id),id);
    assert.equal(api.matchesConferenceFilter(id,'all'),true,id);
    assert.equal(api.matchesConferenceFilter(id,id),true,id);
  }
});
test('Power Conferences group contains exactly the ACC, Big East, Big Ten, Big 12, SEC and Pac-12',()=>{
  assert.deepEqual(new Set(api.powerConferenceIds),new Set(majors));
  for(const id of majors)assert.equal(api.matchesConferenceFilter(id,'power'),true,id);
  for(const id of [...api.midMajorConferenceIds,'999'])
    assert.equal(api.matchesConferenceFilter(id,'power'),false,id);
  assert.equal(api.matchesConferenceFilter('2','power','duke'),true,'Individually included power schools still classify as power');
  assert.match(api.powerOption('power'),/<option value="power" selected>Power Conferences<\/option>/);
});
test('A10, American, Mountain West, WCC and other small conferences remain Mid-Major',()=>{
  for(const id of ['62','3','44','29','18','45','1','16','46'])
    assert.equal(api.matchesConferenceFilter(id,'mid-major'),true,id);
  for(const id of majors)assert.equal(api.midMajorConferenceIds.has(id),false,id);
});
const fixtures=[
  {id:'florida',name:'Florida',abbr:'UF',conference_id:'23'},
  {id:'auburn',name:'Auburn',abbr:'AUB',conference_id:'23'},
  {id:'vcu',name:'VCU',abbr:'VCU',conference_id:'3'},
  {id:'dayton',name:'Dayton',abbr:'DAY',conference_id:'3'},
  {id:'sdsu',name:'San Diego State',abbr:'SDSU',conference_id:'44'},
  {id:'unlv',name:'UNLV',abbr:'UNLV',conference_id:'44'},
  {id:'duke',name:'Duke',abbr:'DUKE',conference_id:'2'},
  {id:'unc',name:'North Carolina',abbr:'UNC',conference_id:'2'},
  {id:'oakland',name:'Oakland',abbr:'OAK',conference_id:'45'},
  {id:'cleveland',name:'Cleveland State',abbr:'CLE',conference_id:'45'},
  {id:'memphis',name:'Memphis',abbr:'MEM',conference_id:'62'},
  {id:'tulane',name:'Tulane',abbr:'TUL',conference_id:'62'}
];
api.setLeague({settings:{
  conferences:['23','3','44','62'],included_programs:['duke','oakland'],
  excluded_programs:['memphis']
},programs:fixtures});
test('only fully enabled conferences receive their own navigation options',()=>{
  const ids=api.eligibleConferenceIds();
  assert.deepEqual(new Set(ids),new Set(['23','3','44']));
  assert.ok(!ids.includes('2'),'partially enabled ACC is not an independent menu');
  assert.ok(!ids.includes('45'),'partially enabled Horizon is not an independent menu');
  assert.ok(!ids.includes('62'),'AAC is not fully enabled when a school is excluded');
});
test('partially enabled conference programs appear in Mid-Major, retaining real conference labels',()=>{
  assert.equal(api.matchesConferenceFilter('2','mid-major','duke'),true);
  assert.equal(api.matchesConferenceFilter('2','mid-major','unc'),false);
  assert.equal(api.matchesConferenceFilter('45','mid-major','oakland'),true);
  assert.equal(api.matchesConferenceFilter('45','mid-major','cleveland'),true,
    'Non-power conferences still belong to Mid-Major when not eligible');
  assert.equal(api.matchesConferenceFilter('23','mid-major','florida'),false);
  assert.equal(api.matchesConferenceFilter('62','mid-major','tulane'),true);
  assert.equal(api.rankingEligible(fixtures[6],'mid-major','all'),true);
  assert.equal(api.rankingEligible(fixtures[0],'mid-major','all'),false);
  assert.equal(api.rankingEligible(fixtures[6],'power','all'),true);
  assert.equal(api.rankingEligible(fixtures[4],'power','all'),false);
  const directory=api.programsPage();
  assert.match(directory,/data-act="directory-conference" data-id="mid-major"/);
  assert.match(directory,/data-act="directory-conference" data-id="power"/);
  assert.doesNotMatch(directory,/data-act="directory-conference" data-id="2"/);
  assert.doesNotMatch(directory,/data-act="directory-conference" data-id="45"/);
  assert.match(directory,/ACC/);
  assert.match(directory,/Horizon League/);
  assert.match(directory,/Mountain West/);
});
test('historical rankings and ratings offer only the fully included conferences and Mid-Major',()=>{
  const options=api.rankingTools('ratings','','mid-major','all');
  assert.match(options,/<option value="mid-major" selected>Mid-Major<\/option>/);
  assert.match(api.rankingTools('ratings','','power','all'),/<option value="power" selected>Power Conferences<\/option>/);
  assert.match(options,/Mountain West/);
  assert.match(options,/SEC/);
  assert.match(options,/Atlantic 10/);
  assert.doesNotMatch(options,/<option value="2"/);
  assert.doesNotMatch(options,/<option value="45"/);
  assert.doesNotMatch(options,/<option value="62"/);
});
test('commissioner school pool retains all schools and routes partial schools into Mid-Major',()=>{
  assert.equal(api.poolVisible().length,fixtures.length);
  const groups=api.conferenceMenuGroups();
  assert.ok(groups.partial.has('2'));
  assert.ok(groups.partial.has('45'));
  assert.ok(groups.partial.has('62'));
  assert.equal(groups.full.has('23'),true);
});
test('Power Conferences appears immediately after Mid-Major in all conference-based menus',()=>{
  assert.match(source,/conferenceButton\(MID_MAJOR_FILTER,'Mid-Major'\)\+conferenceButton\(POWER_FILTER,'Power Conferences'\)/);
  assert.match(source,/chip\(MID_MAJOR_FILTER,'Mid-Major'\)\+chip\(POWER_FILTER,'Power Conferences'\)/);
  for(const [selection,next] of [['conference','conferences'],['draftConference','confOptions'],['poolConferenceFilter','filterOptions']])
    assert.ok(source.includes('midMajorOption('+selection+')+powerOption('+selection+')+'+next));
});
test('Mid-Major remains available in every conference-based menu',()=>{
  assert.match(source,/conferenceButton\(MID_MAJOR_FILTER,'Mid-Major'\)/);
  assert.match(source,/chip\(MID_MAJOR_FILTER,'Mid-Major'\)/);
  assert.match(source,/midMajorOption\(conference\)\+powerOption\(conference\)\+conferences/);
  assert.match(source,/midMajorOption\(draftConference\)\+powerOption\(draftConference\)\+confOptions/);
  assert.match(source,/midMajorOption\(poolConferenceFilter\)\+powerOption\(poolConferenceFilter\)\+filterOptions/);
  assert.match(source,/matchesConferenceFilter\(homeConf,resultsConference,g.home_id\)/);
  assert.match(source,/matchesConferenceFilter\(card\.dataset\.conference,draftConference,card\.dataset\.program\)/);
  assert.match(source,/matchesConferenceFilter\(card\.dataset\.conference,programConference,card\.dataset\.program\)/);
});

test('all eight non-Gonzaga 2026-27 Pac-12 programs appear under Mid-Major, never Gonzaga',()=>{
  const pac12=[
    ['68','Boise State'],['36','Colorado State'],['278','Fresno State'],
    ['204','Oregon State'],['21','San Diego State'],['326','Texas State'],
    ['328','Utah State'],['265','Washington State'],['2250','Gonzaga']
  ].map(([id,name])=>({id,name,abbr:name,conference_id:'21'}));
  api.setLeague({settings:{
    conferences:['21'],included_programs:[],excluded_programs:[]
  },programs:pac12});
  for(const school of pac12){
    const isGonzaga=school.id==='2250';
    assert.equal(api.matchesConferenceFilter('21','mid-major',school.id),!isGonzaga,school.name);
    assert.equal(api.matchesConferenceFilter('21','power',school.id),isGonzaga,school.name);
    assert.equal(api.matchesConferenceFilter('21','21',school.id),true,school.name);
    assert.equal(api.rankingEligible(school,'mid-major','all'),!isGonzaga,school.name);
    assert.equal(api.rankingEligible(school,'power','all'),isGonzaga,school.name);
  }
  api.setPoolConferenceFilter('mid-major');
  assert.deepEqual(new Set(api.poolVisible().map(p=>p.id)),
    new Set(pac12.filter(p=>p.id!=='2250').map(p=>p.id)));
  api.setPoolConferenceFilter('power');
  assert.deepEqual(api.poolVisible().map(p=>p.id),['2250']);
  assert.match(source,/matchesConferenceFilter\(card\.dataset\.conference,programConference,card\.dataset\.program\)/);
  assert.match(source,/matchesConferenceFilter\(card\.dataset\.conference,draftConference,card\.dataset\.program\)/);
  assert.match(source,/data-program="'\+escapeHTML\(p\.id\)\+'" data-conference=/);
});
