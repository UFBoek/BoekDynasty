import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

const source=readFileSync(new URL('../supabase/functions/boek-api/server.js',import.meta.url),'utf8');
const body=source.replace(/^import[^\n]*\n/gm,'').replace('export default (function makeWorker(){','return (function makeWorker(){');
assert.match(body,/return \\(function makeWorker\\(\\)/,'API module must be transformable into test worker');
const factory=new Function('DATA_PIPELINE','PROGRAM_DIRECTORY','crypto','atob','btoa','TextEncoder','Response','URL',body);
const worker=factory({},[],webcrypto,atob,btoa,TextEncoder,Response,URL);
const authToken='test-session-token-longer-than-the-required-minimum';
const managerId='11111111-1111-4111-8111-111111111111';
const commishId='22222222-2222-4222-8222-222222222222';

function environment(role='commissioner',targetRole='manager'){
  const calls=[],saved={};
  const env={FRONTEND_ORIGIN:'https://dynasty.test',DB:{
    async batch(statements){
      for(const statement of statements){
        const {query:sql,args}=statement._statement;
        calls.push({operation:'write',sql,args});
        if(sql.startsWith('UPDATE users SET password_hash=')){
          saved.hash=args[0];saved.salt=args[1];saved.userId=args[2];
        }
        if(sql.startsWith('DELETE FROM sessions WHERE user_id='))saved.revoked=args[0];
      }
      return [{meta:{changes:1}},{meta:{changes:1}}];
    }
  }};
  // Store arguments like the production D1-compatible adapter does.
  env.DB.prepare=sql=>{const statement={query:sql,args:[]};return {
    bind(...args){statement.args=args;return {
      _statement:statement,
      async first(){
        calls.push({operation:'first',sql,args});
        if(sql.includes('FROM sessions s JOIN users u'))
          return {id:role==='commissioner'?commishId:managerId,
            username:role==='commissioner'?'commish':'player',
            display_name:'League member',role,token_hash:'hash-of-token',expires_at:9999999999};
        if(sql.startsWith('SELECT id,username,display_name,role FROM users'))
          return {id:args[0],username:targetRole==='manager'?'player':'commish',
            display_name:'League member',role:targetRole};
        throw Error('Unexpected read: '+sql);
      }
    };}};
  return {env,calls,saved};
}
function request(targetId=managerId){
  return new Request('https://dynasty.test/api/admin/member/reset-password',{
    method:'POST',headers:{Authorization:'Bearer '+authToken,'Content-Type':'application/json',
      Origin:'https://dynasty.test'},body:JSON.stringify({manager_id:targetId})
  });
}
test('only commissioner sessions may reset passwords',async()=>{
  const {env,calls}=environment('manager');
  const res=await worker.fetch(request(),env),data=await res.json();
  assert.equal(res.status,403);
  assert.match(data.error,/Commissioner access required/);
  assert.equal(calls.filter(c=>c.operation==='write').length,0);
});
test('commissioner cannot reset another commissioner account',async()=>{
  const {env,calls}=environment('commissioner','commissioner');
  const res=await worker.fetch(request(commishId),env),data=await res.json();
  assert.equal(res.status,404);
  assert.match(data.error,/Only manager accounts/);
  assert.equal(calls.filter(c=>c.operation==='write').length,0);
});
test('reset produces a one-time credential, hashes it and revokes all target sessions',async()=>{
  const {env,calls,saved}=environment('commissioner','manager');
  const res=await worker.fetch(request(),env),data=await res.json();
  assert.equal(res.status,200,JSON.stringify(data));
  assert.equal(res.headers.get('Cache-Control'),'no-store');
  assert.equal(data.username,'player');
  assert.equal(data.manager_id,managerId);
  assert.match(data.temporary_password,/^[A-Za-z0-9_-]{24}$/);
  assert.equal(Object.hasOwn(data,'password_hash'),false);
  assert.equal(Object.hasOwn(data,'salt'),false);
  assert.equal(saved.revoked,managerId);
  assert.equal(saved.userId,managerId);
  assert.match(saved.hash,/^[a-f0-9]{64}$/);
  assert.notEqual(saved.hash,data.temporary_password);
  assert.ok(calls.some(c=>c.sql.startsWith('UPDATE users SET password_hash=')));
  assert.ok(calls.some(c=>c.sql.startsWith('DELETE FROM sessions WHERE user_id=')));
  const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(data.temporary_password),'PBKDF2',false,['deriveBits']);
  const hash=new Uint8Array(await webcrypto.subtle.deriveBits({
    name:'PBKDF2',salt:new TextEncoder().encode(saved.salt),iterations:100000,hash:'SHA-256'
  },key,256));
  assert.equal([...hash].map(x=>x.toString(16).padStart(2,'0')).join(''),saved.hash);
});
test('reset rejects malformed manager IDs without accessing account records',async()=>{
  const {env,calls}=environment('commissioner');
  const res=await worker.fetch(request('../other'),env);
  assert.equal(res.status,400);
  assert.equal(calls.filter(c=>c.sql.startsWith('SELECT id,username,display_name,role FROM users')).length,0);
});
test('members screen displays usernames but keeps temporary passwords out of league state',()=>{
  const client=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
  assert.match(client,/panelHeading\('Account management'/);
  assert.match(client,/data-act="admin-reset-member-password"/);
  assert.match(client,/data-act="copy-reset-password"/);
  assert.match(client,/passwordResetReceipt=null;render\(\);return;/);
  assert.match(source,/SELECT id,username,display_name,role,created_at,avatar_data,accent_color,favorite_program_id FROM users/);
});
