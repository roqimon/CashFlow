# Alokasi Manual Uang Bebas Implementation Plan

> **For agentic workers:** Execute task-by-task. Keep user data and export/import format intact.

**Goal:** Pemasukan pribadi masuk utuh ke Uang Bebas dan dana hanya masuk ke pos saat pengguna mengalokasikannya.

**Architecture:** Gunakan catatan transfer pos yang sudah ada sebagai ledger alokasi dari/ke Uang Bebas. Nilai anggaran bulanan tetap menjadi batas peringatan dan aturan pencocokan, bukan saldo dana. Saldo pos dihitung dari alokasi aktual, pengeluaran, tabungan dari pos, serta transfer keluar. Kekurangan belanja pos mengurangi Uang Bebas satu kali.

**Tech Stack:** HTML/CSS/JavaScript, localStorage, service worker.

**Spec:** `docs/superpowers/specs/2026-10-24-cashflow-ledger-design.md`

## Batasan

- Pemasukan pribadi, termasuk gaji dan “uang masuk”, menambah Uang Bebas penuh dalam siklus gajian. Pemasukan ST tetap terpisah.
- Aktivasi atau pembuatan pos tidak mendanai pos otomatis.
- Alokasi aktual memindahkan saldo Uang Bebas ke pos tanpa membuat pengeluaran.
- Pos aktif tetap menjadi tujuan pencocokan pengeluaran; nonaktif tetap nonaktif.
- Pengeluaran tanpa dana pos mengurangi Uang Bebas; kekurangan pos yang sudah didanai juga mengurangi Uang Bebas tepat satu kali.
- Setoran tabungan dan transfer harus menjaga sumber dana serta tidak menghitung pengeluaran ganda.
- Jangan hapus/migrasikan destruktif data transaksi, ST, tabungan, transfer atau format ekspor/impor.
- Naikkan versi aplikasi ke 9.9 dan cache service worker ke v103.
- Jangan menambah atau menjalankan suite tes. Gunakan pemeriksaan statis/sintaks dan verifikasi deployment.

## Fokus tinjauan

- Pemasukan 5 juta tanpa alokasi/biaya tampil sebagai Uang Bebas 5 juta.
- Transfer alokasi mengurangi Uang Bebas dan menambah saldo pos dengan nominal sama.
- Belanja lebih kecil dari dana pos tidak mengurangi Uang Bebas lagi.
- Belanja melebihi dana pos mengurangi Uang Bebas sebesar kekurangan saja; peringatan batas anggaran tetap berdasarkan nominal jatah.
- Pos aktif tanpa dana masih dapat menerima transaksi cocok, tetapi transaksi itu dibebankan ke Uang Bebas.
- Pengeluaran historis tanpa `pocketId` tidak dihitung di dua sumber.
- Dana dan belanja ST tetap di luar saldo pribadi.
- Pos nonaktif tidak otomatis aktif.
- Migrasi siklus berjalan tidak menciptakan alokasi ganda atau saldo fiktif.

## Task 1: Sumber saldo dan ledger alokasi

**Files:** `index.html`

- [ ] Hitung saldo pos personal dari transfer masuk aktual, bukan `pocket.amount`.
- [ ] Hitung Uang Bebas dari pemasukan personal dikurangi alokasi/transfer aktual, tabungan, pengeluaran langsung, dan kekurangan dana pos.
- [ ] Pisahkan dana tersedia dari batas anggaran: `cashGap` mengatur potongan Uang Bebas; `budgetOverAmount` mengatur indikator jatah.
- [ ] Pertahankan pengecualian sesi ST serta data transfer/sumber tabungan lama.
- [ ] Alokasi antar sumber tidak menghasilkan transaksi expense duplikat.

## Task 2: Aksi alokasi ke pos

**Files:** `index.html`

- [ ] Tambahkan alur dari kartu/detail Uang Bebas untuk memilih pos aktif, nominal, dan tanggal/catatan bila pola modal yang ada mendukung.
- [ ] Validasi nominal terhadap saldo Uang Bebas pada siklus tanggal gajian yang dipilih.
- [ ] Simpan alokasi sebagai transfer `bebas` → `pocketId`; tampilkan hasil bersih setelah simpan.
- [ ] Jangan mengubah form pindah sisa pos/tabungan selain yang diperlukan untuk memakai saldo baru.

## Task 3: Ringkasan, versi, verifikasi, deployment

**Files:** `index.html`, `sw.js`, dokumen spec/plan.

- [ ] Beranda menampilkan Uang Bebas yang belum dialokasikan; ringkasan kelebihan tetap membedakan kekurangan dana dari pelampauan batas.
- [ ] Perbarui release note ke v9.9 dan cache service worker v103.
- [ ] Periksa diff, konsistensi panggilan saldo, dan sintaks JavaScript tanpa menjalankan tes.
- [ ] Commit hanya file terkait, push `main`, jalankan prosedur VPS proyek, verifikasi commit VPS dan route produksi `https://kas.bisabaca.web.id/` serta versi/cache yang aktif.
