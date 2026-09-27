# Spesifikasi Desain: Fitur Input Cerdas untuk Pengguna Super Malas (Lazy Input Suite)

**Tanggal:** 2026-09-27  
**Aplikasi:** ArusKas — Cash Flow Pribadi  
**Target Pengguna:** Pengguna yang sangat malas mencatat pengeluaran secara manual, mengutamakan minim ketikan (*zero-friction*), otomatisasi instan, dan privasi lokal.

---

## 1. Ringkasan & Tujuan Produk

Aplikasi ArusKas dirancang sebagai PWA (*Progressive Web App*) lokal yang cepat, offline-ready, dan privat. Dokumen spesifikasi ini mendefinisikan implementasi **Lazy Input Suite** yang terdiri dari 5 kapabilitas utama:
1. **AI Receipt & Screenshot Vision Scanner (Gemini Flash):** Memotret struk kasir atau screenshot pop-up notifikasi bank/e-wallet, mengekstrak data via AI, dan langsung menyimpan transaksi secara otomatis.
2. **Input Suara (Voice-to-Expense):** Mengonversi ucapan lisan (bahasa Indonesia) menjadi transaksi langsung simpan via Web Speech API.
3. **Multi-Item Batch Parsing:** Memasukkan banyak pengeluaran sekaligus dalam satu baris (dipisahkan koma/titik koma/baris baru).
4. **1-Tap Quick Action pada Chip Beranda:** Menekan chip pintasan langsung menyimpan transaksi ke riwayat seketika.
5. **Smart Sanitizer Notifikasi Bank/E-Wallet:** Membersihkan teks mutasi transfer m-Banking / e-wallet yang di-paste pengguna menjadi format transaksi bersih.
6. **Impor Cadangan JSON:** Menambahkan fitur restore cadangan data JSON di Pengaturan.

---

## 2. Arsitektur Komponen & Alur Data

### 2.1 Arsitektur Sistem (Client-Side Direct Engine)
Aplikasi mempertahankan model PWA mandiri tanpa server perantara (*zero backend*):
* Gambar struk dikompresi di sisi klien menggunakan HTML5 `<canvas>` (maksimum 1024px, JPEG quality 0.8) sebelum dikirim via HTTPS langsung dari browser pengguna ke Google Gemini API endpoint.
* Audio suara diproses melalui browser native `webkitSpeechRecognition` / `SpeechRecognition` (`id-ID`).
* Seluruh transaksi dan konfigurasi API Key disimpan di `localStorage` peramban pengguna.

```
[ Pengguna ] 
     │
     ├── 1. Foto Struk / Screenshot ──> [ Client Canvas Resize ] ──> [ Gemini 2.5 Flash API ] ──┐
     ├── 2. Suara 🎙️ ─────────────────> [ Web Speech API (id-ID) ] ──> [ Spoken Num Converter ] ─┤
     ├── 3. Batch Teks (Koma/Enter) ──> [ Batch Parser ] ────────────────────────────────────────┤
     ├── 4. 1-Tap Chip ⚡ ────────────> [ Direct Quick Log ] ────────────────────────────────────┤
     └── 5. Paste Teks Bank ──────────> [ Smart Bank Sanitizer ] ────────────────────────────────┘
                                                                                                 │
                                                                                                 ▼
                                                                           [ Transaction Engine: tx() ]
                                                                                                 │
                                                                                                 ▼
                                                                                   [ localStorage: KEY_TX ]
                                                                                                 │
                                                                                                 ▼
                                                                                 [ UI List Re-render ]
                                                                             (Pembaruan instan di daftar)
```

---

## 3. Rincian Fitur & Spesifikasi Teknis

### 3.1 AI Receipt & Screenshot Vision Scanner
* **UI Controls:**
  * Tombol kamera 📷 (`#scanBtn` dan `#scanBtnFocus`) di samping kotak input pada halaman Beranda dan halaman Tambah.
  * Elemen `<input type="file" accept="image/*" capture="environment" id="receiptFileInput" style="display:none">`. Memungkinkan pengguna memilih antara memotret langsung atau mengambil gambar/screenshot dari Galeri.
