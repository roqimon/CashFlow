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
    const el = {
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
      querySelector: () => makeEl('query-' + Math.random()),
      appendChild: () => {},
      append: () => {},
      removeChild: () => {},
      focus: () => {}
    };
    return el;
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

test('getPaydaySetting defaults to 25 and persists changes', () => {
  const env = setupEnv();
  assert.equal(typeof env.getPaydaySetting, 'function', 'getPaydaySetting should be defined');
  assert.equal(env.getPaydaySetting(), 25);
  env.savePaydaySetting(1);
  assert.equal(env.getPaydaySetting(), 1);
});

test('getPaydayCycle with payday 25 on 2026-10-22 (before payday)', () => {
  const env = setupEnv();
  assert.equal(typeof env.getPaydayCycle, 'function', 'getPaydayCycle should be defined');
  const cycle = env.getPaydayCycle(new Date('2026-10-22T10:00:00Z'), 25);
  assert.equal(cycle.start.getFullYear(), 2026);
  assert.equal(cycle.start.getMonth(), 8); // September (0-indexed)
  assert.equal(cycle.start.getDate(), 25);
  assert.equal(cycle.end.getFullYear(), 2026);
  assert.equal(cycle.end.getMonth(), 9); // October
  assert.equal(cycle.end.getDate(), 24);
  assert.ok(cycle.daysRemaining >= 1);
});

test('getPaydayCycle with payday 25 on 2026-10-26 (after payday)', () => {
  const env = setupEnv();
  assert.equal(typeof env.getPaydayCycle, 'function', 'getPaydayCycle should be defined');
  const cycle = env.getPaydayCycle(new Date('2026-10-26T10:00:00Z'), 25);
  assert.equal(cycle.start.getFullYear(), 2026);
  assert.equal(cycle.start.getMonth(), 9); // October (0-indexed)
  assert.equal(cycle.start.getDate(), 25);
  assert.equal(cycle.end.getFullYear(), 2026);
  assert.equal(cycle.end.getMonth(), 10); // November
  assert.equal(cycle.end.getDate(), 24);
});

test('getPaydayCycle with payday 1 covers full calendar month', () => {
  const env = setupEnv();
  assert.equal(typeof env.getPaydayCycle, 'function', 'getPaydayCycle should be defined');
  const cycle = env.getPaydayCycle(new Date('2026-10-15T10:00:00Z'), 1);
  assert.equal(cycle.start.getDate(), 1);
  assert.equal(cycle.end.getDate(), 31);
  assert.equal(cycle.start.getMonth(), 9);
  assert.equal(cycle.end.getMonth(), 9);
});
