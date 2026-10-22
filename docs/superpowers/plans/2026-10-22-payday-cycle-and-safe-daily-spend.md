# Implementation Plan: Siklus Gajian (Payday Cycle) & Jatah Aman Belanja Harian (Safe-to-Spend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement flexible payday cycles (default 25th of month), real-time safe daily spend calculations ("Aman Dibelanjakan Hari Ini"), and streamlined 3-pocket defaults on ArusKas PWA without adding extra taps for lazy users.

**Architecture:**
- Introduce a centralized `getPaydaySetting()` and `savePaydaySetting(day)` backed by localStorage key `aruskas_payday_date_v1`.
- Provide a pure mathematical helper `getPaydayCycle(targetDate, payday)` that outputs `{ start, end, daysRemaining, label }`.
- Upgrade `renderHome()`, `calculatePocketUsage()`, and `generateWhatsAppRecap()` to evaluate cycle bounds instead of hardcoded calendar month 1–31.
- In `index.html`, update the `.card.balance` template to show "Aman Dibelanjakan Hari Ini" (`#dailySafeAmount`), status badge (`#safeStatusBadge`), and cycle countdown (`#homePeriod`).
- Connect `t.pocketId === 'bebas'` and non-pocket expenses as deductions against cycle free money.
- Update `defaultPockets` to 3 streamlined essential pockets (`pocket-dapur`, `pocket-tagihan`, `pocket-keluarga`).

**Tech Stack:** Vanilla JavaScript (ES2022), HTML5 PWA, CSS (`warm-ui.css`), Node.js `node:test` runner.

**Spec:** `docs/superpowers/specs/2026-10-22-payday-cycle-and-safe-daily-spend-design.md`

## Global Constraints
- Target live domain: `https://kas.bisabaca.web.id/`
- Strict 0-friction for lazy loggers: no additional required dropdowns during transaction creation.
- 100% backward compatibility: existing user transactions, pockets, and custom settings must remain safe.
- Cache bump in `sw.js` and `index.html` upon completion.

## Review Focus
1. `payday === 1` behaves identically to classic calendar month (start day 1 00:00:00, end last day of month 23:59:59.999).
2. Payday in short months (e.g. payday 30 or 31 evaluated in February or April) correctly clamps to the last available day of that month.
3. Zero-income cycle handling: when a new cycle begins and no income has been logged, the UI gracefully prompts to log salary rather than showing negative or NaN numbers.
4. Overspending handling: when today's spending exceeds the safe daily amount, `#safeStatusBadge` cleanly flips to overspend notice and calculates negative delta without crashing.
5. Sisa hari (days remaining) calculation: inclusive of today, minimum 1 to prevent division by zero.

---

### Task 1: Payday Cycle Helper and Mathematical Core

**Files:**
- Create: `test/payday_cycle_test.js`
- Modify: `index.html:3000-3200` (around date helper functions)

**Interfaces:**
- Consumes: `targetDate: Date`, `payday: number (1..31)`
- Produces: `getPaydaySetting(): number`, `savePaydaySetting(day: number): void`, `getPaydayCycle(targetDate?: Date, payday?: number): { start: Date, end: Date, daysRemaining: number, label: string }`

- [ ] **Step 1: Write failing unit test for `getPaydayCycle` and `getPaydaySetting`**