* **Proses Kompresi Gambar:**
  * Menggunakan helper `compressImage(file, maxDimension=1024, quality=0.8)`. Mengembalikan data base64 JPEG yang ringan (~100-200 KB).
* **Integrasi Gemini API:**
  * Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}`.
  * System instruction / Prompt:
    > "Kamu adalah asisten keuangan pribadi. Analisis gambar struk belanja, nota, atau screenshot notifikasi transfer/e-wallet ini. Ekstrak informasi dalam format JSON murni tanpa markdown/backticks: {\"title\": \"nama merchant/toko/penerima\", \"amount\": total_nominal_dalam_angka_bulat, \"category\": \"Makan\"|\"Transport\"|\"Belanja\"|\"Tagihan\"|\"Digital\"|\"Rumah\"|\"Kesehatan\"|\"Akademik\"|\"Investasi\"|\"Lainnya\", \"note\": \"ringkasan barang atau catatan singkat\"}. Jika gambar bukan struk atau tidak terbaca, kembalikan {\"error\": \"tidak_terbaca\"}."
* **Logika Penyimpanan:**
  * Jika API mengembalikan data valid, buat objek transaksi via `tx()`:
    * `title`: nama toko/merchant yang diekstrak.
    * `amount`: nominal grand total.
    * `category`: kategori yang diprediksi AI (dicek terhadap `activeCategory`).
    * `icon`: icon kategori yang sesuai.
    * `source`: jika `stMode` aktif dan ada sesi ST, otomatis diset `st` dengan `reimburseStatus: 'pending'`.
  * Simpan ke `KEY_TX`, jalankan `learnCategory` & `learnTitle`, lalu re-render UI.
* **Konfigurasi Pengaturan:**
  * Kolom input `aruskas_gemini_api_key` di `#settingsModal` dengan instruksi dan tautan langsung ke Google AI Studio untuk mendapatkan API key gratis.

### 3.2 Input Suara (Voice to Expense)
* **UI Controls:**
  * Tombol mikrofon 🎙️ (`#voiceBtn` dan `#voiceBtnFocus`) di samping input.
* **Web Speech API:**
  * Objek `window.SpeechRecognition || window.webkitSpeechRecognition`.
  * Bahasa: `recognition.lang = 'id-ID'`.
  * Status visual: Saat aktif, tombol mic berdenyut merah (`class="listening"`).
* **Konverter Kata Lisan ke Angka:**
  * Helper `convertSpokenIndonesianNumbers(text)` yang memetakan frasa lisan bahasa Indonesia seperti:
    * "dua puluh lima ribu" ➔ `25000` / `25rb`
    * "seratus lima puluh ribu" ➔ `150000` / `150rb`
    * "satu juta" ➔ `1jt`
    * "tujuh puluh lima" ➔ `75rb` (jika konteks angka wajar)
* **Eksekusi:**
  * Kalimat hasil transkripsi diteruskan ke `parseInput()`.
  * Transaksi langsung dibuat dan disimpan ke `localStorage`, kolom input dikosongkan, tombol mic kembali ke kondisi normal.

### 3.3 Batch Multi-Input (Multi-Transaksi Satu Baris)
* **Pemicu Delimiter:** Koma (`,`), titik koma (`;`), atau baris baru (`\n`).
* **Contoh Input:** `kopi 25, bensin 35, parkir 5, makan siang 28`
* **Logika Pemrosesan:**
  * Fungsi `processBatchInput(rawString)`:
    * Memecah string berdasarkan pola `[,;\n]+`.
    * Mem-filter potongan string yang kosong.
    * Menjalankan `parseInput()` untuk setiap potongan.
    * Mengumpulkan item yang valid.
    * Menyimpan seluruh transaksi sekaligus di awal array `getTX()` (unshift order terjaga).
    * Jika ada item yang tidak memiliki nominal valid, item yang valid tetap tersimpan, dan bagian yang gagal diinformasikan di kotak pratinjau.
