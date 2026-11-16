import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const js=readFileSync(new URL('../supabase/functions/boek-api/projection-odds.js',import.meta.url),'utf8');
const programs=JSON.parse(readFileSync(new URL('../data/programs-2027.json',import.meta.url),'utf8')).programs;
const parser=new Function('PROGRAM_DIRECTORY',
  js.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn parsePublicProjectionOdds;')(programs);
const sample=[25.3,12.2,.1365,.1143,.3072,-10.3,.01,.001,0];
const makeHTML=(rows=programs)=>{
  const header='<!doctype html><h1>Men\'s projections</h1><p>NCAA bid Conference tournament</p>'+
    '<p>As of November 15, 2026</p>';
  return header+rows.map(([id,name])=>'<tr data-name="'+name.toLowerCase()+'" data-conf="a10">'+
    '<td class="sticky-col" data-v="'+name+'"><img src="../assets/logos/'+id+'.png"></td>'+
    sample.map((v,i)=>'<td class="num'+(i===4?' ink':'')+'" data-v="'+v+'">'+v+'</td>').join('')+
    '</tr>').join('');
};

test('Parses all 365 published ESPN identifiers without fuzzy name matching',()=>{
  const parsed=parser(makeHTML(),'2026-27');
  assert.equal(parsed.rows.length,365);
  assert.equal(parsed.snapshot_date,'2026-11-15');
  assert.equal(parsed.source,'Probable Stats');
  assert.equal(parsed.rows.find(x=>x.program_id==='45')?.bid_prob,.3072);
  assert.equal(parsed.rows.find(x=>x.program_id==='45')?.auto_prob,.1143);
  assert.equal(parsed.rows.find(x=>x.program_id==='45')?.regular_prob,.1365);
});

test('Missing large portions, mismatched seasons or duplicated IDs cause fail-closed',()=>{
  assert.throws(()=>parser(makeHTML(programs.slice(0,300)),'2026-27'),/Incomplete/);
  assert.throws(()=>parser(makeHTML(),'2025-26'),/active league season/);
  assert.throws(()=>parser(makeHTML(programs.map((v,i)=>i===1?[programs[0][0],v[1]]:v)),'2026-27'),/Incomplete/);
});

test('Invalid data cannot accidentally be imported',()=>{
  const bad=makeHTML().replace('data-v="0.3072"','data-v="1.5"');
  assert.throws(()=>parser(bad,'2026-27'),/Incomplete/);
  const invalid=makeHTML().replace('data-v="0.1143"','data-v="0.5072"');
  assert.throws(()=>parser(invalid,'2026-27'),/Incomplete/);
});

test('Correct header values are preferred over visibly rounded percentages',()=>{
  const parsed=parser(makeHTML(),'2026-27');
  const gw=parsed.rows.find(x=>x.program_id==='45');
  assert.equal(gw.bid_prob,.3072);
  assert.equal(gw.regular_prob,.1365);
});
