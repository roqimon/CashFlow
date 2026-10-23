# Pintasan Multi-Tanggal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Catat satu transaksi per tanggal dari pintasan yang dipanggil lewat tulisan atau voice, setelah pengguna meninjau dan mengonfirmasi batch.

**Architecture:** Tambahkan parser tanggal lokal yang deterministik dan dapat diuji tanpa DOM, lalu hubungkan hasil rentang ke pembentukan transaksi berdasarkan setelan pintasan. Form pintasan menyimpan tujuan pos; alur input menahan batch dalam dialog konfirmasi dan baru menyimpan satu kali setelah tombol Oke atau voice Oke yang secara eksplisit diaktifkan pengguna.

**Tech Stack:** Vanilla JavaScript, HTML/CSS, localStorage, browser SpeechRecognition, Node.js `node:test`, Playwright/Python browser test yang sudah tersedia di repo.

**Spec:** `docs/superpowers/specs/2026-10-23-shortcut-multi-date-design.md`

## Global Constraints

- Satu batch eksplisit menghasilkan paling banyak 31 transaksi harian; rentang yang lebih panjang ditolak sebelum konfirmasi.
- Rentang tanggal bersifat inklusif; tanpa bulan/tahun memakai bulan/tahun saat ini; tanpa tahun memakai tahun saat ini.
- Bentuk `1 10 2025` hanya ditafsirkan sebagai tanggal 1 Oktober 2025 bila konteks menyebut tanggal tunggal secara jelas; input ambigu meminta koreksi dan tidak disimpan.
- Setelan pintasan untuk tujuan yang belum tersimpan tetap berperilaku `otomatis` agar data lama kompatibel.
- Batch batal/ditutup tidak menulis transaksi; satu konfirmasi menyimpan tepat satu kali.
- Voice “Oke” hanya didengar sesudah pengguna menekan kontrol voice pada dialog konfirmasi; tidak ada mikrofon latar.
- Tidak menambah layanan AI atau dependensi runtime.
- Jangan mengubah perubahan lokal yang sudah ada di checkout atau memasukkannya ke commit fitur.

## Review Focus

- `1 10 2025` berdekatan dengan format rentang/nominal: uji tanggal tunggal eksplisit dan penolakan input ambigu di Task 1.
- Voice mengubah ucapan bulan/tahun menjadi transkripsi angka atau kata: jalankan fixture transkrip pada parser yang sama di Task 1 dan 4; pisahkan hasil parser dari uji microphone nyata.
- Prefix pintasan `UPD` bertabrakan dengan `UPD Full`: uji pemilihan pintasan terpanjang di Task 2.
- Pos ST dihapus atau tidak punya sesi aktif: uji tujuan yang hilang dan fallback sesi yang ditentukan di Task 2 dan 3.
- Dialog dibuka/ditutup atau konfirmasi dikirim dua kali: uji no-write saat batal dan idempotensi penyimpanan di Task 3 dan 4.

## File Map

- Create `shortcut-date.js`: parser tanggal/rentang, validasi kalender, enumerasi tanggal inklusif, dan format tanggal lokal; tidak mengakses DOM atau localStorage.
- Modify `index.html`: model/form pintasan dan tujuan pos, pengaitan parser dan pembentukan batch, dialog ringkasan serta konfirmasi voice.
- Modify `sw.js`: tambahkan helper parser ke app shell dan naikkan cache version.
- Create `test/shortcut_multi_date_test.js`: unit/integrasi parsing dan pembentukan batch dengan fixture Node VM sesuai pola tes repo.
- Create `test/shortcut_multi_date_browser_test.py`: alur dialog dan penyimpanan di browser, memakai localStorage fixture tanpa menyentuh akun/data produksi.

## Task 1: Parser tanggal deterministik

**Files:**
- Create `shortcut-date.js`
- Create `test/shortcut_multi_date_test.js`
- Modify `sw.js`

**Interfaces:**
- Produces `window.ShortcutDate.parse(text, now) -> {kind, start, end, dates, cleanText, error}`; `kind` bernilai `single`, `range`, `none`, atau `ambiguous`, `start/end` berupa `YYYY-MM-DD` lokal, dan `dates` berupa daftar tanggal inklusif.
- Produces `window.ShortcutDate.formatDate(isoLocalDate) -> string` untuk label dialog berbahasa Indonesia.

- [ ] **Step 1: Tulis tes gagal untuk parser tanggal**

