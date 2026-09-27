# Lazy Input Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan rangkaian fitur input instan untuk pengguna yang malas mengetik: Scan Struk & Screenshot Notifikasi via Gemini 2.5 Flash, Input Suara (Voice-to-Expense), Multi-Item Batch Parsing, 1-Tap Chip Action, Smart Sanitizer Notifikasi Bank/E-Wallet, serta Fitur Impor Cadangan JSON.

**Architecture:** Menerapkan Client-Side Direct Engine pada PWA ArusKas tanpa server backend. Foto struk/screenshot dikompresi di browser via Canvas sebelum dikirim ke endpoint Gemini API dengan API key tersimpan lokal di `localStorage`. Audio suara diproses via Web Speech API (`id-ID`) lalu dikonversi angka lisan ke nominal, dan batch parser memproses pemisah koma/enter.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5 Canvas API, Web Speech API (`SpeechRecognition`), Google Gemini 2.5 Flash Multimodal REST API, LocalStorage, PWA Service Worker.

**Spec:** `docs/superpowers/specs/2026-09-27-lazy-input-suite-design.md`

## Global Constraints
- Tetap 100% client-side PWA tanpa backend terpisah.
- Tidak menggunakan framework/library eksternal berukuran besar.
- Privasi finansial tetap di `localStorage` peramban pengguna.
- Mode tanpa pop-up toast: transaksi baru langsung masuk ke urutan teratas daftar riwayat secara instan.
- API Key Gemini disimpan di `localStorage` (`aruskas_gemini_api_key`) dan dapat dikonfigurasi di menu Pengaturan.

## Review Focus
1. Foto struk sangat besar (10-20MB) dari kamera HP: harus dikompresi via Canvas sebelum dikirim ke API agar tidak timeout atau out-of-memory.
2. Kalimat suara bahasa Indonesia ("tiga puluh lima ribu" atau "seratus dua puluh ribu"): harus terkonversi akurat ke angka `35000` dan `120000`.
3. Teks notifikasi bank panjang dan kompleks: harus terisolasi nama penerima dan nominal tanpa membawa nomor rekening atau tanggal.
4. Input batch dengan satu item tidak valid (misal `kopi 25, tes, bensin 35`): item yang valid tetap tersimpan dan tidak ada data yang hilang.
5. Pemulihan cadangan data (Impor JSON): memvalidasi format berkas JSON agar tidak merusak data lokal yang ada.

---

### Task 1: Unit Test Suite untuk Helper Logika Baru
**Files:**
- Create: `test/lazy_suite_test.js`

**Interfaces:**
- Produces:
  - `convertSpokenIndonesianNumbers(text: string): string`
  - `sanitizeBankNotificationText(raw: string): string`
  - `processBatchInput(raw: string): { items: Array<object>, failed: Array<string> }`

- [ ] **Step 1: Tulis unit test untuk ketiga fungsi inti logika input**
Tulis berkas `test/lazy_suite_test.js` dengan pengujian:
- Konversi angka lisan Indonesia ("makan siang dua puluh lima ribu", "bensin lima puluh ribu", "kopi 15rb").
- Pembersihan teks notifikasi bank (BCA QRIS, Mandiri Livin, GoPay).
- Batch parser pemisah koma/enter (`kopi 25, bensin 35, parkir 5`).

- [ ] **Step 2: Jalankan test dan pastikan gagal (karena fungsi belum diimplementasi)**
Run: `node test/lazy_suite_test.js`
Expected: FAIL dengan "ReferenceError"

- [ ] **Step 3: Implementasi logika helper dalam modul test**
Lengkapi implementasi helper di `test/lazy_suite_test.js` hingga semua skenario lolos verifikasi.

- [ ] **Step 4: Jalankan test ulang dan pastikan seluruh test PASS**
Run: `node test/lazy_suite_test.js`
Expected: PASS ("All tests passed!")

- [ ] **Step 5: Commit test suite**
```bash
git add test/lazy_suite_test.js
git commit -m "test: add unit test suite for lazy input helper functions"
```

---

### Task 2: Implementasi Helper Logika ke `index.html`
**Files:**
- Modify: `index.html:540-570`

**Interfaces:**
- Consumes: Helper teruji dari Task 1.
- Produces:
  - `window.convertSpokenIndonesianNumbers(text)`
  - `window.sanitizeBankNotificationText(raw)`
  - `window.processBatchInput(raw)`

- [ ] **Step 1: Sisipkan fungsi `convertSpokenIndonesianNumbers`, `sanitizeBankNotificationText`, dan `processBatchInput` ke dalam blok `<script>` di `index.html`**
- [ ] **Step 2: Hubungkan `sanitizeBankNotificationText` dan `processBatchInput` ke dalam `addFrom()` dan `pratinjau()`**
- [ ] **Step 3: Uji fungsi di browser / node sintaks check**
Run: `node -c debug_test.js`
- [ ] **Step 4: Commit perubahan logika parser**
```bash
git add index.html
git commit -m "feat: add spoken number conversion, bank notification sanitizer, and batch parser"
```

---

### Task 3: 1-Tap Quick Action pada Chip Beranda & Batch Input UI
**Files:**
- Modify: `index.html:450-465, 580-600, 680-710`

**Interfaces:**
- Consumes: `processBatchInput()`, `addFrom()`
- Produces: 1-tap chip logger, multi-item batch preview.

