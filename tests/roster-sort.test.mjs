import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const code=readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
const start=code.indexOf('  function sortTeamRoster(');
const end=code.indexOf('  // One roster treatment',start);
assert.ok(start>0&&end>start,'shared roster sorting helpers exist');
const forecasts={a:{points:18},b:{points:34},c:null};
const make=new Function('fpOf',
  'let teamRosterSort="points";\n'+code.slice(start,end)+
  '\nreturn {sort:sortTeamRoster,description:teamRosterSortDescription,control:teamRosterSortControl,set:value=>{teamRosterSort=value}};');
const feature=make(p=>forecasts[p.id]||null);
const schools=[
  {id:'a',name:'Alpha'},
  {id:'b',name:'Bravo'},
  {id:'c',name:'Charlie'}
];
const ids=schools=>schools.map(p=>p.id);

test('manager rosters sort by earned season points by default',()=>{
  assert.deepEqual(ids(feature.sort(schools,true,{a:12,b:3,c:7})),['a','c','b']);
  assert.deepEqual(ids(feature.sort(schools,false,{})),['a','b','c']);
  assert.equal(feature.description(true),'Sorted by season points');
});

test('projected sort uses the same forecast model and puts missing values last',()=>{
  feature.set('projected');
  assert.deepEqual(ids(feature.sort(schools,true,{a:12,b:3,c:7})),['b','a','c']);
  assert.equal(feature.description(true),'Sorted by projected points');
  assert.match(feature.control(),/data-act="roster-sort"/);
  assert.match(feature.control(),/aria-pressed="true">Projected points/);
  feature.set('points');
  assert.match(feature.control(),/aria-pressed="true">Season points/);
});
