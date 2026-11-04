import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');

async function runStartup(authenticated){
  let fatal=null;
  const app={innerHTML:'Loading Boek Dynasty…',addEventListener(){},querySelector(){return null;}};
  const league={
    user:{id:'test',username:'test',display_name:'Test Manager',role:'manager'},
    users:[{id:'test',username:'test',display_name:'Test Manager',role:'manager'}],
    programs:[],picks:[],ownership:[],trades:[],trade_items:[],archives:[],
    archived_rosters:[],season_records:[],waiver_claims:[],roster_transactions:[],
    draft_order:['test'],settings:{league_name:'Boek Dynasty',rounds:16,max_managers:7,
      draft_status:'pending',draft_clock_seconds:0,draft_deadline:0,
      conferences:[],scoring:{best_programs:8},trading_enabled:true,waivers_enabled:false},
    season:'2026-27'
  };
  const sandbox={
    document:{querySelector:query=>query==='#app'?app:null,querySelectorAll:()=>[],hidden:false,activeElement:null},
    location:{search:'',pathname:'/'},
    URLSearchParams,
    navigator:{},
    window:{matchMedia:()=>({matches:false})},
    setInterval:()=>1,
    fetch:async url=>({
      ok:url==='/api/status'||authenticated,
      status:authenticated||url==='/api/status'?200:401,
      json:async()=>url==='/api/status'
        ?{league_name:'Boek Dynasty',needs_setup:false}
        :authenticated?league:{error:'Sign in required.'}
    }),
    console:{error:e=>{fatal=String(e)}}
  };
  vm.runInNewContext(client,sandbox,{filename:'src/client.js'});
  for(let i=0;i<80;i++)await Promise.resolve();
  return {html:app.innerHTML,fatal};
}

test('the real, unmodified client starts without undefined draft clock errors',async()=>{
  const guest=await runStartup(false);
  assert.equal(guest.fatal,null);
  assert.match(guest.html,/data-form="login"/);
  assert.doesNotMatch(guest.html,/Loading Boek Dynasty/);
});

test('the real, unmodified client renders the league shell for signed-in users',async()=>{
  const member=await runStartup(true);
  assert.equal(member.fatal,null);
  assert.match(member.html,/class="shell"/);
  assert.match(member.html,/data-id="results"/);
  assert.doesNotMatch(member.html,/Loading Boek Dynasty/);
});

test('startup error has a recoverable reload screen',()=>{
  assert.match(client,/const startupFailure=/);
  assert.match(client,/Reload site/);
  assert.match(client,/function updateDraftClock\(\)/);
});