```javascript
// test/payday_cycle_test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function setupEnv() {
  const domScriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  if (!domScriptMatch) throw new Error('Script block not found in index.html');
  const code = domScriptMatch[1];
  const storage = {};
  const ctx = {
    localStorage: {
      getItem: (k) => storage[k] !== undefined ? storage[k] : null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; }
    },
    console,
    Date,
    Math,
    Intl
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

test('getPaydaySetting defaults to 25 and persists changes', () => {
  const env = setupEnv();
  assert.equal(env.getPaydaySetting(), 25);
  env.savePaydaySetting(1);
  assert.equal(env.getPaydaySetting(), 1);
});

test('getPaydayCycle with payday 25 on 2026-10-22 (before payday)', () => {
  const env = setupEnv();
  const cycle = env.getPaydayCycle(new Date('2026-10-22T10:00:00Z'), 25);
  assert.equal(cycle.start.getFullYear(), 2026);
  assert.equal(cycle.start.getMonth(), 8); // September (0-indexed)
  assert.equal(cycle.start.getDate(), 25);
  assert.equal(cycle.end.getFullYear(), 2026);
  assert.equal(cycle.end.getMonth(), 9); // October
  assert.equal(cycle.end.getDate(), 24);
  assert.ok(cycle.daysRemaining >= 1);
});

test('getPaydayCycle with payday 25 on 2026-10-26 (after payday)', () => {
  const env = setupEnv();
  const cycle = env.getPaydayCycle(new Date('2026-10-26T10:00:00Z'), 25);
  assert.equal(cycle.start.getFullYear(), 2026);
  assert.equal(cycle.start.getMonth(), 9); // October (0-indexed)
  assert.equal(cycle.start.getDate(), 25);
  assert.equal(cycle.end.getFullYear(), 2026);
  assert.equal(cycle.end.getMonth(), 10); // November
  assert.equal(cycle.end.getDate(), 24);
});

test('getPaydayCycle with payday 1 covers full calendar month', () => {
  const env = setupEnv();
  const cycle = env.getPaydayCycle(new Date('2026-10-15T10:00:00Z'), 1);
  assert.equal(cycle.start.getDate(), 1);
  assert.equal(cycle.end.getDate(), 31);
  assert.equal(cycle.start.getMonth(), 9);
  assert.equal(cycle.end.getMonth(), 9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/payday_cycle_test.js`
Expected: FAIL (`env.getPaydaySetting is not a function`)

- [ ] **Step 3: Implement `getPaydaySetting`, `savePaydaySetting`, and `getPaydayCycle` in `index.html`**

