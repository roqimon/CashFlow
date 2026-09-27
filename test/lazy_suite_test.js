// test/lazy_suite_test.js
const assert = require('assert');

/**
 * Konversi teks angka lisan bahasa Indonesia ke representasi angka.
 * Contoh:
 * "makan siang dua puluh lima ribu" -> "makan siang 25000"
 * "bensin lima puluh ribu" -> "bensin 50000"
 * "beli token satu juta" -> "beli token 1000000"
 * "kopi tiga puluh lima" -> "kopi 35000"
 */
function convertSpokenIndonesianNumbers(text) {
  if (!text) return '';
  let str = String(text).toLowerCase();

  const numWordMap = {
    'nol': 0, 'kosong': 0,
    'satu': 1, 'se': 1,
    'dua': 2,
    'tiga': 3,
    'empat': 4,
    'lima': 5,
    'enam': 6,
    'tujuh': 7,
    'delapan': 8,
    'sembilan': 9,
    'sepuluh': 10,
    'sebelas': 11,
    'seratus': 100,
    'seribu': 1000,
    'sejuta': 1000000,
    'setengah': 0.5
  };

  const numberWordsRegex = /\b(?:setengah|nol|kosong|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|seratus|ratus|seribu|ribu|sejuta|juta|k|rb|jt)(?:\s+(?:setengah|nol|kosong|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|seratus|ratus|seribu|ribu|sejuta|juta|k|rb|jt))*\b/gi;

  function wordsToNumber(phrase) {
    const tokens = phrase.trim().toLowerCase().split(/\s+/);
    if (!tokens.length) return null;

    let total = 0;
    let subTotal = 0;
    let currentUnit = 0;
    let hasNumberWord = false;

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];

      if (tok === 'seratus') {
        hasNumberWord = true;
        subTotal += 100;
        currentUnit = 0;
      } else if (tok === 'seribu') {
        hasNumberWord = true;
        total += (subTotal + (currentUnit || 1)) * 1000;
        subTotal = 0;
        currentUnit = 0;
      } else if (tok === 'sejuta') {
        hasNumberWord = true;
        total += (subTotal + (currentUnit || 1)) * 1000000;
        subTotal = 0;
        currentUnit = 0;
      } else if (tok === 'setengah') {
        hasNumberWord = true;
        currentUnit = 0.5;
      } else if (numWordMap[tok] !== undefined) {
        hasNumberWord = true;
        currentUnit = numWordMap[tok];
      } else if (tok === 'belas') {
        hasNumberWord = true;
        subTotal += (currentUnit || 1) + 10;
        currentUnit = 0;
      } else if (tok === 'puluh') {
        hasNumberWord = true;
        subTotal += (currentUnit || 1) * 10;
        currentUnit = 0;
      } else if (tok === 'ratus') {
        hasNumberWord = true;
        subTotal += (currentUnit || 1) * 100;
        currentUnit = 0;
      } else if (tok === 'ribu' || tok === 'rb' || tok === 'k') {
        hasNumberWord = true;
        const blockVal = subTotal + currentUnit;
        total += (blockVal === 0 ? 1 : blockVal) * 1000;
        subTotal = 0;
        currentUnit = 0;
      } else if (tok === 'juta' || tok === 'jt') {
        hasNumberWord = true;
        const blockVal = subTotal + currentUnit;
        total += (blockVal === 0 ? 1 : blockVal) * 1000000;
        subTotal = 0;
        currentUnit = 0;
      }
    }

    total += subTotal + currentUnit;
    if (!hasNumberWord || total <= 0) return null;

    // Jika pengguna hanya menyebut "tiga puluh lima" dalam konteks pengeluaran, asumsikan ribuan jika < 1000
    if (total > 0 && total < 1000) {
      total = total * 1000;
    }

    return Math.round(total);
  }

  str = str.replace(numberWordsRegex, match => {
    const val = wordsToNumber(match);
    return val !== null ? String(val) : match;
  });

  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Membersihkan format teks notifikasi mutasi transfer m-Banking / e-wallet.
 * Contoh input:
 * "m-Transfer: BERHASIL Tgl 27/09 10:15:20 Rp 45.000 ke KOPI KENANGAN Ref: 9812739182"
 * Output: "KOPI KENANGAN 45000"
 */
