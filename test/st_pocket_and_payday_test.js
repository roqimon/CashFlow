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
