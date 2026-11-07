import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Exercise the actual notification engine with a deterministic in-memory DB
// and push transport. Do not send real alerts or modify production data.
const source=readFileSync(new URL('../supabase/functions/boek-api/notifications.js',import.meta.url),'utf8');
const mocked=source.replace(
  "import {allowedPushEndpoint,vapidKeys,deliverWebPush} from './push.js';",
  "const allowedPushEndpoint=()=>true;const vapidKeys=async()=>({public_key:'test'});const deliverWebPush=async(...args)=>globalThis.__draftTestPushes.push(args);"
);
assert.notEqual(mocked,source,'The notification transport import must be mocked');
const {createNotificationEngine}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(mocked));

function fixture(picks=0,overrides={}){
  const users=['a','b','c','d','e'].map(id=>({id,display_name:id.toUpperCase()}));
  const state={picks,status:'live',overrides};
  const notifications=[],outbox=new Map();
  let seq=0;
  const settings=()=>({draft_status:state.status,draft_order:JSON.stringify(users.map(x=>x.id)),rounds:'20'});
  const db={
    prepare(sql){
      let args=[];
      return {
        bind(...values){args=values;return this;},
        async all(){
          if(sql.startsWith('SELECT key,value FROM settings WHERE key IN'))return {results:Object.entries(settings()).map(([key,value])=>({key,value}))};
          if(sql.startsWith('SELECT id,display_name FROM users ORDER BY'))return {results:users};
          if(sql.startsWith('SELECT endpoint,p256dh,auth_secret FROM cbb_push_devices'))return {results:[{endpoint:'https://push.test/'+args[0],p256dh:'test',auth_secret:'test'}]};
          throw Error('Unexpected list query: '+sql);
        },
        async first(){
          if(sql.startsWith('SELECT trades,draft,announcements,push_enabled'))return {trades:true,draft:true,announcements:true,push_enabled:true,email_enabled:false,email_address:null,email_verified_at:null};
          if(sql.startsWith('SELECT value FROM settings WHERE key=?'))return {value:'1'};
          if(sql.startsWith('SELECT count(*) AS n FROM picks'))return {n:state.picks};
          if(sql.startsWith('SELECT owner_manager_id FROM draft_pick_owners'))return state.overrides[args[0]]?{owner_manager_id:state.overrides[args[0]]}:null;
          if(sql.startsWith('INSERT INTO cbb_notifications')){
            const [user_id,kind,title,body,target,reference_id]=args;
            if(notifications.some(n=>n.user_id===user_id&&n.kind===kind&&n.reference_id===reference_id))return null;
            const row={id:'test-'+(++seq),user_id,kind,title,body,target,reference_id};
            notifications.push(row);
            return {id:row.id};
          }
          if(sql.startsWith('SELECT id,user_id,kind,title,body,target FROM cbb_notifications'))return notifications.find(n=>n.id===args[0])||null;
          if(sql.startsWith('SELECT count(*) AS n FROM cbb_notifications WHERE user_id'))return {n:notifications.filter(n=>n.user_id===args[0]).length};
          throw Error('Unexpected single query: '+sql);
        },
        async run(){
          if(sql.startsWith('INSERT INTO cbb_notification_outbox')){outbox.set(args[0],{processed:false});return {meta:{changes:1}};}
          if(sql.startsWith('UPDATE cbb_notification_outbox')){const row=outbox.get(args[3]);if(row)row.processed=!!args[0];return {meta:{changes:1}};}
          if(sql.startsWith('UPDATE cbb_push_devices SET last_delivered_at'))return {meta:{changes:1}};
          throw Error('Unexpected mutation: '+sql);
        }
      };
    }
  };
  return {state,notifications,outbox,engine:createNotificationEngine(db)};
}
function locate(rows,kind,slot){return rows.filter(n=>n.kind===kind&&n.reference_id===(kind==='draft_soon'?'soon:':'turn:')+slot);}
function pushes(){globalThis.__draftTestPushes=[];return globalThis.__draftTestPushes;}

test('3RR draft sends on-clock and one-pick-away pushes to the correct round 3 managers',async()=>{
  const sent=pushes(),f=fixture(10); // 11th overall: first pick of reversed round 3
  await f.engine.reconcileDraft();
  assert.deepEqual(locate(f.notifications,'draft_turn',11).map(n=>n.user_id),['e']);
  assert.deepEqual(locate(f.notifications,'draft_soon',12).map(n=>n.user_id),['d']);
  assert.match(locate(f.notifications,'draft_soon',12)[0].title,/up next/i);
  assert.equal(sent.length,2,'Both alerts should be passed to the web-push transport');
  assert.deepEqual(sent.map(call=>call[1].endpoint),['https://push.test/e','https://push.test/d']);
  await f.engine.reconcileDraft();
  assert.equal(sent.length,2,'Reconciliation must not send duplicate pushes');
  assert.equal(f.outbox.size,2);
  assert.ok([...f.outbox.values()].every(x=>x.processed));
});

test('3RR round 3/4 turnaround skips redundant soon alerts during back-to-back picks',async()=>{
  pushes();
  const f=fixture(14);
  await f.engine.reconcileDraft(); // #15 A; #16 A, also A
  assert.deepEqual(locate(f.notifications,'draft_turn',15).map(n=>n.user_id),['a']);
  assert.equal(locate(f.notifications,'draft_soon',16).length,0);
  f.state.picks=15;
  await f.engine.reconcileDraft(); // #16 A; #17 B
  assert.deepEqual(locate(f.notifications,'draft_turn',16).map(n=>n.user_id),['a']);
  assert.deepEqual(locate(f.notifications,'draft_soon',17).map(n=>n.user_id),['b']);
});

test('current live draft slot 18 alerts #19, not #20, and honors traded pick owners',async()=>{
  const sent=pushes(),f=fixture(17,{18:'a',19:'e'});
  await f.engine.reconcileDraft();
  assert.deepEqual(locate(f.notifications,'draft_turn',18).map(n=>n.user_id),['a']);
  assert.deepEqual(locate(f.notifications,'draft_soon',19).map(n=>n.user_id),['e']);
  assert.equal(f.notifications.some(n=>n.reference_id==='soon:20'),false);
  assert.deepEqual(sent.map(call=>call[1].endpoint),['https://push.test/a','https://push.test/e']);
});

test('successful draft pick triggers immediate alerts, and paused drafts suppress alerts',async()=>{
  pushes();
  const f=fixture(17);
  await f.engine.onMutation('draft/pick',{id:'c',display_name:'C'}, {},
    {clone:()=>({json:async()=>({overall:17})})});
  assert.deepEqual(locate(f.notifications,'draft_turn',18).map(n=>n.user_id),['c']);
  assert.deepEqual(locate(f.notifications,'draft_soon',19).map(n=>n.user_id),['d']);
  f.state.picks=18;
  f.state.status='paused';
  await f.engine.reconcileDraft();
  assert.equal(locate(f.notifications,'draft_turn',19).length,0);
});

test('scheduled reconciliation remains connected to the API entrypoint',()=>{
  const entry=readFileSync(new URL('../supabase/functions/boek-api/index.ts',import.meta.url),'utf8');
  const server=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
  assert.match(entry,/notificationEngine\.reconcileDraft\(\)/);
  assert.match(entry,/notificationEngine\.flush\(12\)/);
  const master=server.match(/const reversedDraftRound=round=>[^;]+;/)?.[0];
  assert.ok(master,'Authoritative 3RR ordering must be present');
  assert.ok(source.includes(master),'Notifications must use the exact authoritative 3RR round-direction rule');
});
