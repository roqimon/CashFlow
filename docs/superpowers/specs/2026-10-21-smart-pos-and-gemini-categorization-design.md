# Desain Spesifikasi: Smart Pos & Gemini AI Categorization with 1-Tap Destination Chips

**Tanggal:** 21 Oktober 2026  
**Status:** Disetujui (Tahap Perancangan)  
**Target:** ArusKas PWA (Cache v36)  

---

## 1. Latar Belakang & Masalah
Pengguna ingin transaksi yang dicatat dapat langsung memotong pos yang sesuai (misalnya: *Uang Belanja / Dapur*, *Saldo Bebas*, atau *Surat Tugas / ST Oktober*).
Namun ada tantangan utama:
1. **Bahaya Friksi / Kelelahan Mencatat (*Logging Fatigue*):** Mengharuskan pengguna memilih *dropdown* pos setiap kali mencatat transaksi akan memperlambat alur input cepat 3 detik ("catat secepat kilat").
2. **Kekuatan Gemini AI yang Belum Dioptimalkan:** Saat ini Gemini 2.5 Flash Lite sudah terintegrasi untuk membaca foto struk dan koreksi teks/suara, namun belum diarahkan untuk langsung menentukan pos anggaran (`pocketId`), saldo bebas (`bebas`), atau surat tugas (`source: 'st'`).
3. **Pemisahan Pengeluaran Pribadi vs Pos Anggaran:** Pengguna perlu cara mudah agar transaksi pribadi tidak memotong kuota pos anggaran bulanan keluarga (masuk ke *Saldo Bebas*).

---

## 2. Solusi & Arsitektur Sistem

Solusi terdiri dari 3 pilar:
1. **Otomatisasi Lokal 0 Detik (Lapisan 1):**
   - Menggunakan pemetaan kategori lokal yang sudah ada di memori browser.
   - Saat pengguna mengetik `beras 50rb` atau `kopi 25rb`, mesin lokal langsung mengenali kategori dan memetakan ke pos anggaran terkait (`pocketId`) tanpa jeda jaringan (0 ms).
2. **Otomatisasi Gemini AI (Lapisan 2):**
   - Pada fitur **Foto Struk / Nota** dan **Koreksi AI (Suara & Teks)**, daftar pos anggaran aktif (`getPockets()`) dan sesi ST aktif (`getActiveSTSession()`) disuntikkan ke dalam *system prompt* Gemini.
   - Gemini langsung mengembalikan JSON dengan properti `pocketId` (ID pos yang cocok, atau `'bebas'`) serta `source` (`'personal'` atau `'st'`).
3. **Pil Pintar 1-Tap (*Smart Destination Chips* - Lapisan 3):**
   - Deretan tombol chip pipih horizontal tepat di atas / bawah kotak input di **Beranda** (`#quickInput`) dan **Mode Fokus** (`#focusInput`).
   - Format deretan chip:
     `[ ⚡ Otomatis ]` `[ 🛒 Dapur ]` `[ ⛽ Bensin ]` `...` `[ ⚪ Bebas ]` `[ 💼 ST Oktober ]` (jika ada sesi ST aktif).
   - *Default:* Selalu aktif di `[ ⚡ Otomatis ]` (tidak perlu sentuh apa-apa).
   - *Override:* 1 ketukan jempol jika pengguna ingin secara spesifik mengarahkan ke `[ ⚪ Bebas ]` atau `[ 💼 ST Oktober ]`.

---

## 3. Detail Arsitektur Data & Logika

### 3.1 Properti Transaksi Baru
- `tx.pocketId`: 
  - `string`: ID dari kantong/pos anggaran (misal `'pocket-dapur'`).
  - `'bebas'`: Penanda eksplisit bahwa transaksi adalah pengeluaran pribadi di luar pos anggaran bulanan.
  - `null`: Mode bawaan (mengikuti pencocokan kategori).
- `tx.source`: `'personal'` | `'st'`
- `tx.stSessionId`: ID sesi ST aktif jika `source === 'st'`.