function sanitizeBankNotificationText(raw) {
  if (!raw) return '';
  let text = String(raw).trim();

  // Pola nominal uang (misal: Rp 45.000 atau Rp15.000 atau 50.000)
  const amountMatch = text.match(/(?:rp\.?|idr)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+)/i);
  let amountStr = '';
  if (amountMatch) {
    const cleanNum = amountMatch[1].replace(/\./g, '').replace(/,/g, '.');
    amountStr = Math.round(parseFloat(cleanNum));
  }

  // Cari nama penerima / merchant
  let merchant = '';

  // Pola: "ke [NAMA]" atau "di [NAMA]" atau "pembayaran ke [NAMA]"
  const toMatch = text.match(/(?:ke|di|merchant|toko|kepada)\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:via|ref|berhasil|sukses|pada|sebesar|rp|tgl|tanggal|\d{2}\/)|\s*$)/i);
  if (toMatch && toMatch[1]) {
    merchant = toMatch[1].trim();
  }

  // Pola: "pembayaran [QRIS] ... ke/di [NAMA]"
  if (!merchant) {
    const qrisMatch = text.match(/qris\s+(?:rp[\s\d.,]+)?\s*(?:di|ke)\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:via|berhasil|sukses|ref|\d{2}\/)|\s*$)/i);
    if (qrisMatch && qrisMatch[1]) {
      merchant = qrisMatch[1].trim();
    }
  }

  // Jika nama merchant dan nominal ditemukan
  if (merchant && amountStr) {
    // Bersihkan karakter sampah
    merchant = merchant.replace(/\b(?:pt|cv|tbk|rek|rekening|berhasil|sukses)\b/gi, '').trim();
    return `${merchant} ${amountStr}`;
  }

  return raw;
}

/**
 * Memproses input batch satu baris yang dipisahkan koma, titik koma, atau baris baru.
 * Contoh: "kopi 25, bensin 35, parkir 5"
 */
function processBatchInput(raw, parseInputFn) {
  if (!raw) return { isBatch: false, items: [], failed: [] };
  const rawStr = String(raw).trim();

  // Hanya anggap batch jika ada pemisah koma, titik koma, atau newline
  if (!/[,;\n]/.test(rawStr)) {
    return { isBatch: false, items: [], failed: [] };
  }

  const chunks = rawStr.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  if (chunks.length <= 1) {
    return { isBatch: false, items: [], failed: [] };
  }

  const items = [];
  const failed = [];

  for (const chunk of chunks) {
    const res = parseInputFn(chunk);
    if (res && res.ok && res.item) {
      items.push(res.item);
    } else {
      failed.push(chunk);
    }
  }

  return { isBatch: true, items, failed };
}

// ----------------------------------------------------
// RUN TESTS
// ----------------------------------------------------

console.log('--- Step 1: Testing convertSpokenIndonesianNumbers ---');
assert.strictEqual(
  convertSpokenIndonesianNumbers('makan siang dua puluh lima ribu'),
  'makan siang 25000'
);
assert.strictEqual(
  convertSpokenIndonesianNumbers('bensin lima puluh ribu'),
  'bensin 50000'
);
assert.strictEqual(
  convertSpokenIndonesianNumbers('gaji satu juta'),
  'gaji 1000000'
);
assert.strictEqual(
  convertSpokenIndonesianNumbers('kopi tiga puluh lima'),
  'kopi 35000'
);
assert.strictEqual(
  convertSpokenIndonesianNumbers('token listrik seratus lima puluh ribu'),
  'token listrik 150000'
);
console.log('✔ convertSpokenIndonesianNumbers passed');

console.log('--- Step 2: Testing sanitizeBankNotificationText ---');
const bcaNotif = 'm-Transfer: BERHASIL Tgl 27/09 10:15:20 Rp 45.000 ke KOPI KENANGAN Ref: 9812739182';
const bcaResult = sanitizeBankNotificationText(bcaNotif);
assert(bcaResult.includes('KOPI KENANGAN'));
assert(bcaResult.includes('45000'));

const gopayNotif = 'Kamu berhasil bayar Rp15.000 ke Indomaret via QRIS';
const gopayResult = sanitizeBankNotificationText(gopayNotif);
assert(gopayResult.includes('Indomaret'));
assert(gopayResult.includes('15000'));
console.log('✔ sanitizeBankNotificationText passed');

console.log('--- Step 3: Testing processBatchInput ---');
// Mock parseInputFn
function mockParseInput(str) {
  const parts = str.trim().split(/\s+/);
  if (parts.length >= 2) {
    const title = parts[0];
    const amt = parseInt(parts[1], 10);
    if (!isNaN(amt)) {
      return { ok: true, item: { title, amount: amt * 1000 } };
    }
  }
  return { ok: false, msg: 'Invalid' };
}

const batchStr = 'kopi 25, bensin 35, parkir 5';
const batchResult = processBatchInput(batchStr, mockParseInput);
assert.strictEqual(batchResult.isBatch, true);
assert.strictEqual(batchResult.items.length, 3);
assert.strictEqual(batchResult.items[0].title, 'kopi');
assert.strictEqual(batchResult.items[0].amount, 25000);
assert.strictEqual(batchResult.items[1].title, 'bensin');
assert.strictEqual(batchResult.items[1].amount, 35000);
assert.strictEqual(batchResult.items[2].title, 'parkir');
assert.strictEqual(batchResult.items[2].amount, 5000);
console.log('✔ processBatchInput passed');

