import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
const bootstrap="  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();";
assert.ok(client.includes(bootstrap),'Client bootstrap changed.');
const root={innerHTML:'',addEventListener(){},querySelector(){return null;}};
const app=new Function('document','location','URLSearchParams','return '+client.replace(bootstrap,"  return {isPrankDraftPick};\n})();"))(
  {querySelector:key=>key==='#app'?root:null},{search:''},URLSearchParams
);

test('Only Syracuse and Providence trigger the prank',()=>{
  assert.equal(app.isPrankDraftPick('183'),true);
  assert.equal(app.isPrankDraftPick(2507),true);
  assert.equal(app.isPrankDraftPick('1'),false);
  assert.equal(app.isPrankDraftPick('1830'),false);
  assert.equal(app.isPrankDraftPick('25070'),false);
});

test('Preview and queuing are unaffected; the message happens after confirmation',()=>{
  const select=client.slice(client.indexOf("    if(act==='draft-select'){"),client.indexOf("    if(act==='draft-clear-selection')"));
  assert.match(select,/draftSelectedProgram=String\(id\);render\(\);/);
  assert.doesNotMatch(select,/isPrankDraftPick|DRAFT_PRANK_ERROR/);
  const desk=client.slice(client.indexOf("}else if(act==='draft-confirm'){"),client.indexOf("}else if(act==='pick'){"));
  assert.ok(desk.indexOf('if(isPrankDraftPick(programId))')>desk.indexOf('if(!isMyTurn())'));
  assert.ok(desk.indexOf('if(isPrankDraftPick(programId))')<desk.indexOf("await api('draft/pick'"));
  assert.match(desk,/window\.alert\(DRAFT_PRANK_ERROR\);return;/);
  const other=client.slice(client.indexOf("}else if(act==='pick'){"),client.indexOf("}else if(act==='sync'){"));
  assert.ok(other.indexOf('if(isPrankDraftPick(id))')>other.indexOf('window.confirm('));
  assert.ok(other.indexOf('if(isPrankDraftPick(id))')<other.indexOf("await api('draft/pick'"));
});

test('Both API routes reject before pick insertion or clock mutation',()=>{
  for(const source of [edge,worker]){
    const pick=source.slice(source.indexOf("if(path==='draft/pick'){"));
    const blocked=pick.indexOf("if(programId==='183'||programId==='2507')");
    assert.ok(blocked>=0,'missing server-side restriction');
    assert.match(pick,/Error: These programs are too garbage\./);
    assert.ok(blocked<pick.indexOf('INSERT INTO picks'));
    assert.ok(blocked<pick.indexOf('draft_deadline'));
  }
});
