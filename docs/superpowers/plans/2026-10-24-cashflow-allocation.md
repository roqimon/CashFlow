# Pendanaan Budget Pos dari Uang Bebas Implementation Plan

> **For agentic workers:** Execute task-by-task. Keep user data and export/import format intact.

**Goal:** Pemasukan pribadi masuk ke Uang Bebas; budget pos aktif memindahkan dananya dari Uang Bebas dengan transfer yang dapat ditelusuri.

**Architecture:** Gunakan ledger transfer pos untuk pendanaan saat budget dibuat/naik, pendanaan awal satu kali per siklus, pengembalian saat budget turun, dan pengembalian saat pos dinonaktifkan. Nilai budget menjadi target alokasi dan batas peringatan. Saldo pos dihitung dari transfer aktual, pengeluaran, tabungan dari pos, dan transfer keluar. Kekurangan belanja pos mengurangi Uang Bebas satu kali.

**Tech Stack:** HTML/CSS/JavaScript, localStorage, service worker.

**Spec:** `docs/superpowers/specs/2026-10-24-cashflow-ledger-design.md`

## Batasan

- Pemasukan pribadi, termasuk gaji dan “uang masuk”, menambah Uang Bebas penuh dalam siklus gajian. Pemasukan ST tetap terpisah.
- Pembuatan/kenaikan budget dan aktivasi pos mencatat pendanaan dari Uang Bebas tanpa membuat pengeluaran.
- Pos aktif lama didanai satu kali per siklus jika saldo Uang Bebas cukup; budget utuh tidak dialokasikan jika saldo kurang.
- Menonaktifkan pos mengembalikan sisa dana aktual ke Uang Bebas.
- Pos aktif tetap menjadi tujuan pencocokan pengeluaran; nonaktif tetap nonaktif.
- Pengeluaran tanpa dana pos mengurangi Uang Bebas; kekurangan pos yang sudah didanai juga mengurangi Uang Bebas tepat satu kali.
- Setoran tabungan dan transfer harus menjaga sumber dana serta tidak menghitung pengeluaran ganda.
- Jangan hapus/migrasikan destruktif data transaksi, ST, tabungan, transfer atau format ekspor/impor.
- Naikkan versi aplikasi ke 10.8 dan cache service worker ke v111.
- Jangan menambah atau menjalankan suite tes. Gunakan pemeriksaan statis/sintaks dan verifikasi deployment.

## Fokus tinjauan

- Pemasukan 5 juta tanpa alokasi/biaya tampil sebagai Uang Bebas 5 juta.
- Membuat/menaikkan budget mengurangi Uang Bebas dan menambah saldo pos dengan nominal sama.
- Belanja lebih kecil dari dana pos tidak mengurangi Uang Bebas lagi.
- Belanja melebihi dana pos mengurangi Uang Bebas sebesar kekurangan saja; menonaktifkan pos mengembalikan saldo positif.
- Pos aktif tanpa dana masih dapat menerima transaksi cocok, tetapi transaksi itu dibebankan ke Uang Bebas.
- Pengeluaran historis tanpa `pocketId` tidak dihitung di dua sumber.
- Dana dan belanja ST tetap di luar saldo pribadi.
- Pos nonaktif tidak otomatis aktif.
- Migrasi siklus berjalan tidak menciptakan alokasi ganda atau saldo fiktif.

## Task 1: Sumber saldo dan ledger alokasi

**Files:** `index.html`

- [x] Hitung saldo pos personal dari transfer masuk aktual; catat transfer saat budget dibuat/naik, saat dana dialihkan, dan saat pos dinonaktifkan.
- [x] Hitung Uang Bebas dari pemasukan personal dikurangi alokasi/transfer aktual, tabungan, pengeluaran langsung, dan kekurangan dana pos.
- [x] Pisahkan dana tersedia dari batas anggaran: `cashGap` mengatur potongan Uang Bebas; `budgetOverAmount` mengatur indikator jatah.
- [x] Pertahankan pengecualian sesi ST serta data transfer/sumber tabungan lama.
- [x] Alokasi antar sumber tidak menghasilkan transaksi expense duplikat.

## Task 2: Pendanaan budget dan siklus pos

**Files:** `index.html`

- [x] Budget baru/kenaikan memindahkan dana dari Uang Bebas; budget turun mengembalikan sisa aktual yang tersedia.
- [x] Pos lama didanai satu kali per siklus jika saldo cukup; penanda siklus mencegah alokasi ganda saat render/navigasi.
- [x] Pos nonaktif mengembalikan sisa melalui transfer `pocketId` → `bebas`; aktivasi kembali mengecek dan mencatat dana yang diperlukan.
- [x] Jangan menghapus pos yang sudah memiliki riwayat finansial.

## Task 3: Ringkasan, versi, verifikasi, deployment

**Files:** `index.html`, `sw.js`, dokumen spec/plan.

- [x] Beranda menampilkan Uang Bebas yang belum dialokasikan; ringkasan kelebihan tetap membedakan kekurangan dana dari pelampauan batas.
- [x] Perbarui release note ke v10.8 dan cache service worker v111.
- [x] Periksa diff, konsistensi panggilan saldo, dan sintaks JavaScript tanpa menjalankan tes.
- [x] Commit file terkait, push `main`, deploy ke VPS, dan verifikasi commit VPS, API akun, SMTP, route produksi, versi, serta cache yang aktif.
