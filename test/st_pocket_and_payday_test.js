const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const nodeCrypto = require('node:crypto');

const savingsCoreCode = fs.readFileSync('savings-core.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function setupEnv() {
  const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  const code = scriptMatches[scriptMatches.length - 1][1];
  const storage = {};
  const elements = {};
  const listeners = {};

  function makeEl(id) {
    return {
      id, value: '', innerHTML: '', textContent: '', style: {}, dataset: {},
      children: [],
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); },
        toggle(c, f) { if (f ?? !this._set.has(c)) this._set.add(c); else this._set.delete(c); }
      },
      setAttribute: () => {},
      toggleAttribute: () => {},
      removeAttribute: () => {},
      getAttribute: () => null,
      addEventListener: (type, fn) => { (listeners[id+':'+type] ||= []).push(fn); },
      removeEventListener: () => {},
      closest: () => null,
      querySelectorAll: () => [],
      querySelector: () => makeEl('child-' + Math.random()),
      appendChild: () => {},
      append: () => {},
      removeChild: () => {},
      focus: () => {}
    };
  }

  const docEl = makeEl('html');
  const bodyEl = makeEl('body');

  const ctx = {
    console: { log: () => {}, error: () => {}, warn: () => {} },
    Date,
    Math,
    Intl,
    crypto: nodeCrypto.webcrypto,
    document: {
      documentElement: docEl,
      body: bodyEl,
      getElementById: (id) => elements[id] || (elements[id] = makeEl(id)),
      querySelectorAll: () => [],
      querySelector: () => makeEl('query-el'),
      addEventListener: (type, fn) => { (listeners['document:'+type] ||= []).push(fn); }
    },
    $: (id) => elements[id] || (elements[id] = makeEl(id)),
    navigator: {
      serviceWorker: {
        register: () => Promise.resolve(),
        addEventListener: () => {}
      }
    },
    location: { hash: '' },
    localStorage: {
      getItem: (k) => storage[k] !== undefined ? storage[k] : null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
    },
    setTimeout: (fn) => fn(),
    requestAnimationFrame: (fn) => fn(),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  ctx.window = ctx;

  vm.createContext(ctx);
  vm.runInContext(savingsCoreCode, ctx);
  vm.runInContext(code, ctx);
  return { ctx, elements, storage, listeners };
}

test('default budget pockets are inactive until the user activates them', () => {
  const { ctx } = setupEnv();
  const defaults=ctx.getPockets().filter(pocket=>pocket.id!=='bebas');
  assert.ok(defaults.length>0);
  assert.ok(defaults.every(pocket=>pocket.isActive===false));
});

test('legacy auto-enabled default pockets migrate to inactive without clearing their data', () => {
  const { ctx } = setupEnv();
  ctx.localStorage.setItem('aruskas_budget_pockets_v1', JSON.stringify([
    {id:'pocket-dapur',name:'Dapur & Makan',amount:2500000,isActive:true,categories:['dapur']},
    {id:'bebas',name:'Uang Bebas',amount:0,isActive:true,categories:[]}
  ]));
  const pockets=ctx.getPockets();
  assert.equal(pockets.find(pocket=>pocket.id==='pocket-dapur').isActive,false);
  assert.equal(pockets.find(pocket=>pocket.id==='pocket-dapur').amount,2500000);
});

