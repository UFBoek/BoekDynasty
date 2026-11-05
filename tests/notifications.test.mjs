import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const tail='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
const added="  return {set:(u,l)=>{me=u;league=l;},inbox:x=>{notificationSnapshot=x;return notificationsPage();},admin:x=>{notificationAdmin=x;adminSection='notifications';return commissionerPage();},bell:()=>{current='home';render();return root.innerHTML;}};\n})();";
assert.ok(client.includes(tail));
const root={innerHTML:'',addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
const app=new Function('document','location','URLSearchParams','window','navigator',
  'return '+client.replace(tail,added))(
  {querySelector:id=>id==='#app'?root:null,querySelectorAll:()=>[],activeElement:null},
  {search:'',pathname:'/'},URLSearchParams,
  {matchMedia:()=>({matches:false})},{userAgent:'node-test'}
);
const user={id:'commish',display_name:'Commissioner',role:'commissioner',username:'commissioner'};
const teammate={id:'manager',display_name:'Manager',role:'manager',username:'manager'};
app.set(user,{users:[user,teammate],programs:[],picks:[],ownership:[],trades:[],trade_items:[],
 draft_order:['commish','manager'],settings:{rounds:16,draft_status:'pending',league_name:'Test Dynasty',
 trading_enabled:true,conferences:[],scoring:{best_programs:8},max_managers:8},season:'2026-27'});
test('notification inbox handles unseen alerts and personal preference controls',()=>{
  const html=app.inbox({unread:1,devices:[],email_available:false,
    preferences:{trades:true,draft:true,announcements:false,push_enabled:true,email_enabled:false},
    notifications:[{id:'123e4567-e89b-12d3-a456-426614174000',kind:'draft_turn',title:"You're on the clock!",
      body:'Make pick #2.',target:'draft',created_at:1780000000,read_at:null}]});
  assert.match(html,/draft_turn|Draft alerts/);
  assert.match(html,/notification-pref-trades/);
  assert.match(html,/notification-pref-announcements/);
  assert.match(html,/notification-email-option/);
  assert.match(html,/notifications-read-all/);
  assert.match(html,/data-act="notification-open"/);
});
test('topbar bell exposes unread count to managers',()=>{
  const html=app.bell();
  assert.match(html,/data-act="tab" data-id="notifications"/);
  assert.match(html,/notification-bell-count/);
  assert.match(html,/Notifications, 1 unread/);
});
test('commissioner notifications controls show broadcasts, member devices and alert toggles',()=>{
  const html=app.admin({total:14,unread:3,pending_delivery:1,email_available:false,
    settings:{trades:true,draft:true,announcements:true},
    announcements:[{title:'Draft time',body:'Starts this weekend',recipients:2,created_at:1780000000}],
    devices:[{id:user.id,display_name:'Commissioner',devices:1},
      {id:teammate.id,display_name:'Manager',devices:0}]});
  assert.match(html,/Notification Center/);
  assert.match(html,/admin-notification-trades/);
  assert.match(html,/admin-notification-draft/);
  assert.match(html,/data-act="notification-admin-send"/);
  assert.match(html,/data-act="notification-admin-retry"/);
  assert.match(html,/Everyone in the league/);
  assert.match(html,/Manager/);
  assert.match(html,/Not enrolled/);
});
test('service worker displays and routes real push events without credentials',()=>{
  const source=readFileSync(new URL('../src/service-worker.js',import.meta.url),'utf8');
  assert.match(source,/addEventListener\('push'/);
  assert.match(source,/showNotification\(/);
  assert.match(source,/addEventListener\('notificationclick'/);
  assert.match(source,/openWindow\(/);
  assert.doesNotMatch(source,/Authorization|Bearer|localStorage/);
  const proxy=readFileSync(new URL('../src/worker-proxy.js',import.meta.url),'utf8');
  assert.match(proxy,/path==='\/sw\.js'/);
  assert.match(proxy,/new Response\(SW/);
});
test('notification data is available only through a session-validated API, with commissioner checks',()=>{
  const server=readFileSync(new URL('../supabase/functions/boek-api/notifications.js',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../supabase/functions/boek-api/index.ts',import.meta.url),'utf8');
  assert.match(entry,/activityActor\(request\)/);
  assert.match(entry,/notificationEngine\.route/);
  assert.match(entry,/notificationEngine\.onMutation/);
  assert.match(server,/if\(!actor\)return fail\('Sign in required.'/);
  assert.match(server,/actor\.role!=='commissioner'/);
  assert.match(server,/allowedPushEndpoint/);
  assert.match(server,/notification-email-form|notifications\/email\/request/);
});
