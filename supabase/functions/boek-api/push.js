// RFC 8291 aes128gcm encrypted payloads, authenticated using RFC 8292 VAPID.
// Private signing key is generated on first request and stored only server-side.
const enc=new TextEncoder();
const b64=x=>btoa(String.fromCharCode(...x)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-String(s).length%4)%4)),c=>c.charCodeAt(0));
const join=(...xs)=>{const out=new Uint8Array(xs.reduce((n,x)=>n+x.byteLength,0));let o=0;for(const x of xs){out.set(x,o);o+=x.byteLength;}return out;};
const hkdf=async(input,salt,info,length)=>{
  const key=await crypto.subtle.importKey('raw',input,'HKDF',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));
};
export function allowedPushEndpoint(value){
  try{
    const u=new URL(value),host=u.hostname.toLowerCase();
    return value.length<2048&&u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&!u.search&&
      (host==='fcm.googleapis.com'||host==='android.googleapis.com'||
      host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||
      host==='web.push.apple.com'||host==='push.apple.com'||host.endsWith('.push.apple.com')||
      host==='wns.notify.windows.com'||host.endsWith('.notify.windows.com'));
  }catch{return false;}
}
export async function vapidKeys(db){
  let row=await db.prepare('SELECT public_key,private_jwk FROM cbb_push_vapid_keys WHERE id=1').first();
  if(row)return row;
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const raw=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
  const privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
  await db.prepare('INSERT INTO cbb_push_vapid_keys(id,public_key,private_jwk) VALUES(1,?,?::jsonb) ON CONFLICT(id) DO NOTHING')
    .bind(b64(raw),JSON.stringify(privateJwk)).run();
  row=await db.prepare('SELECT public_key,private_jwk FROM cbb_push_vapid_keys WHERE id=1').first();
  return row;
}
export async function deliverWebPush(keys,device,payload){
  if(!allowedPushEndpoint(device.endpoint))throw new Error('Untrusted push service.');
  const receiver=decode(device.p256dh),auth=decode(device.auth_secret);
  if(receiver.length!==65||receiver[0]!==4||auth.length!==16)throw new Error('Invalid subscription keys.');
  const peer=await crypto.subtle.importKey('raw',receiver,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const ephemeral=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const sender=new Uint8Array(await crypto.subtle.exportKey('raw',ephemeral.publicKey));
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:peer},ephemeral.privateKey,256));
  const ikm=await hkdf(shared,auth,join(enc.encode('WebPush: info'),new Uint8Array([0]),receiver,sender),32);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const cek=await hkdf(ikm,salt,enc.encode('Content-Encoding: aes128gcm\0'),16);
  const nonce=await hkdf(ikm,salt,enc.encode('Content-Encoding: nonce\0'),12);
  const aes=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,tagLength:128},aes,
    join(enc.encode(JSON.stringify(payload)),new Uint8Array([2]))));
  const record=new Uint8Array(21+sender.length);
  record.set(salt);new DataView(record.buffer).setUint32(16,4096,false);
  record[20]=sender.length;record.set(sender,21);
  const jwk=typeof keys.private_jwk==='string'?JSON.parse(keys.private_jwk):keys.private_jwk;
  const signKey=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const now=Math.floor(Date.now()/1000);
  const body={aud:new URL(device.endpoint).origin,exp:now+3600,sub:'https://boek-dynasty.fig-league-archive.workers.dev/'};
  const content=b64(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})))+'.'+b64(enc.encode(JSON.stringify(body)));
  const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signKey,enc.encode(content)));
  const authorization='vapid t='+content+'.'+b64(signature)+', k='+keys.public_key;
  const response=await fetch(device.endpoint,{method:'POST',headers:{
    Authorization:authorization,'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',
    TTL:'86400',Urgency:payload.kind==='draft_turn'?'high':'normal'
  },body:join(record,encrypted),signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Object.assign(new Error('Push service HTTP '+response.status),{status:response.status});
  return true;
}
