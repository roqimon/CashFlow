const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
function captureFunction(name, nextName) {
  const start = html.indexOf(`async function ${name}(`);
  const end = html.indexOf(`\n${nextName}`, start);
  assert.ok(start >= 0 && end > start, `${name} has a standalone implementation`);
  return html.slice(start, end);
}

test('archive preparation makes a JPEG Blob from a 1600 px copy', async () => {
  const source = captureFunction('prepareReceiptBlob', 'async function persistScannedReceipt');
  const context = { Blob, atob, compressImage: async (file, size, quality) => {
    assert.equal(size, 1600);
    assert.equal(quality, 0.82);
    return 'YWJj';
  } };
  vm.createContext(context);
  vm.runInContext(`${source}; this.prepareReceiptBlob = prepareReceiptBlob`, context);
  const blob = await context.prepareReceiptBlob({ name: 'nota.png' });
  assert.equal(blob.type, 'image/jpeg');
  assert.equal(await blob.text(), 'abc');
});

test('one photo attaches to every valid AI transaction and saves once', async () => {
  const source = captureFunction('persistScannedReceipt', 'async function executeReceiptAiScan');
  const records = [];
  let saved;
  const context = {
    id: () => 'r-1',
    prepareReceiptBlob: async () => new Blob(['photo'], { type: 'image/jpeg' }),
    window: { ReceiptStore: { put: async record => records.push(record), remove: async () => {} } },
    getTX: () => [{ id: 'old' }],
    saveTX: items => { saved = items; return true; }
  };
  vm.createContext(context);
  vm.runInContext(`${source}; this.persistScannedReceipt = persistScannedReceipt`, context);
  const items = [{ id: 't-1', title: 'A', amount: 1000, category: 'Makan' }, { id: 't-2', title: 'B', amount: 2000, category: 'Belanja' }, { id: 'bad', amount: 0 }];
  const result = await context.persistScannedReceipt({ file: {}, items });
  assert.equal(result.receiptId, 'r-1');
  assert.equal(records.length, 1);
  assert.equal(records[0].transactionIds.length, 2);
  assert.deepEqual(Array.from(saved.slice(0, 2), item => item.receiptId), ['r-1', 'r-1']);
  assert.equal(saved.length, 3);
});

test('storage failure does not silently save transaction and failed transaction rolls photo back', async () => {
  const source = captureFunction('persistScannedReceipt', 'async function executeReceiptAiScan');
  let saved = false;
  let removed = false;
  const context = {
    id: () => 'r-1', prepareReceiptBlob: async () => new Blob(['photo']),
    window: { ReceiptStore: { put: async () => { throw new Error('quota'); }, remove: async () => { removed = true; } } },
    getTX: () => [], saveTX: () => { saved = true; return true; }
  };
  vm.createContext(context);
  vm.runInContext(`${source}; this.persistScannedReceipt = persistScannedReceipt`, context);
  await assert.rejects(context.persistScannedReceipt({ file: {}, items: [{ id: 't-1', title: 'A', amount: 1 }] }), /quota/);
  assert.equal(saved, false);
  context.window.ReceiptStore.put = async () => {};
  context.saveTX = () => false;
  await assert.rejects(context.persistScannedReceipt({ file: {}, items: [{ id: 't-1', title: 'A', amount: 1 }] }), /transaksi/i);
  assert.equal(removed, true);
  assert.equal(saved, false);
});

test('manual and AI paths archive only when there is a transaction', () => {
  assert.match(html, /async function saveScanManualTransaction\([\s\S]*?saveReceiptWithChoice\(/);
  assert.match(html, /async function executeReceiptAiScan\([\s\S]*?saveReceiptWithChoice\(/);
  assert.match(html, /if\(!validItems\.length\)/);
  assert.match(html, /function cancelReceiptScan\(\)\{receiptSelectionToken\+\+;currentReceiptFile=null/);
});

test('manual save cannot duplicate a completed AI scan', async () => {
  const start = html.indexOf('async function saveScanManualTransaction()');
  const end = html.indexOf('\nasync function importJsonData', start);
  assert.ok(start >= 0 && end > start);
  const context = { isScanning: false, receiptScanCompleted: true, $: () => { throw new Error('completed scan should not read the form'); } };
  vm.createContext(context);
  vm.runInContext(`${html.slice(start, end)}; this.saveScanManualTransaction=saveScanManualTransaction`, context);
  await context.saveScanManualTransaction();
});

test('manual save ignores a second click while the first photo is saving', async () => {
  const start = html.indexOf('async function saveScanManualTransaction()');
  const end = html.indexOf('\nasync function importJsonData', start);
  const context = { isScanning: false, receiptScanCompleted: false, receiptSaveInProgress: true, $: () => { throw new Error('second click should not read the form'); } };
  vm.createContext(context);
  vm.runInContext(`${html.slice(start, end)}; this.saveScanManualTransaction=saveScanManualTransaction`, context);
  await context.saveScanManualTransaction();
});
