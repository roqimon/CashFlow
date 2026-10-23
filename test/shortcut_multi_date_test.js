const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ShortcutDate = require('../shortcut-date.js');
const now = new Date(2026, 9, 23, 12);

function dates(text) {
  return ShortcutDate.parse(text, now);
}

test('parses inclusive numeric ranges with default current month and year', () => {
  for (const text of ['1-5', '1 sampai 5', 'dari tanggal 1-5']) {
    assert.deepEqual(dates(text).dates, [
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
    ], text);
  }
});

test('parses Indonesian month names and explicit years in ranges', () => {
  assert.deepEqual(dates('1-5 Oktober').dates, [
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
  ]);
  assert.deepEqual(dates('1 sampai 5 Oktober 2026').dates, [
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
  ]);
  assert.deepEqual(dates('1-5 Okt 2025').dates, [
    '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05',
  ]);
});

test('parses voice-like Indonesian month and number transcripts', () => {
  assert.deepEqual(dates('satu sampai lima Oktober').dates, [
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
  ]);
  assert.deepEqual(dates('tanggal satu sampai lima Oktober dua ribu dua puluh enam').dates, [
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
  ]);
});

test('normalizes spoken date numbers only in date expressions, preserving spoken amounts', () => {
  assert.equal(
    ShortcutDate.normalizeTranscript('UPD Full dari tanggal satu sampai lima Oktober dua ribu dua puluh enam'),
    'UPD Full dari tanggal 1 sampai 5 Oktober 2026',
  );
  assert.equal(ShortcutDate.normalizeTranscript('bayar tiga puluh ribu'), 'bayar tiga puluh ribu');
  assert.equal(ShortcutDate.normalizeTranscript('UPD Full tanggal satu Oktober dua ribu dua puluh enam'), 'UPD Full tanggal 1 Oktober 2026');
});

test('parses single dates without turning them into batches', () => {
  assert.deepEqual(dates('1 Okt').dates, ['2026-10-01']);
  assert.deepEqual(dates('tanggal 1/10/2025').dates, ['2025-10-01']);
  assert.deepEqual(dates('tanggal 1 10 2025').dates, ['2025-10-01']);
  assert.equal(dates('1 Okt').kind, 'single');
});

test('supports explicit cross-month and cross-year ranges, including leap day', () => {
  assert.deepEqual(dates('28 Februari sampai 2 Maret 2024').dates, [
    '2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02',
  ]);
  assert.deepEqual(dates('30 Desember 2025 sampai 2 Januari 2026').dates, [
    '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02',
  ]);
});

test('rejects impossible dates, reversed ranges, ambiguity, and batches over 31 days', () => {
  for (const text of ['31 Februari', '5-1 Oktober', '1 April sampai 2 Mei 2026']) {
    assert.ok(['invalid', 'error'].includes(dates(text).kind), `${text}: ${JSON.stringify(dates(text))}`);
  }
  assert.equal(dates('1 10 2025').kind, 'ambiguous');
  assert.equal(dates('1 Oktober 2025 sampai 2 November 2025').kind, 'error');
});

test('removes only the parsed date from the remaining transaction text', () => {
  const parsed = dates('dari tanggal 1 sampai 5 Oktober 2026 nominal 132500');
  assert.equal(parsed.kind, 'range');
  assert.equal(parsed.cleanText, 'nominal 132500');
});

function sourceFunction(name) {
  const html = fs.readFileSync('index.html', 'utf8');
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) return undefined;
  const lineEnd = html.indexOf('\n', start);
  const firstLine = html.slice(start, lineEnd < 0 ? html.length : lineEnd).trimEnd();
  if (firstLine.endsWith('}')) return firstLine;
  const end = html.indexOf('\n}', start);
  return end < 0 ? undefined : html.slice(start, end + 2);
}

test('matches space or hyphen spelling and chooses the longest shortcut first', () => {
  const ctx = { norm: value => String(value || '').trim().toLowerCase().replace(/\s+/g, '-') };
  vm.createContext(ctx);
  vm.runInContext(`${sourceFunction('matchShortcut')}; this.matchShortcut = matchShortcut;`, ctx);
  const shortcuts = [
    { code: 'upd', title: 'UPD', amount: 79500 },
    { code: 'upd-full', title: 'UPD Full', amount: 132500 },
  ];
  assert.equal(ctx.matchShortcut('UPD Full dari tanggal 1-5 Oktober', shortcuts).shortcut.title, 'UPD Full');
  assert.equal(ctx.matchShortcut('upd-full 1-5', shortcuts).shortcut.title, 'UPD Full');
  assert.equal(ctx.matchShortcut('UPD 1-5', shortcuts).shortcut.title, 'UPD');
});

test('shortcut model keeps a stable target selection and legacy shortcuts default to auto', () => {
  const ctx = {
    parseAmount: value => Number(value) || 0,
    norm: value => String(value || '').trim().toLowerCase().replace(/\s+/g, '-'),
    id: () => 'shortcut-id',
    icon: () => '📋',
  };
  vm.createContext(ctx);
  vm.runInContext(`${sourceFunction('sc')}; this.sc = sc;`, ctx);
  assert.equal(ctx.sc({ code: 'UPD Full', amount: 132500 }).targetPocketId, 'auto');
  assert.equal(ctx.sc({ code: 'UPD', targetPocketId: 'pocket-st' }).targetPocketId, 'pocket-st');
  assert.equal(ctx.sc({ code: 'UPD', targetPocketId: null }).targetPocketId, null);
  assert.match(fs.readFileSync('index.html', 'utf8'), /id="scTargetPocket"/);
});

