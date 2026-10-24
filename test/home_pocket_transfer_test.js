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

test('inactive budget pockets and savings goals do not count as Uang Bebas allocations', () => {
  const transferStart=html.indexOf('function getPocketTransfers(){');
  const transferEnd=html.indexOf('\nfunction getSavings(){',transferStart);
  const savingsStart=html.indexOf('function getSavingsEntrySource(',transferStart);
  const savingsEnd=html.indexOf('\nfunction getExpensePocketId(',savingsStart);
  const safeSpendStart=html.indexOf('function calculateSafeDailySpend(',savingsStart);
  const safeSpendEnd=html.indexOf('\nfunction ensureCurrentBudgetAllocations(',safeSpendStart);
  assert.ok(transferStart>=0&&transferEnd>transferStart&&savingsStart>transferEnd&&savingsEnd>savingsStart&&safeSpendStart>savingsEnd&&safeSpendEnd>safeSpendStart);
  const date='2026-10-21';
  const transfers=[
    {id:'inactive-allocation',fromPocketId:'bebas',toPocketId:'off',amount:5500000,date},
    {id:'active-allocation',fromPocketId:'bebas',toPocketId:'on',amount:750000,date}
  ];
  const context={
    KEY_POCKET_TRANSFERS:'transfers',localStorage:{getItem:key=>key==='transfers'?JSON.stringify(transfers):null},
    getPaydaySetting:()=>25,getPaydayCycle:()=>({start:new Date('2026-09-25T00:00:00'),end:new Date('2026-10-24T23:59:59'),daysRemaining:4}),
    dateInput:value=>new Date(value).toISOString().slice(0,10),
    isPocketActive:pocket=>pocket.id==='on',isDedicatedSTPocket:()=>false,
    getSavingsEntrySource:entry=>entry.sourcePocketId||'bebas',
    calculatePocketUsage:()=>({cashGap:0,budgetOverAmount:0}),getExpensePocketId:()=> 'bebas',
    getFreeBalanceAdjustments:()=>[],getTX:()=>[],
    getSavings:()=>({goals:[{id:'off-goal',status:'active',isActive:false},{id:'on-goal',status:'active',isActive:true}],entries:[
      {id:'off-deposit',goalId:'off-goal',type:'deposit',amount:2000000,date,sourcePocketId:'bebas'},
      {id:'on-deposit',goalId:'on-goal',type:'deposit',amount:300000,date,sourcePocketId:'bebas'}
    ]})
  };
  vm.createContext(context);
  vm.runInContext(`${html.slice(transferStart,transferEnd)}\n${html.slice(savingsStart,savingsEnd)}\n${html.slice(safeSpendStart,safeSpendEnd)};this.calculateSafeDailySpend=calculateSafeDailySpend`,context);
  const result=context.calculateSafeDailySpend([], [
    {id:'bebas',isActive:true},{id:'off',amount:5500000,isActive:false},{id:'on',amount:750000,isActive:true}
  ],context.getSavings(),new Date('2026-10-21T12:00:00'),25);
  assert.equal(result.savingsAllocated,300000);
  assert.equal(result.freeMoneyMoved,1050000);
  assert.equal(result.freeMoneyInitial,-1050000);
});

