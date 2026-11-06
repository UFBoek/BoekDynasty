import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const page = read('src/index.html');
const client = read('src/client.js');
const css = read('src/style.css')+'\n'+read('src/results-design.css');
const server = read('src/server.js');
const brandLogoBase64 = read('src/brand-logo.base64').trim();
if (!brandLogoBase64.startsWith('iVBORw0KGgo')) throw new Error('Brand logo asset must be a PNG.');
const results = read('src/results.js');
const netCrosswalk = JSON.parse(read('data/net-name-crosswalk-2027.json'));
if(netCrosswalk.season !== 2027 || netCrosswalk.teams.length !== 365) throw new Error('Invalid NET school name crosswalk.');
const historicalConferences = JSON.parse(read('data/historical-conference-2022-2026.json'));
if(!Array.isArray(historicalConferences.seasons)||historicalConferences.seasons.length!==5||
  historicalConferences.seasons.some(x=>!Array.isArray(x.winners)||x.winners.length<28))
  throw new Error('Historical conference champions archive is incomplete.');
const directory = JSON.parse(read('data/programs-2027.json'));
if(directory.season!==2027 || directory.programs.length!==365) throw new Error('Invalid 2026–27 program directory.');
const bundled = 'const BRAND_LOGO_BASE64='+JSON.stringify(brandLogoBase64)+';\n'+'const PAGE='+JSON.stringify(page)+';\nconst CLIENT='+JSON.stringify(client)+';\nconst CSS='+JSON.stringify(css)+';\nconst PROGRAM_DIRECTORY='+JSON.stringify(directory.programs)+';\nconst NET_NAME_CROSSWALK='+JSON.stringify(netCrosswalk.teams)+';\n'+'const HISTORICAL_CONFERENCE_CHAMPIONS='+JSON.stringify(historicalConferences)+';\n'+results+'\n'+server+'\n';
mkdirSync(new URL('../dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('../dist/worker.js',import.meta.url),bundled);
console.log('Generated dist/worker.js ('+bundled.length+' characters)');