### 3.2 Penyesuaian `calculatePocketUsage`
Pada fungsi `calculatePocketUsage(pocket, targetDate, txList)`:
```javascript
// Jika transaksi secara eksplisit ditandai 'bebas' atau milik pocket lain, jangan potong pocket ini!
if (t.pocketId === 'bebas') return false;
if (t.pocketId && t.pocketId !== pocket.id) return false;
if (t.pocketId && t.pocketId === pocket.id) return true;
// Fallback: pencocokan substring kategori / judul (untuk transaksi legacy/otomatis)
```

### 3.3 Prompt Gemini AI Enhancement
Pada `aiCorrectTransactionText` dan `scanReceiptWithGemini`:
- Masukkan daftar pos anggaran aktif:
  ```javascript
  const activePockets = getPockets().map(p => `${p.name} (id: ${p.id})`).join(', ');
  const activeST = getActiveSTSession();
  const stPrompt = activeST ? `Tersedia sesi dinas: ${activeST.label} (id: ${activeST.id})` : 'Tidak ada sesi dinas aktif';
  ```
- Minta Gemini mengklasifikasikan:
  ```json
  {
    "title": "Nama transaksi bersih",
    "amount": 100000,
    "category": "Kategori",
    "pocketId": "id_pocket_yang_cocok ATAU 'bebas'",
    "source": "personal ATAU 'st'",
    "stSessionId": "id_sesi_st_bila_st ATAU null",
    "note": "Catatan ringkas"
  }
  ```

---

## 4. Antarmuka Pengguna (UI/UX)

### 4.1 Horizontal Chip Selector di Beranda & Mode Fokus
- Terletak tepat di atas kotak pratinjau transaksi.
- Berupa bar horizontal dengan `overflow-x: auto; white-space: nowrap; scrollbar-width: none;`.
- Elemen chip:
  - `⚡ Otomatis`: Warna netral/aksen, status aktif bawaan.
  - `🛒 [Nama Pos]`: Menampilkan ikon + nama pos (dari `getPockets()`).
  - `⚪ Bebas`: Aksen abu-abu/netral dengan indikator badge.
  - `💼 [Sesi ST]`: Hanya muncul jika ada sesi ST yang berstatus `active`.
- State aktif tersimpan dalam variabel `activeInputDestination = 'auto'` (bisa bernilai `'auto'`, `'bebas'`, `'st'`, atau `pocketId`).
- Saat transaksi disimpan, `activeInputDestination` otomatis kembali ke `'auto'` agar tidak menjebak transaksi berikutnya.

### 4.2 Pratinjau Cerdas (`pratinjau`)
Kotak pratinjau (`quickPreview` dan `focusPreview`) menampilkan tujuan potongan secara jelas:
- Contoh: `🍽️ Makan Siang · Makan · - Rp 35.000 · 🎯 Pos: Dapur & Belanja`
- Jika bebas: `🍽️ Makan Siang · Makan · - Rp 35.000 · ⚪ Saldo Bebas`
- Jika ST: `🍽️ Makan Siang · Makan · - Rp 35.000 · 💼 ST Oktober`

---

## 5. Rencana Pengujian (Test Plan)
1. **Unit Test Klasifikasi & Bypass Pocket (`test/smart_pos_and_destination_test.js`):**
   - Verifikasi transaksi dengan `pocketId: 'bebas'` tidak pernah dihitung ke dalam jatah kantong manapun di `calculatePocketUsage`.
   - Verifikasi transaksi dengan `pocketId: 'pocket-dapur'` hanya memotong pos dapur, tidak bocor ke pos lain meskipun ada kesamaan kata kunci.
   - Verifikasi fallback otomatis jika `pocketId` tidak diisi (tetap kompatibel dengan transaksi legacy).
2. **Unit Test AI Prompt Structure:**
   - Memastikan prompt Gemini untuk scan nota dan koreksi suara menyertakan daftar pos aktif dan opsi `bebas`/`st`.
3. **PWA Cache:**
   - Memperbarui versi cache Service Worker ke `aruskas-pwa-v36`.
