const test = require('node:test');
const assert = require('node:assert/strict');
const ReceiptAnalysis = require('../receipt-analysis.js');

test('uses a valid printed date and falls back for absent or impossible dates', () => {
  const upload = new Date('2026-10-21T08:15:00+07:00');
  assert.equal(ReceiptAnalysis.receiptDate('2026-10-19', upload), '2026-10-19T12:00:00.000Z');
  assert.equal(ReceiptAnalysis.receiptDate('19/10/2026', upload), '2026-10-19T12:00:00.000Z');
  assert.equal(ReceiptAnalysis.receiptDate('31/02/2026', upload), upload.toISOString());
  assert.equal(ReceiptAnalysis.receiptDate(null, upload), upload.toISOString());
});

test('accepts reconciled product rows and never adds the receipt total twice', () => {
  const result = ReceiptAnalysis.chooseTransactions({merchant:'Indomaret',total:18000,items:[{title:'Roti',amount:8000,category:'Makan'},{title:'Air mineral',amount:10000,category:'Belanja'}]}, ['Makan','Belanja']);
  assert.equal(result.mode, 'items');
  assert.equal(result.items.length, 2);
  assert.equal(result.items.reduce((sum, item) => sum + item.amount, 0), 18000);
});

test('falls back to one merchant total when product rows are incomplete', () => {
  const result = ReceiptAnalysis.chooseTransactions({merchant:'Indomaret',total:20000,items:[{title:'Roti',amount:8000,category:'Makan'}]}, ['Makan']);
  assert.equal(result.mode, 'total');
  assert.deepEqual(result.items.map(item => [item.title,item.amount]), [['Indomaret',20000]]);
});

test('rejects an unverified subtotal as a complete receipt', () => {
  const result = ReceiptAnalysis.chooseTransactions({merchant:'Toko',items:[{title:'Roti',amount:8000}]}, ['Makan']);
  assert.equal(result.mode, 'manual');
});
