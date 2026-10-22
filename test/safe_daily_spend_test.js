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
  return ctx;
}

test('calculateSafeDailySpend with salary, pockets and daily spending', () => {
  const env = setupEnv();
  assert.equal(typeof env.calculateSafeDailySpend, 'function', 'calculateSafeDailySpend should be defined');
  const targetDate = new Date('2026-10-26T10:00:00'); // after payday 25
  const txList = [
    { type: 'income', amount: 5000000, createdAt: '2026-10-25T08:00:00' },
    { type: 'expense', amount: 25000, pocketId: 'bebas', createdAt: '2026-10-26T12:00:00' }
  ];
  const pockets = [
    { id: 'pocket-dapur', name: 'Dapur', amount: 2500000, categories: ['dapur'] },
    { id: 'pocket-tagihan', name: 'Tagihan', amount: 1000000, categories: ['tagihan'] }
  ];
  const savings = { entries: [] };

  const res = env.calculateSafeDailySpend(txList, pockets, savings, targetDate, 25);
  assert.equal(res.cycleIncome, 5000000);
  assert.equal(res.committedBudget, 3500000);
  assert.equal(res.freeMoneyInitial, 1500000);
  assert.equal(res.freeMoneySpent, 25000);
  assert.equal(res.freeMoneyRemaining, 1475000);
  assert.equal(res.todaySpent, 25000);
  assert.ok(res.safeDailyAmount > 0);
  assert.equal(res.isOverspent, false);
});
