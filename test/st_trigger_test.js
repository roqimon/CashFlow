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
  function makeEl(id) {
    return {
      id, value: '', innerHTML: '', textContent: '', style: {}, dataset: {},
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
      addEventListener: () => {},
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
      addEventListener: () => {}
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
  return { ctx, elements };
}

test('ST Trigger via text prefix: "ST bbm 400rb"', () => {
  const { ctx } = setupEnv();
  // Create an ST pocket: "ST Oktober"
  const stPocket = {
    id: 'pocket-st-oktober',
    name: 'ST Oktober',
    icon: '📋',
    amount: 3000000,
    categories: ['st', 'dinas', 'perjalanan dinas', 'bbm', 'hotel']
  };
  ctx.savePockets([stPocket]);

  const res = ctx.parseInput('ST bbm 400rb');
  assert.equal(res.ok, true);
  assert.equal(res.item.source, 'st', 'source must be st');
  assert.equal(res.item.pocketId, 'pocket-st-oktober', 'pocketId must be stPocket id');
  assert.equal(res.item.reimburseStatus, 'pending', 'reimburseStatus must be pending');
  assert.equal(res.item.amount, 400000);
});

test('Shortcut target pocket overrides the automatic input destination', () => {
  const { ctx } = setupEnv();
  const stPocket = { id: 'pocket-st-shortcut', name: 'ST Oktober', icon: '📋', amount: 3000000, categories: ['st'] };
  ctx.savePockets([stPocket]);
  ctx.localStorage.setItem('aruskas_shortcuts_v3_fixed', JSON.stringify([{ code: 'upd-full', title: 'UPD Full', category: 'Perjalanan', type: 'expense', icon: '📋', amount: 132500, targetPocketId: stPocket.id }]));

  const result = ctx.parseInput('UPD Full');
  assert.equal(result.ok, true);
  assert.equal(result.item.source, 'st');
  assert.equal(result.item.pocketId, stPocket.id);
  assert.equal(result.item.reimburseStatus, 'pending');
});

test('ST Trigger via spoken Indonesian variations: "es te bbm 400rb", "dinas bbm 400rb"', () => {
  const { ctx } = setupEnv();
  const stPocket = {
    id: 'pocket-st-oktober',
    name: 'ST Oktober',
    icon: '📋',
    amount: 3000000,
    categories: ['st', 'dinas']
  };
  ctx.savePockets([stPocket]);

  const res1 = ctx.parseInput('es te bbm 400rb');
  assert.equal(res1.ok, true, 'es te should trigger ST');
  assert.equal(res1.item.source, 'st', 'es te must produce source st');

  const res2 = ctx.parseInput('dinas bbm 400rb');
  assert.equal(res2.ok, true, 'dinas should trigger ST');
  assert.equal(res2.item.source, 'st', 'dinas must produce source st');
});

test('ST Trigger via clicking ST chip in addFrom', () => {
  const { ctx, elements } = setupEnv();
  const stPocket = {
    id: 'pocket-st-oktober',
    name: 'ST Oktober',
    icon: '📋',
    amount: 3000000,
    categories: ['st', 'dinas']
  };
  ctx.savePockets([stPocket]);

  // User selects the ST chip
  ctx.setInputDestination('pocket-st-oktober');

  // User enters regular text without ST prefix: "bbm 400rb"
  elements['quickInput'].value = 'bbm 400rb';
  ctx.addFrom('quickInput');

  const txList = ctx.getTX();
  assert.ok(txList.length > 0);
  const latestTx = txList[0];
  assert.equal(latestTx.amount, 400000);
  assert.equal(latestTx.source, 'st', 'Transaction saved with ST chip must have source=st');
  assert.equal(latestTx.pocketId, 'pocket-st-oktober');
  assert.equal(latestTx.reimburseStatus, 'pending', 'Expense in ST pocket must have reimburseStatus=pending');
});