test('shortcut batch copies configured pos, category, amount, and session to each date', () => {
  let nextId = 0;
  const stPocket = { id: 'pocket-st', name: 'Pos ST Oktober' };
  const ctx = {
    window: { ShortcutDate },
    Date,
    Number,
    activeInputDestination: 'auto',
    getSC: () => [
      { code: 'upd', title: 'UPD', amount: 79500, category: 'Perjalanan', type: 'expense', icon: '📋', note: '', targetPocketId: 'pocket-st' },
      { code: 'upd-full', title: 'UPD Full', amount: 132500, category: 'Perjalanan', type: 'expense', icon: '📋', note: '', targetPocketId: 'pocket-st' },
    ],
    getPockets: () => [stPocket],
    getSTPocket: () => stPocket,
    getActiveSTSession: () => ({ id: 'session-st' }),
    inferPocket: () => null,
    activeCategory: value => value,
    parseAmount: value => Number(String(value).replace(/\D/g, '')) || null,
    tx: value => ({ id: `tx-${++nextId}`, ...value }),
  };
  vm.createContext(ctx);
  vm.runInContext(`${sourceFunction('matchShortcut')}; ${sourceFunction('prepareShortcutDateBatch')}; this.prepareShortcutDateBatch = prepareShortcutDateBatch;`, ctx);

  for (const [phrase, amount, total] of [
    ['UPD dari tanggal 1-5 Oktober', 79500, 397500],
    ['UPD Full dari tanggal 1 sampai 5 Oktober 2026', 132500, 662500],
    ['UPD Full dari tanggal 1-5 Oktober nominal 140.000', 140000, 700000],
  ]) {
    const batch = ctx.prepareShortcutDateBatch(phrase);
    assert.equal(batch.handled, true, phrase);
    assert.equal(batch.items.length, 5, phrase);
    assert.equal(batch.amount, amount, phrase);
    assert.equal(batch.total, total, phrase);
    assert.deepEqual(batch.items.map(item => item.category), Array(5).fill('Perjalanan'));
    assert.deepEqual(batch.items.map(item => item.amount), Array(5).fill(amount));
    assert.deepEqual(batch.items.map(item => item.createdAt.slice(0, 10)), [
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
    ]);
    for (const item of batch.items) {
      assert.equal(item.source, 'st');
      assert.equal(item.pocketId, 'pocket-st');
      assert.equal(item.stSessionId, 'session-st');
      assert.equal(item.reimburseStatus, 'pending');
      assert.equal(item.shortcutCode, batch.shortcut.code);
    }
  }
});

test('shortcut batch rejects ambiguous dates, missing pos, and missing amounts without writing', () => {
  const shortcut = { code: 'upd', title: 'UPD', amount: 79500, category: 'Perjalanan', type: 'expense', icon: '📋', targetPocketId: 'missing-pos' };
  const ctx = {
    window: { ShortcutDate }, Date, Number, activeInputDestination: 'auto',
    getSC: () => [shortcut], getPockets: () => [], getSTPocket: () => null,
    getActiveSTSession: () => null, inferPocket: () => null, activeCategory: value => value,
    parseAmount: value => Number(String(value).replace(/\D/g, '')) || null,
    tx: value => value,
  };
  vm.createContext(ctx);
  vm.runInContext(`${sourceFunction('matchShortcut')}; ${sourceFunction('prepareShortcutDateBatch')}; this.prepareShortcutDateBatch = prepareShortcutDateBatch;`, ctx);
  assert.match(ctx.prepareShortcutDateBatch('UPD 1 10 2025').error, /pemisah|tanggal/i);
  assert.match(ctx.prepareShortcutDateBatch('UPD 1-5 Oktober').error, /pos.*tidak tersedia/i);
  shortcut.targetPocketId = 'auto';
  shortcut.amount = 0;
  assert.match(ctx.prepareShortcutDateBatch('UPD 1-5 Oktober').error, /nominal/i);
});

test('date-like shortcut input fails closed if the date parser did not load', () => {
  const ctx = {
    window: {}, Date, Number, activeInputDestination: 'auto',
    getSC: () => [{ code: 'upd', title: 'UPD', amount: 79500, category: 'Perjalanan', type: 'expense', icon: '📋' }],
    getPockets: () => [], getSTPocket: () => null, getActiveSTSession: () => null,
    inferPocket: () => null, activeCategory: value => value,
    parseAmount: value => Number(String(value).replace(/\D/g, '')) || null,
    tx: value => value,
  };
  vm.createContext(ctx);
  vm.runInContext(`${sourceFunction('matchShortcut')}; ${sourceFunction('prepareShortcutDateBatch')}; this.prepareShortcutDateBatch = prepareShortcutDateBatch;`, ctx);
  const result = ctx.prepareShortcutDateBatch('UPD Full dari tanggal satu sampai lima Oktober');
  assert.equal(result.handled, true);
  assert.match(result.error, /parser tanggal|refresh/i);
});
