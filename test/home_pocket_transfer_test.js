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
  const start=html.indexOf('function calculatePocketUsage(');
  const end=html.indexOf('\nfunction inferPocket(',start);
  assert.ok(start>=0&&end>start);
  const context={savingsCore:savings,getSavings:()=>({goals:[{id:'g',name:'Goal',targetAmount:1000000}],entries:[{id:'e',goalId:'g',type:'deposit',amount:20000,date:'2026-10-21',sourcePocketId:'p'}]})};
  vm.createContext(context);
  vm.runInContext(`${html.slice(start,end)};this.calculatePocketUsage=calculatePocketUsage`,context);
  const usage=context.calculatePocketUsage({id:'p',amount:100000,categories:['Makan']},new Date(2026,9,21),[{type:'expense',source:'personal',amount:30000,category:'Makan',createdAt:'2026-10-21T10:00:00Z'}]);
  assert.equal(usage.spent,30000);
  assert.equal(usage.allocated,20000);
  assert.equal(usage.remaining,50000);
});

test('home shows five recent transactions and five monthly expense categories with share', () => {
  const start=html.indexOf('function renderHome(arr)');
  const end=html.indexOf('\nfunction savingsIconHtml(',start);
  const source=html.slice(start,end);
  assert.match(source,/arr\.slice\(0,5\)/);
  assert.match(source,/slice\(0,5\)/);
  assert.match(source,/c\.total\s*\/\s*s\.expense/);
});

test('pocket transfer button is outside the edit target', () => {
  const start=html.indexOf('function renderBudgetPockets()');
  const end=html.indexOf('\nfunction render()',start);
  const source=html.slice(start,end);
  assert.doesNotMatch(source,/data-edit-pocket="\$\{esc\(p\.id\)\}" role="button"/);
  assert.match(source,/data-action="sweep-pocket-modal"/);
});
