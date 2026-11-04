import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const end="  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();".replaceAll('\n','\n');
assert.ok(source.includes(end),'client bootstrap changed');
const exposed=source.replace(end,"  return {set:(user,state)=>{me=user;league=state;},reconcile:reconcileDraftQueue,queue:()=>draftWatchlist,dirty:()=>draftQueueDirty,version:()=>draftQueueVersion};\n})();".replace('\n','\n'));
function create(store={}){
  const saved=new Map(Object.entries(store));
  const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  const root={innerHTML:'',addEventListener(){}};
  const app=new Function('document','location','URLSearchParams','localStorage','setTimeout','clearTimeout',
    'return '+exposed)({querySelector:x=>x==='#app'?root:null}, {search:''},URLSearchParams,storage,()=>1,()=>{});
  return {app,saved};
}
const user={id:'manager-1'};
test('mobile-only local queue is preserved and scheduled for upload',()=>{
  const {app}=create({'boek_dynasty_draft_queue_manager-1':'["57","150","84"]'});
  app.set(user,{draft_queue:{items:[],version:0}});
  app.reconcile();
  assert.deepEqual([...app.queue()],['57','150','84']);
  assert.equal(app.dirty(),true);
  assert.equal(app.version(),0);
});
test('desktop without local picks loads the manager account queue in order',()=>{
  const {app}=create();
  app.set(user,{draft_queue:{items:['57','84'],version:3}});
  app.reconcile();
  assert.deepEqual([...app.queue()],['57','84']);
  assert.equal(app.version(),3);
  assert.equal(app.dirty(),false);
});
test('first migration adds local-only picks after established server picks',()=>{
  const {app}=create({'boek_dynasty_draft_queue_manager-1':'["84","101"]'});
  app.set(user,{draft_queue:{items:['57','84'],version:5}});
  app.reconcile();
  assert.deepEqual([...app.queue()],['57','84','101']);
  assert.equal(app.dirty(),true);
});
test('an older state response cannot overwrite a more recent account queue',()=>{
  const {app}=create({'boek_dynasty_draft_queue_manager-1_account_synced_v1':'1'});
  app.set(user,{draft_queue:{items:['57','84'],version:9}});
  app.reconcile();
  app.set(user,{draft_queue:{items:[],version:8}});
  app.reconcile();
  assert.deepEqual([...app.queue()],['57','84']);
});
