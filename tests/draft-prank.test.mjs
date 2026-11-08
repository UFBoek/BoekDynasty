import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const bootstrap="  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();";
assert.ok(client.includes(bootstrap),'Client bootstrap changed.');
const root={innerHTML:'',addEventListener(){},querySelector(){return null;}};
const exposed=client.replace(bootstrap,"  return {isPrankDraftPick,steps:DRAFT_PRANK_MESSAGES,start:id=>{draftPrank={programId:String(id),step:0}},next:advanceDraftPrank,current:()=>draftPrank,dialog:draftPrankDialog};\n})();");
const app=new Function('document','location','URLSearchParams','return '+exposed)(
  {querySelector:key=>key==='#app'?root:null},{search:''},URLSearchParams
);

test('Only Syracuse and Providence get the warnings',()=>{
  for(const id of ['183','2507'])assert.equal(app.isPrankDraftPick(id),true);
  for(const id of ['1','1830','25070'])assert.equal(app.isPrankDraftPick(id),false);
});

test('Four messages appear in the specified order, and only the fourth Continue permits submission',()=>{
  assert.deepEqual(app.steps,["Error: These programs are too garbage. Are you sure you want to continue?","Are you sure? There are a lot of good programs left.","I'm trying to do you a favor. Take a look back at some of the teams that are left.","Alright man, last chance."]);
  for(const id of ['183','2507']){
    app.start(id);
    for(let stage=0;stage<4;stage++){
      assert.equal(app.current().step,stage);
      const html=app.dialog();
      assert.match(html,/role="alertdialog"/);
      assert.match(html,/data-act="draft-prank-cancel"/);
      assert.match(html,/data-act="draft-prank-continue"/);
      assert.ok(html.includes(app.steps[stage].replaceAll("'",'&#39;')));
      assert.equal(app.next(),stage===3);
    }
  }
});

test('Pre-confirmation selection and queueing remain completely normal',()=>{
  const select=client.slice(client.indexOf("    if(act==='draft-select'){"),client.indexOf("    if(act==='draft-clear-selection')"));
  assert.match(select,/draftSelectedProgram=String\(id\);render\(\);/);
  assert.doesNotMatch(select,/showDraftPrank|DRAFT_PRANK_MESSAGES/);
  const primary=client.slice(client.indexOf("}else if(act==='draft-confirm'){"),client.indexOf("}else if(act==='pick'){"));
  assert.match(primary,/showDraftPrank\(programId\)/);
  assert.ok(primary.indexOf('showDraftPrank(programId)')<primary.indexOf("await api('draft/pick'"));
  const other=client.slice(client.indexOf("}else if(act==='pick'){"),client.indexOf("}else if(act==='sync'){"));
  assert.ok(other.indexOf('showDraftPrank(id)')>other.indexOf('window.confirm('));
  const continueFlow=client.slice(client.indexOf("}else if(act==='draft-prank-continue'){"),client.indexOf("}else if(act==='draft-confirm'){"));
  assert.ok(continueFlow.indexOf('advanceDraftPrank()')<continueFlow.indexOf("await api('draft/pick'"));
  assert.match(continueFlow,/if\(!advanceDraftPrank\(\)\)/);
  assert.match(css,/\.draft-prank-layer/);
});

test('Both APIs allow Syracuse and Providence to be drafted after the full warning sequence',()=>{
  for(const source of [edge,worker]){
    const route=source.slice(source.indexOf("if(path==='draft/pick'){"));
    assert.doesNotMatch(route,/if\(programId==='183'\|\|programId==='2507'\)/);
    assert.match(route,/INSERT INTO picks/);
  }
});
