import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let client=read('src/client.js');
function patch(before,after){if(!client.includes(before))throw new Error('Client compatibility marker missing: '+before.slice(0,60));client=client.replace(before,after);}
const first="  const root=document.querySelector('#app');";
patch(first,first+"\n  const TOKEN_KEY='boek_dynasty_session';\n  let bearerToken=localStorage.getItem(TOKEN_KEY)||'';");
patch("headers:body===undefined?{}:{'Content-Type':'application/json'}","headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(bearerToken?{Authorization:'Bearer '+bearerToken}:{})}");
patch("credentials:'same-origin'","credentials:'omit'");
patch("if(!res.ok)throw new Error(parsed.error||'Request failed.');","if(!res.ok){if(res.status===401&&path==='state'){bearerToken='';localStorage.removeItem(TOKEN_KEY);}throw new Error(parsed.error||'Request failed.');}");
patch("        me=res.user;await refresh();","        if(!res.token)throw new Error('Login succeeded without a session token.');\n        bearerToken=res.token;localStorage.setItem(TOKEN_KEY,bearerToken);\n        me=res.user;await refresh();");
patch("if(act==='logout'){await api('logout',{});me=null;","if(act==='logout'){await api('logout',{});bearerToken='';localStorage.removeItem(TOKEN_KEY);me=null;");
patch("if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});","if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});");
const logo=read('src/brand-logo.base64').trim();
if(!logo.startsWith('iVBORw0KGgo'))throw new Error('Expected PNG logo.');
const bundled='const PAGE='+JSON.stringify(read('src/index.html'))+';\n'+
'const CLIENT='+JSON.stringify(client)+';\n'+
'const CSS='+JSON.stringify(read('src/style.css'))+';\n'+
'const BRAND_LOGO_BASE64='+JSON.stringify(logo)+';\n'+read('src/worker-proxy.js');
mkdirSync(new URL('../dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('../dist/worker-proxy.js',import.meta.url),bundled);
console.log('Built stateless Worker proxy',bundled.length,'bytes. No D1 dependencies.');