- [ ] **Step 1: Modifikasi click event listener untuk `#exampleChips button`**
Jika chip memiliki nominal (misal `api 50`, `siang 50`), langsung panggil `addFrom()` dengan nilai tersebut tanpa menunggu tombol Simpan ditekan.
Jika tidak memiliki nominal, masukkan nama pintasan ke input dan fokuskan kursor di belakangnya.
- [ ] **Step 2: Modifikasi `pratinjau()` saat mendeteksi koma / newline**
Menampilkan ringkasan pintar berapa transaksi yang terdeteksi dan total nominalnya.
- [ ] **Step 3: Verifikasi fungsi 1-tap dan batch di browser**
- [ ] **Step 4: Commit perubahan 1-tap dan batch UI**
```bash
git add index.html
git commit -m "feat: enable 1-tap quick action on home chips and batch input preview"
```

---

### Task 4: Input Suara (Voice to Expense)
**Files:**
- Modify: `index.html:450-465, 700-725`

**Interfaces:**
- Consumes: `convertSpokenIndonesianNumbers()`, `addFrom()`
- Produces: `#voiceBtn`, `#voiceBtnFocus`, `startVoiceInput()`

- [ ] **Step 1: Tambahkan tombol mikrofon 🎙️ di UI Beranda dan UI Mode Fokus**
- [ ] **Step 2: Tambahkan CSS animasi berdenyut merah (`.listening`) saat mendengarkan suara**
- [ ] **Step 3: Implementasi `initVoiceInput()` menggunakan `SpeechRecognition` / `webkitSpeechRecognition` (`lang = 'id-ID'`)**
Saat ucapan selesai:
1. Konversi teks suara dengan `convertSpokenIndonesianNumbers()`.
2. Masukkan ke input box.
3. Langsung eksekusi `addFrom()` sehingga otomatis tersimpan ke riwayat.
- [ ] **Step 4: Commit fitur voice input**
```bash
git add index.html
git commit -m "feat: add voice-to-expense input with indonesian speech recognition"
```

---

### Task 5: AI Receipt & Screenshot Vision Scanner (Gemini Flash)
**Files:**
- Modify: `index.html:450-475, 600-650, 700-725`

**Interfaces:**
- Consumes: `compressImage()`, Google Gemini 2.5 Flash API
- Produces: `#scanBtn`, `#scanBtnFocus`, `#receiptFileInput`, `scanReceiptWithGemini()`

- [ ] **Step 1: Tambahkan tombol kamera 📷 dan hidden file input `<input type="file" accept="image/*">`**
- [ ] **Step 2: Tambahkan fungsi kompresi gambar HTML5 Canvas `compressImage(file, 1024, 0.8)`**
- [ ] **Step 3: Tambahkan fungsi `scanReceiptWithGemini(file)`**
1. Ambil API Key dari `localStorage` (default: key pengguna).
2. Tampilkan spinner berputar halus pada tombol kamera.
3. Kirim base64 gambar ke `models/gemini-2.5-flash:generateContent`.
4. Parse hasil JSON dari AI.
5. Langsung buat transaksi via `tx()` dan simpan via `saveTX()`.
6. Hapus spinner dan refresh tampilan daftar transaksi.
- [ ] **Step 4: Tambahkan pengaturan Gemini API Key di `#settingsModal`**
- [ ] **Step 5: Commit fitur AI Vision scanner**
```bash
git add index.html
git commit -m "feat: add ai receipt and screenshot scanner powered by gemini 2.5 flash"
```

---

### Task 6: Fitur Impor Cadangan JSON & Perbaikan PWA Offline
**Files:**
- Modify: `index.html:465-475, 650-675`

**Interfaces:**
- Produces: `#importJsonBtn`, `#importJsonFile`, `importJsonData(file)`

- [ ] **Step 1: Tambahkan tombol "Impor JSON" dan input file hidden di `#settingsModal`**
- [ ] **Step 2: Implementasi fungsi `importJsonData(file)`**
Membaca file JSON cadangan, memvalidasi struktur, menggabungkan/memulihkan `KEY_TX`, `KEY_SC`, `KEY_CATREC`, dan memanggil `render()`.
- [ ] **Step 3: Rapikan inisialisasi Service Worker agar tidak unregister setiap reload**
- [ ] **Step 4: Commit fitur restore JSON dan perbaikan SW**
```bash
git add index.html
git commit -m "feat: add json backup import and fix pwa service worker caching"
```

---

### Task 7: Pengujian Terintegrasi & Verifikasi Menyeluruh
**Files:**
- Test & Verify: Seluruh fitur di `index.html` dan `test/lazy_suite_test.js`

- [ ] **Step 1: Jalankan seluruh automated test**
Run: `node test/lazy_suite_test.js`
Expected: PASS
- [ ] **Step 2: Verifikasi alur browser secara menyeluruh:**
1. Klik chip Beranda 1-Tap ➔ Transaksi tersimpan instan.
2. Ketik `kopi 20, makan 30` ➔ 2 transaksi tersimpan sekaligus.
3. Paste format notifikasi BCA QRIS ➔ Terekstrak bersih dan tersimpan.
4. Klik tombol kamera dan coba scan gambar.
5. Tes tombol mikrofon.
6. Tes Ekspor dan Impor data JSON.
- [ ] **Step 3: Final Commit & Dokumentasi**
```bash
git commit -am "chore: complete lazy input suite integration and verification"
```
