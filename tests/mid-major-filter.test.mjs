import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const end='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
assert.ok(source.includes(end),'Client startup hook should remain stable');
const stub='  return {matchesConferenceFilter,isMidMajorMenuConference,eligibleConferenceIds,conferenceMenuGroups,midMajorConferenceIds,conferenceGroups,midMajorOption,rankingTools,rankingEligible,poolVisible,programsPage,setLeague:v=>{league=v;poolDraftConfs=null;poolDraftSchools=null;}};\n})();';
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
  const directory=api.programsPage();
  assert.match(directory,/data-act="directory-conference" data-id="mid-major"/);
  assert.doesNotMatch(directory,/data-act="directory-conference" data-id="2"/);
  assert.doesNotMatch(directory,/data-act="directory-conference" data-id="45"/);
  assert.match(directory,/ACC/);
  assert.match(directory,/Horizon League/);
  assert.match(directory,/Mountain West/);
});
test('historical rankings and ratings offer only the fully included conferences and Mid-Major',()=>{
  const options=api.rankingTools('ratings','','mid-major','all');
  assert.match(options,/<option value="mid-major" selected>Mid-Major<\/option>/);
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
test('Mid-Major remains available in every conference-based menu',()=>{
  assert.match(source,/conferenceButton\(MID_MAJOR_FILTER,'Mid-Major'\)/);
  assert.match(source,/chip\(MID_MAJOR_FILTER,'Mid-Major'\)/);
  assert.match(source,/midMajorOption\(conference\)\+conferences/);
  assert.match(source,/midMajorOption\(draftConference\)\+confOptions/);
  assert.match(source,/midMajorOption\(poolConferenceFilter\)\+filterOptions/);
  assert.match(source,/matchesConferenceFilter\(homeConf,resultsConference,g.home_id\)/);
  assert.match(source,/matchesConferenceFilter\(card.dataset.conference,draftConference\)/);
  assert.match(source,/matchesConferenceFilter\(card.dataset.conference,programConference\)/);
});