/**
 * Mengekstrak informasi tanggal atau rentang tanggal dari input teks.
 * Contoh:
 * "mobil 900rb 1-3/2/2026" -> { hasDate: true, isRange: true, date: "2026-02-01...", note: "Periode: 1-3/2/2026", cleanText: "mobil 900rb" }
 * "bensin 50 15/3/2026"    -> { hasDate: true, isRange: false, date: "2026-03-15...", note: "", cleanText: "bensin 50" }
 */
function parseDateInfo(rawText) {
  if (!rawText) return { hasDate: false, isRange: false, date: null, note: '', cleanText: '' };
  let str = String(rawText);
  const now = new Date();
  const curYear = now.getFullYear();

  // Pola rentang tanggal: D-D/M/YYYY atau D-D/M (contoh: 1-3/2/2026 atau 1-3/2)
  const rangeMatch = str.match(/\b(\d{1,2})-(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (rangeMatch) {
    const d1 = parseInt(rangeMatch[1], 10);
    const d2 = parseInt(rangeMatch[2], 10);
    const m = parseInt(rangeMatch[3], 10);
    let y = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : curYear;
    if (y < 100) y += 2000;

    const startDate = new Date(y, m - 1, d1, 12, 0, 0);
    const note = `Periode: ${d1}-${d2}/${m}/${y}`;
    const cleanText = str.replace(rangeMatch[0], '').replace(/\s+/g, ' ').trim();

    return {
      hasDate: true,
      isRange: true,
      date: startDate.toISOString(),
      note,
      cleanText
    };
  }

  // Pola tanggal tunggal: D/M/YYYY atau D/M (contoh: 15/3/2026 atau 15/3)
  const singleMatch = str.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (singleMatch) {
    const d = parseInt(singleMatch[1], 10);
    const m = parseInt(singleMatch[2], 10);
    let y = singleMatch[3] ? parseInt(singleMatch[3], 10) : curYear;
    if (y < 100) y += 2000;

    const dt = new Date(y, m - 1, d, 12, 0, 0);
    const cleanText = str.replace(singleMatch[0], '').replace(/\s+/g, ' ').trim();

    return {
      hasDate: true,
      isRange: false,
      date: dt.toISOString(),
      note: '',
      cleanText
    };
  }

  return { hasDate: false, isRange: false, date: null, note: '', cleanText: str.trim() };
}

/**
 * Smart Kategori: memprediksi kategori transaksi secara cerdas berdasarkan:
 * 1. Daftar kategori kustom yang sudah dibuat pengguna.
 * 2. Riwayat transaksi sebelumnya dengan kata kunci serupa.
 * 3. Fallback ke aturan default.
 */
function smartInferCat(input, type, existingCats = [], previousTx = []) {
  const t = String(input || '').toLowerCase().trim();
  const words = t.split(/\s+/).filter(w => w.length > 1 && !/^\d+$/.test(w));

  // 1. Cek apakah ada nama kategori yang disebutkan langsung di input
  for (const cat of existingCats) {
    const cl = cat.toLowerCase();
    if (t.includes(cl)) return cat;
  }

  // 2. Cek riwayat transaksi sebelumnya yang memiliki kemiripan kata
  if (previousTx && previousTx.length) {
    const catFreq = {};
    for (const tx of previousTx) {
      if (!tx.category || tx.category === 'Lainnya') continue;
      const txTitleWords = (tx.title + ' ' + (tx.note || '')).toLowerCase().split(/\s+/);
      const matchCount = words.filter(w => txTitleWords.includes(w)).length;
      if (matchCount > 0) {
        catFreq[tx.category] = (catFreq[tx.category] || 0) + matchCount;
      }
    }
    let bestCat = null, maxCount = 0;
    for (const [c, count] of Object.entries(catFreq)) {
      if (count > maxCount) {
        maxCount = count;
        bestCat = c;
      }
    }
    if (bestCat) return bestCat;
  }

  // 3. Fallback kata kunci umum
  if (/mobil|motor|bensin|tol|parkir|ojol|grab|gojek|sewa|rental/i.test(t)) {
    // Jika ada kategori Transport atau Rental
    const trans = existingCats.find(c => /transport|kendaraan|rental/i.test(c));
    return trans || 'Transport';
  }
  if (/makan|nasi|kopi|kafe|cafe|ayam|roti|jajan/i.test(t)) {
    const makan = existingCats.find(c => /makan|kuliner|f&b|food/i.test(c));
    return makan || 'Makan';
  }

  return type === 'income' ? 'Pemasukan' : 'Lainnya';
}

console.log('--- Step 4: Testing parseDateInfo ---');
const dateRangeResult = parseDateInfo('mobil 900rb 1-3/2/2026');
assert.strictEqual(dateRangeResult.hasDate, true);
assert.strictEqual(dateRangeResult.isRange, true);
assert.strictEqual(dateRangeResult.note, 'Periode: 1-3/2/2026');
assert.strictEqual(dateRangeResult.cleanText, 'mobil 900rb');
const d = new Date(dateRangeResult.date);
assert.strictEqual(d.getFullYear(), 2026);
assert.strictEqual(d.getMonth(), 1); // Feb is 1
assert.strictEqual(d.getDate(), 1);

const singleDateResult = parseDateInfo('bensin 50 15/3/2026');
assert.strictEqual(singleDateResult.hasDate, true);
assert.strictEqual(singleDateResult.isRange, false);
assert.strictEqual(singleDateResult.cleanText, 'bensin 50');
const sd = new Date(singleDateResult.date);
assert.strictEqual(sd.getDate(), 15);
assert.strictEqual(sd.getMonth(), 2); // Mar is 2
console.log('✔ parseDateInfo passed');

console.log('--- Step 5: Testing smartInferCat ---');
const userCats = ['Makan', 'Transport', 'Sewa & Rental', 'Digital'];
const userHistory = [
  { title: 'Sewa Mobil Avanza', category: 'Sewa & Rental' },
  { title: 'Kopi Kenangan', category: 'Makan' }
];

// Kata "mobil" cocok dengan riwayat "Sewa Mobil Avanza" -> "Sewa & Rental"
const infer1 = smartInferCat('mobil rental 900rb', 'expense', userCats, userHistory);
assert.strictEqual(infer1, 'Sewa & Rental');

// Kategori disebut langsung misal "bayar digital 50rb"
const infer2 = smartInferCat('bayar digital 50rb', 'expense', userCats, userHistory);
assert.strictEqual(infer2, 'Digital');
console.log('✔ smartInferCat passed');

console.log('--- Step 6: Testing matchShortcut ---');
function matchShortcut(inputWork, shortcuts) {
  if (!inputWork || !shortcuts || !shortcuts.length) return null;
  const sorted = [...shortcuts].filter(s => s && s.code).sort((a,b) => b.code.length - a.code.length);
  const clean = inputWork.trim();

  for (const s of sorted) {
    const code = s.code.toLowerCase().trim();
    if (!code) continue;

    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexWord = new RegExp(`^${escaped}(?:\\s+(.*)|$)`, 'i');
    const mWord = clean.match(regexWord);
    if (mWord) {
      return {
        shortcut: s,
        remainder: (mWord[1] || '').trim()
      };
    }

    const regexDirectDigit = new RegExp(`^${escaped}(\\d+.*)$`, 'i');
    const mDigit = clean.match(regexDirectDigit);
    if (mDigit) {
      return {
        shortcut: s,
        remainder: mDigit[1].trim()
      };
    }
  }
  return null;
}

const testShortcuts = [
  { code: 'kopi', title: 'Kopi Kenangan', amount: 15000, category: 'Makan', type: 'expense', icon: '☕' },
  { code: 'kopi susu', title: 'Kopi Susu Tetangga', amount: 20000, category: 'Makan', type: 'expense', icon: '☕' },
  { code: 'bensin', title: 'Bensin Motor', amount: 0, category: 'Transport', type: 'expense', icon: '⛽' }
];

// Test multi-word shortcut match
const m1 = matchShortcut('kopi susu 25rb', testShortcuts);
assert.ok(m1);
assert.strictEqual(m1.shortcut.code, 'kopi susu');
assert.strictEqual(m1.remainder, '25rb');

// Test single-word shortcut without space before digits
const m2 = matchShortcut('kopi25', testShortcuts);
assert.ok(m2);
assert.strictEqual(m2.shortcut.code, 'kopi');
assert.strictEqual(m2.remainder, '25');

// Test shortcut without nominal using default amount
const m3 = matchShortcut('kopi', testShortcuts);
assert.ok(m3);
assert.strictEqual(m3.shortcut.code, 'kopi');
assert.strictEqual(m3.remainder, '');

// Test shortcut with custom amount and note
const m4 = matchShortcut('Kopi 30 di kantor', testShortcuts);
assert.ok(m4);
assert.strictEqual(m4.shortcut.code, 'kopi');
assert.strictEqual(m4.remainder, '30 di kantor');

console.log('✔ matchShortcut passed');

console.log('\n=======================================');
console.log('All Lazy Input Suite helper tests PASS!');
console.log('=======================================');

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    convertSpokenIndonesianNumbers,
    sanitizeBankNotificationText,
    processBatchInput,
    parseDateInfo,
    smartInferCat,
    matchShortcut
  };
}