test('ST transactions count in ST pocket usage and show in pocket transaction list', () => {
  const { ctx, elements } = setupEnv();
  
  // Pos ST Oktober
  const stPocket = {
    id: 'pocket-st-okt',
    name: 'ST Oktober',
    icon: '💼',
    amount: 1500000,
    categories: ['st', 'dinas', 'bbm']
  };
  ctx.savePockets([stPocket]);

  // Ketik "ST BBM 300rb"
  const res = ctx.parseInput('ST BBM 300rb');
  assert.equal(res.ok, true);
  assert.equal(res.item.source, 'st');
  assert.equal(res.item.pocketId, 'pocket-st-okt');
  assert.equal(res.item.amount, 300000);

  // Simpan transaksi
  ctx.localStorage.setItem('aruskas_transactions_v4_st', JSON.stringify([res.item]));

  // 1. calculatePocketUsage harus menghitung pengeluaran Rp 300.000 ke pos ST Oktober
  const usage = ctx.calculatePocketUsage(stPocket, new Date(), ctx.getTX());
  assert.equal(usage.spent, 300000, 'Spent on ST pocket must include ST expense');
  assert.equal(usage.remaining, 1200000, 'Remaining budget must be 1.500.000 - 300.000 = 1.200.000');

  // 2. Chip destination tidak lagi berisi tombol Otomatis
  ctx.renderDestinationChips();
  const homeChipsEl = elements['homeDestinationChips'];
  assert.ok(!homeChipsEl.innerHTML.includes('data-dest="auto"'), 'Chip Otomatis should be removed');
  assert.ok(homeChipsEl.innerHTML.includes('data-dest="pocket-st-okt"'), 'ST pocket chip should exist');
  assert.ok(homeChipsEl.innerHTML.includes('data-dest="bebas"'), 'Bebas chip should exist');
});

test('Payday calendar controls render 1-31 and change cycle correctly', () => {
  const { ctx, elements } = setupEnv();
  ctx.renderPaydayControls();

  const gridEl = elements['paydayCalendarGrid'];
  assert.ok(gridEl.innerHTML.includes('data-payday-val="1"'));
  assert.ok(gridEl.innerHTML.includes('data-payday-val="25"'));
  assert.ok(gridEl.innerHTML.includes('data-payday-val="31"'));

  // Test save custom payday (misal tgl 10)
  ctx.savePaydaySetting(10);
  assert.equal(ctx.getPaydaySetting(), 10);
  ctx.renderPaydayControls();
  assert.ok(gridEl.innerHTML.includes('class="payday-day-btn active" data-payday-val="10"'));
});


test('Pocket stays active even when it has 0 transactions', () => {
  const { ctx } = setupEnv();
  
  // Pos baru tanpa transaksi sama sekali
  const emptyPocket = {
    id: 'pocket-empty-1',
    name: 'Dana Darurat Baru',
    icon: '🛡️',
    amount: 500000,
    categories: ['darurat'],
    isActive: true
  };
  
  ctx.savePockets([emptyPocket]);
  
  // Pastikan isPocketActive mengembalikan true meskipun txList kosong
  assert.equal(ctx.isPocketActive(emptyPocket, []), true, 'Pocket with isActive:true must stay active even without tx');
  
  // Data lama tanpa status harus tetap legacy-active, lalu migrasi eksplisit.
  const defaultPocket = {
    id: 'pocket-empty-2',
    name: 'Tabungan Nikah',
    icon: '💍',
    amount: 1000000,
    categories: ['nikah']
  };
  assert.equal(ctx.isPocketActive(defaultPocket, []), true, 'Pocket without explicit isActive must default to active');
  ctx.savePockets([defaultPocket]);
  assert.equal(ctx.getPockets()[0].isActive, true, 'Legacy pocket status should be persisted once during migration');
  ctx.setPocketActive(defaultPocket.id, false);
  assert.equal(ctx.getPockets().find(p=>p.id===defaultPocket.id).isActive, false, 'Explicit inactive state should survive reads and saves');
  assert.equal(ctx.isPocketActive(ctx.getPockets().find(p=>p.id===defaultPocket.id), []), false, 'Explicit inactive pocket must remain inactive');
});

test('inactive pocket state persists through save, rerender and navigation reads', () => {
  const { ctx, storage } = setupEnv();
  const pocket = { id: 'pocket-toggle-proof', name: 'Transport', amount: 400000, categories: ['transport'], isActive: true };
  ctx.savePockets([pocket]);
  ctx.setPocketActive(pocket.id, false);
  for (let i = 0; i < 4; i++) {
    assert.equal(JSON.parse(storage.aruskas_budget_pockets_v1).find(p => p.id === pocket.id).isActive, false);
    assert.equal(ctx.getPockets().find(p => p.id === pocket.id).isActive, false);
  }
});

