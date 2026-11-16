import {PROGRAM_DIRECTORY} from './data.js';

// Publicly viewable simulation table, once daily. This is NOT Bart Torvik.
// The site's robots.txt explicitly allows crawling. No challenge bypass,
// login, third-party proxy, or automated traffic to restricted Torvik pages.
export const PROJECTION_SOURCE='Probable Stats';
export const PROJECTION_URL='https://probablestats.com/ncaam/projections';
const KNOWN_IDS=new Set(PROGRAM_DIRECTORY.map(p=>String(p[0])));
const pct=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1?n:null;};
const round5=n=>Math.round(n*100000)/100000;

export function parsePublicProjectionOdds(html,expectedSeason){
  const raw=String(html||'');
  if(raw.length<35000||raw.length>1500000||
     !raw.includes("Men's projections")||!raw.includes('NCAA bid')||
     !raw.includes('Conference tournament'))throw Error('Missing expected public projection table.');
  const published=raw.match(/As of\s+([A-Za-z]+\s+\d{1,2},\s+20\d{2})/i);
  if(!published)throw Error('Public projection snapshot date is missing.');
  const parsedDate=new Date(published[1]+' 12:00:00 GMT');
  if(!Number.isFinite(parsedDate.getTime()))throw Error('Invalid public projection date.');
  const day=parsedDate.toISOString().slice(0,10);
  if(day.slice(0,4)!==String(expectedSeason).slice(0,4))
    throw Error('Public simulation is not for the active league season.');
  const rows=[],used=new Set(),unknown=[],errors=[];
  const rowMatches=raw.matchAll(/<tr\s+data-name="[^"]+"\s+data-conf="[^"]+"[^>]*>([\s\S]*?)<\/tr>/gi);
  let total=0;
  for(const entry of rowMatches){
    total++;
    const fragment=entry[1];
    const logo=fragment.match(/(?:\.\.\/)?assets\/logos\/(\d+)\.png/i);
    if(!logo){errors.push('Missing ESPN team logo ID');continue;}
    const id=logo[1];
    if(!KNOWN_IDS.has(id)){unknown.push(id);continue;}
    if(used.has(id)){errors.push('Duplicate ESPN ID '+id);continue;}
    // The table consistently publishes nine numerical cells in this order:
    // projected record, conference record, conference regular title,
    // conference tournament, NCAA bid, average NCAA seed, Sweet 16,
    // Final Four, and national title. These are published data-v fractions,
    // never rounded percentages scraped from the visible text.
    const numbers=[...fragment.matchAll(/<td\s+class="num(?:\s+[^"]*)?"\s+data-v="([^"]+)"[^>]*>/gi)]
      .map(x=>Number(x[1]));
    if(numbers.length!==9){errors.push('Unexpected table columns for '+id);continue;}
    const reg=pct(numbers[2]),auto=pct(numbers[3]),bid=pct(numbers[4]);
    if(reg===null||auto===null||bid===null||auto>bid+0.000001){
      errors.push('Invalid regular/automatic/bid odds for '+id);continue;
    }
    used.add(id);
    rows.push({program_id:id,bid_prob:round5(bid),auto_prob:round5(auto),
      regular_prob:round5(reg)});
  }
  if(total<350||total>400||rows.length<350||rows.length>400||
     errors.length||unknown.length>12)
    throw Error('Incomplete public projection table: '+rows.length+'/'+total+
      ' matched, '+unknown.length+' unknown, '+errors.length+' invalid.');
  return {season:String(expectedSeason),snapshot_date:day,source:PROJECTION_SOURCE,
    source_url:PROJECTION_URL,listed:total,unknown,rows};
}

export async function syncPublicProjectionOdds(db,season,nowDay){
  const response=await fetch(PROJECTION_URL,{
    headers:{'Accept':'text/html','User-Agent':'BoekDynasty/1.0 (+https://github.com/UFBoek/BoekDynasty)'},
    signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw Error('Public projection source HTTP '+response.status);
  const html=await response.text();
  const snapshot=parsePublicProjectionOdds(html,season);
  const age=(Date.parse(nowDay+'T12:00:00Z')-
    Date.parse(snapshot.snapshot_date+'T12:00:00Z'))/86400000;
  if(!Number.isFinite(age)||age<0||age>3)
    throw Error('Public probability snapshot is stale or dated in the future.');
  // One JSON set-based write, idempotent for same-day source updates.
  const payload=JSON.stringify(snapshot.rows);
  await db.prepare(
    'INSERT INTO private.cbb_tourneycast_daily'+
    '(season,snapshot_date,program_id,bid_prob,auto_prob,regular_prob,source) '+
    'SELECT ?, ?::date,x.program_id,x.bid_prob,x.auto_prob,x.regular_prob,? '+
    'FROM jsonb_to_recordset(?::jsonb) AS x'+
    '(program_id text,bid_prob numeric,auto_prob numeric,regular_prob numeric) '+
    'ON CONFLICT(season,snapshot_date,program_id) DO UPDATE SET '+
    'bid_prob=EXCLUDED.bid_prob,auto_prob=EXCLUDED.auto_prob,'+
    'regular_prob=EXCLUDED.regular_prob,source=EXCLUDED.source,imported_at=now()'
  ).bind(season,snapshot.snapshot_date,snapshot.source,payload).run();
  return {source:snapshot.source,snapshot_date:snapshot.snapshot_date,
    source_url:snapshot.source_url,imported:snapshot.rows.length,listed:snapshot.listed,
    guaranteed:snapshot.rows.filter(t=>t.bid_prob>=.70).length,
    examples:Object.fromEntries(snapshot.rows.filter(x=>['45','235','139'].includes(x.program_id))
      .map(x=>[x.program_id,{bid:x.bid_prob,auto:x.auto_prob,regular:x.regular_prob}]))};
}
