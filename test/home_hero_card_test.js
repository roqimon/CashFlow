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
      toggleAttribute: () => {},
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

  const elementIds = [
    'dailySafeAmount', 'safeStatusBadge', 'homePeriod', 'freeMoneyTotal', 'committedStatus',
    'netBalance', 'incomeTotal', 'expenseTotal', 'txCount', 'homeTxList', 'homeCategories',
    'budgetPocketList', 'budgetSummaryText', 'settingPayday'
  ];
  elementIds.forEach(id => { elements[id] = makeEl(id); });

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

test('renderHome updates dailySafeAmount and the configured cycle period', () => {
  const { ctx, elements } = setupEnv();
  const tx = [
    { type: 'income', amount: 5000000, createdAt: new Date().toISOString() },
    { type: 'expense', amount: 20000, pocketId: 'bebas', createdAt: new Date().toISOString() }
  ];
  ctx.renderHome(tx);
  assert.ok(elements.dailySafeAmount.textContent.includes('Rp'), 'dailySafeAmount should be formatted with Rp');
  assert.match(elements.homePeriod.textContent, /\d{1,2}\s\w+\s[–-]\s\d{1,2}\s\w+/i, 'homePeriod should show the cycle date range');
  assert.ok(elements.freeMoneyTotal.textContent.includes('Rp'), 'freeMoneyTotal should be formatted with Rp');
});

test('formatDailySafeAmount uses readable rupiah units without rounding the shown amount upward', () => {
  const { ctx } = setupEnv();
  assert.equal(typeof ctx.formatDailySafeAmount, 'function', 'formatDailySafeAmount should be defined');
  assert.equal(ctx.formatDailySafeAmount(1600000), 'Rp1,6 juta');
  assert.equal(ctx.formatDailySafeAmount(1666666), 'Rp1,66 juta');
  assert.equal(ctx.formatDailySafeAmount(500000), 'Rp500 ribu');
  assert.equal(ctx.formatDailySafeAmount(50500), 'Rp\u00a050.500');
  assert.equal(ctx.formatDailySafeAmount(0), 'Rp\u00a00');
});
