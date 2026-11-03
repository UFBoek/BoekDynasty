import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const target = resolve(new URL('../', import.meta.url).pathname, 'pages-dist');
const basePath = '/BoekDynasty/';
const apiBase = String(process.env.BOEK_API_BASE || 'https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api').replace(/\/$/, '');

if (!/^https:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/.test(apiBase)) {
  throw new Error('BOEK_API_BASE is required and must be a secure HTTPS API URL. Do not publish until the new backend is configured.');
}
mkdirSync(target, { recursive: true });
const write = (file, contents) => writeFileSync(resolve(target, file), contents);

let html = read('src/index.html')
  .replaceAll('href="/', 'href="' + basePath)
  .replaceAll('src="/', 'src="' + basePath);
html = html.replace('<link rel="manifest" href="' + basePath + 'manifest.webmanifest">', '<link rel="manifest" href="' + basePath + 'manifest.webmanifest">');

let client = read('src/client.js');
const first = "  const root=document.querySelector('#app');";
if (!client.includes(first)) throw new Error('Client bootstrap marker not found.');
client = client.replace(first, first + '\n  const API_BASE = ' + JSON.stringify(apiBase) + ';\n  const SITE_BASE = ' + JSON.stringify(basePath) + ';');
if (!client.includes("fetch('/api/'+path")) throw new Error('Client API marker not found.');
client = client.replace("fetch('/api/'+path", "fetch(API_BASE+'/'+path");
client = client.replace("credentials:'same-origin'", "credentials:'omit'");
client = client.replace(
  "  const root=document.querySelector('#app');",
  "  const root=document.querySelector('#app');\n  const TOKEN_KEY='boek_dynasty_session';\n  let bearerToken=localStorage.getItem(TOKEN_KEY)||'';"
);
client = client.replace(
  "headers:body===undefined?{}:{'Content-Type':'application/json'}",
  "headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(bearerToken?{Authorization:'Bearer '+bearerToken}:{})}"
);
client = client.replace(
  "if(!res.ok)throw new Error(parsed.error||'Request failed.');",
  "if(!res.ok){if(res.status===401&&path==='state'){bearerToken='';localStorage.removeItem(TOKEN_KEY);}throw new Error(parsed.error||'Request failed.');}"
);
client = client.replace(
  "        me=res.user;await refresh();",
  "        if(!res.token)throw new Error('Login succeeded without a session token.');\n        bearerToken=res.token;localStorage.setItem(TOKEN_KEY,bearerToken);\n        me=res.user;await refresh();"
);
client = client.replace(
  "if(act==='logout'){await api('logout',{});me=null;",
  "if(act==='logout'){await api('logout',{});bearerToken='';localStorage.removeItem(TOKEN_KEY);me=null;"
);
client = client.replaceAll('src="/brand-logo.png?v=3"', 'src="' + basePath + 'brand-logo.png?v=3"');
client = client.replace("location.origin+'/?invite='+", "location.origin+SITE_BASE+'?invite='+");
const swRegistration="if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});";
if (!client.includes(swRegistration)) throw new Error('Legacy service worker registration marker not found.');
client = client.replace(swRegistration, '// GitHub Pages does not register the old Worker-specific service worker.');

write('index.html', html);
write('app.js', client);
write('style.css', read('src/style.css'));
const image = Buffer.from(read('src/brand-logo.base64').trim(), 'base64');
if (image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid site icon PNG.');
for (const name of ['icon.png', 'brand-logo.png', 'apple-touch-icon.png']) write(name, image);
write('manifest.webmanifest', JSON.stringify({
  name:'Boek Dynasty',short_name:'Boek Dynasty',id:basePath,start_url:basePath,
  display:'standalone',background_color:'#f4f6fa',theme_color:'#f4f6fa',
  icons:[{src:basePath+'icon.png',sizes:'192x192',type:'image/png'}]
}));
write('.nojekyll', '');
console.log('Prepared GitHub Pages static bundle (frontend only). Backend: '+new URL(apiBase).host);
