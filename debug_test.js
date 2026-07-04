// Debug script untuk test logika transaksi
// Jalankan di Node.js: node debug_test.js

console.log('=== DEBUG TEST: Transaksi Logic ===\n');

// Simulate localStorage
const mockStorage = {};
const localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value; }
};

// Copy functions from index_st.html
const KEY_TX = 'aruskas_transactions_v4_st';

function id() {
  return (crypto.randomUUID && crypto.randomUUID()) || Date.now() + '-' + Math.random().toString(16).slice(2);
}

function tx(o) {
  const type = o.type || 'expense';
  const category = o.category || (type === 'income' ? 'Pemasukan' : 'Lainnya');
  const source = o.source || 'personal';
  const reimburseStatus = (source === 'st' && type === 'expense') ? (o.reimburseStatus || 'pending') : (o.reimburseStatus || null);
  const stSessionId = o.stSessionId || (source === 'st' ? 'TEST-SESSION' : null);
  const updFlag = o.updFlag || false;
  
  return {
    id: o.id || id(),
    title: o.title || 'Transaksi',
    amount: Number(o.amount) || 0,
    type,
    category,
    icon: o.icon || '📝',
    note: o.note || '',
    rawInput: o.rawInput || '',
    shortcutCode: o.shortcutCode || '',
    source,
    reimburseStatus,
    stSessionId,
    updFlag,
    createdAt: o.createdAt || new Date().toISOString(),
    updatedAt: o.updatedAt || null
  };
}

function getTX() {
  try {
    const raw = localStorage.getItem(KEY_TX);
    const arr = raw ? JSON.parse(raw) : [];
    if (!arr.length) {
      console.log('[ArusKas] No transactions found');
      return [];
    }
    console.log('[ArusKas] Loaded ' + arr.length + ' transactions');
    return arr.map(tx);
  } catch (e) {
    console.error('[ArusKas] getTX error:', e);
    return [];
  }
}

function saveTX(a) {
  try {
    localStorage.setItem(KEY_TX, JSON.stringify(a));
    console.log('[ArusKas] Saved ' + a.length + ' transactions');
  } catch (e) {
    console.error('[ArusKas] saveTX error:', e);
  }
}

function parseAmount(x) {
  let raw = String(x || '').toLowerCase().replace(/rp|idr/g, '').replace(/\s+/g, '');
  const sm = raw.match(/(juta|jt|m|ribu|rb|k)$/);
  const suf = sm ? sm[1] : '';
  let nt = suf ? raw.slice(0, -suf.length) : raw;
  let v;
  if (nt.includes(',')) v = parseFloat(nt.replace(/\./g, '').replace(',', '.'));
  else if (/^\d{1,3}(\.\d{3})+$/.test(nt)) v = parseInt(nt.replace(/\./g, ''), 10);
  else if (nt.includes('.')) v = parseFloat(nt);
  else v = parseInt(nt, 10);
  if (!isFinite(v) || v <= 0) return null;
  if (['juta', 'jt', 'm'].includes(suf)) return Math.round(v * 1e6);
  if (['ribu', 'rb', 'k'].includes(suf)) return Math.round(v * 1e3);
  return v < 1000 ? Math.round(v * 1000) : Math.round(v);
}

// Test parseAmount
console.log('Test parseAmount:');
console.log('  "300" →', parseAmount('300'));
console.log('  "50rb" →', parseAmount('50rb'));
console.log('  "1jt" →', parseAmount('1jt'));
console.log('  "1.500.000" →', parseAmount('1.500.000'));

// Simulate addFrom
console.log('\n=== Simulate addFrom("bbm 300") ===');

const rawInput = 'bbm 300';
const matches = [...rawInput.matchAll(/(?:rp\s*)?\d+(?:[,.]\d+)?\s*(?:juta|jt|m|ribu|rb|k)?/gi)];
const am = matches[0] || null;
const typedAmount = am ? parseAmount(am[0]) : null;

console.log('Raw input:', rawInput);
console.log('Amount match:', am ? am[0] : null);
console.log('Parsed amount:', typedAmount);

if (!typedAmount) {
  console.error('❌ ERROR: Amount not parsed!');
  process.exit(1);
}

const without = (am ? (rawInput.slice(0, am.index) + ' ' + rawInput.slice(am.index + am[0].length)) : rawInput)
  .replace(/[+\-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

console.log('Without amount:', without);

// Simulate transaction creation
const newItem = tx({
  title: 'Bbm',
  amount: typedAmount,
  type: 'expense',
  category: 'Transport',
  icon: '⛽',
  rawInput: rawInput,
  source: 'personal'
});

console.log('\nNew transaction object:');
console.log(JSON.stringify(newItem, null, 2));

// Save to storage
const arr = getTX();
arr.unshift(newItem);
saveTX(arr);

// Verify saved data
const saved = getTX();
console.log('\n=== Verification ===');
console.log('Transactions in storage:', saved.length);
console.log('First transaction:', saved[0]);

if (saved.length > 0 && saved[0].title === 'Bbm') {
  console.log('\n✅ SUCCESS: Transaction saved correctly!');
} else {
  console.log('\n❌ FAILED: Transaction not saved properly!');
}
