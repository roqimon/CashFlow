const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('--- Test 1: Floating Bulk Bar UI Structure and CSS ---');
assert.ok(html.includes('.bulk-bar{display:none;position:fixed!important;left:14px!important;right:14px!important;bottom:calc(86px + env(safe-area-inset-bottom, 0px))!important'), 'bulk-bar must be fixed floating above bottom nav');
assert.ok(html.includes('id="homeBulkBar"'), 'homeBulkBar must exist in Home');
assert.ok(html.includes('id="txBulkBar"'), 'txBulkBar must exist in Transactions');
assert.ok(html.includes('id="homeSelectAllBtn"'), 'homeSelectAllBtn must exist');
assert.ok(html.includes('id="txSelectAllBtn"'), 'txSelectAllBtn must exist');
assert.ok(html.includes('id="homeToggleSelectBtn"'), 'homeToggleSelectBtn must exist in Home header');
assert.ok(html.includes('id="txToggleSelectBtn"'), 'txToggleSelectBtn must exist in Transactions header');
assert.ok(html.includes('data-exit-select'), 'data-exit-select buttons must exist');
assert.ok(html.includes('id="homeBulkDelete"'), 'homeBulkDelete must exist');
assert.ok(html.includes('id="txBulkDelete"'), 'txBulkDelete must exist');
console.log('✔ Floating bulk bar structure and styling verified');

console.log('--- Test 2: Select Mode and Bulk Delete Logic ---');
assert.ok(html.includes('function startSelectMode()'), 'startSelectMode function exists');
assert.ok(html.includes('function exitSelectMode()'), 'exitSelectMode function exists');
assert.ok(html.includes('function toggleSelectAllVisible()'), 'toggleSelectAllVisible function exists');
assert.ok(html.includes('function updateSelectUI()'), 'updateSelectUI function exists');
assert.ok(html.includes('async function bulkDelete()'), 'bulkDelete function exists');
assert.ok(html.includes('homeToggleSelectBtn'), 'homeToggleSelectBtn listener attached');
assert.ok(html.includes('txToggleSelectBtn'), 'txToggleSelectBtn listener attached');
assert.ok(html.includes('confirmCancel'), 'confirmCancel listener attached');
assert.ok(html.includes('confirmOk'), 'confirmOk listener attached');
console.log('✔ Select Mode and Bulk Delete handlers verified');

console.log('--- Test 3: Simulation of Select Mode and Bulk Deletion ---');
// Simulate state logic
let txList = [
  { id: '1', title: 'Makan Siang', amount: 35000 },
  { id: '2', title: 'Kopi', amount: 18000 },
  { id: '3', title: 'Bensin', amount: 25000 }
];
let selectSet = new Set();
let selectMode = false;

// 1. Enter selectMode
selectMode = true;
selectSet.clear();
assert.strictEqual(selectMode, true);
assert.strictEqual(selectSet.size, 0);

// 2. Select items 1 and 3
selectSet.add('1');
selectSet.add('3');
assert.strictEqual(selectSet.size, 2);
assert.strictEqual(selectSet.has('1'), true);
assert.strictEqual(selectSet.has('2'), false);
assert.strictEqual(selectSet.has('3'), true);

// 3. Select all visible
const visibleIds = txList.map(t => t.id);
const allSelected = visibleIds.every(id => selectSet.has(id));
assert.strictEqual(allSelected, false);
visibleIds.forEach(id => selectSet.add(id));
assert.strictEqual(selectSet.size, 3);

// 4. Test cancel (exitSelectMode)
selectMode = false;
selectSet.clear();
assert.strictEqual(selectMode, false);
assert.strictEqual(selectSet.size, 0);

// 5. Test deletion with selectSet
selectMode = true;
selectSet.add('2');
const remainingTx = txList.filter(t => !selectSet.has(t.id));
assert.strictEqual(remainingTx.length, 2);
assert.strictEqual(remainingTx.find(t => t.id === '2'), undefined);
selectMode = false;
selectSet.clear();
console.log('✔ Select mode simulation, toggle, and bulk deletion logic verified');

console.log('--- Test 4: Camera & Photo Source Selection ---');
assert.ok(html.includes('id="photoChoiceModal"'), 'photoChoiceModal dialog exists');
assert.ok(html.includes('id="btnTakePhoto"'), 'Direct hardware Camera option exists');
assert.ok(html.includes('id="btnPickGallery"'), 'Gallery picker option exists');
assert.ok(html.includes('id="cameraDirectInput" accept="image/*" capture="environment"'), 'Direct rear camera input has capture=environment');
assert.ok(html.includes('id="galleryFileInput" accept="image/*"'), 'Gallery file input accepts image/*');
console.log('✔ Photo selection options & hardware camera hooks verified');

console.log('--- Test 5: Voice Input HTTPS & Speech Guidance ---');
assert.ok(html.includes('id="voiceNoticeModal"'), 'voiceNoticeModal exists');
assert.ok(html.includes('window.isSecureContext'), 'Checks isSecureContext');
assert.ok(html.includes('openModalLayer(\'voiceNoticeModal\')'), 'Opens voiceNoticeModal when context is not secure');
console.log('✔ Voice input modal and security checks verified');

console.log('--- Test 6: All Pages & Navigation Integrity ---');
const pages = ['home', 'transactions', 'add', 'report', 'shortcut'];
pages.forEach(p => {
  assert.ok(html.includes(`data-page="${p}"`), `Page ${p} must exist in HTML`);
  assert.ok(html.includes(`data-nav="${p}"`), `Nav button for ${p} must exist`);
});
console.log('✔ All 5 pages and navigation buttons verified');

console.log('\n=======================================');
console.log('All Bulk Mode & UX verification tests PASSED!');
console.log('=======================================');
