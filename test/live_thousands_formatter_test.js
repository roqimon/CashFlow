const assert = require('assert');
const fs = require('fs');

function formatThousands(val) {
  if (val === null || val === undefined) return '';
  let digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  digits = digits.replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function unformatThousands(val) {
  if (typeof val === 'number') return val;
  const s = String(val || '').trim();
  if (!s) return 0;
  const digits = s.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function computeNewCursorPos(oldVal, newVal, oldCursorPos) {
  const digitsBefore = oldVal.slice(0, oldCursorPos).replace(/\D/g, '').length;
  if (digitsBefore === 0) return 0;
  let count = 0;
  for (let i = 0; i < newVal.length; i++) {
    if (/\d/.test(newVal[i])) count++;
    if (count === digitsBefore) return i + 1;
  }
  return newVal.length;
}

// 1. Basic & Extended Formatting
assert.strictEqual(formatThousands(''), '');
assert.strictEqual(formatThousands(null), '');
assert.strictEqual(formatThousands(undefined), '');
assert.strictEqual(formatThousands('0'), '0');
assert.strictEqual(formatThousands('00'), '0');
assert.strictEqual(formatThousands('000'), '0');
assert.strictEqual(formatThousands('05'), '5');
assert.strictEqual(formatThousands('05000'), '5.000');
assert.strictEqual(formatThousands('7'), '7');
assert.strictEqual(formatThousands('75'), '75');
assert.strictEqual(formatThousands('750'), '750');
assert.strictEqual(formatThousands('7500'), '7.500');
assert.strictEqual(formatThousands('75000'), '75.000');
assert.strictEqual(formatThousands('750000'), '750.000');
assert.strictEqual(formatThousands('7500000'), '7.500.000');
assert.strictEqual(formatThousands('75000000'), '75.000.000');
assert.strictEqual(formatThousands('750000000'), '750.000.000');
assert.strictEqual(formatThousands('1000000000'), '1.000.000.000');

// Pasted text with symbols
assert.strictEqual(formatThousands('Rp 2.500.000'), '2.500.000');
assert.strictEqual(formatThousands('Rp. 50.000,-'), '50.000');
assert.strictEqual(formatThousands('IDR 10,000,000'), '10.000.000');

// 2. Unformatting
assert.strictEqual(unformatThousands(''), 0);
assert.strictEqual(unformatThousands(null), 0);
assert.strictEqual(unformatThousands('0'), 0);
assert.strictEqual(unformatThousands('2.500.000'), 2500000);
assert.strictEqual(unformatThousands('50.000'), 50000);
assert.strictEqual(unformatThousands('1.000.000.000'), 1000000000);

// 3. Cursor Tracking
// Typing at end: '10.000' + '0' -> '10.0000' -> '100.000'
{
  const raw = '10.0000';
  const pos = 7;
  const formatted = formatThousands(raw);
  const newPos = computeNewCursorPos(raw, formatted, pos);
  assert.strictEqual(formatted, '100.000');
  assert.strictEqual(newPos, 7);
}

// Typing at start: '5' + '10.000' -> '510.000'
{
  const raw = '510.000';
  const pos = 1;
  const formatted = formatThousands(raw);
  const newPos = computeNewCursorPos(raw, formatted, pos);
  assert.strictEqual(formatted, '510.000');
  assert.strictEqual(newPos, 1);
}

// Typing middle: '1|.000' + '2' -> '12.000'
{
  const raw = '12.000';
  const pos = 2;
  const formatted = formatThousands(raw);
  const newPos = computeNewCursorPos(raw, formatted, pos);
  assert.strictEqual(formatted, '12.000');
  assert.strictEqual(newPos, 2);
}

// 4. Backspace before dot
{
  const val = '12.000';
  const pos = 3; // '12.|000'
  assert.strictEqual(val[pos - 1], '.');
  const newVal = val.slice(0, pos - 2) + val.slice(pos);
  const formatted = formatThousands(newVal);
  const newPos = computeNewCursorPos(newVal, formatted, pos - 2);
  assert.strictEqual(newVal, '1000');
  assert.strictEqual(formatted, '1.000');
  assert.strictEqual(newPos, 1); // '1|.000'
}

// 5. Delete after dot
{
  const val = '1.000';
  const pos = 1; // '1|.000'
  assert.strictEqual(val[pos], '.');
  const newVal = val.slice(0, pos) + val.slice(pos + 2);
  const formatted = formatThousands(newVal);
  const newPos = computeNewCursorPos(newVal, formatted, pos);
  assert.strictEqual(newVal, '100');
  assert.strictEqual(formatted, '100');
  assert.strictEqual(newPos, 1); // '1|00'
}

// 6. Verify index.html implementation
const html = fs.readFileSync('index.html', 'utf8');

// Function definitions exist
assert.ok(html.includes('function formatThousands(val)'), 'formatThousands must be defined in index.html');
assert.ok(html.includes('function unformatThousands(val)'), 'unformatThousands must be defined in index.html');
assert.ok(html.includes('function computeNewCursorPos('), 'computeNewCursorPos must be defined in index.html');
assert.ok(html.includes('function initThousandsFormatter()'), 'initThousandsFormatter must be defined in index.html');
assert.ok(html.includes('initThousandsFormatter();'), 'initThousandsFormatter must be invoked during startup');

// Selector contains all required fields
assert.ok(html.includes('#pocketFormAmount'), 'Selector must include #pocketFormAmount');
assert.ok(html.includes('#manAmount'), 'Selector must include #manAmount');
assert.ok(html.includes('#scAmount'), 'Selector must include #scAmount');
assert.ok(html.includes('#scanManualAmount'), 'Selector must include #scanManualAmount');
assert.ok(html.includes('#editAmount'), 'Selector must include #editAmount');
assert.ok(html.includes('#savingsGoalTarget'), 'Selector must include #savingsGoalTarget');
assert.ok(html.includes('#savingsEntryAmount'), 'Selector must include #savingsEntryAmount');

// Input tags have formatted placeholders & inputmode="numeric"
assert.ok(html.includes('id="pocketFormAmount" inputmode="numeric" required placeholder="Contoh: 2.500.000"'), 'pocketFormAmount placeholder check');
assert.ok(html.includes('id="manAmount" inputmode="numeric" placeholder="Contoh: 50.000"'), 'manAmount placeholder check');
assert.ok(html.includes('id="scAmount" inputmode="numeric" placeholder="Contoh: 25.000"'), 'scAmount placeholder check');
assert.ok(html.includes('id="scanManualAmount" inputmode="numeric" placeholder="Contoh: 45.000"'), 'scanManualAmount placeholder check');
assert.ok(html.includes('id="editAmount" inputmode="numeric" placeholder="Contoh: 50.000" value="${formatThousands(t.amount)}"'), 'editAmount formatting check');

// Versioning is v34
assert.ok(html.includes('id="appVersionBadge" style="font-weight:800">v35</span>'), 'App version badge must be v35');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("CACHE_NAME = 'aruskas-pwa-v35'"), 'Service worker cache name must be v35');

console.log('All tests in live_thousands_formatter_test.js passed completely!');
