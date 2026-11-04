import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const target = resolve(new URL('../', import.meta.url).pathname, 'pages-dist');
const basePath = '/BoekDynasty/';
const apiBase = String(process.env.BOEK_API_BASE || 'https://hscgsaujazcyneykarai.supabase.co/functions/v1/boek-api').replace(/\/$/, '');

if (!/^https:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/.test(apiBase)) {
  throw new Error('BOEK_API_BASE must be a secure HTTPS URL.');
}
mkdirSync(target, { recursive: true });
const write = (file, contents) => writeFileSync(resolve(target, file), contents);
const html = read('src/index.html')
  .replaceAll('href="/', 'href="' + basePath)
  .replaceAll('src="/', 'src="' + basePath);

let client = read('src/client.js');
const marker = "  const root=document.querySelector('#app');";
if (!client.includes(marker) || !client.includes("fetch('/api/'+path"))
  throw new Error('Frontend API markers have changed; update build-pages.mjs.');
client = client.replace(marker, marker +
  '\n  const API_BASE = ' + JSON.stringify(apiBase) +
  ';\n  const SITE_BASE = ' + JSON.stringify(basePath) + ';');
client = client.replace("fetch('/api/'+path", "fetch(API_BASE+'/'+path");
client = client.replace("credentials:'same-origin'", "credentials:'omit'");
client = client.replaceAll('src="/brand-logo.png?v=3"', 'src="' + basePath + 'brand-logo.png?v=3"');
client = client.replace("location.origin+'/?invite='+", "location.origin+SITE_BASE+'?invite='+");
write('index.html',html);
write('app.js',client);
write('style.css',read('src/style.css'));
const image = Buffer.from(read('src/brand-logo.base64').trim(),'base64');
if(image.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Invalid PNG logo.');
for(const name of ['icon.png','brand-logo.png','apple-touch-icon.png'])write(name,image);
write('manifest.webmanifest',JSON.stringify({
  name:'Boek Dynasty',short_name:'Boek Dynasty',id:basePath,start_url:basePath,
  display:'standalone',background_color:'#f4f6fa',theme_color:'#f4f6fa',
  icons:[{src:basePath+'icon.png',sizes:'192x192',type:'image/png'}]
}));
write('.nojekyll','');
console.log('Prepared GitHub Pages frontend. API: '+new URL(apiBase).host);
