const assert = require('assert');
const fs = require('fs');

// Read index.html content to extract parsing logic
const html = fs.readFileSync('index.html', 'utf8');

// Ensure script doesn't contain the harmful fuzzyFirst auto-replacement on rawWork
assert.ok(!html.includes('const fuzz=fuzzyFirst(first);if(fuzz){const corrected=rawWork.replace(first,fuzz);'), 'Harmful fuzzy replacement must be removed');

// Test parsing logic extracted from index.html
function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  if (start === -1) throw new Error(`Function ${name} not found`);
  // Find closing of function or end of statement
  let depth = 0;
  let started = false;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') {
      depth++;
      started = true;
    } else if (html[i] === '}') {
      depth--;
      if (started && depth === 0) {
        return html.substring(start, i + 1);
      }
    }
  }
  throw new Error(`Could not extract function ${name}`);
}

// Evaluate simulated environment
const vm = require('vm');
const context = {
  console,
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  document: {
    getElementById: () => null
  },
  location: {
    protocol: 'https:',
    hostname: 'roqimon.github.io'
  }
};
vm.createContext(context);

// Load helper definitions in sandbox
vm.runInContext(`
  ${extractFunction('norm')}
  ${extractFunction('money')}
  ${extractFunction('parseAmount')}
  ${extractFunction('title')}
  ${extractFunction('inferType')}
  ${extractFunction('parseDateInfo')}
  ${extractFunction('matchShortcut')}
  const INCOME_RULES = ${html.match(/const INCOME_RULES=(\[\[.*?\]\]);/)[1]};
  const EXPENSE_RULES = ${html.match(/const EXPENSE_RULES=(\[\[.*?\]\]);/)[1]};
  ${extractFunction('smartInferCat')}
  function getSC() { return []; }
  function getCatRecords() { return []; }
  function findCatRecordByCode() { return null; }
  function getCatMem() { return {}; }
  function getTitleMem() { return {}; }
  function getCatList() { return ['Makan', 'Transport', 'Belanja', 'Rumah', 'Tagihan', 'Lainnya']; }
  function getTX() { return []; }
  function getActiveSTSession() { return null; }
  function icon(cat, type) { return '🍽️'; }
  function tx(o) { return o; }
  function fmt(t) { return t.title + ' ' + t.amount; }
  ${extractFunction('parseInput')}
`, context);

// Test 1: "siang 50" must NOT become "Udang", title must be "Siang", category "Makan"
const res1 = context.parseInput('siang 50');
console.log('Result for "siang 50":', res1);
assert.ok(res1.ok, 'Parsing should succeed');
assert.strictEqual(res1.item.title, 'Siang', 'Title must be "Siang", NOT "Udang"');
assert.strictEqual(res1.item.category, 'Makan', 'Category must be "Makan"');
assert.strictEqual(res1.item.amount, 50000, 'Amount must be 50000');
assert.strictEqual(res1.item.type, 'expense', 'Type must be "expense"');

// Test 2: "makan siang 35"
const res2 = context.parseInput('makan siang 35');
console.log('Result for "makan siang 35":', res2);
assert.ok(res2.ok);
assert.strictEqual(res2.item.title, 'Makan Siang');
assert.strictEqual(res2.item.category, 'Makan');
assert.strictEqual(res2.item.amount, 35000);

// Test 3: "sarapan 15"
const res3 = context.parseInput('sarapan 15');
console.log('Result for "sarapan 15":', res3);
assert.ok(res3.ok);
assert.strictEqual(res3.item.title, 'Sarapan');
assert.strictEqual(res3.item.category, 'Makan');
assert.strictEqual(res3.item.amount, 15000);

// Test 4: "malam 40"
const res4 = context.parseInput('malam 40');
console.log('Result for "malam 40":', res4);
assert.ok(res4.ok);
assert.strictEqual(res4.item.title, 'Malam');
assert.strictEqual(res4.item.category, 'Makan');
assert.strictEqual(res4.item.amount, 40000);

// Test 5: "bensin 25"
const res5 = context.parseInput('bensin 25');
console.log('Result for "bensin 25":', res5);
assert.ok(res5.ok);
assert.strictEqual(res5.item.title, 'Bensin');
assert.strictEqual(res5.item.category, 'Transport');
assert.strictEqual(res5.item.amount, 25000);

console.log('\n✔ All input parsing bug tests PASSED successfully!');
