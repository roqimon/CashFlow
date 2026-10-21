# Family Budgeting & WhatsApp Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformasi ArusKas dari sistem kantor/ST menjadi aplikasi budgeting keluarga & personal yang mudah dipahami mayoritas orang Indonesia dengan fitur Kantong Jatah Anggaran dan 1-Click WhatsApp Recap Share.

**Architecture:** Penyimpanan lokal berbasis `localStorage` untuk model data `budgetPockets`, kalkulasi progres anggaran dinamis per bulan aktif berdasarkan pemetaan kategori otomatis, integrasi visual bar progres di Beranda dan menu pengelolaan di Pintasan, serta generator pesan WhatsApp dengan deep-link web share.

**Tech Stack:** Vanilla JavaScript (ES2022), HTML5, CSS3 Glassmorphism, Service Worker PWA, Node.js Test Suite.

**Spec:** [docs/superpowers/specs/2026-10-21-family-budget-and-share-design.md](file:///d:/Apps/CashFlow/docs/superpowers/specs/2026-10-21-family-budget-and-share-design.md)

## Global Constraints
- Tetap 100% offline-first PWA yang cepat dan ringan.
- Nol friksi input: Transaksi biasa (`beras 120rb`, `kopi 20rb`) harus otomatis memotong anggaran tanpa mewajibkan pengguna memilih kantong secara manual setiap input.
- Tidak boleh merusak data transaksi pengguna yang sudah ada di `localStorage`.
- Semua modal dan form baru harus thumb-friendly dan responsif di mobile.

## Review Focus
1. **Perhitungan Sisa Budgeting:** Menghitung total pengeluaran per kantong pada bulan berjalan secara akurat tanpa menghitung transaksi bulan lain.
2. **Kondisi Overbudget:** Jika pengeluaran melebihi plafon (>= 100%), UI harus menampilkan peringatan ramah warna merah/oranye ("Lebih Rp XXX") tanpa memicu error kalkulasi angka negatif.
3. **Format Teks WhatsApp:** Karakter khusus (simbol emoji, baris baru, format mata uang rupiah) harus ter-encode dengan aman saat dibuka di WhatsApp Web maupun aplikasi WhatsApp HP.
4. **Resistensi Kategori:** Transaksi dengan kategori khusus atau baru tetap tercatat aman; jika kategori tidak terdaftar di kantong mana pun, transaksi masuk ke rekap "Lainnya/Kas Bebas".
5. **Kebersihan Legacy ST:** Menghapus seluruh elemen DOM, listener, dan referensi modal ST lama agar tidak meninggalkan *memory leak* atau *zombie events*.

---

### Task 1: Budget Data Model, Calculation Engine & WhatsApp Text Generator

**Files:**
- Modify: `index.html`
- Create: `test/budget_and_share_test.js`

- [ ] **Step 1: Write failing unit tests for Budgeting logic and WhatsApp text generator**
  - Test default pockets initialization (`getPockets()`, `savePockets()`).
  - Test calculation of pocket spending for the active month (`calculatePocketUsage(monthDate, txList, pockets)`).
  - Test detection of overbudget status.
  - Test WhatsApp recap message string generator (`generateWhatsAppRecap(monthDate, txList, pockets)`).

- [ ] **Step 2: Run test to confirm failure**
  ```powershell
  node test/budget_and_share_test.js
  ```

- [ ] **Step 3: Implement data model and calculation helper functions in `index.html`**
  - Define `KEY_POCKETS = 'aruskas_budget_pockets_v1'`.
  - Implement `defaultPockets`: Dapur & Belanja (2.5jt), Anak & Sekolah (1.5jt), Tagihan Rumah (1jt), Jajan & Santai (800rb), Tabungan (1jt).
  - Implement `getPockets()`, `savePockets()`.
  - Implement `getPocketSpending(pocket, year, month, txList)`.
  - Implement `generateWhatsAppRecap(date, txList, pockets)`.

- [ ] **Step 4: Re-run test to verify passes**
  ```powershell
  node test/budget_and_share_test.js
  ```

- [ ] **Step 5: Commit Task 1**
  ```powershell
  git add index.html test/budget_and_share_test.js
  git commit -m "feat(budget): implement budget pockets model, spending calculator, and whatsapp recap generator"
  ```

---

### Task 2: Home Budget Cards & WhatsApp Share UI

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace `#stSessionContainer` in Beranda with `#budgetContainer`**
  - Tambahkan kartu "Jatah Anggaran Bulan Ini" dengan header ringkasan (Total Terpakai / Total Plafon).
  - Tampilkan list kartu/bar progres per kantong:
    - Nama kantong + Ikon
    - Progress bar persentase (warna dinamis: hijau < 75%, kuning 75-99%, merah >= 100%)
    - Teks Terpakai vs Plafon dan sisa jatah ("Sisa Rp XXX" atau "⚠️ Lebih Rp XXX").
  - Tambahkan tombol pintas "Atur Anggaran" yang mengarahkan ke tab Pintasan/Anggaran.

- [ ] **Step 2: Add WhatsApp Share Button in Report Page**
  - Di halaman Laporan (`report`), tambahkan tombol aksi utama:
    - `[ 📲 Kirim Rekap ke WhatsApp ]` dengan ikon WhatsApp / bagikan.
  - Implementasikan event listener untuk membuka WhatsApp dengan teks rekap terformat rapi sesuai bulan yang sedang aktif dilihat.

- [ ] **Step 3: Clean up Input Row in Beranda & Focus Mode**
  - Hapus tombol toggle `[ 📋 ST ]` (`#stToggle` dan `#stToggleFocus`) dari `#quickInput` dan `#focusInput`.
  - Kotak input sekarang menjadi lebih luas, lega, dan nyaman untuk mengetik transaksi.

- [ ] **Step 4: Verify UI in browser and run tests**
  ```powershell
  node test/budget_and_share_test.js
  ```

- [ ] **Step 5: Commit Task 2**
  ```powershell
  git add index.html
  git commit -m "feat(ui): add home budget progress cards, whatsapp share button, and streamlined input bar"
  ```

---

### Task 3: Pocket Management in Settings/Shortcut Menu & ST Cleanup

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace ST Session Manager with Budget Pocket Manager**
  - Ubah bagian ST di tab Pintasan menjadi "Kantong Anggaran Keluarga".
  - Buat daftar kantong dengan info plafon bulanan, tombol edit plafon cepat, dan tombol tambah kantong baru.
  - Buat modal form sederhana untuk tambah/edit kantong (Nama, Ikon, Nominal Plafon).

- [ ] **Step 2: Clean up legacy ST code and modals**
  - Hapus modal `#settleModal` dan `#editDepositModal`.
  - Bersihkan filter sumber transaksi `Pribadi vs ST` menjadi filter kategori / kantong yang lebih bersih.
  - Pastikan tidak ada console error saat merender riwayat transaksi lama.

- [ ] **Step 3: Run all existing and new test suites**
  ```powershell
  node test/bulk_mode_and_ux_test.js
  node test/input_parsing_bug_test.js
  node test/lazy_integration_test.js
  node test/lazy_suite_test.js
  node test/mobile_overflow_and_camera_test.js
  node test/budget_and_share_test.js
  ```

- [ ] **Step 4: Commit Task 3**
  ```powershell
  git add index.html test/
  git commit -m "refactor(cleanup): replace ST manager with budget pocket manager and clean up legacy modals"
  ```

---

### Task 4: Service Worker Version Bump, Verification & Deploy to VPS

**Files:**
- Modify: `sw.js`
- Modify: `index.html`
- Modify: `test/mobile_overflow_and_camera_test.js`

- [ ] **Step 1: Bump Service Worker cache to v15**
  - In `sw.js`: `CACHE_NAME = 'aruskas-pwa-v15'`
  - In `index.html`: `register('./sw.js?v=20261021.3')`
  - In test: update version assertions.

- [ ] **Step 2: Run all tests to confirm 100% green**
  ```powershell
  node test/bulk_mode_and_ux_test.js
  node test/budget_and_share_test.js
  node test/mobile_overflow_and_camera_test.js
  ```

- [ ] **Step 3: Deploy to VPS using `./deploy.ps1`**
  ```powershell
  .\deploy.ps1
  ```

- [ ] **Step 4: Verify live website on `https://kas.bisabaca.web.id/`**
  - Check HTTP status 200.
  - Verify budget cards, input, and WhatsApp sharing.
