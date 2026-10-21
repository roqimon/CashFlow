const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareShareFiles, shareSelectedReceipts, buildReportSharePlan, buildReceiptPdf } = require('../receipt-gallery.js');
const { create: createPdf } = require('../receipt-pdf.js');

test('creates a readable PDF document containing one page per receipt image', async () => {
  const originalDocument = global.document;
  const originalCreateImageBitmap = global.createImageBitmap;
  global.createImageBitmap = async () => ({ width: 2, height: 3, close() {} });
  global.document = { createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({ fillStyle: '', fillRect() {}, drawImage() {} }),
    toBlob: callback => callback(new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' }))
  }) };
  try {
    const pdf = await createPdf([
      { title: 'Pasar', capturedAt: '2026-10-01T10:00:00Z', image: new Blob(['receipt']) },
      { title: 'Toko', capturedAt: '2026-10-31T10:00:00Z', image: new Blob(['receipt']) }
    ]);
    const contents = Buffer.from(await pdf.arrayBuffer()).toString('latin1');
    assert.equal(pdf.type, 'application/pdf');
    assert.match(contents, /%PDF-1\.4/);
    assert.match(contents, /\/Count 2/);
    assert.match(contents, /\(Pasar\)/);
    assert.match(contents, /\(Toko\)/);
    assert.match(contents, /startxref\n\d+\n%%EOF$/);
  } finally {
    global.document = originalDocument;
    global.createImageBitmap = originalCreateImageBitmap;
  }
});

test('builds one PDF page per selected receipt and labels each with title and date', async () => {
  const records = new Map([
    ['r-1', { id: 'r-1', title: 'Pasar', capturedAt: '2026-10-01T10:00:00Z', blob: new Blob(['first'], { type: 'image/jpeg' }) }],
    ['r-2', { id: 'r-2', title: 'Toko', capturedAt: '2026-10-31T10:00:00Z', blob: new Blob(['second'], { type: 'image/jpeg' }) }]
  ]);
  const pdf = await buildReceiptPdf(['r-1', 'r-2'], { get: async id => records.get(id) }, { create: async pages => pages });
  assert.equal(pdf.length, 2);
  assert.deepEqual(pdf.map(page => page.title), ['Pasar', 'Toko']);
  assert.deepEqual(pdf.map(page => page.date), ['1 Oktober 2026', '31 Oktober 2026']);
  assert.deepEqual(pdf.map(page => page.image.type), ['image/jpeg', 'image/jpeg']);
});

test('WhatsApp modes choose text and photos from the same date filter', () => {
  const receipts = [
    { id: 'r1', capturedAt: '2026-10-21T10:00:00Z', title: 'Pasar' },
    { id: 'r2', capturedAt: '2026-10-20T10:00:00Z', title: 'Toko' }
  ];
  const transactions = [
    { id: 't1', receiptId: 'r1', createdAt: '2026-10-21T10:00:00Z' },
    { id: 't2', receiptId: 'r2', createdAt: '2026-10-20T10:00:00Z' }
  ];
  const dates = { from: '2026-10-21', to: '2026-10-21' };
  assert.deepEqual(buildReportSharePlan('list', receipts, transactions, dates), { includeList: true, receiptIds: [], transactionIds: ['t1'], valid: true });
  assert.deepEqual(buildReportSharePlan('both', receipts, transactions, dates), { includeList: true, receiptIds: ['r1'], transactionIds: ['t1'], valid: true });
  assert.deepEqual(buildReportSharePlan('receipts', receipts, transactions, dates), { includeList: false, receiptIds: ['r1'], transactionIds: ['t1'], valid: true });
  assert.deepEqual(buildReportSharePlan('pdf', receipts, transactions, dates), { includeList: false, receiptIds: ['r1'], transactionIds: ['t1'], valid: true });
  assert.equal(buildReportSharePlan('both', receipts, transactions, { from: '2026-10-22', to: '2026-10-21' }).valid, false);
});

test('prepares selected photos as files before a share click', async () => {
  const records = new Map([
    ['r-1', { id: 'r-1', title: 'Pasar', blob: new Blob(['first'], { type: 'image/jpeg' }) }],
    ['r-2', { id: 'r-2', title: 'Toko', blob: new Blob(['second'], { type: 'image/jpeg' }) }]
  ]);
  const files = await prepareShareFiles(['r-1', 'r-2'], { get: async id => records.get(id) }, File);
  assert.equal(files.length, 2);
  assert.deepEqual(files.map(file => file.type), ['image/jpeg', 'image/jpeg']);
  assert.match(files[0].name, /Pasar/);
});

test('unsupported multi-file share leaves files for manual download', async () => {
  let called = false;
  const result = await shareSelectedReceipts([new File(['x'], 'x.jpg')], 'Nota', { canShare: () => false, share: () => { called = true; } });
  assert.equal(result, 'unsupported');
  assert.equal(called, false);
});

test('share calls the native sheet immediately and reports completion only after resolution', async () => {
  const files = [new File(['x'], 'x.jpg')];
  let shared;
  const navigatorApi = { canShare: data => data.files === files, share: data => { shared = data; return Promise.resolve(); } };
  const promise = shareSelectedReceipts(files, 'Pilih WhatsApp', navigatorApi);
  assert.equal(shared.files, files, 'share is invoked in the same click stack');
  assert.equal(await promise, 'shared');
});

test('cancelling native share is not reported as a sent message', async () => {
  const navigatorApi = { canShare: () => true, share: () => Promise.reject(Object.assign(new Error('cancelled'), { name: 'AbortError' })) };
  assert.equal(await shareSelectedReceipts([new File(['x'], 'x.jpg')], 'Nota', navigatorApi), 'cancelled');
});

test('unexpected share errors remain visible to caller', async () => {
  const navigatorApi = { canShare: () => true, share: () => Promise.reject(new Error('target failed')) };
  await assert.rejects(shareSelectedReceipts([new File(['x'], 'x.jpg')], 'Nota', navigatorApi), /target failed/);
});
