// Read-only, no-key T-Rank feed. Fetches one published CSV per season.
// This module never touches the dynasty scoring tables.
const cache = new Map();
const pending = new Map();
const numbers = value => {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};
const normalizedHeader = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function parseTorvikCsv(raw, year) {
  if (!raw || raw.length < 20000 || /<!doctype|<html/i.test(raw.slice(0,500)))
    throw new Error('Torvik did not return a valid CSV file.');
  const rows = [];
  let cell = '', row = [], quoted = false;
  const source = raw.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i+1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && source[i+1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (quoted) throw new Error('Torvik CSV contains an unfinished quoted field.');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift()?.map(normalizedHeader) || [];
  const field = (...options) => headers.findIndex(header => options.includes(header));
  const idx = {
    rank: field('rank', 'trank'),
    team: field('team'),
    conf: field('conf', 'conference'),
    record: field('record'),
    offense: field('adjoe', 'adjoffensiveefficiency'),
    offense_rank: field('oerank'),
    defense: field('adjde', 'adjdefensiveefficiency'),
    defense_rank: field('derank'),
    barthag: field('barthag'),
    wab: field('wab'),
    tempo: field('adjt', 'adjtempo', 'adjustedtempo')
  };
  if (idx.team < 0 || idx.rank < 0 || idx.offense < 0 || idx.defense < 0 || idx.barthag < 0)
    throw new Error('Torvik changed the published ratings columns.');
  const teams = rows.map(values => {
    const get = name => idx[name] < 0 ? '' : values[idx[name]];
    const team = String(get('team') || '').trim();
    const rank = numbers(get('rank'));
    if (!team || !Number.isInteger(rank) || rank < 1 || rank > 400) return null;
    return {
      team, rank, conf: String(get('conf') || '').trim(),
      record: String(get('record') || '').trim(),
      adj_o: numbers(get('offense')), adj_o_rank: numbers(get('offense_rank')),
      adj_d: numbers(get('defense')), adj_d_rank: numbers(get('defense_rank')),
      barthag: numbers(get('barthag')), wab: numbers(get('wab')),
      tempo: numbers(get('tempo'))
    };
  }).filter(Boolean);
  if (teams.length < 330 || teams.length > 400 || new Set(teams.map(x=>x.team.toLowerCase())).size !== teams.length)
    throw new Error('Torvik returned an incomplete or duplicate ratings table.');
  return {source:'Bart Torvik T-Rank',season:year,source_url:'https://barttorvik.com/',fetched_at:new Date().toISOString(),teams};
}
export async function getTorvikRatings(year) {
  if (!Number.isInteger(year) || year < 2022 || year > 2027)
    throw new Error('Supported seasons: 2021–22 through 2026–27.');
  const cached = cache.get(year);
  if (cached && cached.expires > Date.now()) return cached.payload;
  if (pending.has(year)) return pending.get(year);
  const task = (async () => {
    const response = await fetch('https://barttorvik.com/' + year + '_team_results.csv', {
      headers:{'Accept':'text/csv','User-Agent':'Mozilla/5.0 (compatible; BoekDynasty T-Rank; +https://github.com/UFBoek/BoekDynasty)'},
      signal:AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('Torvik ratings are temporarily unavailable (HTTP ' + response.status + ').');
    const raw = await response.text();
    const payload = parseTorvikCsv(raw, year);
    cache.set(year,{payload,expires:Date.now()+(year===2027?6:24)*60*60*1000});
    return payload;
  })();
  pending.set(year,task);
  try { return await task; }
  finally { pending.delete(year); }
}
