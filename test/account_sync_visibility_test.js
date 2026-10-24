const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('account-client.js', 'utf8');

test('a signed-in account refreshes cloud data when the app returns to the foreground', async () => {
  const storage = new Map();
  const elements = new Map();
  const documentListeners = {};
  const windowListeners = {};
  const requests = [];
  const document = {
    readyState: 'loading',
    visibilityState: 'hidden',
    addEventListener: (name, fn) => { documentListeners[name] = fn; },
    getElementById: id => {
      if (!elements.has(id)) elements.set(id, { addEventListener() {}, querySelectorAll: () => [], setAttribute() {}, style: {}, dataset: {} });
      return elements.get(id);
    },
  };
  const context = {
    document,
    navigator: { onLine: true },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
    location: { href: 'https://kas.bisabaca.web.id/#home/guard', pathname: '/', search: '', hash: '#home/guard' },
    URL,
    AbortController,
    Storage: class Storage {},
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval() {},
    addEventListener: (name, fn) => { windowListeners[name] = fn; },
    fetch: async (url, options = {}) => {
      requests.push({ url, method: options.method || 'GET' });
      const payload = url.endsWith('/check')
        ? { authenticated: true, id: 'account-1', email: 'roqimon@gmail.com' }
        : { transactions: [], documents: [], deletedIds: [], deletedDocumentKeys: [] };
      return { ok: true, json: async () => payload };
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);

  documentListeners.DOMContentLoaded();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof documentListeners.visibilitychange, 'function', 'visibility refresh listener is registered');

  const syncCallsBeforeResume = requests.filter(item => item.url.endsWith('/sync')).length;
  document.visibilityState = 'visible';
  documentListeners.visibilitychange();
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(requests.filter(item => item.url.endsWith('/sync')).length, syncCallsBeforeResume + 1);
});
