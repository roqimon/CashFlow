const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

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
      querySelector: (s) => makeEl('sub-' + s),
      focus: () => {}
    };
  }

  const context = {
    console,
    crypto: require('node:crypto'),
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    JSON,
    document: {
      documentElement: { dataset: {}, style: {} },
      body: { dataset: {}, style: {} },
      getElementById: (id) => (elements[id] ||= makeEl(id)),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (type, fn) => { (listeners['doc:'+type] ||= []).push(fn); }
    },
    navigator: { onLine: true, userAgent: 'test' },
    localStorage: {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
    },
    addEventListener: (type, fn) => { (listeners['win:'+type] ||= []).push(fn); },
    removeEventListener: () => {},
    location: { href: 'http://localhost/' },
    history: { pushState: () => {}, replaceState: () => {} },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    alert: () => {},
    confirm: () => true
  };
  context.window = context;
  context.$ = context.document.getElementById;

  const savingsSource = fs.readFileSync('savings-core.js', 'utf8');
  vm.createContext(context);
  vm.runInContext(savingsSource, context);
  vm.runInContext(code, context);

  return { ctx: context, storage, elements, listeners };
}

test('user can activate pocket even with 0 transactions and 0 income balance', () => {
  const { ctx, storage } = setupEnv();

  // Akun baru: 0 transaksi
  ctx.saveAruskasTransactions([]);
  assert.equal(ctx.getTX().length, 0, 'No transactions present');

  // Ambil pos bawaan (misal pocket-dapur yang inactive)
  const pockets = ctx.getPockets();
  const dapur = pockets.find(p => p.id === 'pocket-dapur');
  assert.ok(dapur, 'pocket-dapur should exist');
  assert.equal(ctx.isPocketActive(dapur), false, 'Default pocket-dapur should initially be inactive');

  // User mengaktifkan pos anggaran Dapur & Makan
  ctx.setPocketActive('pocket-dapur', true);

  // Verifikasi: pos dapur sekarang harus AKTIF!
  const updatedPockets = ctx.getPockets();
  const updatedDapur = updatedPockets.find(p => p.id === 'pocket-dapur');
  assert.equal(updatedDapur.isActive, true, 'pocket-dapur must be active after user toggles it');
  assert.equal(ctx.isPocketActive(updatedDapur), true, 'isPocketActive must return true for updatedDapur');

  // Pastikan render menampilkan kartu pos di beranda
  ctx.refreshAruskas();
  const budgetContainer = ctx.document.getElementById('budgetPocketList');
  assert.ok(budgetContainer.innerHTML.includes('pocket-dapur'), 'budgetPocketList should contain pocket-dapur card');
});
