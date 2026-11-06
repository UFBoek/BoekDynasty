import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const client=read('src/client.js');
const logo=read('src/brand-logo.base64').trim();
if(!logo.startsWith('iVBORw0KGgo'))throw new Error('Expected PNG logo.');
const bundled='const PAGE='+JSON.stringify(read('src/index.html'))+';\n'+
  'const CLIENT='+JSON.stringify(client)+';\n'+
  'const CSS='+JSON.stringify(read('src/style.css')+'\n'+read('src/results-design.css'))+';\n'+
  'const SW='+JSON.stringify(read('src/service-worker.js'))+';\n'+
  'const BRAND_LOGO_BASE64='+JSON.stringify(logo)+';\n'+read('src/worker-proxy.js');
mkdirSync(new URL('../dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('../dist/worker-proxy.js',import.meta.url),bundled);
console.log('Built stateless Worker proxy',bundled.length,'bytes. No D1 dependencies.');
