import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const boot='  try{\n    setInterval(updateDraftClock,1000);\n    Promise.resolve(boot()).catch(startupFailure);\n  }catch(e){startupFailure(e);}\n})();';
assert.ok(source.includes(boot),'Tests must replace the startup function without running the live API');
const end=`  return {
    init:(u,l)=>{me=u;league=l;current='home';},
    setGate:kind=>{notificationGate=kind;},
    dialog:()=>notificationOnboarding(),
    screen:()=>{render();return {html:root.innerHTML,inert:root.querySelector('.shell')?.inert};},
    navigate:async id=>{await action({dataset:{act:'tab',id}});return current;},
    gateOpen:()=>notificationGateOpen()
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
test('On the next login a push setup dialog overlays and inerts the league',()=>{
  app.setGate('prompt');
  const {html,inert}=app.screen();
  assert.match(html,/notification-setup-overlay/);
  assert.match(html,/aria-modal="true"/);
  assert.match(html,/Enable notifications/);
  assert.equal(inert,true);
  assert.doesNotMatch(app.dialog(),/notification-setup-unavailable/);
});
test('Navigation cannot advance while push setup is unresolved',async()=>{
  app.setGate('prompt');
  assert.equal(await app.navigate('draft'),'home');
  assert.equal(await app.navigate('trades'),'home');
  assert.equal(app.gateOpen(),true);
});
test('Denied notifications expose browser settings and a fail-safe continuation path',()=>{
  app.setGate('blocked');
  const html=app.dialog();
  assert.match(html,/Allow notifications in app settings/);
  assert.match(html,/notification-setup-recheck/);
  assert.match(html,/notification-setup-unavailable/);
  app.setGate('error');
  assert.match(app.dialog(),/notification-setup-unavailable/);
});
test('Mobile browser without Home Screen install does not show an automatic permission dialog',()=>{
  installed=false;
  app.setGate('prompt');
  const {html,inert}=app.screen();
  assert.doesNotMatch(html,/notification-setup-overlay/);
  assert.equal(inert,false);
  assert.equal(app.gateOpen(),false);
  installed=true;
});
test('Already enabled notifications do not block the app',()=>{
  app.setGate('done');
  const {html,inert}=app.screen();
  assert.doesNotMatch(html,/notification-setup-overlay/);
  assert.equal(inert,false);
  assert.equal(app.gateOpen(),false);
});
