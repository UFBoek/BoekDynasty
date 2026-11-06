import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const boot='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
assert.ok(source.includes(boot),'Tests must replace startup without calling the live API');
const end=`  return {
    init:(u,l)=>{me=u;league=l;current='home';},
    screen:()=>{render();return {html:root.innerHTML,inert:root.querySelector('.shell')?.inert};},
    navigate:async id=>{await action({dataset:{act:'tab',id}});return current;},
    inbox:()=>notificationsPage()
  };\n})();`;
const shell={inert:false};
const root={innerHTML:'',addEventListener(){},querySelector(sel){return sel==='.shell'?shell:null;},querySelectorAll(){return [];}};
const document={querySelector:id=>id==='#app'?root:null,querySelectorAll:()=>[],activeElement:null};
let installed=true;
const window={matchMedia:()=>({matches:installed}),scrollTo(){}};
const navigator={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',standalone:false};
const app=new Function('document','location','URLSearchParams','window','navigator',
  'return '+source.replace(boot,end))(document,{search:'',pathname:'/'},URLSearchParams,window,navigator);
app.init({id:'commissioner',display_name:'Commissioner',role:'commissioner',username:'commissioner'},
 {users:[{id:'commissioner',display_name:'Commissioner',role:'commissioner',username:'commissioner'}],
  programs:[],picks:[],ownership:[],trades:[],trade_items:[],season:'2026-27',
  settings:{rounds:16,draft_status:'pending',league_name:'Test Dynasty',scoring:{best_programs:8},
    max_managers:8,conferences:[],draft_order:[],trading_enabled:true}});
test('installed Home Screen apps never display a mandatory notification popup',()=>{
  installed=true;
  const {html,inert}=app.screen();
  assert.doesNotMatch(html,/notification-setup-overlay|notification-setup-modal|aria-modal="true"/);
  assert.equal(inert,false);
  assert.doesNotMatch(source,/function notificationOnboarding|function enterNotificationSetup|notificationGateOpen/);
});
test('all navigation remains accessible without push permission',async()=>{
  installed=true;
  assert.equal(await app.navigate('draft'),'draft');
  assert.equal(await app.navigate('trades'),'trades');
  assert.equal(await app.navigate('notifications'),'notifications');
  const {html,inert}=app.screen();
  assert.doesNotMatch(html,/notification-setup-overlay/);
  assert.equal(inert,false);
});
test('normal browsers also show no notification popup',()=>{
  installed=false;
  const {html,inert}=app.screen();
  assert.doesNotMatch(html,/notification-setup-overlay/);
  assert.equal(inert,false);
});
test('notification inbox, preferences and voluntary push controls remain available',()=>{
  const html=app.inbox();
  assert.match(html,/notification-inbox/);
  assert.match(html,/notification-pref-draft/);
  assert.match(html,/notification-pref-push_enabled/);
  assert.match(source,/if\(act==='notifications-enable-push'\)/);
  assert.match(source,/if\(act==='notifications-disable-push'\)/);
});
