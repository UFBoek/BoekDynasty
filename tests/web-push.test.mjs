import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

const source=readFileSync(new URL('../supabase/functions/boek-api/push.js',import.meta.url),'utf8')
  .replaceAll('export async function ','async function ').replaceAll('export function ','function ');
const enc=new TextEncoder();
const b64=x=>Buffer.from(x).toString('base64url');
const decode=x=>new Uint8Array(Buffer.from(x,'base64url'));
const append=(...arrs)=>Buffer.concat(arrs.map(x=>Buffer.from(x)));
const hkdf=async(ikm,salt,info,n)=>{
  const key=await webcrypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);
  return new Uint8Array(await webcrypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,n*8));
};
test('Web Push encrypts an interoperable aes128gcm record and signs correct VAPID JWT',async()=>{
  const client=await webcrypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const senderSigning=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const clientPublic=new Uint8Array(await webcrypto.subtle.exportKey('raw',client.publicKey));
  const vapidPublic=new Uint8Array(await webcrypto.subtle.exportKey('raw',senderSigning.publicKey));
  const private_jwk=await webcrypto.subtle.exportKey('jwk',senderSigning.privateKey);
  const secret=webcrypto.getRandomValues(new Uint8Array(16));
  const keys={public_key:b64(vapidPublic),private_jwk};
  let request=null;
  const send= new Function('crypto','fetch','TextEncoder','AbortSignal',source+
    '\nreturn {deliverWebPush,allowedPushEndpoint};')(webcrypto,async(url,options)=>{
    request={url,options};return {ok:true,status:201};
  },TextEncoder,AbortSignal);
  assert.equal(send.allowedPushEndpoint('https://localhost:8080/abc'),false);
  assert.equal(send.allowedPushEndpoint('https://fcm.googleapis.com/fcm/send/example'),true);
  const device={endpoint:'https://fcm.googleapis.com/fcm/send/example',
    p256dh:b64(clientPublic),auth_secret:b64(secret)};
  const original={kind:'trade_offer',title:'New offer',body:'Someone sent you a trade.',url:'/?notifications=1'};
  assert.equal(await send.deliverWebPush(keys,device,original),true);
  assert.equal(request.options.headers['Content-Encoding'],'aes128gcm');
  const jwt=request.options.headers.Authorization.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.ok(jwt,'The VAPID Authorization header is present');
  assert.equal(jwt[2],keys.public_key);
  const parts=jwt[1].split('.');
  assert.equal(JSON.parse(Buffer.from(parts[1],'base64url').toString()).aud,'https://fcm.googleapis.com');
  assert.equal(await webcrypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},senderSigning.publicKey,
    decode(parts[2]),enc.encode(parts[0]+'.'+parts[1])),true);
  const body=new Uint8Array(request.options.body),salt=body.slice(0,16);
  assert.equal(new DataView(body.buffer).getUint32(16,false),4096);
  assert.equal(body[20],65);
  const senderPublic=await webcrypto.subtle.importKey('raw',body.slice(21,86),
    {name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=new Uint8Array(await webcrypto.subtle.deriveBits({name:'ECDH',public:senderPublic},client.privateKey,256));
  const ikm=await hkdf(shared,secret,append(enc.encode('WebPush: info'),new Uint8Array([0]),
    clientPublic,body.slice(21,86)),32);
  const cek=await hkdf(ikm,salt,enc.encode('Content-Encoding: aes128gcm\0'),16);
  const nonce=await hkdf(ikm,salt,enc.encode('Content-Encoding: nonce\0'),12);
  const aes=await webcrypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']);
  const data=new Uint8Array(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:nonce},
    aes,body.slice(86)));
  assert.equal(data.at(-1),2);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(data.slice(0,-1))),original);
});
