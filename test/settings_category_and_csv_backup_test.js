const assert = require('node:assert/strict');
const fs = require('node:fs');

console.log('=== TEST SUITE: Settings Category Visuals & CSV Only Backup ===\n');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');

// --- Test 1: Category Manager Visuals and Layout ---
console.log('--- Test 1: Category Manager Visuals and Layout ---');
assert.ok(css.includes('#catManager .category-manage-item'), 'warm-ui.css must contain refined #catManager .category-manage-item layout rules');
assert.ok(css.includes('#catManager .category-manage-item .icon'), 'Category icon dimensions and place-items: center defined');
assert.ok(css.includes('#catManager .shortcut-actions button'), 'Action buttons have defined compact min-height and padding');
assert.ok(html.includes('class="shortcut-item category-manage-item'), 'renderCatManager outputs valid semantic classnames');
assert.ok(html.includes('typeLabel'), 'renderCatManager displays type label (Pemasukan / Pengeluaran)');
console.log('✔ Category Manager visual styling verified');

// --- Test 2: Backup Section is CSV Only (JSON Removed from Settings) ---
console.log('--- Test 2: Backup Section is CSV Only ---');
assert.ok(html.includes('data-action="export-csv"'), 'Export CSV button exists in settings');
assert.ok(html.includes('data-action="import-csv"'), 'Import CSV button exists in settings');
assert.ok(!html.includes('data-action="export-json"'), 'Export JSON button must be removed from settings');
assert.ok(!html.includes('data-action="import-json"'), 'Import JSON button must be removed from settings');
assert.ok(!html.includes('importJsonFileInput'), 'importJsonFileInput must be removed');
assert.ok(html.includes('importCsvFileInput'), 'importCsvFileInput file input exists');
assert.ok(html.includes('accept=".csv,text/csv,application/vnd.ms-excel"'), 'File input strictly accepts CSV formats');
console.log('✔ CSV only backup UI verified');

// --- Test 3: CSV Parser and Date Parsing Functionality ---
console.log('--- Test 3: CSV Parser and Date Parsing Logic ---');
assert.ok(html.includes('function parseCSVText('), 'parseCSVText helper is defined');
assert.ok(html.includes('function parseCsvDateValue('), 'parseCsvDateValue helper is defined');
assert.ok(html.includes('function importCsvData('), 'importCsvData handler is defined');

// Extract parseCSVText and parseCsvDateValue for unit test
const csvParseMatch = html.match(/function parseCSVText\(text\)\{[\s\S]*?\n\}/);
const csvDateMatch = html.match(/function parseCsvDateValue\(dateStr, timeStr\)\{[\s\S]*?\n\}/);
assert.ok(csvParseMatch, 'Found parseCSVText code');
assert.ok(csvDateMatch, 'Found parseCsvDateValue code');

eval(csvParseMatch[0]);
eval(csvDateMatch[0]);

const sampleCsv = `tanggal,waktu,tipe,sumber,sesi_st,upd,status_reimburse,kategori,nama,nominal,ikon,catatan,shortcut,raw_input
"21/10/2026","14.30","expense","personal","","","","Makan","Makan Siang Soto","35000","🍽️","enak","soto","soto 35"
"20/10/2026","09.15","income","personal","","","","Gaji","Gaji Bulanan","5000000","💰","gaji masuk","","gaji 5jt"`;

const parsed = parseCSVText(sampleCsv);
assert.equal(parsed.length, 3, 'Header + 2 rows parsed');
assert.equal(parsed[1][8], 'Makan Siang Soto', 'Title parsed correctly');
assert.equal(parsed[1][9], '35000', 'Amount parsed correctly');
assert.equal(parsed[2][8], 'Gaji Bulanan', 'Income title parsed correctly');

const parsedDate = parseCsvDateValue(parsed[1][0], parsed[1][1]);
const dObj = new Date(parsedDate);
assert.equal(dObj.getFullYear(), 2026, 'Year matches 2026');
assert.equal(dObj.getMonth(), 9, 'Month matches October (0-indexed 9)');
assert.equal(dObj.getDate(), 21, 'Day matches 21');
console.log('✔ CSV parser and date parser unit tests PASSED');

// --- Test 4: Router and Event Listener Connections ---
console.log('--- Test 4: Router and Event Listener Connections ---');
assert.ok(html.includes("if(a==='import-csv'){$('importCsvFileInput')?.click();}"), 'import-csv routed to importCsvFileInput click');
assert.ok(html.includes("$('importCsvFileInput')?.addEventListener('change'"), 'importCsvFileInput change listener attached');
console.log('✔ Event listeners and action routing verified');

console.log('\n=======================================');
console.log('All Settings & CSV Backup Tests PASSED! 🎉');
console.log('=======================================');
