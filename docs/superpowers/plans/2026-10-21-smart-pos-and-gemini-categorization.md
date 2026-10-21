# Smart Pos & Gemini AI Categorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengotomatiskan pemilihan pos anggaran (uang belanja, pos jatah, saldo bebas, dan ST) menggunakan pemetaan cerdas lokal 0 detik dan Gemini AI, serta menyediakan chip horizontal 1-tap untuk kontrol instan pengguna.

**Architecture:** Transaksi diperkaya dengan properti `pocketId` (`'bebas'` atau ID pocket) dan `source` (`'personal'` atau `'st'`). Mesin lokal dan Gemini AI mengekstrak pos secara otomatis tanpa jeda bagi pengguna, sementara baris chip horizontal di Beranda dan Mode Fokus memberikan kemampuan ganti pos 1 sentuhan. `calculatePocketUsage` diperbarui agar saldo bebas secara ketat tidak memotong pos manapun.

**Tech Stack:** Vanilla JavaScript (ES2022), HTML5, CSS3, Google Gemini API (2.5 Flash Lite), Service Worker PWA, Node.js Unit Testing.

**Spec:** [docs/superpowers/specs/2026-10-21-smart-pos-and-gemini-categorization-design.md](file:///d:/Apps/CashFlow/docs/superpowers/specs/2026-10-21-smart-pos-and-gemini-categorization-design.md)

## Global Constraints
- Tetap 100% offline-first: pencatatan biasa (teks/suara) harus instan (0 ms) tanpa menunggu jaringan internet.
- Saldo Bebas (`pocketId === 'bebas'`) tidak boleh memotong kuota pos anggaran manapun di `calculatePocketUsage`.
- Kompatibilitas mundur: transaksi lama yang belum memiliki `pocketId` tetap dihitung secara benar via pencocokan kategori.
- Chip pemilih harus *thumb-friendly*, rapi, dan otomatis kembali ke `[ ⚡ Otomatis ]` setelah transaksi disimpan agar tidak menjebak transaksi berikutnya.
- Domain produksi resmi adalah `https://kas.bisabaca.web.id/`.

## Review Focus
1. **Pengecualian Saldo Bebas:** Transaksi dengan kata kunci "makan" atau "bensin" yang ditandai `pocketId: 'bebas'` tidak boleh mengurangi saldo pos Dapur atau Transport.
2. **Isolasi Antar Pos:** Transaksi yang secara eksplisit memiliki `pocketId: 'pocket-dapur'` tidak boleh terhitung di pos `pocket-transport` meskipun judulnya mengandung kata yang mirip.
3. **Penyuntikan Prompt Gemini:** Prompt koreksi AI dan scan struk menyertakan seluruh pos aktif dan sesi ST aktif tanpa merusak format JSON respon.
4. **Reset State Chip Pasca-Simpan:** Setelah transaksi disimpan, tombol chip tujuan otomatis kembali terpilih di `[ ⚡ Otomatis ]`.
5. **Kesesuaian Tampilan Mobile:** Deretan chip horizontal tidak menyebabkan *layout shift* atau terpotong pada layar HP kecil.

---

### Task 1: Data Model, Pocket Calculation Logic, and Local Auto-Inference

**Files:**
- Modify: `index.html:1099-1120` (`calculatePocketUsage`)
- Modify: `index.html:1334-1336` (`inferPocket` & `parseInput`)
- Create: `test/smart_pos_and_destination_test.js`

**Interfaces:**
- Consumes: `getPockets()`, `tx()`
- Produces: `inferPocket(category, title, pockets)` -> returns pocketId or null; updated `calculatePocketUsage` respecting `'bebas'` and exact `pocketId`.

- [ ] **Step 1: Write failing unit test in `test/smart_pos_and_destination_test.js`**

```javascript
import assert from 'node:assert';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

// Test 1: calculatePocketUsage handles 'bebas' and explicit pocketId
console.log('--- Test 1: Pocket calculation handles bebas and pocketId ---');
assert.ok(html.includes("t.pocketId === 'bebas'"), 'calculatePocketUsage must check for bebas pocketId');
assert.ok(html.includes("t.pocketId && t.pocketId !== pocket.id"), 'calculatePocketUsage must check for pocketId mismatch');

// Test 2: inferPocket helper exists
console.log('--- Test 2: inferPocket helper exists ---');
assert.ok(html.includes('function inferPocket('), 'inferPocket function must exist');
```

- [ ] **Step 2: Run test to verify failure**
```powershell
node test/smart_pos_and_destination_test.js
```
Expected: FAIL with missing `t.pocketId === 'bebas'` or `inferPocket`.

- [ ] **Step 3: Implement minimal code in `index.html`**

Update `calculatePocketUsage`:
```javascript
function calculatePocketUsage(pocket,targetDate,txList){
  const d=targetDate?new Date(targetDate):new Date();
  const year=d.getFullYear(), month=d.getMonth();
  const cats=(pocket.categories||[]).map(c=>String(c).toLowerCase().trim());
  const matchingTx=(txList||[]).filter(t=>{
    if(t.type!=='expense')return false;
    if(t.source==='st')return false;
    const tDate=new Date(t.createdAt||Date.now());
    if(tDate.getFullYear()!==year||tDate.getMonth()!==month)return false;
    if(t.pocketId==='bebas')return false;
    if(t.pocketId&&t.pocketId!==pocket.id)return false;
    if(t.pocketId&&t.pocketId===pocket.id)return true;
    const tCat=String(t.category||'').toLowerCase().trim();
    const tTitle=String(t.title||'').toLowerCase().trim();
    return cats.some(c=>tCat.includes(c)||tTitle.includes(c));
  });
  const spent=matchingTx.reduce((sum,t)=>sum+(Number(t.amount)||0),0);
  const amount=Number(pocket.amount)||0;
  const remaining=amount-spent;
  const percent=amount>0?Math.round((spent/amount)*100):0;
  const isOver=spent>amount;
  const overAmount=Math.max(0,spent-amount);
  return {pocket,spent,amount,remaining,percent,isOver,overAmount,count:matchingTx.length};
}
```

Add `inferPocket` helper:
```javascript
function inferPocket(category, title, pockets){
  const pList=pockets&&pockets.length?pockets:getPockets();
  if(!pList||!pList.length) return null;
  const tCat=String(category||'').toLowerCase().trim();
  const tTitle=String(title||'').toLowerCase().trim();
  for(const p of pList){
    const cats=(p.categories||[]).map(c=>String(c).toLowerCase().trim());
    if(cats.some(c=>tCat.includes(c)||tTitle.includes(c))) return p.id;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**
```powershell
node test/smart_pos_and_destination_test.js
```
Expected: PASS

- [ ] **Step 5: Commit Task 1**
```powershell
git add index.html test/smart_pos_and_destination_test.js
git commit -m "feat(budget): add inferPocket helper and enforce pocketId isolation in calculatePocketUsage"
```

---

### Task 2: Gemini AI Prompt Enhancement for Pockets and ST Classification

**Files:**
- Modify: `index.html:1988-2030` (`aiCorrectTransactionText`)
- Modify: `index.html:2410-2490` (`scanReceiptWithGemini`)
- Test: `test/smart_pos_and_destination_test.js`

**Interfaces:**
- Consumes: `getPockets()`, `getActiveSTSession()`, `setGeminiApiKey()`
- Produces: Gemini JSON responses containing `pocketId` (`'bebas'` or pocket ID), `source` (`'personal'` or `'st'`), and `stSessionId`.

- [ ] **Step 1: Write test for Gemini prompt structure in `test/smart_pos_and_destination_test.js`**

Add assertions:
```javascript
console.log('--- Test 3: Gemini prompt injects pockets and ST session ---');
assert.ok(html.includes('activePocketsInfo'), 'aiCorrectTransactionText must format active pockets info for Gemini');
assert.ok(html.includes('pocketId'), 'scanReceiptWithGemini must instruct Gemini to extract pocketId');
```

- [ ] **Step 2: Run test to verify failure**
```powershell
node test/smart_pos_and_destination_test.js
```
Expected: FAIL

- [ ] **Step 3: Update `aiCorrectTransactionText` and `scanReceiptWithGemini` in `index.html`**

In `aiCorrectTransactionText`:
Format pocket list:
```javascript
const pList=getPockets();
const activePocketsInfo=pList.length?pList.map(p=>`${p.name} (id: ${p.id})`).join(', '):'Belum ada pos khusus';
const activeST=getActiveSTSession();
const stInfo=activeST?`Tersedia Sesi Dinas: ${activeST.label} (id: ${activeST.id})`:'Tidak ada sesi dinas aktif';
```
Update prompt to ask for:
`"pocketId": "id pos yang cocok atau 'bebas' jika pribadi",`
`"source": "personal" atau "st",`
`"stSessionId": "id sesi st jika source st, atau null"`

In `scanReceiptWithGemini`:
Include `activePocketsInfo` and `stInfo` in receipt scan prompt.
When parsing items, use `it.pocketId || inferPocket(cat, cleanTitle)` and set `it.source` / `it.stSessionId`.

- [ ] **Step 4: Run test to verify passes**
```powershell
node test/smart_pos_and_destination_test.js
```
Expected: PASS

- [ ] **Step 5: Commit Task 2**
```powershell
git add index.html test/smart_pos_and_destination_test.js
git commit -m "feat(ai): empower gemini to classify transactions into budget pockets, bebas, or ST"
```

---

### Task 3: Horizontal Smart Destination Chips UI in Beranda & Focus Mode

**Files:**
- Modify: `index.html` (Markup in `#home-quick` & `.focus-entry`, CSS styling in `<style>`, JS handlers for chip selection and preview).
- Test: `test/smart_pos_and_destination_test.js`

**Interfaces:**
- Consumes: `activeInputDestination`, `renderDestinationChips()`, `setDestination(id)`
- Produces: Visual chip bar in DOM with 1-tap override behavior that resets to `'auto'` on save.

- [ ] **Step 1: Write test for Destination Chips markup and state in `test/smart_pos_and_destination_test.js`**

Add assertions:
```javascript
console.log('--- Test 4: Destination Chips in Beranda & Focus Mode ---');
assert.ok(html.includes('id="homeDestinationChips"'), 'homeDestinationChips container must exist in home page');
assert.ok(html.includes('id="focusDestinationChips"'), 'focusDestinationChips container must exist in focus page');
assert.ok(html.includes('activeInputDestination'), 'activeInputDestination state variable must exist');
assert.ok(html.includes('renderDestinationChips'), 'renderDestinationChips function must exist');
```

- [ ] **Step 2: Run test to verify failure**
```powershell
node test/smart_pos_and_destination_test.js
```
Expected: FAIL

- [ ] **Step 3: Implement Markup, Styling, and JS Logic in `index.html`**

1. HTML Markup:
In `#home-quick`:
```html
<div class="destination-chips-wrap" id="homeDestinationChips"></div>
```
In `.focus-entry`:
```html
<div class="destination-chips-wrap" id="focusDestinationChips"></div>
```

2. CSS Styling:
```css
.destination-chips-wrap {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  white-space: nowrap;
  padding: 6px 2px 8px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.destination-chips-wrap::-webkit-scrollbar { display: none; }
.destination-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  border: 1px solid var(--line);
  background: var(--surface2);
  color: var(--muted);
  cursor: pointer;
  transition: all .15s ease;
  user-select: none;
}
.destination-chip.active {
  background: var(--green);
  color: #fff;
  border-color: var(--green);
  box-shadow: 0 2px 8px rgba(31,138,91,0.25);
}
```

3. JS Implementation:
- `let activeInputDestination = 'auto';`
- `function renderDestinationChips()`
- `function setInputDestination(destId)`
- Update `pratinjau()` to reflect active destination.
- In `addFrom()`, apply destination to `item`:
  - if `'bebas'`: `item.pocketId = 'bebas'; item.source = 'personal';`
  - if `'st'`: `item.source = 'st'; item.stSessionId = getActiveSTSession()?.id;`
  - if pocket: `item.pocketId = activeInputDestination; item.source = 'personal';`
  - if `'auto'`: `item.pocketId = inferPocket(item.category, item.title);`
  - Reset `activeInputDestination = 'auto'` after saving.

- [ ] **Step 4: Run test to verify passes**
```powershell
node test/smart_pos_and_destination_test.js
```
Expected: PASS

- [ ] **Step 5: Commit Task 3**
```powershell
git add index.html test/smart_pos_and_destination_test.js
git commit -m "feat(ui): add 1-tap smart destination chips to home and focus input modes"
```

---

### Task 4: Service Worker Bump to v42, Version Badge, and Full Verification & Deployment

**Files:**
- Modify: `sw.js:1`
- Modify: `index.html` (Version badge to `v42`, force update query)
- Modify: `test/home_header_and_icons_test.js` & `test/live_thousands_formatter_test.js` (Sync version assertions to `v42`)

- [ ] **Step 1: Synchronize cache version to `v42` across files**
- In `sw.js`: `const CACHE_NAME = 'aruskas-pwa-v42';`
- In `index.html`:
  - `id="appVersionBadge"` -> `v42`
  - `u.searchParams.set('updated','v42')`
  - query bumps on `warm-ui.css?v=20261021.22`

- [ ] **Step 2: Run all test suites across the project**
```powershell
node -e "const fs = require('fs'); const { execSync } = require('child_process'); fs.readdirSync('test').filter(f => f.endsWith('_test.js')).forEach(f => { console.log('-->', f); execSync('node test/' + f, { stdio: 'inherit' }); });"
```
Expected: All 18 test suites PASS without error.

- [ ] **Step 3: Commit and Push to GitHub**
```powershell
git add index.html sw.js test/
git commit -m "chore(release): bump cache to v42 and synchronize test suites"
git push origin main
```

- [ ] **Step 4: Deploy to VPS Target & Verify Live Production**
```powershell
ssh bisabaca-vps "cd /home/ubuntu/CashFlow && git pull origin main"
curl.exe -s https://kas.bisabaca.web.id/sw.js | Select-Object -First 1
```
Expected: `const CACHE_NAME = 'aruskas-pwa-v42';`
Live site `https://kas.bisabaca.web.id/` reflects latest changes.
