# Alokasi Pos dan Saldo Uang Bebas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Samakan saldo pribadi, alokasi pos/tabungan, alur ST, dan peringatan overbudget dengan aturan yang disetujui.

**Architecture:** Pertahankan model siklus gajian yang ada, tetapi gunakan satu sumber perhitungan untuk Uang Bebas dan saldo pos. Catat sumber tabungan, keluarkan dana ST dari saldo pribadi, dan tampilkan pelampauan tanpa menghitung defisit pos dua kali.

**Tech Stack:** HTML/CSS/JavaScript, localStorage, service worker.

**Spec:** `docs/superpowers/specs/2026-10-24-cashflow-ledger-design.md`

## Global Constraints

- Pemasukan pribadi masuk Uang Bebas; ST terpisah.
- Jatah pos aktif dan tabungan adalah alokasi bersumber Uang Bebas dalam siklus gajian.
- Pelampauan pos memotong Uang Bebas hanya sebesar selisih satu kali.
- Pos nonaktif tidak boleh aktif kembali sendiri.
- Beranda tetap ringkas dan clean; naikkan versi aplikasi ke 9.8.
- Jangan menghapus data pengguna atau mengubah format ekspor/impor.

## Review Focus

- Pengeluaran kategori lama tanpa `pocketId` tidak boleh dipotong dari Uang Bebas sekaligus dari pos.
- Transfer dan setoran tabungan harus memakai siklus gajian serta sumber yang konsisten.
- Pos ST yang namanya memuat bulan/tahun tidak boleh mengurangi saldo pribadi.
- Pengeluaran pos di atas jatah harus mengurangi Uang Bebas sebesar kelebihan saja.
- Nonaktif pos tidak boleh memengaruhi status aktif tersimpan setelah render/navigasi.

### Task 1: Satukan sumber dan perhitungan saldo

**Files:** `index.html`

- [ ] Ubah helper transfer dan alokasi tabungan agar menghitung dalam siklus gajian, bukan campuran bulan kalender.
- [ ] Pisahkan alokasi pribadi dari ST, tentukan tujuan transaksi personal baru secara eksplisit, dan pertahankan pencocokan historis.
- [ ] Pastikan Uang Bebas dihitung dari pemasukan pribadi, alokasi pos/tabungan, pengeluaran umum, transfer bersih, dan kelebihan belanja pos.
- [ ] Pastikan saldo pos menghitung belanja dan tabungan keluar satu kali; setoran pos tidak membuat pengeluaran transaksi ganda.
- [ ] Cek diff dan struktur JavaScript tanpa menambah/menjalankan tes otomatis.

### Task 2: Ringkasan overbudget dan versi

**Files:** `index.html`, `warm-ui.css`, `sw.js`

- [ ] Tambahkan ringkasan jumlah pos yang melewati jatah dan total selisihnya pada status beranda, dengan warna merah lembut yang tetap sesuai desain.
- [ ] Pastikan kartu pos menampilkan nilai “Melewati jatah” ringkas tanpa menghitung nilai minus lagi ke total uang.
- [ ] Naikkan APP_VERSION ke 9.8, catatan rilis, dan cache service worker.
- [ ] Periksa ulang diff dan sintaks; jangan jalankan suite tes.

### Task 3: Commit, deploy, dan cek live

**Files:** commit perubahan aplikasi saja.

- [ ] Commit hanya file implementasi dan dokumen rancangan/rencana.
- [ ] Push branch `main`, tarik commit di VPS memakai prosedur proyek.
- [ ] Periksa commit VPS, respons domain produksi, versi 9.8, dan cache service worker.