```javascript
const KEY_PAYDAY = 'aruskas_payday_date_v1';

function getPaydaySetting() {
  try {
    const raw = localStorage.getItem(KEY_PAYDAY);
    if (!raw) return 25;
    const n = parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 && n <= 31 ? n : 25;
  } catch (e) {
    return 25;
  }
}

function savePaydaySetting(day) {
  try {
    const n = Math.max(1, Math.min(31, parseInt(day, 10) || 25));
    localStorage.setItem(KEY_PAYDAY, String(n));
    return n;
  } catch (e) {
    console.error('Failed to save payday setting', e);
  }
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getPaydayCycle(targetDate = new Date(), payday = getPaydaySetting()) {
  const d = new Date(targetDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const date = d.getDate();

  if (payday === 1) {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month, daysInMonth(year, month), 23, 59, 59, 999);
    const msDiff = Math.max(0, end.getTime() - d.getTime());
    const daysRemaining = Math.max(1, Math.ceil(msDiff / 86400000));
    const label = `${start.getDate()} ${start.toLocaleDateString('id-ID', { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'short' })}`;
    return { start, end, daysRemaining, label };
  }

  const pCurr = Math.min(payday, daysInMonth(year, month));
  let start, end;
  if (date >= pCurr) {
    start = new Date(year, month, pCurr, 0, 0, 0, 0);
    const nextMonth = month + 1;
    const nextYear = year + Math.floor(nextMonth / 12);
    const nMonthNorm = (nextMonth % 12 + 12) % 12;
    const pNext = Math.min(payday, daysInMonth(nextYear, nMonthNorm));
    end = new Date(nextYear, nMonthNorm, pNext - 1, 23, 59, 59, 999);
  } else {
    const prevMonth = month - 1;
    const prevYear = year + Math.floor(prevMonth / 12);
    const pMonthNorm = (prevMonth % 12 + 12) % 12;
    const pPrev = Math.min(payday, daysInMonth(prevYear, pMonthNorm));
    start = new Date(prevYear, pMonthNorm, pPrev, 0, 0, 0, 0);
    end = new Date(year, month, pCurr - 1, 23, 59, 59, 999);
  }

  const msDiff = Math.max(0, end.getTime() - d.getTime());
  const daysRemaining = Math.max(1, Math.ceil(msDiff / 86400000));
  const label = `${start.getDate()} ${start.toLocaleDateString('id-ID', { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString('id-ID', { month: 'short' })}`;
  return { start, end, daysRemaining, label };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/payday_cycle_test.js`
Expected: PASS (4 tests passing)

- [ ] **Step 5: Commit Task 1**

```bash
git add test/payday_cycle_test.js index.html
git commit -m "feat(budget): add payday cycle calculation and storage helper"
```

---

### Task 2: Safe Daily Spend ("Jatah Aman Hari Ini") Calculation Logic

**Files:**
- Create: `test/safe_daily_spend_test.js`
- Modify: `index.html` (add `calculateSafeDailySpend` function)

**Interfaces:**
- Consumes: `txList: Transaction[]`, `pockets: Pocket[]`, `savings: Savings`, `targetDate: Date`, `payday: number`
- Produces: `calculateSafeDailySpend(txList, pockets, savings, targetDate, payday): { cycleIncome, committedBudget, freeMoneyInitial, freeMoneySpent, freeMoneyRemaining, daysRemaining, safeDailyAmount, todaySpent, todayRemaining, isOverspent, statusText }`

- [ ] **Step 1: Write failing unit test for `calculateSafeDailySpend`**

```javascript
// test/safe_daily_spend_test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function setupEnv() {
  const domScriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  const code = domScriptMatch[1];
  const storage = {};
  const ctx = {
    localStorage: {
      getItem: (k) => storage[k] !== undefined ? storage[k] : null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; }
    },
    console, Date, Math, Intl
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

test('calculateSafeDailySpend with salary, pockets and daily spending', () => {
  const env = setupEnv();
  const targetDate = new Date('2026-10-26T10:00:00'); // after payday 25
  const txList = [
    { type: 'income', amount: 5000000, createdAt: '2026-10-25T08:00:00' },
    { type: 'expense', amount: 25000, pocketId: 'bebas', createdAt: '2026-10-26T12:00:00' }
  ];
  const pockets = [
    { id: 'pocket-dapur', name: 'Dapur', amount: 2500000, categories: ['dapur'] },
    { id: 'pocket-tagihan', name: 'Tagihan', amount: 1000000, categories: ['tagihan'] }
  ];
  const savings = { entries: [] };

  const res = env.calculateSafeDailySpend(txList, pockets, savings, targetDate, 25);
  assert.equal(res.cycleIncome, 5000000);
  assert.equal(res.committedBudget, 3500000);
  assert.equal(res.freeMoneyInitial, 1500000);
  assert.equal(res.freeMoneySpent, 25000);
  assert.equal(res.freeMoneyRemaining, 1475000);
  assert.equal(res.todaySpent, 25000);
  assert.ok(res.safeDailyAmount > 0);
  assert.equal(res.isOverspent, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/safe_daily_spend_test.js`
Expected: FAIL (`env.calculateSafeDailySpend is not a function`)

- [ ] **Step 3: Implement `calculateSafeDailySpend` in `index.html`**

```javascript
function calculateSafeDailySpend(txList = [], pockets = [], savings = null, targetDate = new Date(), payday = getPaydaySetting()) {
  const cycle = getPaydayCycle(targetDate, payday);
  const startTs = cycle.start.getTime();
  const endTs = cycle.end.getTime();

  const cycleTx = (txList || []).filter(t => {
    const time = new Date(t.createdAt || Date.now()).getTime();
    return time >= startTs && time <= endTs;
  });

  const cycleIncome = cycleTx
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const committedBudget = (pockets || [])
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  let savingsAllocated = 0;
  if (savings && Array.isArray(savings.entries)) {
    savingsAllocated = savings.entries
      .filter(e => {
        if (e.type !== 'deposit') return false;
        const eTime = new Date(e.date || Date.now()).getTime();
        return eTime >= startTs && eTime <= endTs;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }

  const freeMoneyInitial = Math.max(0, cycleIncome - committedBudget - savingsAllocated);

  const activePocketIds = new Set((pockets || []).map(p => p.id));
  const freeMoneyTx = cycleTx.filter(t => {
    if (t.type !== 'expense') return false;
    if (t.source === 'st') return false;
    if (t.pocketId === 'bebas') return true;
    if (t.pocketId && !activePocketIds.has(t.pocketId)) return true;
    if (t.pocketId) return false;
    const cat = String(t.category || '').toLowerCase().trim();
    const isPocketMatch = (pockets || []).some(p =>
      (p.categories || []).some(c => cat.includes(String(c).toLowerCase().trim()))
    );
    return !isPocketMatch;
  });

  const freeMoneySpent = freeMoneyTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const freeMoneyRemaining = freeMoneyInitial - freeMoneySpent;

  const targetDateStr = dateInput(targetDate);
  const todaySpent = freeMoneyTx
    .filter(t => dateInput(new Date(t.createdAt || Date.now())) === targetDateStr)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const baseDailyPace = Math.max(0, Math.floor(freeMoneyRemaining / cycle.daysRemaining));
  const todayRemaining = baseDailyPace - todaySpent;
  const isOverspent = todayRemaining < 0;

  return {
    cycle,
    cycleIncome,
    committedBudget,
    freeMoneyInitial,
    freeMoneySpent,
    freeMoneyRemaining,
    daysRemaining: cycle.daysRemaining,
    baseDailyPace,
    safeDailyAmount: Math.max(0, todayRemaining),
    todaySpent,
    todayRemaining,
    isOverspent,
    hasIncome: cycleIncome > 0
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/safe_daily_spend_test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add test/safe_daily_spend_test.js index.html
git commit -m "feat(budget): add safe daily spend computation logic"
```

---

### Task 3: Streamline Default Pockets & Update Pocket Cycle Calculation

**Files:**
- Modify: `index.html` (`defaultPockets`, `calculatePocketUsage`)
- Create: `test/streamlined_pockets_test.js`

**Interfaces:**
- Updates `defaultPockets` to 3 core essential commitment pockets:
  - 🛒 Dapur & Makan (Rp 2.500.000)
  - 💡 Tagihan, Cicilan & Rumah (Rp 1.800.000)
  - 🎓 Keluarga & Anak (Rp 1.200.000)
- `calculatePocketUsage(pocket, targetDate, txList)` respects the active payday cycle instead of `getMonth()`.

- [ ] **Step 1: Write test for payday-aware pocket usage and default pockets**

```javascript
// test/streamlined_pockets_test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function setupEnv() {
  const domScriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  const code = domScriptMatch[1];
  const storage = {};
  const ctx = {
    localStorage: {
      getItem: (k) => storage[k] !== undefined ? storage[k] : null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; }
    },
    console, Date, Math, Intl
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

test('defaultPockets has 3 streamlined core commitment pockets', () => {
  const env = setupEnv();
  const pockets = env.getPockets();
  assert.equal(pockets.length, 3);
  assert.equal(pockets[0].id, 'pocket-dapur');
  assert.equal(pockets[1].id, 'pocket-tagihan');
  assert.equal(pockets[2].id, 'pocket-keluarga');
});

test('calculatePocketUsage matches across payday boundary (e.g. 26 Oct uses 25 Oct transaction)', () => {
  const env = setupEnv();
  const pocket = { id: 'pocket-dapur', name: 'Dapur', amount: 2500000, categories: ['dapur'] };
  const txList = [
    { type: 'expense', amount: 100000, category: 'dapur', createdAt: '2026-10-25T10:00:00' },
    { type: 'expense', amount: 50000, category: 'dapur', createdAt: '2026-10-20T10:00:00' } // previous cycle
  ];
  const usage = env.calculatePocketUsage(pocket, new Date('2026-10-26T10:00:00'), txList);
  assert.equal(usage.spent, 100000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/streamlined_pockets_test.js`
Expected: FAIL

- [ ] **Step 3: Update `defaultPockets` and `calculatePocketUsage` in `index.html`**

```javascript
const defaultPockets = [
  {
    id: 'pocket-dapur',
    name: 'Dapur & Makan',
    icon: '🛒',
    amount: 2500000,
    color: '#1f8a5b',
    categories: ['dapur & bahan makanan', 'dapur', 'belanja dapur', 'pasar', 'sayur', 'beras', 'minyak', 'bumbu', 'lauk', 'daging', 'ikan', 'telur', 'ayam', 'makan & minum', 'makan', 'sarapan', 'siang', 'malam', 'warteg', 'padang']
  },
  {
    id: 'pocket-tagihan',
    name: 'Tagihan, Cicilan & Rumah',
    icon: '💡',
    amount: 1800000,
    color: '#ad4e34',
    categories: ['tagihan & utilitas', 'tagihan', 'listrik', 'pln', 'token', 'pdam', 'air', 'wifi', 'internet', 'pulsa', 'kuota', 'iuran', 'kebutuhan rumah', 'rumah', 'sabun', 'sampo', 'deterjen', 'kebersihan', 'cicilan & finansial', 'cicilan', 'angsuran', 'kredit', 'kpr', 'leasing', 'paylater']
  },
  {
    id: 'pocket-keluarga',
    name: 'Keluarga & Anak',
    icon: '🎓',
    amount: 1200000,
    color: '#3094d4',
    categories: ['anak & pendidikan', 'anak', 'pendidikan', 'sekolah', 'spp', 'les', 'bimbel', 'buku', 'susu', 'pampers', 'popok', 'sosial & sedekah', 'kirim ortu', 'transfer ibu', 'transfer mama', 'transfer bapak', 'uang belanja ortu', 'bantu keluarga']
  }
];

function calculatePocketUsage(pocket, targetDate, txList) {
  const cycle = getPaydayCycle(targetDate || new Date(), getPaydaySetting());
  const startTs = cycle.start.getTime();
  const endTs = cycle.end.getTime();
  const cats = (pocket.categories || []).map(c => String(c).toLowerCase().trim());

  const matchingTx = (txList || []).filter(t => {
    if (t.type !== 'expense') return false;
    if (t.source === 'st') return false;
    const tTime = new Date(t.createdAt || Date.now()).getTime();
    if (tTime < startTs || tTime > endTs) return false;
    if (t.pocketId === 'bebas') return false;
    if (t.pocketId && t.pocketId !== pocket.id) return false;
    if (t.pocketId && t.pocketId === pocket.id) return true;
    const tCat = String(t.category || '').toLowerCase().trim();
    const tTitle = String(t.title || '').toLowerCase().trim();
    return cats.some(c => tCat.includes(c) || tTitle.includes(c));
  });

  const spent = matchingTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const amount = Number(pocket.amount) || 0;
  const remaining = Math.max(0, amount - spent);
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  const isOver = spent > amount;
  const overAmount = isOver ? spent - amount : 0;

  return { spent, amount, remaining, percent, isOver, overAmount, txCount: matchingTx.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/streamlined_pockets_test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add test/streamlined_pockets_test.js index.html
git commit -m "feat(budget): streamline default pockets and apply payday cycle to pocket usage"
```

---

### Task 4: Connect Front-end UI (Hero Card & Settings Dropdown)

**Files:**
- Modify: `index.html` (Hero card markup in `data-page="home"`, `renderHome()`, settings payday dropdown in `data-page="settings"`)
- Create: `test/home_hero_card_test.js`

**Interfaces:**
- Binds `#dailySafeAmount`, `#safeStatusBadge`, `#homePeriod`, `#freeMoneyTotal`, `#committedStatus` in `renderHome()`.
- Updates `#settingPayday` onchange to call `savePaydaySetting()` and re-render.

- [ ] **Step 1: Write test for Home Hero Card rendering**

```javascript
// test/home_hero_card_test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function setupEnv() {
  const domScriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  const code = domScriptMatch[1];
  const storage = {};
  const elements = {};
  function makeEl(id) {
    return {
      id, value: '', innerHTML: '', textContent: '', style: {},
      classList: { _s: new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)}, contains(c){return this._s.has(c)} }
    };
  }
  const elementIds = [
    'dailySafeAmount', 'safeStatusBadge', 'homePeriod', 'freeMoneyTotal', 'committedStatus',
    'netBalance', 'incomeTotal', 'expenseTotal', 'txCount', 'homeTxList', 'homeCategories',
    'budgetPocketList', 'budgetSummaryText', 'settingPayday'
  ];
  elementIds.forEach(id => { elements[id] = makeEl(id); });

  const ctx = {
    localStorage: {
      getItem: (k) => storage[k] !== undefined ? storage[k] : null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; }
    },
    $: (id) => elements[id] || makeEl(id),
    document: { getElementById: (id) => elements[id] || makeEl(id) },
    console, Date, Math, Intl
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return { ctx, elements };
}

test('renderHome updates dailySafeAmount and cycle period', () => {
  const { ctx, elements } = setupEnv();
  const tx = [
    { type: 'income', amount: 5000000, createdAt: new Date().toISOString() },
    { type: 'expense', amount: 20000, pocketId: 'bebas', createdAt: new Date().toISOString() }
  ];
  ctx.renderHome(tx);
  assert.ok(elements.dailySafeAmount.textContent.includes('Rp'));
  assert.ok(elements.homePeriod.textContent.includes('lagi'));
  assert.ok(elements.freeMoneyTotal.textContent.includes('Rp'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/home_hero_card_test.js`
Expected: FAIL

- [ ] **Step 3: Update Hero card HTML, `renderHome()`, and settings payday dropdown in `index.html`**

Update HTML in `<section class="page active" data-page="home">`:
```html
<section class="card balance">
  <div class="row">
    <span id="safeStatusBadge" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;background:rgba(255,255,255,.2);padding:2px 8px;border-radius:999px">🟢 Sesuai Ritme</span>
    <span id="homePeriod">Memuat siklus...</span>
  </div>
  <small style="color:rgba(255,255,255,0.85);font-size:11.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;display:block;margin-top:6px">
    Aman Dibelanjakan Hari Ini
  </small>
  <h2 id="dailySafeAmount">Rp 0</h2>
  <div class="grid2" style="margin-top:16px">
    <div>
      <small style="opacity:.9">Sisa Uang Bebas</small>
      <strong id="freeMoneyTotal" style="display:block">Rp 0</strong>
    </div>
    <div>
      <small style="opacity:.9">Pos Komitmen</small>
      <strong id="committedStatus" style="display:block">Aman 🛡️</strong>
    </div>
  </div>
</section>
```

Update `renderHome(arr)` to call `calculateSafeDailySpend` and update elements.

Add Payday dropdown in Settings (`data-page="settings"`):
```html
<section class="card settings-card">
  <div class="settings-card-head">
    <span class="settings-card-icon" style="background:#eaf4ed;color:var(--green)">🗓️</span>
    <div style="flex:1;min-width:0">
      <strong style="font-size:14px;color:var(--ink);display:block">Tanggal Gajian Bulanan</strong>
      <small class="muted" style="font-size:11.5px">Awal siklus perhitungan anggaran & jatah belanja harian</small>
    </div>
  </div>
  <div style="margin-top:12px">
    <select id="settingPayday" class="input" style="width:100%;font-size:13px;font-weight:700">
      <option value="25">Tanggal 25 (Umum Swasta / BUMN)</option>
      <option value="1">Tanggal 1 (PNS / ASN / Awal Bulan)</option>
      <option value="20">Tanggal 20</option>
      <option value="27">Tanggal 27</option>
      <option value="28">Tanggal 28</option>
    </select>
  </div>
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/home_hero_card_test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add test/home_hero_card_test.js index.html
git commit -m "feat(ui): update home hero card to safe daily spend and add payday setting"
```

---

### Task 5: Full Regression Testing, Service Worker Bump, and Verification

**Files:**
- Modify: `sw.js` (bump cache version)
- Modify: `index.html` (bump version label if applicable)
- Verify: All tests in `test/` pass

- [ ] **Step 1: Run all existing and new test suites**

Run:
```bash
node --test test/payday_cycle_test.js test/safe_daily_spend_test.js test/streamlined_pockets_test.js test/home_hero_card_test.js test/st_budget_pocket_test.js
```
Expected: All tests PASS.

- [ ] **Step 2: Bump Service Worker cache version**

Update `sw.js` cache name to `aruskas-cache-v40`.

- [ ] **Step 3: Commit Task 5**

```bash
git add sw.js index.html
git commit -m "chore(pwa): bump cache version to v40 for payday cycle and daily spend release"
```
