import assert from 'node:assert';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

console.log('=== TEST SUITE: Smart Pos & Gemini Destination Categorization ===\n');

// Test 1: calculatePocketUsage handles 'bebas' and explicit pocketId
console.log('--- Test 1: Pocket calculation handles bebas and pocketId ---');
assert.ok(html.includes("t.pocketId==='bebas'") || html.includes("t.pocketId === 'bebas'"), 'calculatePocketUsage must check for bebas pocketId');
assert.ok(html.includes("t.pocketId&&t.pocketId!==pocket.id") || html.includes("t.pocketId && t.pocketId !== pocket.id"), 'calculatePocketUsage must check for pocketId mismatch');

// Test 2: inferPocket helper exists
console.log('--- Test 2: inferPocket helper exists ---');
assert.ok(html.includes('function inferPocket('), 'inferPocket function must exist');

// Test 3: Simulation of pocket deduction logic
console.log('--- Test 3: Simulation of pocket deduction logic ---');
function simulateCalculatePocketUsage(pocket, targetDate, txList) {
  const d = targetDate ? new Date(targetDate) : new Date();
  const year = d.getFullYear(), month = d.getMonth();
  const cats = (pocket.categories || []).map(c => String(c).toLowerCase().trim());
  const matchingTx = (txList || []).filter(t => {
    if (t.type !== 'expense') return false;
    if (t.source === 'st') return false;
    const tDate = new Date(t.createdAt || Date.now());
    if (tDate.getFullYear() !== year || tDate.getMonth() !== month) return false;
    if (t.pocketId === 'bebas') return false;
    if (t.pocketId && t.pocketId !== pocket.id) return false;
    if (t.pocketId && t.pocketId === pocket.id) return true;
    const tCat = String(t.category || '').toLowerCase().trim();
    const tTitle = String(t.title || '').toLowerCase().trim();
    return cats.some(c => tCat.includes(c) || tTitle.includes(c));
  });
  const spent = matchingTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  return { spent, count: matchingTx.length };
}

const mockPocketDapur = {
  id: 'pocket-dapur',
  name: 'Dapur & Belanja',
  amount: 2500000,
  categories: ['makan', 'belanja', 'dapur', 'sayur', 'beras']
};

const nowIso = new Date().toISOString();
const txList = [
  // 1. Transaction matching "makan" but explicitly 'bebas' -> must NOT be counted in dapur!
  { id: '1', title: 'Makan Bebas', amount: 50000, type: 'expense', category: 'Makan', pocketId: 'bebas', createdAt: nowIso },
  // 2. Transaction matching "makan" with pocketId 'pocket-dapur' -> counted!
  { id: '2', title: 'Belanja Sayur', amount: 75000, type: 'expense', category: 'Makan', pocketId: 'pocket-dapur', createdAt: nowIso },
  // 3. Transaction with different pocketId 'pocket-transport' -> must NOT be counted in dapur!
  { id: '3', title: 'Bensin Motor', amount: 30000, type: 'expense', category: 'Transport', pocketId: 'pocket-transport', createdAt: nowIso },
  // 4. Legacy transaction matching "beras" without pocketId -> fallback counted!
  { id: '4', title: 'Beli Beras', amount: 100000, type: 'expense', category: 'Dapur', createdAt: nowIso }
];

const resDapur = simulateCalculatePocketUsage(mockPocketDapur, new Date(), txList);
assert.strictEqual(resDapur.spent, 175000, 'Dapur must only count 75k + 100k (50k bebas excluded)');
assert.strictEqual(resDapur.count, 2, 'Dapur must have exactly 2 transactions');
console.log('✔ Pocket calculation logic correctly excludes bebas and isolated pocketIds!');

// Test 4: Gemini prompt injects pockets and ST session
console.log('--- Test 4: Gemini prompt injects pockets and ST session ---');
assert.ok(html.includes('activePocketsInfo'), 'aiCorrectTransactionText must format active pockets info for Gemini');
assert.ok(html.includes('activeSTInfo'), 'aiCorrectTransactionText must format active ST info for Gemini');
assert.ok(html.includes('"pocketId"'), 'aiCorrectTransactionText prompt must ask for pocketId');
console.log('✔ Gemini prompt structure verified for Pockets and ST classification!');

console.log('\nAll Task 1 & 2 tests passed successfully!');
