const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('account-client.js', 'utf8');

function setupTestEnvironment({ initialTransactions = [], remoteSync = { transactions: [], documents: [], deletedIds: [], deletedDocumentKeys: [] } }) {
  const storage = new Map();
  if (initialTransactions.length) {
    storage.set('aruskas_transactions_v4_st', JSON.stringify(initialTransactions));
  }
  const elements = new Map();
  const documentListeners = {};
  const windowListeners = {};
  const requests = [];

  const getOrCreateEl = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        hidden: true,
        style: {},
        dataset: {},
        addEventListener() {},
        querySelectorAll: () => [],
        setAttribute() {},
      });
    }
    return elements.get(id);
  };

  const document = {
    readyState: 'loading',
    visibilityState: 'visible',
    addEventListener: (name, fn) => { documentListeners[name] = fn; },
    getElementById: id => getOrCreateEl(id),
  };

  let savedTx = null;
  let refreshed = false;

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
    saveAruskasTransactions: (txns) => { savedTx = txns; },
    refreshAruskas: () => { refreshed = true; },
    openAccountModal: () => {},
    fetch: async (url, options = {}) => {
      requests.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
      if (url.endsWith('/check')) {
        return { ok: true, json: async () => ({ authenticated: true, id: 'new-user-123', email: 'test@example.com' }) };
      }
      if (url.endsWith('/sync')) {
        return { ok: true, json: async () => remoteSync };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);

  return { context, storage, elements, requests, documentListeners, getSavedTx: () => savedTx, isRefreshed: () => refreshed };
}

test('new user onboarding prompt is displayed when remote is empty but local has sample data', async () => {
  const sampleTx = [{ id: 'sample-1', title: 'Kopi', amount: 25000, type: 'expense' }];
  const { elements, documentListeners, getSavedTx, storage } = setupTestEnvironment({ initialTransactions: sampleTx });

  documentListeners.DOMContentLoaded();
  await new Promise(resolve => setImmediate(resolve));

  const onboardingEl = elements.get('accountNewUserOnboarding');
  assert.equal(onboardingEl.hidden, false, 'accountNewUserOnboarding should be shown');

  // Trigger start fresh
  const startFreshBtn = elements.get('accountStartFresh');
  assert.equal(typeof startFreshBtn.onclick, 'function', 'accountStartFresh onclick handler should be registered');
  await startFreshBtn.onclick();

  assert.equal(onboardingEl.hidden, true, 'accountNewUserOnboarding should be hidden after choosing');
  assert.equal(getSavedTx()?.length, 0, 'Local transactions should be cleared to empty array');
  assert.equal(storage.get('aruskas_cleared'), '1', 'aruskas_cleared flag should be set');
});

test('new user choosing keep local transactions pushes local transactions to cloud', async () => {
  const sampleTx = [{ id: 'sample-1', title: 'Kopi', amount: 25000, type: 'expense' }];
  const { elements, documentListeners, requests } = setupTestEnvironment({ initialTransactions: sampleTx });

  documentListeners.DOMContentLoaded();
  await new Promise(resolve => setImmediate(resolve));

  const onboardingEl = elements.get('accountNewUserOnboarding');
  assert.equal(onboardingEl.hidden, false, 'accountNewUserOnboarding should be shown');

  const keepLocalBtn = elements.get('accountKeepLocal');
  assert.equal(typeof keepLocalBtn.onclick, 'function', 'accountKeepLocal onclick handler should be registered');
  await keepLocalBtn.onclick();

  assert.equal(onboardingEl.hidden, true, 'accountNewUserOnboarding should be hidden after choosing');
  const postSync = requests.find(r => r.url.endsWith('/sync') && r.method === 'POST');
  assert.ok(postSync, 'A POST sync request should have been dispatched');
  assert.equal(postSync.body.transactions.length, 1, 'Local transaction should be pushed in payload');
});