Fixture `now = new Date(2026, 9, 23, 12)` harus mencakup:
- `1-5` dan `1 sampai 5` → 1–5 Oktober 2026.
- `1-5 Oktober`, `1 sampai 5 Oktober 2026`, `1-5 Okt 2025` → rentang inklusif yang tepat.
- tanggal tunggal `1 Okt`, `1/10/2025`, `tanggal 1 10 2025` → satu tanggal bila konteksnya jelas.
- transkrip kata `satu sampai lima Oktober` dan `tanggal satu sampai lima Oktober dua ribu dua puluh enam` setelah normalisasi angka voice yang telah ada.
- tanggal mustahil, tahun kabisat, rentang terbalik, lintas bulan/tahun, input ambigu `1 10 2025` tanpa konteks tanggal, serta rentang 32 hari.
- angka nominal pada sisa kalimat tidak ikut ditafsirkan sebagai tanggal dan `cleanText` menghapus hanya fragmen tanggal.

- [ ] **Step 2: Jalankan tes dan pastikan gagal karena parser belum tersedia**

Run: `node --test test/shortcut_multi_date_test.js`
Expected: FAIL pada impor/akses `ShortcutDate` yang belum ada.

- [ ] **Step 3: Implementasikan kontrak `ShortcutDate` dalam `shortcut-date.js`**

Parser memprioritaskan frasa rentang dan konteks tanggal tunggal; memvalidasi round-trip komponen kalender agar tanggal overflow ditolak; mengembalikan `ambiguous` saat pola tidak pasti; tidak menebak rentang dari tiga angka polos. Terapkan batas 31 hari.

- [ ] **Step 4: Tambahkan parser ke app shell dan jalankan tes**

Tambahkan `./shortcut-date.js` ke app shell dan naikkan `CACHE_NAME` di `sw.js`. Run: `node --test test/shortcut_multi_date_test.js`.
Expected: seluruh kasus tanggal lulus.

## Task 2: Setelan pintasan dan penerapan tujuan

**Files:**
- Modify `index.html`
- Modify `test/shortcut_multi_date_test.js`

**Interfaces:**
- Mengonsumsi `ShortcutDate.parse` dari Task 1.
- Model pintasan menyimpan `targetPocketId` (`"auto"`, `null` untuk dana pribadi/tanpa pos, atau ID pos); nilai yang hilang pada pintasan lama dinormalisasi menjadi `"auto"`.
- Fungsi form `fillSC`/`saveShortcut` membaca dan menyimpan tujuan itu. Builder batch menerima pintasan, rentang tanggal, dan override nominal opsional, lalu mengembalikan item transaksi tanpa menulis storage.

- [ ] **Step 1: Tambahkan tes gagal untuk persistensi tujuan serta builder transaksi**

Pastikan edit/reload pintasan mempertahankan tujuan; legacy shortcut menjadi `auto`; `UPD Full` menang dari prefix `UPD`; nominal pintasan Rp79.500 menghasilkan lima item Rp79.500 (total Rp397.500), sementara Rp132.500 menghasilkan lima item (total Rp662.500); setiap item mempertahankan kategori, tipe, ikon, shortcutCode, sumber/pos, sesi ST, reimburse, tanggal lokal, dan catatan.

- [ ] **Step 2: Jalankan tes dan pastikan gagal**

Run: `node --test test/shortcut_multi_date_test.js`.
Expected: gagal pada bidang tujuan/builder yang belum tersedia.

- [ ] **Step 3: Simpan tujuan di model serta form pintasan**

Tambahkan kontrol tujuan pos ke `shortcutForm`; isi pilihan pos yang ada, termasuk pos ST. Simpan ID stabil, validasi tujuan terhapus, dan pertahankan perilaku otomatis untuk data lama.

- [ ] **Step 4: Implementasikan builder batch murni**

Gunakan kecocokan pintasan terpanjang. Terapkan override nominal hanya bila ada angka nominal eksplisit yang tidak merupakan fragmen tanggal. Tetapkan tujuan `ST` ke `source: "st"`, pos ST yang valid, sesi aktif bila ada, dan reimburse pending untuk expense; tujuan pos terhapus menghasilkan error, tidak fallback diam-diam. Set waktu tanggal lokal pada tengah hari sebelum serialisasi.

- [ ] **Step 5: Jalankan tes builder dan tes regresi pintasan/pos**

Run: `node --test test/shortcut_multi_date_test.js test/st_trigger_test.js test/st_pocket_and_payday_test.js test/smart_pos_and_destination_test.js`.
Expected: tes baru lulus dan alur ST/pintasan lama tetap lulus.

## Task 3: Dialog ringkasan dan konfirmasi tersimpan satu kali

**Files:**
- Modify `index.html`
- Modify `test/shortcut_multi_date_test.js`

