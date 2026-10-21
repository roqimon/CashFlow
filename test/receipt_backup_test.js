const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReceiptBackup, restoreReceiptBackup } = require('../receipt-backup.js');

function store(initial = []) {
  const records = new Map(initial.map(item => [item.id, item]));
  return {
    records,
    list: async () => [...records.values()],
    get: async id => records.get(id) || null,
    put: async item => { records.set(item.id, item); },
    remove: async id => { records.delete(id); }
  };
}

test('JSON backup includes JPEG bytes and original metadata once', async () => {
  const photo = { id: 'r1', blob: new Blob(['JPEG bytes'], { type: 'image/jpeg' }), capturedAt: '2026-10-21T10:00:00Z', title: 'Pasar', categoryNames: ['Makan'], transactionIds: ['t1', 't2'] };
  const backup = await buildReceiptBackup({ transactions: [{ id: 't1', receiptId: 'r1' }] }, store([photo]));
  assert.equal(backup.receipts.length, 1);
  assert.equal(backup.receipts[0].imageBase64, btoa('JPEG bytes'));
  assert.deepEqual(backup.receipts[0].transactionIds, ['t1', 't2']);
});

test('restoring a backup twice upserts by ID and preserves linked transactions', async () => {
  const origin = store([{ id: 'r1', blob: new Blob(['image'], { type: 'image/jpeg' }), capturedAt: '2026-10-21T10:00:00Z', title: 'Pasar', categoryNames: [], transactionIds: ['t1'] }]);
  const backup = await buildReceiptBackup({ transactions: [{ id: 't1', receiptId: 'r1' }] }, origin);
  const target = store();
  await restoreReceiptBackup(backup.receipts, target);
  await restoreReceiptBackup(backup.receipts, target);
  assert.equal(target.records.size, 1);
  assert.equal(await target.records.get('r1').blob.text(), 'image');
});

test('old backups without photos remain valid and malformed image data fails before writes', async () => {
  const target = store();
  assert.equal(await restoreReceiptBackup(undefined, target), 0);
  await assert.rejects(restoreReceiptBackup([{ id: 'r1', imageBase64: '%' }], target), /foto|base64/i);
  assert.equal(target.records.size, 0);
});

test('photo write failure rolls back newly imported photos', async () => {
  const backup = await buildReceiptBackup({}, store([
    { id: 'r1', blob: new Blob(['1'], { type: 'image/jpeg' }), capturedAt: '2026-10-21T10:00:00Z', title: 'A' },
    { id: 'r2', blob: new Blob(['2'], { type: 'image/jpeg' }), capturedAt: '2026-10-21T10:00:00Z', title: 'B' }
  ]));
  const target = store();
  target.put = async item => { if (item.id === 'r2') throw new Error('Kuota penuh'); target.records.set(item.id, item); };
  await assert.rejects(restoreReceiptBackup(backup.receipts, target), /Kuota penuh/);
  assert.equal(target.records.size, 0);
});
