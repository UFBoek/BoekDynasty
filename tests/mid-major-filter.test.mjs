import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const end='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
assert.ok(source.includes(end),'Client startup hook should be stable');
const stub='  return {matchesConferenceFilter,midMajorConferenceIds,conferenceGroups,midMajorOption,rankingTools,rankingEligible,poolVisible,initPoolDraft,setLeague:v=>{league=v;}};\n})();';
const root={innerHTML:'',addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
const document={querySelector:q=>q==='#app'?root:null,querySelectorAll:()=>[],activeElement:null};
const api=new Function('document','window','navigator','location','URLSearchParams',
  'return '+source.replace(end,stub))(document,{matchMedia:()=>({matches:false})},
  {userAgent:'node-test'},{search:'',pathname:'/'},URLSearchParams);
const majors=['23','2','7','8','4','21'];
test('mid-major groups all non-major Division I conferences together',()=>{
  const [major,multiBid,other]=api.conferenceGroups;
  const all=[...major.ids,...multiBid.ids,...other.ids];
  assert.equal(new Set(all).size,all.length,'each conference is in exactly one section');
  assert.equal(api.midMajorConferenceIds.size,multiBid.ids.length+other.ids.length);
  for(const id of all){
    assert.equal(api.matchesConferenceFilter(id,'mid-major'),!majors.includes(id),id);
    assert.equal(api.matchesConferenceFilter(id,'all'),true);
    assert.equal(api.matchesConferenceFilter(id,id),true);
  }
});
test('mid-major filter includes AAC, A10, Mountain West, WCC, and smaller leagues',()=>{
  for(const id of ['62','3','44','29','18','45','1','16','46']){
    assert.equal(api.matchesConferenceFilter(id,'mid-major'),true,id);
  }
  for(const id of majors)assert.equal(api.matchesConferenceFilter(id,'mid-major'),false,id);
});
test('historical rankings and rating selectors show an aggregated mid-major option',()=>{
  api.setLeague({settings:{conferences:['2','44','62','29'],included_programs:[],excluded_programs:[]},
    programs:[{id:'a',conference_id:'2',name:'Duke'}, {id:'b',conference_id:'44',name:'San Diego State'},
      {id:'c',conference_id:'62',name:'Memphis'}, {id:'d',conference_id:'29',name:'Gonzaga'}]});
  const options=api.rankingTools('ratings','', 'mid-major','all');
  assert.match(options,/<option value="mid-major" selected>Mid-Major \(all conferences\)<\/option>/);
  assert.match(options,/San Diego State|Mountain West/);
  assert.equal(api.rankingEligible({id:'a',conference_id:'2'},'mid-major','all'),false);
  assert.equal(api.rankingEligible({id:'b',conference_id:'44'},'mid-major','all'),true);
  assert.equal(api.rankingEligible({id:'c',conference_id:'62'},'mid-major','all'),true);
});
test('mid-major filter works in commissioner school pool',()=>{
  const pool=api.poolVisible().map(p=>p.id);
  assert.equal(pool.length,4,'all schools remain present when filter defaults to all');
  assert.equal(api.matchesConferenceFilter('2','mid-major'),false);
  assert.equal(api.matchesConferenceFilter('44','mid-major'),true);
});
test('Mid-Major is reachable from every applicable conference UI',()=>{
  assert.match(source,/conferenceButton\(MID_MAJOR_FILTER,'Mid-Major'\)/);
  assert.match(source,/chip\(MID_MAJOR_FILTER,'Mid-Major'\)/);
  assert.match(source,/midMajorOption\(conference\)\+conferences/);
  assert.match(source,/midMajorOption\(draftConference\)\+confOptions/);
  assert.match(source,/midMajorOption\(poolConferenceFilter\)\+filterOptions/);
  assert.match(source,/act==='pool-mid-major'/);
  assert.match(source,/matchesConferenceFilter\(homeConf,resultsConference\)/);
  assert.match(source,/matchesConferenceFilter\(card.dataset.conference,draftConference\)/);
  assert.match(source,/matchesConferenceFilter\(card.dataset.conference,programConference\)/);
});
