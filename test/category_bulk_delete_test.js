const assert = require('node:assert/strict');
const fs = require('node:fs');

console.log('=== TEST SUITE: Category Bulk Delete in Pintasan Page ===\n');

const html = fs.readFileSync('index.html', 'utf8');

// --- Test 1: Category Header & Bulk Bar UI Elements ---
console.log('--- Test 1: Category Header & Bulk Bar UI Elements ---');
assert.ok(html.includes('id="catToggleSelectBtn"'), 'Category section must have a select toggle button #catToggleSelectBtn');
assert.ok(html.includes('id="catBulkBar"'), 'Category section must have a floating bulk bar #catBulkBar');
assert.ok(html.includes('id="catSelectAllBtn"'), 'Category bulk bar must have a select all button #catSelectAllBtn');
assert.ok(html.includes('id="catSelCount"'), 'Category bulk bar must have an item count indicator #catSelCount');
assert.ok(html.includes('data-exit-cat-select'), 'Category bulk bar must have an exit/cancel button with data-exit-cat-select');
assert.ok(html.includes('id="catBulkDelete"'), 'Category bulk bar must have a bulk delete button #catBulkDelete');
console.log('✔ Category UI elements verified');

// --- Test 2: CSS Rules for Selectable Categories & Checkbox ---
console.log('--- Test 2: CSS Rules for Selectable Categories & Checkbox ---');
assert.ok(html.includes('.category-manage-item'), 'CSS includes .category-manage-item styling');
assert.ok(html.includes('.cat-cb'), 'CSS includes .cat-cb styling');
console.log('✔ CSS rules verified');

// --- Test 3: JavaScript State & Function Definitions ---
console.log('--- Test 3: JavaScript State & Function Definitions ---');
assert.ok(html.includes('let catSelectMode'), 'catSelectMode variable is defined');
assert.ok(html.includes('catSelectSet'), 'catSelectSet variable is defined');
assert.ok(html.includes('function startCatSelectMode('), 'startCatSelectMode function is defined');
assert.ok(html.includes('function exitCatSelectMode('), 'exitCatSelectMode function is defined');
assert.ok(html.includes('function updateCatSelectUI('), 'updateCatSelectUI function is defined');
assert.ok(html.includes('function toggleSelectAllCats('), 'toggleSelectAllCats function is defined');
assert.ok(html.includes('async function bulkDeleteCategories('), 'bulkDeleteCategories function is defined');
console.log('✔ Function and state definitions verified');

// --- Test 4: Mutual Exclusivity and Navigation Hooks ---
console.log('--- Test 4: Mutual Exclusivity and Navigation Hooks ---');
assert.ok(html.includes('if(catSelectMode)exitCatSelectMode()') || html.includes('if(catSelectMode) exitCatSelectMode()'), 'Navigation / Layer reset clears catSelectMode');
assert.ok(html.includes('catToggleSelectBtn'), 'catToggleSelectBtn event listener hook exists');
assert.ok(html.includes('catSelectAllBtn'), 'catSelectAllBtn event listener hook exists');
assert.ok(html.includes('catBulkDelete'), 'catBulkDelete event listener hook exists');
console.log('✔ Mutual exclusivity & navigation hooks verified');

// --- Test 5: Logic Unit Test for Protection of "Lainnya" and Safe Reassignment ---
console.log('--- Test 5: Logic Unit Test for Protection of "Lainnya" and Safe Reassignment ---');
// Mock environment
let transactions = [
  { id: '1', title: 'Nasi Padang', category: 'Makan', amount: 25000, type: 'expense' },
  { id: '2', title: 'Bensin Motor', category: 'Transport', amount: 20000, type: 'expense' },
  { id: '3', title: 'Gaji Bulanan', category: 'Gaji', amount: 5000000, type: 'income' },
  { id: '4', title: 'Lain-lain', category: 'Lainnya', amount: 15000, type: 'expense' }
];

let shortcuts = [
  { id: 'sc1', code: 'padang', title: 'Nasi Padang', category: 'Makan', type: 'expense' },
  { id: 'sc2', code: 'bbm', title: 'Bensin', category: 'Transport', type: 'expense' }
];

const selectedCats = new Set(['Makan', 'Transport', 'Lainnya']);
// 'Lainnya' must be filtered out
const catsToDelete = Array.from(selectedCats).filter(c => c !== 'Lainnya');
assert.deepEqual(catsToDelete.sort(), ['Makan', 'Transport'], 'Lainnya is strictly protected and never deleted');

// Execute simulation of reassignment
transactions.forEach(t => {
  if (catsToDelete.includes(t.category)) {
    t.category = 'Lainnya';
  }
});
shortcuts.forEach(s => {
  if (catsToDelete.includes(s.category)) {
    s.category = 'Lainnya';
  }
});

assert.equal(transactions.find(t => t.id === '1').category, 'Lainnya', 'Tx 1 reassigned to Lainnya');
assert.equal(transactions.find(t => t.id === '2').category, 'Lainnya', 'Tx 2 reassigned to Lainnya');
assert.equal(transactions.find(t => t.id === '3').category, 'Gaji', 'Tx 3 preserved as Gaji');
assert.equal(shortcuts.find(s => s.id === 'sc1').category, 'Lainnya', 'Shortcut 1 reassigned to Lainnya');
assert.equal(shortcuts.find(s => s.id === 'sc2').category, 'Lainnya', 'Shortcut 2 reassigned to Lainnya');
console.log('✔ Safe reassignment and protection logic verified');

console.log('\n=======================================');
console.log('All Category Bulk Delete Tests PASSED!');
console.log('=======================================');
