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

test('default pockets include three commitment pockets and Uang Bebas', () => {
  const env = setupEnv();
  const pockets = env.getPockets();
  assert.equal(pockets.length, 4);
  assert.equal(pockets[0].id, 'pocket-dapur');
  assert.equal(pockets[1].id, 'pocket-tagihan');
  assert.equal(pockets[2].id, 'pocket-keluarga');
  assert.equal(pockets[3].id, 'bebas');
  assert.equal(pockets[3].isSystem, true);
});

test('calculatePocketUsage matches across payday boundary (e.g. 26 Oct uses 25 Oct transaction)', () => {
  const env = setupEnv();
  const pocket = { id: 'pocket-dapur', name: 'Dapur', amount: 2500000, categories: ['dapur'] };
  const txList = [
    { type: 'expense', amount: 100000, category: 'dapur', createdAt: '2026-10-25T10:00:00' },
    { type: 'expense', amount: 50000, category: 'dapur', createdAt: '2026-10-20T10:00:00' } // previous cycle
  ];
  // On 2026-10-26 with payday 25, the 2026-10-25 transaction is in-cycle, but 2026-10-20 is previous cycle
  const usage = env.calculatePocketUsage(pocket, new Date('2026-10-26T10:00:00'), txList);
  assert.equal(usage.spent, 100000);
});
