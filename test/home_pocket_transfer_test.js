const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const savings = require('../savings-core.js');
const html = fs.readFileSync('index.html', 'utf8');

test('pocket allocation survives normalization and counts only in its month', () => {
  const goal = {id:'goal-1',name:'Dana darurat',targetAmount:1000000,status:'active'};
  let data = savings.upsertGoal(savings.emptySavings(), goal);
  data = savings.addEntry(data, {id:'entry-1',goalId:'goal-1',type:'deposit',amount:30000,date:'2026-10-21',sourcePocketId:'pocket-food'});
  assert.equal(savings.pocketAllocated(data,'pocket-food',new Date(2026,9,21)),30000);
  assert.equal(savings.pocketAllocated(data,'pocket-food',new Date(2026,8,21)),0);
  assert.equal(savings.pocketAllocated(data,'pocket-other',new Date(2026,9,21)),0);
  assert.equal(savings.goalBalance(data,'goal-1'),30000);
  assert.equal(savings.normalizeSavings(data).entries[0].sourcePocketId,'pocket-food');
});

test('budget usage subtracts transfers without adding them to expenses', () => {
  const transferStart=html.indexOf('function getPocketTransfers(){');
  const transferEnd=html.indexOf('\nfunction getSavings(){',transferStart);
  const start=html.indexOf('function calculatePocketUsage(');
  const end=html.indexOf('\nfunction inferPocket(',start);
  assert.ok(transferStart>=0&&transferEnd>transferStart&&start>=0&&end>start);
  const transfers=[{id:'move-1',fromPocketId:'p',toPocketId:'target',amount:15000,date:'2026-10-21'}];
  const context={KEY_POCKET_TRANSFERS:'transfers',localStorage:{getItem:key=>key==='transfers'?JSON.stringify(transfers):null},savingsCore:savings,getSavings:()=>({goals:[{id:'g',name:'Goal',targetAmount:1000000}],entries:[{id:'e',goalId:'g',type:'deposit',amount:20000,date:'2026-10-21',sourcePocketId:'p'}]})};
  vm.createContext(context);
  vm.runInContext(`${html.slice(transferStart,transferEnd)}\n${html.slice(start,end)};this.calculatePocketUsage=calculatePocketUsage`,context);
  const usage=context.calculatePocketUsage({id:'p',amount:100000,categories:['Makan']},new Date(2026,9,21),[{type:'expense',source:'personal',amount:30000,category:'Makan',createdAt:'2026-10-21T10:00:00Z'}]);
  assert.equal(usage.spent,30000);
  assert.equal(usage.allocated,20000);
  assert.equal(usage.outgoing,15000);
  assert.equal(usage.remaining,35000);
  const destination=context.calculatePocketUsage({id:'target',amount:80000,categories:[]},new Date(2026,9,21),[]);
  assert.equal(destination.incoming,15000);
  assert.equal(destination.effectiveAmount,95000);
  assert.equal(destination.remaining,95000);
});

test('home shows five recent transactions and five monthly expense categories with share', () => {
  const start=html.indexOf('function renderHome(arr)');
  const end=html.indexOf('\nfunction savingsIconHtml(',start);
  const source=html.slice(start,end);
  assert.match(source,/arr\.slice\(0,5\)/);
  assert.match(source,/slice\(0,5\)/);
  assert.match(source,/c\.total\s*\/\s*s\.expense/);
});

test('home pocket cards open choices while all-pockets view has direct actions', () => {
  const start=html.indexOf('function renderBudgetPockets()');
  const end=html.indexOf('\nfunction render()',start);
  const source=html.slice(start,end);
  assert.match(source,/class="home-pocket-card[^`]*data-pocket-actions="\$\{esc\(p\.id\)\}"/);
  assert.doesNotMatch(source,/data-action="sweep-pocket-modal"/);
  assert.match(html,/data-action="edit-pocket-action"/);
  assert.match(html,/data-action="transfer-pocket-action"/);
  const managerStart=html.indexOf('function renderPocketManager(){');
  const managerEnd=html.indexOf('\nfunction openPocketActions(',managerStart);
  const manager=html.slice(managerStart,managerEnd);
  assert.match(manager,/data-edit-pocket="\$\{esc\(p\.id\)\}"/);
  assert.match(manager,/data-action="sweep-pocket-modal" data-pocket-id="\$\{esc\(p\.id\)\}"/);
});