test('free pocket is always available and income and unmatched spending use it', () => {
  const { ctx } = setupEnv();
  ctx.localStorage.setItem('aruskas_pockets_cleared', '1');
  const pockets = ctx.getPockets();
  assert.ok(pockets.some(p => p.id === 'bebas'), 'Uang Bebas should exist even after all regular budgets are removed');
  assert.equal(ctx.manualTransactionPocket({ type: 'income', category: 'Pemasukan' }, pockets), 'bebas');
  assert.equal(ctx.manualTransactionPocket({ type: 'expense', category: 'Lainnya', title: 'Belanja umum' }, pockets), 'bebas');
});

test('personal income remains categorized as Pemasukan when that category is hidden', () => {
  const fn = html.match(/function activeCategory\(cat,type\)\{[^}]+\}/)?.[0];
  assert.ok(fn, 'activeCategory must be present');
  const categoryCtx = { isCatDeleted: category => category === 'Pemasukan' };
  vm.createContext(categoryCtx);
  vm.runInContext(fn, categoryCtx);
  const result = vm.runInContext(`[
    activeCategory('Pemasukan', 'income'),
    activeCategory('Lainnya', 'income'),
    activeCategory('Deklarasi', 'income'),
    activeCategory('Deklarasi', 'expense')
  ]`, categoryCtx);
  assert.deepEqual(Array.from(result), ['Pemasukan', 'Pemasukan', 'Deklarasi', 'Deklarasi']);
});

test('legacy personal income in Lainnya is repaired without changing ST income', () => {
  const helper = html.match(/function normalizePersonalIncomeCategories\(txns\)\{[^\n]+/)?.[0];
  assert.ok(helper, 'normalizePersonalIncomeCategories must be present');
  const rows = [
    { type: 'income', source: 'personal', category: 'Lainnya', icon: '📦' },
    { type: 'income', source: 'personal', category: 'Honor Lama', icon: '💵' },
    { type: 'income', source: 'st', category: 'Lainnya', icon: '📦' },
    { type: 'expense', source: 'personal', category: 'Lainnya', icon: '📦' }
  ];
  const migrationCtx = {
    isCatDeleted: category => ['Pemasukan', 'Honor Lama'].includes(category),
    icon: (category, type) => `${category}:${type}`
  };
  vm.createContext(migrationCtx);
  vm.runInContext(html.match(/function activeCategory\(cat,type\)\{[^\n]+/)?.[0], migrationCtx);
  vm.runInContext(helper, migrationCtx);
  migrationCtx.rows = rows;
  const changed = vm.runInContext('normalizePersonalIncomeCategories(rows)', migrationCtx);
  assert.equal(changed, true);
  assert.deepEqual(rows.map(row => [row.category, row.icon]), [
    ['Pemasukan', 'Pemasukan:income'],
    ['Pemasukan', 'Pemasukan:income'],
    ['Lainnya', '📦'],
    ['Lainnya', '📦']
  ]);
});

test('Uang Bebas home card shows gross income and current usable balance', () => {
  const { ctx } = setupEnv();
  ctx.localStorage.setItem('aruskas_cleared', '1');
  ctx.localStorage.setItem('aruskas_budget_pockets_v1', JSON.stringify([
    { id: 'bebas', name: 'Uang Bebas', amount: 0, isActive: true, categories: [] },
    { id: 'pocket-bbm', name: 'BBM', amount: 5450000, isActive: true, categories: ['Transport'] }
  ]));
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  ctx.localStorage.setItem('aruskas_transactions_v4_st', JSON.stringify([{
    id: 'income-for-free-card', title: 'Masuk', amount: 5000000,
    type: 'income', category: 'Pemasukan', source: 'personal',
    pocketId: 'bebas', createdAt: now.toISOString()
  }]));
  ctx.localStorage.setItem('aruskas_budget_transfers_v1', JSON.stringify([{
    id: 'oversized-allocation', fromPocketId: 'bebas', toPocketId: 'pocket-bbm',
    amount: 5450000, date: today
  }]));

  const freePocket = ctx.getPockets().find(pocket => pocket.id === 'bebas');
  const usage = ctx.calculatePocketUsage(freePocket, now, ctx.getTX());
  assert.equal(usage.income, 5000000);
  assert.equal(usage.remaining, -450000);
  assert.match(html, /Pemasukan siklus/);
  assert.match(html, /<span>\$\{usage\.remaining<0\?'Minus':'Sisa'\}<\/span>/);
});