test('budget usage subtracts transfers without adding them to expenses', () => {
  const transferStart=html.indexOf('function getPocketTransfers(){');
  const transferEnd=html.indexOf('\nfunction getSavings(){',transferStart);
  const start=html.indexOf('function calculatePocketUsage(');
  const end=html.indexOf('\nfunction inferPocket(',start);
  assert.ok(transferStart>=0&&transferEnd>transferStart&&start>=0&&end>start);
  const transfers=[{id:'move-1',fromPocketId:'p',toPocketId:'target',amount:15000,date:'2026-10-21'}];
  const context={KEY_POCKET_TRANSFERS:'transfers',localStorage:{getItem:key=>key==='transfers'?JSON.stringify(transfers):null},savingsCore:savings,getSavings:()=>({goals:[{id:'g',name:'Goal',targetAmount:1000000}],entries:[{id:'e',goalId:'g',type:'deposit',amount:20000,date:'2026-10-21',sourcePocketId:'p'}]}),getPockets:()=>[{id:'bebas',isActive:true}],getTX:()=>[],getPaydaySetting:()=>25,calculateSafeDailySpend:()=>({freeMoneyInitial:0,freeMoneyRemaining:0,freeMoneySpent:0,freeMoneyMoved:0,freeExpenseCount:0,cycleIncome:0,freeMoneyIncoming:0,freeMoneyOutgoing:0,savingsAllocated:0})};
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

test('tapping available remainder fills the transfer amount and scrolls to it', () => {
  const start=html.indexOf('function useAllSweepRemainder(');
  const end=html.indexOf('\nfunction updateSweepPocketSelectedInfo(',start);
  assert.ok(start>=0&&end>start,'remainder autofill helper exists');
  let scrollOptions=null,focusOptions=null,previewUpdated=false;
  const amount={value:'',scrollIntoView:options=>{scrollOptions=options},focus:options=>{focusOptions=options}};
  const source={selectedOptions:[{dataset:{sisa:'2500000'}}]};
  const context={
    $:id=>id==='sweepPocketSelect'?source:id==='sweepAmount'?amount:null,
    formatThousands:value=>String(value).replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
    updateSweepPreview:()=>{previewUpdated=true}
  };
  vm.createContext(context);
  vm.runInContext(`${html.slice(start,end)};this.useAllSweepRemainder=useAllSweepRemainder`,context);
  assert.equal(context.useAllSweepRemainder(),true);
  assert.equal(amount.value,'2.500.000');
  assert.equal(scrollOptions.behavior,'smooth');
  assert.equal(scrollOptions.block,'center');
  assert.equal(focusOptions.preventScroll,true);
  assert.equal(previewUpdated,true);
  assert.match(html,/id="sweepPocketAvailableHint"[^>]*aria-label="[^\"]*seluruh sisa yang bisa dipindahkan/);
  assert.match(html,/sweepPocketAvailableHint'\)\?\.addEventListener\('click',useAllSweepRemainder\)/);
  assert.match(html,/sweepMaxBtn'\)\?\.addEventListener\('click',useAllSweepRemainder\)/);
});

test('home shows the latest transaction and five monthly expense categories with share', () => {
  const start=html.indexOf('function renderHome(arr)');
  const end=html.indexOf('\nfunction savingsIconHtml(',start);
  const source=html.slice(start,end);
  assert.match(source,/arr\.slice\(0,1\)/);
  assert.match(source,/MAX_DEFAULT_LEGEND = 4/);
  assert.match(source,/items\.slice\(0, MAX_DEFAULT_LEGEND\)/);
  assert.match(source,/renderHomeDonut\(totals,\s*s\.expense\)/);
});

test('home pocket cards open their transaction details and all-pockets view has direct actions', () => {
  const start=html.indexOf('function renderBudgetPockets()');
  const end=html.indexOf('\nfunction render()',start);
  const source=html.slice(start,end);
  assert.match(source,/class="home-pocket-card[^`]*data-home-pocket-transactions="\$\{esc\(p\.id\)\}"/);
  assert.doesNotMatch(source,/data-action="sweep-pocket-modal"/);
  assert.match(html,/data-home-pocket-transactions[\s\S]*openPocketTransactions\(pocketTransactions\.dataset\.homePocketTransactions\)/);
  assert.match(html,/data-action="edit-pocket-action"/);
  assert.match(html,/data-action="transfer-pocket-action"/);
  const managerStart=html.indexOf('function renderPocketManager(){');
  const managerEnd=html.indexOf('\nfunction openPocketActions(',managerStart);
  const manager=html.slice(managerStart,managerEnd);
  assert.match(manager,/data-edit-pocket="\$\{esc\(p\.id\)\}"/);
  assert.match(manager,/data-action="sweep-pocket-modal" data-pocket-id="\$\{esc\(p\.id\)\}"/);
});
