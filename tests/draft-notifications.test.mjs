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
          if(sql.startsWith('UPDATE cbb_notification_outbox')){const row=outbox.get(args[2]);if(row)row.processed=!!args[0];return {meta:{changes:1}};}
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

test('3RR sends only on-clock push to the correct manager in round three',async()=>{
  const sent=pushes(),f=fixture(10); // #11 is E, first pick of reversed round 3
  await f.engine.reconcileDraft();
  assert.deepEqual(locate(f.notifications,'draft_turn',11).map(n=>n.user_id),['e']);
  assert.equal(f.notifications.filter(n=>n.kind==='draft_soon').length,0);
  assert.equal(sent.length,1,'Only the on-clock notification should be pushed');
  assert.equal(sent[0][1].endpoint,'https://push.test/e');
  await f.engine.reconcileDraft();
  assert.equal(sent.length,1,'Rechecking the same turn must not resend an alert');
  assert.equal(f.outbox.size,1);
  assert.ok([...f.outbox.values()].every(x=>x.processed));
});

test('3RR round three/four reversal targets the correct on-clock manager',async()=>{
  pushes();
  const f=fixture(14);
  await f.engine.reconcileDraft(); // #15 A
  assert.deepEqual(locate(f.notifications,'draft_turn',15).map(n=>n.user_id),['a']);
  f.state.picks=15;
  await f.engine.reconcileDraft(); // #16 A; first pick of round 4
  assert.deepEqual(locate(f.notifications,'draft_turn',16).map(n=>n.user_id),['a']);
  f.state.picks=16;
  await f.engine.reconcileDraft(); // #17 B
  assert.deepEqual(locate(f.notifications,'draft_turn',17).map(n=>n.user_id),['b']);
  assert.equal(f.notifications.some(n=>n.kind==='draft_soon'),false);
});

test('traded draft pick belongs to its current owner and never generates advance alerts',async()=>{
  const sent=pushes(),f=fixture(17,{18:'a',19:'e'});
  await f.engine.reconcileDraft();
  assert.deepEqual(locate(f.notifications,'draft_turn',18).map(n=>n.user_id),['a']);
  assert.equal(f.notifications.length,1);
  assert.deepEqual(sent.map(call=>call[1].endpoint),['https://push.test/a']);
});

test('successful draft picks trigger immediate on-clock alerts; paused drafts do not',async()=>{
  pushes();
  const f=fixture(17);
  await f.engine.onMutation('draft/pick',{id:'c',display_name:'C'}, {},
    {clone:()=>({json:async()=>({overall:17})})});
  assert.deepEqual(locate(f.notifications,'draft_turn',18).map(n=>n.user_id),['c']);
  assert.equal(f.notifications.some(n=>n.kind==='draft_soon'),false);
  f.state.picks=18;
  f.state.status='paused';
  await f.engine.reconcileDraft();
  assert.equal(locate(f.notifications,'draft_turn',19).length,0);
});

test('scheduled data sync cannot create a new draft notification',()=>{
  const entry=readFileSync(new URL('../supabase/functions/boek-api/index.ts',import.meta.url),'utf8');
  const server=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
  assert.doesNotMatch(entry,/notificationEngine\.reconcileDraft\(\)/);
  assert.match(entry,/notificationEngine\.flush\(12\)/);
  assert.doesNotMatch(source,/emit\(soonOwner,'draft_soon'/);
  const master=server.match(/const reversedDraftRound=round=>[^;]+;/)?.[0];
  assert.ok(master,'Authoritative 3RR ordering must be present');
  assert.ok(source.includes(master),'Notifications must use the exact authoritative 3RR round-direction rule');
});
