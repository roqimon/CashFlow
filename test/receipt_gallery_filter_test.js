const test = require('node:test');
const assert = require('node:assert/strict');
const { filter, filterByDateInputs } = require('../receipt-gallery.js');

const receipts = [
  { id: 'r-old', capturedAt: '2026-09-03T10:00:00Z', title: 'Toko Lama', categoryNames: ['Belanja'], transactionIds: ['t-old'] },
  { id: 'r-multi', capturedAt: '2026-10-20T10:00:00Z', title: 'Pasar', categoryNames: ['Makan', 'Belanja'], transactionIds: ['t-1', 't-2'] },
  { id: 'r-orphan', capturedAt: '2026-10-21T10:00:00Z', title: 'Apotek', categoryNames: ['Kesehatan'], transactionIds: ['removed'] }
];
const transactions = [
  { id: 't-old', receiptId: 'r-old', title: 'Toko Lama', category: 'Belanja' },
  { id: 't-1', receiptId: 'r-multi', title: 'Beras', category: 'Makan' },
  { id: 't-2', receiptId: 'r-multi', title: 'Sabun', category: 'Belanja' }
];
const october = { start: new Date('2026-10-01T00:00:00Z'), end: new Date('2026-10-31T23:59:59Z'), allDates: false, category: '', query: '' };

test('period follows report and all dates includes older photos in newest-first order', () => {
  assert.deepEqual(filter(receipts, transactions, october).map(r => r.id), ['r-orphan', 'r-multi']);
  assert.deepEqual(filter(receipts, transactions, { ...october, allDates: true }).map(r => r.id), ['r-orphan', 'r-multi', 'r-old']);
});

test('one multi-transaction photo appears once and matches categories and names', () => {
  const found = filter(receipts, transactions, { ...october, category: 'Belanja', query: 'sabun' });
  assert.deepEqual(found.map(r => r.id), ['r-multi']);
  assert.equal(found[0].transactionCount, 2);
  assert.deepEqual(filter(receipts, transactions, { ...october, category: 'Makan', query: 'sabun' }), []);
});

test('a photo remains searchable after its transaction was deleted', () => {
  assert.deepEqual(filter(receipts, transactions, { ...october, category: 'Kesehatan', query: 'apotek' }).map(r => r.id), ['r-orphan']);
  assert.deepEqual(filter(receipts, transactions, { ...october, category: 'Belanja', query: 'apotek' }), []);
});

test('a chosen date range determines every photo to share without individual selection', () => {
  const visible = filterByDateInputs(receipts, transactions, {
    from: '2026-10-20', to: '2026-10-20', category: '', query: ''
  });
  assert.deepEqual(visible.map(receipt => receipt.id), ['r-multi']);
});

test('date filter rejects reversed or incomplete ranges', () => {
  assert.deepEqual(filterByDateInputs(receipts, transactions, { from: '2026-10-22', to: '2026-10-20' }), []);
  assert.deepEqual(filterByDateInputs(receipts, transactions, { from: '2026-10-20', to: '' }), []);
});
