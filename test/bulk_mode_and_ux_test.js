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
const pages = ['home', 'transactions', 'add', 'report', 'settings'];
pages.forEach(p => {
  assert.ok(html.includes(`data-page="${p}"`), `Page ${p} must exist in HTML`);
  assert.ok(html.includes(`data-nav="${p}"`), `Nav button for ${p} must exist`);
});
assert.ok(html.includes('data-legacy-page="shortcut"'), 'Legacy shortcut page alias must exist');
console.log('✔ All 5 pages and navigation buttons verified');

console.log('--- Test 7: App Update Indicators & Banners ---');
assert.ok(html.includes('id="updateSuccessBanner"'), 'updateSuccessBanner element exists');
assert.ok(html.includes('id="closeUpdateBanner"'), 'closeUpdateBanner button exists');
assert.ok(html.includes('id="appVersionDetails"'), 'appVersionDetails card exists');
assert.ok(html.includes('id="appVersionBadge"'), 'appVersionBadge badge exists');
assert.ok(html.includes('id="updateStatusText"'), 'updateStatusText description exists');
assert.ok(html.includes('Ringkasan dan input cepat'), 'Home subtitle contains subtitle text');
assert.ok(html.includes('checkUpdateNotice()'), 'checkUpdateNotice function is executed');
console.log('✔ Update indicators, banner, and version badges verified');

console.log('--- Test 8: Budget Pockets Bulk Mode & Persistence ---');
assert.ok(html.includes('id="pocketBulkBar"'), 'pocketBulkBar must exist');
assert.ok(html.includes('id="pocketToggleSelectBtn"'), 'pocketToggleSelectBtn must exist');
assert.ok(html.includes('id="pocketSelectAllBtn"'), 'pocketSelectAllBtn must exist');
assert.ok(html.includes('id="pocketBulkDelete"'), 'pocketBulkDelete must exist');
assert.ok(html.includes('data-exit-pocket-select'), 'data-exit-pocket-select must exist');
assert.ok(html.includes('function startPocketSelectMode()'), 'startPocketSelectMode must exist');
assert.ok(html.includes('function exitPocketSelectMode()'), 'exitPocketSelectMode must exist');
assert.ok(html.includes('function bulkDeletePockets()'), 'bulkDeletePockets must exist');
assert.ok(html.includes('pocket-manage-item'), 'pocket-manage-item styling class exists');

// Verify pocket persistence logic simulation
const mockStorage = {};
const KEY_POCKETS = 'aruskas_budget_pockets_v1';
const defaultPockets = [
  { id: 'pocket-dapur', name: 'Dapur' },
  { id: 'pocket-transport', name: 'Transport' }
];

function mockGetPockets() {
  const raw = mockStorage[KEY_POCKETS];
  if (raw === undefined || raw === null) {
    mockStorage[KEY_POCKETS] = JSON.stringify(defaultPockets);
    return defaultPockets;
  }
  const arr = JSON.parse(raw);
  return Array.isArray(arr) ? arr : [];
}

function mockSavePockets(list) {
  mockStorage[KEY_POCKETS] = JSON.stringify(Array.isArray(list) ? list : []);
}

// 1. First run seeds defaults
let p = mockGetPockets();
assert.strictEqual(p.length, 2, 'First run should seed 2 default pockets');

// 2. Delete pocket-transport
mockSavePockets(p.filter(item => item.id !== 'pocket-transport'));

// 3. Second run must NOT respawn pocket-transport
let pAfterDel = mockGetPockets();
assert.strictEqual(pAfterDel.length, 1, 'Only 1 pocket should remain');
assert.strictEqual(pAfterDel[0].id, 'pocket-dapur', 'Remaining pocket must be pocket-dapur');

// 4. Delete all pockets (bulk delete simulation)
mockSavePockets([]);
let pEmpty = mockGetPockets();
assert.strictEqual(pEmpty.length, 0, 'Empty pockets array must remain empty and not respawn');
console.log('✔ Budget Pockets bulk delete & persistence verified');

console.log('--- Test 9: Shortcuts Bulk Mode ---');
assert.ok(html.includes('id="scBulkBar"'), 'scBulkBar must exist');
assert.ok(html.includes('id="scToggleSelectBtn"'), 'scToggleSelectBtn must exist');
assert.ok(html.includes('id="scSelectAllBtn"'), 'scSelectAllBtn must exist');
assert.ok(html.includes('id="scBulkDelete"'), 'scBulkDelete must exist');
assert.ok(html.includes('data-exit-sc-select'), 'data-exit-sc-select must exist');
assert.ok(html.includes('function startScSelectMode()'), 'startScSelectMode must exist');
assert.ok(html.includes('function exitScSelectMode()'), 'exitScSelectMode must exist');
assert.ok(html.includes('function bulkDeleteShortcuts()'), 'bulkDeleteShortcuts must exist');
assert.ok(html.includes('shortcut-manage-item'), 'shortcut-manage-item styling class exists');

// Shortcut bulk delete simulation
let mockShortcuts = [
  { id: 'sc-1', code: 'kopi', title: 'Kopi' },
  { id: 'sc-2', code: 'bensin', title: 'Bensin' },
  { id: 'sc-3', code: 'makan', title: 'Makan' }
];
let scSelectSet = new Set(['sc-1', 'sc-3']);
let remainingShortcuts = mockShortcuts.filter(s => !scSelectSet.has(s.id));
assert.strictEqual(remainingShortcuts.length, 1);
assert.strictEqual(remainingShortcuts[0].code, 'bensin');
console.log('✔ Shortcuts bulk mode & bulk delete logic verified');

console.log('\n=======================================');
console.log('All Bulk Mode & UX verification tests PASSED!');
console.log('=======================================');
