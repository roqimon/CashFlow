const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('=== TEST SUITE: Indonesian Default Categories & Smart Multi-Tier Classification ===\n');

const html = fs.readFileSync('index.html', 'utf8');

// Extract definitions from index.html
const catMetaMatch = html.match(/const catMeta\s*=\s*(\{[\s\S]*?\});/);
assert(catMetaMatch, 'catMeta must exist');

const expenseRulesMatch = html.match(/const EXPENSE_RULES\s*=\s*(\[\[[\s\S]*?\]\]);/);
assert(expenseRulesMatch, 'EXPENSE_RULES must exist');

const incomeRulesMatch = html.match(/const INCOME_RULES\s*=\s*(\[[\s\S]*?\]\]);/);
assert(incomeRulesMatch, 'INCOME_RULES must exist');

const defaultPocketsMatch = html.match(/const defaultPockets\s*=\s*(\[[\s\S]*?\]);/);
assert(defaultPocketsMatch, 'defaultPockets must exist');

const context = {
  console,
  Date,
  Math,
  String,
  Number,
  parseInt,
  parseFloat,
  isNaN,
  Array,
  Object,
  RegExp,
  Set,
  Map,
  JSON
};
vm.createContext(context);

// Extract smartInferCat and icon
function extractFunction(name) {
  const match = html.match(new RegExp(`function ${name}\\s*\\([^{]*\\)\\s*\\{[\\s\\S]*?\\n\\}`));
  if (match) return match[0];
  const inlineMatch = html.match(new RegExp(`function ${name}\\s*\\([^)]*\\)\\{[^}]+\\}`));
  if (inlineMatch) return inlineMatch[0];
  throw new Error(`Function ${name} not found`);
}

const iconStart = html.indexOf('function icon(cat,type)');
const iconEnd = html.indexOf('function renderIcon', iconStart);
const iconFnStr = html.slice(iconStart, iconEnd).trim();

vm.runInContext(`
  var catMeta = ${catMetaMatch[1]};
  var EXPENSE_RULES = ${expenseRulesMatch[1]};
  var INCOME_RULES = ${incomeRulesMatch[1]};
  var defaultPockets = ${defaultPocketsMatch[1]};
  function findCatRecord(cat) { return null; }
  ${extractFunction('smartInferCat')}
  ${iconFnStr}
`, context);

const allExistingCats = Object.keys(context.catMeta);

// Test 1: Category existence
console.log('--- Test 1: All Indonesian Core Categories Exist ---');
const expectedCats = [
  'Dapur & Bahan Makanan',
  'Makan & Minum',
  'Jajan & Nongkrong',
  'Kebutuhan Rumah',
  'Tagihan & Utilitas',
  'Transportasi',
  'Anak & Pendidikan',
  'Kesehatan',
  'Belanja & Pakaian',
  'Sosial & Sedekah',
  'Hiburan & Hobi',
  'Cicilan & Finansial',
  'Gaji',
  'Usaha & Jualan',
  'Pemasukan'
];

expectedCats.forEach(cat => {
  assert(allExistingCats.includes(cat), `Category "${cat}" must exist in catMeta`);
});
console.log('✔ All 15 Indonesian Core Categories verified in catMeta');

// Test 2: Cooking raw ingredients vs Ready meals disambiguation
console.log('\n--- Test 2: Raw Ingredients (Dapur) vs Ready Meals (Makan) ---');
const raw1 = context.smartInferCat('beli beras 5kg sama telur 65rb', 'expense', allExistingCats, []);
assert.strictEqual(raw1, 'Dapur & Bahan Makanan', `Expected "Dapur & Bahan Makanan", got "${raw1}"`);
console.log('✔ "beli beras 5kg sama telur" -> Dapur & Bahan Makanan');

