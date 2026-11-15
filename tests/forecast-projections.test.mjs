import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Exercise the actual client forecast, not a second copy of its formulas.
const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const startup='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
const exposed=`  return {
    scenario(programs,ranks,earned=0,wins=0,losses=0,asOf=1){
      me={id:'test'};
      league={programs,settings:{current_season:'2026-27',
        scoring:{best_programs:15,conference_regular_title:8,conference_tournament_title:8,
          conference_regular_title_mid_major:6,conference_tournament_title_mid_major:6}}};
      kenpomData={source:'KenPom',snapshot_date:'2026-11-15',ranks};
      kenpomFetchedAt=1;
      standingsData={season:'2026-27',as_of:asOf,program_points:{235:earned},
        program_records:{235:{wins,losses}}};
      fpMemo=null;
      return fpIndex()?.get('235');
    }
  };
})();`;
assert.ok(source.includes(startup),'Client bootstrap section changed');
const compiled=source.replace(startup,exposed);
const root={innerHTML:'',addEventListener(){},querySelector(){return null;}};
const client=new Function('document','location','URLSearchParams','return '+compiled)(
  {querySelector:()=>root,querySelectorAll:()=>[]},{search:''},URLSearchParams);
const ranksAAC=[77,78,98,113,116,127,138,143,154,170,171,202,220];
const aacSchools=ranksAAC.map((rank,i)=>({id:i===1?'235':String(9000+i),
  name:i===1?'Memphis Tigers':'AAC peer '+i,conference_id:'62'}));
const aacRanks=Object.fromEntries(aacSchools.map((school,i)=>[school.id,ranksAAC[i]]));

test('Memphis 6.5 points in four games influences the full-season projection beyond the old 29.1',()=>{
  const predicted=client.scenario(aacSchools,aacRanks,6.5,3,1);
  assert.ok(predicted,'Memphis forecast exists');
  assert.ok(predicted.baseline>27&&predicted.baseline<30);
  assert.ok(predicted.conferenceAdjustment<0,
    'a tight Wichita State rival offsets an optimistic conference-average assumption');
  assert.ok(predicted.formAdjustment>4,
    'verified earned early points should register meaningful upside');
  assert.ok(predicted.points>=32&&predicted.points<=35,
    'do not over-extrapolate a four-game run');
});

test('a tougher top rival lowers title adjustment, holding conference average equal',()=>{
  const schools=[{id:'235',name:'Memphis',conference_id:'62'},
    ...[1,2,3,4].map(i=>({id:String(9000+i),name:'Peer '+i,conference_id:'62'}))];
  const rankSet=opponents=>Object.fromEntries(schools.map((p,i)=>[p.id,i?opponents[i-1]:80]));
  const contested=client.scenario(schools,rankSet([81,120,180,220]));
  const spaced=client.scenario(schools,rankSet([135,145,160,161]));
  assert.equal(contested.baseline,spaced.baseline,
    'same mean conference rank preserves prior baseline');
  assert.ok(contested.conferenceAdjustment<spaced.conferenceAdjustment,
    'rank of the next-best team must affect title expectation');
});

test('more earned points always improve the projection for the same ranking and record',()=>{
  const a=client.scenario(aacSchools,aacRanks,6.5,3,1);
  const b=client.scenario(aacSchools,aacRanks,8.5,3,1,2);
  assert.ok(b.points>a.points);
  assert.ok(b.formAdjustment>a.formAdjustment);
});

test('earned points are a floor on forecast even for an exceptional run',()=>{
  const a=client.scenario(aacSchools,aacRanks,60,3,1);
  assert.ok(a.points>=60);
});