**Interfaces:**
- `addFrom()` mengirim input rentang ke dialog, bukan menyimpan langsung.
- Dialog memegang batch pending dan tombol Oke/Batal; hanya handler konfirmasi yang memanggil `saveTX`.
- Konfirmasi voice memiliki kontrol mikrofon eksplisit yang memulai pengenal `id-ID` sementara dan hanya menerima hasil “oke/ok”; hentikan recognizer pada hasil, error, tutup dialog, atau batas waktu.

- [ ] **Step 1: Tambahkan tes gagal untuk batas simpan/dialog**

Pastikan pemrosesan batch menghasilkan 5 preview dan total yang tepat tanpa perubahan storage; Batal/tutup tidak mengubah storage; Oke menyimpan lima item tepat sekali; dua pemanggilan confirm tidak menggandakan batch; input gagal/ambiguous/tujuan invalid tidak membuka konfirmasi.

- [ ] **Step 2: Jalankan tes dan pastikan gagal**

Run: `node --test test/shortcut_multi_date_test.js`.
Expected: gagal pada flow konfirmasi yang belum ada.

- [ ] **Step 3: Bangun dialog batch dan handler simpan atomik**

Tampilkan kode/nama pintasan, kategori, tujuan, rentang lengkap, jumlah item, nominal per transaksi, total, serta tombol `Oke` dan `Batal`. Pertahankan batch dalam memori sampai Oke; kosongkan input dan render sekali setelah simpan; gunakan flag pending/consumed untuk mencegah submit ulang.

- [ ] **Step 4: Hubungkan voice Oke dengan kontrol eksplisit**

Tambahkan tombol “Ucapkan Oke” pada dialog. Mulai SpeechRecognition hanya dari klik tombol, uji transcript yang dinormalisasi sama persis dengan token `oke` atau `ok`, stop setelah keputusan, dan tetap sediakan tombol simpan jika API tidak ada atau gagal.

- [ ] **Step 5: Jalankan tes unit dan voice-mock**

Run: `node --test test/shortcut_multi_date_test.js test/voice_ai_and_theme_test.js`.
Expected: tes dialog dan voice lama lulus; voice-mock tidak boleh mengonfirmasi untuk ucapan lain.

## Task 4: Browser flow dan regresi akhir

**Files:**
- Create `test/shortcut_multi_date_browser_test.py`
- Modify `test/shortcut_multi_date_test.js` jika browser findings menuntut koreksi

**Interfaces:**
- Browser test menginisialisasi profil/storage tes terisolasi dan menutup browser/server setelah assertions.

- [ ] **Step 1: Tulis browser test gagal untuk form, preview, dan konfirmasi**

Dengan dua pintasan fixture `UPD` Rp79.500 dan `UPD Full` Rp132.500 pada pos ST fixture, uji pengeditan/reload setelan, input `1-5`, `1 sampai 5`, `1 Okt`, `1 10 2025`, `1-5 Oktober`, dan `1-5 Oktober 2026`; cek tampilan dialog, jumlah/total, properti tiap transaksi setelah Oke, serta batal/no-write.

- [ ] **Step 2: Jalankan browser test dan pastikan gagal sebelum integrasi**

Run: `python test/shortcut_multi_date_browser_test.py`.
Expected: kegagalan pada kontrol/parser/konfirmasi yang belum tersedia, bukan kegagalan setup browser.

- [ ] **Step 3: Perbaiki integrasi yang ditemukan**

Batasi perubahan pada form pintasan, normalisasi input suara, parser tanggal, dialog, dan service-worker shell.

- [ ] **Step 4: Jalankan seluruh tes target dan audit diff**

Run: `node --test test/shortcut_multi_date_test.js test/shortcut_settings_regression_test.js test/st_trigger_test.js test/st_pocket_and_payday_test.js test/smart_pos_and_destination_test.js test/boot_bindings_test.js` dan `python test/shortcut_multi_date_browser_test.py`.
Expected: semua target lulus; tinjau `git diff --check` dan pastikan perubahan awal pengguna tetap tidak tersentuh.

- [ ] **Step 5: Manual voice smoke test pada browser/perangkat yang mendukung SpeechRecognition**

Ucapkan setidaknya: “UPD Full dari tanggal satu sampai lima Oktober dua ribu dua puluh enam”, lalu “Oke” setelah mengaktifkan kontrol voice pada pop-up. Catat transcript recognizer aktual, tanggal hasil parse, dan hasil penyimpanan sebagai bukti terpisah. Jika lingkungan tidak menyediakan recognizer/mikrofon, laporkan blocker dan jangan menyatakan voice nyata terverifikasi.

## Handoff

Rencana ini belum mengubah kode. Eksekusi native direkomendasikan karena semua tahap berurutan di satu alur dan perubahan lokal yang ada perlu dilindungi dari pembagian checkout. Sebelum implementasi, minta pengguna meninjau rencana dan memilih eksekusi native.