const raw2 = context.smartInferCat('ayam potong 1kg bumbu racik di tukang sayur 40rb', 'expense', allExistingCats, []);
assert.strictEqual(raw2, 'Dapur & Bahan Makanan', `Expected "Dapur & Bahan Makanan", got "${raw2}"`);
console.log('✔ "ayam potong 1kg bumbu racik di tukang sayur" -> Dapur & Bahan Makanan');

const meal1 = context.smartInferCat('ayam geprek cabe 5 sama es teh 22rb', 'expense', allExistingCats, []);
assert.strictEqual(meal1, 'Makan & Minum', `Expected "Makan & Minum", got "${meal1}"`);
console.log('✔ "ayam geprek cabe 5 sama es teh" -> Makan & Minum');

const meal2 = context.smartInferCat('nasi padang rendang 28rb', 'expense', allExistingCats, []);
assert.strictEqual(meal2, 'Makan & Minum', `Expected "Makan & Minum", got "${meal2}"`);
console.log('✔ "nasi padang rendang" -> Makan & Minum');

// Test 3: Indonesian Slangs & Brands
console.log('\n--- Test 3: Indonesian Slangs & Brands ---');
const trans1 = context.smartInferCat('pertalite 50rb', 'expense', allExistingCats, []);
assert.strictEqual(trans1, 'Transportasi', `Expected "Transportasi", got "${trans1}"`);
console.log('✔ "pertalite" -> Transportasi');

const jajan1 = context.smartInferCat('kopi kenangan mantan 22rb', 'expense', allExistingCats, []);
assert.strictEqual(jajan1, 'Jajan & Nongkrong', `Expected "Jajan & Nongkrong", got "${jajan1}"`);
console.log('✔ "kopi kenangan mantan" -> Jajan & Nongkrong');

const tagihan1 = context.smartInferCat('token listrik 100rb', 'expense', allExistingCats, []);
assert.strictEqual(tagihan1, 'Tagihan & Utilitas', `Expected "Tagihan & Utilitas", got "${tagihan1}"`);
console.log('✔ "token listrik" -> Tagihan & Utilitas');

const anak1 = context.smartInferCat('mamypoko m34 sama minyak telon 85rb', 'expense', allExistingCats, []);
assert.strictEqual(anak1, 'Anak & Pendidikan', `Expected "Anak & Pendidikan", got "${anak1}"`);
console.log('✔ "mamypoko sama minyak telon" -> Anak & Pendidikan');

const rumah1 = context.smartInferCat('rinso cair sama sunlight di alfamart 45rb', 'expense', allExistingCats, []);
assert.strictEqual(rumah1, 'Kebutuhan Rumah', `Expected "Kebutuhan Rumah", got "${rumah1}"`);
console.log('✔ "rinso cair sama sunlight di alfamart" -> Kebutuhan Rumah');

const sosial1 = context.smartInferCat('kondangan anaknya pak rt 100rb', 'expense', allExistingCats, []);
assert.strictEqual(sosial1, 'Sosial & Sedekah', `Expected "Sosial & Sedekah", got "${sosial1}"`);
console.log('✔ "kondangan anaknya pak rt" -> Sosial & Sedekah');

// Test 4: Income Categories
console.log('\n--- Test 4: Income Classification ---');
const inc1 = context.smartInferCat('gaji bulan ini 8jt', 'income', allExistingCats, []);
assert.strictEqual(inc1, 'Gaji', `Expected "Gaji", got "${inc1}"`);
console.log('✔ "gaji bulan ini" -> Gaji');

const inc2 = context.smartInferCat('jualan baju gamis laku 250rb', 'income', allExistingCats, []);
assert.strictEqual(inc2, 'Usaha & Jualan', `Expected "Usaha & Jualan", got "${inc2}"`);
console.log('✔ "jualan baju gamis laku" -> Usaha & Jualan');

console.log('\n======================================================');
console.log('All Indonesian Categories & Auto-Classification PASSED!');
console.log('======================================================');
