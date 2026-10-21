const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fakeIndexedDB() {
  const records = new Map();
  let created = false;
  const db = {
    objectStoreNames: { contains: () => created },
    createObjectStore(name) { assert.equal(name, 'receipts'); created = true; },
    transaction(name, mode) {
      assert.equal(name, 'receipts');
      assert.ok(['readonly', 'readwrite'].includes(mode));
      const tx = { oncomplete: null, onerror: null, error: null };
      tx.objectStore = () => Object.fromEntries(['put', 'get', 'getAll', 'delete', 'clear'].map(method => [method, value => {
        const request = { onsuccess: null, onerror: null, result: null };
        queueMicrotask(() => {
          if (method === 'put') records.set(value.id, value);
          if (method === 'get') request.result = records.get(value) || undefined;
          if (method === 'getAll') request.result = [...records.values()];
          if (method === 'delete') records.delete(value);
          if (method === 'clear') records.clear();
          request.onsuccess?.({ target: request });
          queueMicrotask(() => tx.oncomplete?.());
        });
        return request;
      }]));
      return tx;
    }
  };
  return { open() {
    const request = { onupgradeneeded: null, onsuccess: null, onerror: null, result: db };
    queueMicrotask(() => { request.onupgradeneeded?.(); request.onsuccess?.(); });
    return request;
  } };
}

test('receipt store keeps one JPEG record and supports lookup, list, delete, and clear', async () => {
  const { createReceiptStore } = require('../receipt-store.js');
  const store = createReceiptStore(fakeIndexedDB());
  const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
  const receipt = { id: 'r-1', blob, capturedAt: '2026-10-21T08:00:00Z', title: 'Toko', categoryNames: ['Belanja'], transactionIds: ['t-1', 't-2'] };
  await store.put(receipt);
  assert.equal((await store.get('r-1')).blob, blob);
  assert.deepEqual((await store.list()).map(item => item.id), ['r-1']);
  await store.remove('r-1');
  assert.equal(await store.get('r-1'), null);
  await store.put(receipt);
  await store.clear();
  assert.deepEqual(await store.list(), []);
});

test('transaction normalizer preserves receipt link and duplicate omits it', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const txSource = html.match(/^function tx\(o\).*$/m)?.[0];
  assert.ok(txSource, 'tx() exists');
  const context = { id: () => 'new-id', icon: () => '•', getActiveSTSession: () => null, Date };
  vm.createContext(context);
  vm.runInContext(`${txSource}; this.tx = tx`, context);
  assert.equal(context.tx({ id: 't-1', receiptId: 'r-1' }).receiptId, 'r-1');
  const duplicateSource = html.match(/function duplicateTx\(\)\{.*?\}(?=async function deleteTx)/s)?.[0];
  assert.ok(duplicateSource, 'duplicateTx() exists');
  let saved;
  Object.assign(context, {
    selectedId: 't-1', getTX: () => [{ id: 't-1', title: 'Toko', receiptId: 'r-1' }],
    saveTX: arr => { saved = arr; }, closeModalLayer: () => {}, render: () => {}
  });
  vm.runInContext(`${duplicateSource}; duplicateTx()`, context);
  assert.equal(saved[0].receiptId, null);
});

test('unlinking a deleted photo keeps transactions', () => {
  const { unlinkReceipt } = require('../receipt-store.js');
  const transactions = [{ id: 't-1', receiptId: 'r-1' }, { id: 't-2', receiptId: 'r-2' }];
  assert.deepEqual(unlinkReceipt(transactions, 'r-1'), [{ id: 't-1', receiptId: null }, { id: 't-2', receiptId: 'r-2' }]);
});