* **Pratinjau Multi-Item:**
  * Saat mengetik tanda koma, `#quickPreview` menampilkan: *"3 transaksi terdeteksi (Total: Rp 65.000)"*.

### 3.4 Chip Pintasan 1-Tap Instan
* **Perilaku Baru Tombol Chip (`#exampleChips button`):**
  * Membaca atribut `data-example`.
  * Jika kode memiliki nominal (contoh: `api 50`, `siang 50`, `kopi 20`):
    * Langsung mengeksekusi `parseInput()` dan menyimpan transaksi seketika.
    * Memberikan efek visual tap aktif sesaat pada chip.
  * Jika kode belum memiliki nominal (contoh: hanya `bensin` atau `makan`):
    * Memasukkan teks `bensin ` ke dalam input box dan otomatis memfokuskan kursor di belakangnya agar pengguna tinggal mengetik angka.

### 3.5 Smart Bank / E-Wallet Text Sanitizer
* **Helper:** `sanitizeBankNotificationText(rawText)`
* **Pola yang Dikenali:**
  * BCA: `m-Transfer: BERHASIL ... Rp 50.000 ke ...` atau `QRIS Rp 25.000 ke KOPI KENANGAN`
  * Mandiri Livin: `Transaksi QRIS Rp 45.000 di KOPI KENANGAN Berhasil`
  * GoPay: `Kamu berhasil bayar Rp15.000 ke Indomaret`
  * OVO / DANA / ShopeePay: `Transfer ke ... sebesar Rp ... berhasil`
* **Proses:**
  * Otomatis membuang nomor rekening, nomor referensi, tanggal, dan footer template bank.
  * Menghasilkan teks bersih yang langsung dapat dipahami oleh `parseInput()`.

### 3.6 Fitur Impor Cadangan Data JSON
* Pada `#settingsModal`:
  * Menambahkan tombol **"Impor JSON"** di samping tombol "Ekspor JSON".
  * File picker input hidden `.json`.
  * Saat file dipilih, membaca isi JSON, memvalidasi struktur data `{ transactions, shortcuts, categories }`, memuatnya ke `localStorage`, dan merefresh seluruh tampilan UI tanpa perlu refresh halaman browser.

---

## 4. Penanganan Error & Kasus Batas (Edge Cases)

1. **Browser Tidak Mendukung Web Speech API:**
   * Tombol mikrofon disembunyikan secara anggun atau menampilkan pesan saat diklik: *"Peramban ini tidak mendukung input suara."*
2. **Kamera / Mic Ditolak Pengguna:**
   * Kotak pratinjau menampilkan panduan singkat untuk mengaktifkan izin di setelan browser HP.
3. **Ketiadaan Koneksi Internet Saat Scan Foto:**
   * Kotak pratinjau menampilkan pesan jelas: *"Koneksi internet diperlukan khusus untuk analisis foto AI."*
4. **API Key Gemini Tidak Valid / Habis Kuota:**
   * Menampilkan pesan ramah yang mengarahkan pengguna memeriksa API Key di menu Pengaturan.
5. **Nilai Parsial pada Batch Input:**
   * Jika 2 dari 3 transaksi valid, 2 transaksi tetap disimpan agar pengguna tidak perlu mengulang input yang sudah benar.

---

## 5. Rencana Pengujian (Testing Strategy)

1. **Unit Test Logika Parser:**
   * Uji konversi angka lisan bahasa Indonesia (`convertSpokenIndonesianNumbers`).
   * Uji batch parser untuk memisahkan string berkoma/enter (`processBatchInput`).
   * Uji pembersihan teks mutasi bank (`sanitizeBankNotificationText`).
2. **Manual Test Integrasi UI:**
   * Pengujian tombol kamera & file picker (foto nota dan screenshot e-wallet).
   * Pengujian tombol mikrofon di Chrome Android / Safari iOS.
   * Pengujian klik chip 1-tap pada Beranda.
   * Pengujian ekspor dan impor kembali file backup JSON.
