const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareShareFiles, shareSelectedReceipts } = require('../receipt-gallery.js');

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
