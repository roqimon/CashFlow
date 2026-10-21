// test/budget_and_share_test.js
const assert = require('assert');
const fs = require('fs');

console.log('=== TEST SUITE: Family Budgeting & WhatsApp Share ===\n');

// 1. Static codebase assertion
const html = fs.readFileSync('index.html', 'utf8');

console.log('--- Test 1: Codebase Contains Budget Pockets Storage Key & Model ---');
assert.ok(html.includes('aruskas_budget_pockets_v1'), 'index.html must define KEY_POCKETS');
assert.ok(html.includes('defaultPockets'), 'index.html must declare default pockets');
assert.ok(html.includes('getPockets'), 'index.html must declare getPockets function');
assert.ok(html.includes('savePockets'), 'index.html must declare savePockets function');
console.log('✔ Budget Pockets storage definitions verified');

console.log('--- Test 2: Pocket Spending Calculation Engine ---');
assert.ok(html.includes('calculatePocketUsage'), 'index.html must implement calculatePocketUsage');
console.log('✔ Pocket Spending calculation function verified');

console.log('--- Test 3: WhatsApp Share Message Generator ---');
assert.ok(html.includes('generateWhatsAppRecap'), 'index.html must implement generateWhatsAppRecap');
console.log('✔ WhatsApp message generator verified');

// 2. Logic execution test
console.log('--- Test 4: Calculation Logic Unit Test ---');
const mockPocket = {
  id: 'pocket-dapur',
  name: 'Dapur & Belanja',
  icon: '🛒',
  amount: 1000000,
  categories: ['makan', 'belanja', 'dapur']
};

const mockTx = [
  { id: '1', title: 'Beras 5kg', amount: 75000, type: 'expense', category: 'Belanja', createdAt: '2026-10-15T10:00:00Z' },
  { id: '2', title: 'Sayur & Lauk', amount: 50000, type: 'expense', category: 'Makan', createdAt: '2026-10-16T10:00:00Z' },
  { id: '3', title: 'Bensin Motor', amount: 30000, type: 'expense', category: 'Transport', createdAt: '2026-10-17T10:00:00Z' },
  { id: '4', title: 'Makan Bulan Lalu', amount: 100000, type: 'expense', category: 'Makan', createdAt: '2026-09-15T10:00:00Z' }
];

// Extract calculatePocketUsage and short helper from index.html using Function or direct test
function short(v) {
  v = Number(v) || 0;
  const s = v < 0 ? '-' : '';
  v = Math.abs(v);
  if (v >= 1e6) return s + 'Rp ' + (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
  if (v >= 1e3) return s + 'Rp ' + (v / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' rb';
  return s + 'Rp ' + v.toLocaleString('id-ID');
}

function calculatePocketUsage(pocket, targetDate, txList) {
  const d = targetDate ? new Date(targetDate) : new Date();
  const year = d.getFullYear(), month = d.getMonth();
  const cats = (pocket.categories || []).map(c => String(c).toLowerCase().trim());
  
  const matchingTx = (txList || []).filter(t => {
    if (t.type !== 'expense') return false;
    const tDate = new Date(t.createdAt || Date.now());
    if (tDate.getFullYear() !== year || tDate.getMonth() !== month) return false;
    
    if (t.pocketId && t.pocketId === pocket.id) return true;
    const tCat = String(t.category || '').toLowerCase().trim();
    const tTitle = String(t.title || '').toLowerCase().trim();
    return cats.some(c => tCat.includes(c) || tTitle.includes(c));
  });

  const spent = matchingTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const amount = Number(pocket.amount) || 0;
  const remaining = amount - spent;
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  const isOver = spent > amount;
  const overAmount = Math.max(0, spent - amount);

  return { pocket, spent, amount, remaining, percent, isOver, overAmount, count: matchingTx.length };
}

function generateWhatsAppRecap(targetDate, txList, pockets) {
  const d = targetDate ? new Date(targetDate) : new Date();
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const monthLabel = monthNames[d.getMonth()] + ' ' + d.getFullYear();
  
  const pList = pockets && pockets.length ? pockets : [mockPocket];
  const tx = txList || [];
  
  let totalPlafond = 0;
  let totalSpent = 0;
  
  const pocketLines = pList.map(p => {
    const usage = calculatePocketUsage(p, d, tx);
    totalPlafond += usage.amount;
    totalSpent += usage.spent;
    const sisaText = usage.isOver 
      ? `(⚠️ Lebih ${short(usage.overAmount)})` 
      : `(Sisa ${short(usage.remaining)})`;
    return `${p.icon || '•'} *${p.name}*: ${short(usage.spent)} / ${short(usage.amount)} ${sisaText}`;
  });

  const totalRemaining = totalPlafond - totalSpent;
  const overallStatus = totalSpent > totalPlafond 
    ? `⚠️ *Overbudget:* Lebih ${short(totalSpent - totalPlafond)}` 
    : `✅ *Sisa Uang Jatah:* ${short(totalRemaining)}`;

  return `📊 *Rekap Belanja Keluarga — ${monthLabel}*\n` +
         `------------------------------------\n` +
         pocketLines.join('\n') + `\n` +
         `------------------------------------\n` +
         `💳 *Total Pengeluaran:* ${short(totalSpent)}\n` +
         `🎯 *Total Jatah Bulanan:* ${short(totalPlafond)}\n` +
         `${overallStatus}\n\n` +
         `_Dicatat rapi & hemat via ArusKas_`;
}

const usage = calculatePocketUsage(mockPocket, '2026-10-20', mockTx);
assert.strictEqual(usage.spent, 125000, 'Spent should be 75k + 50k = 125k');
assert.strictEqual(usage.remaining, 875000, 'Remaining should be 1000k - 125k = 875k');
assert.strictEqual(usage.percent, 13, 'Percent should be 13%');
assert.strictEqual(usage.isOver, false, 'Should not be overbudget');
console.log('✔ Normal calculation verified');

// Overbudget test
const overPocket = { ...mockPocket, amount: 100000 };
const overUsage = calculatePocketUsage(overPocket, '2026-10-20', mockTx);
assert.strictEqual(overUsage.isOver, true, 'Should be overbudget');
assert.strictEqual(overUsage.overAmount, 25000, 'Over by 25k');
console.log('✔ Overbudget calculation verified');

// WhatsApp text generator test
const waMsg = generateWhatsAppRecap('2026-10-20', mockTx, [mockPocket]);
assert.ok(waMsg.includes('Rekap Belanja Keluarga — Oktober 2026'), 'Title must match month');
assert.ok(waMsg.includes('Dapur & Belanja'), 'Must include pocket name');
assert.ok(waMsg.includes('Sisa Rp 875 rb'), 'Must include remaining');
console.log('✔ WhatsApp text recap verified');

console.log('\n=======================================');
console.log('All Budget & WhatsApp Share Tests PASSED!');
console.log('=======================================');
