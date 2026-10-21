# Desain Spesifikasi: ArusKas Family Budgeting & WhatsApp Recap Share

**Tanggal:** 21 Oktober 2026  
**Status:** Disetujui  
**Target:** ArusKas PWA v15

---

## 1. Latar Belakang & Tujuan
ArusKas awalnya memiliki fitur khusus "ST" (Surat Tugas / Perjalanan Dinas) dengan alur deposit kantor, status reimburse (pending/reimbursed), dan kalkulasi settlement akomodasi. Fitur ini terlalu sempit dan membuat aplikasi beraroma korporat/lapangan yang membingungkan bagi pengguna umum di Indonesia.

Berdasarkan benchmark pasar Indonesia (**KasRumah - duitplan.id** dan **CatatBareng - amia.my.id**), kebutuhan terbesar masyarakat adalah:
1. **Pemisahan Jatah / Kantong Anggaran (Envelope Budgeting):** Mengatur jatah belanja dapur, kebutuhan sekolah anak, tagihan rumah, dan jajan.
2. **Visibilitas Sisa Uang & Batas Pengeluaran:** Mengetahui sisa jatah per pos tanpa harus hitung manual atau buka Excel.
3. **Kemudahan Berbagi Rekap ke Pasangan / Keluarga:** Mengirim rekap belanja bulanan ke WhatsApp dengan 1-klik untuk mencegah kecurigaan boros antar pasangan.
4. **Nol Friksi Input:** Mempertahankan keunggulan input teks 1 baris, suara, dan scan struk AI yang otomatis memotong anggaran tanpa mewajibkan pengguna memilih kantong secara manual setiap saat.

---

## 2. Arsitektur Data

### 2.1 Model Kantong Anggaran (`BudgetPocket`)
Disimpan di `localStorage` dengan kunci `aruskas_budget_pockets_v1`.

```javascript
{
  id: string,               // ID unik (contoh: "pocket-dapur", "pocket-anak")
  name: string,             // Nama kantong: "Dapur & Belanja"
  icon: string,             // Emoji/ikon representasi: "🛒"
  amount: number,           // Plafon/jatah anggaran bulanan (contoh: 2500000)
  color: string,            // Aksen warna bar progres: "green" | "blue" | "orange" | "purple"
  categories: string[],     // Daftar kategori yang otomatis memotong kantong ini
  createdAt: string,
  updatedAt: string
}
```

### 2.2 Kantong Bawaan (Default Pockets)
Untuk pengguna baru atau yang belum mengatur anggaran:
1. 🛒 **Dapur & Belanja** (`amount: 2.500.000`, categories: `['Makan', 'Belanja', 'Dapur', 'Bahan']`)
2. 🎓 **Kebutuhan Anak & Sekolah** (`amount: 1.500.000`, categories: `['Pendidikan', 'Sekolah', 'Anak', 'Kursus']`)
3. 💡 **Tagihan & Rumah** (`amount: 1.000.000`, categories: `['Tagihan', 'Listrik', 'Air', 'Internet', 'Rumah', 'Pulsa']`)
4. ☕ **Jajan & Santai** (`amount: 800.000`, categories: `['Jajan', 'Kopi', 'Hiburan', 'Nongkrong']`)
5. 🐷 **Tabungan & Darurat** (`amount: 1.000.000`, categories: `['Tabungan', 'Investasi', 'Darurat']`)

### 2.3 Pembersihan & Migrasi dari Legacy "ST"
- Kunci `aruskas_st_sessions_v1` dan `aruskas_st_mode` dimigrasikan secara aman (tidak merusak riwayat transaksi).
- Transaksi lama dengan `source: 'st'` tetap aman di riwayat sebagai pengeluaran/pemasukan biasa.
- Properti transaksi `reimburseStatus` dan `stSessionId` tidak lagi dimunculkan di UI publik.

---

## 3. Komponen Antarmuka Pengguna (UI/UX)

### 3.1 Beranda (`home`)
1. **Kartu Jatah Anggaran Bulan Ini:**
   - Menampilkan total jatah keluarga, total terpakai, dan sisa uang bersih.
   - Daftar progres bar per kantong:
     - Hijau: Pengeluaran < 75%
     - Kuning / Oranye: Pengeluaran 75% - 99%
     - Merah: Overbudget >= 100% (dengan teks peringatan ramah: "Lebih Rp XXX")
2. **Input Cepat Bersih:**
   - Menghapus tombol `[ 📋 ST ]`. Input bar menjadi lebih luas dan bersih.
   - Pencatatan transaksi biasa (`beras 120rb`, `susu anak 85rb`) langsung terpotong ke kantong terkait secara otomatis melalui pemetaan kategori cerdas.

### 3.2 Laporan (`report`)
1. **Tombol "📲 Kirim Rekap ke WhatsApp":**
   - Menghasilkan ringkasan terformat rapi sesuai bulan aktif.
   - Membuka URL `https://api.whatsapp.com/send?text=...` atau Web Share API.
   - Format teks:
     ```text
     📊 Rekap Belanja Keluarga — [Nama Bulan]
     ----------------------------------
     🛒 Dapur & Belanja : Rp 1.850.000 / Rp 2.500.000 (Sisa Rp 650.000)
     🎓 Kebutuhan Anak  : Rp 1.100.000 / Rp 1.500.000 (Sisa Rp 400.000)
     💡 Tagihan & Rumah : Rp 920.000 / Rp 1.000.000 (Sisa Rp 80.000)
     ☕ Jajan & Santai  : Rp 820.000 / Rp 800.000 (⚠️ Lebih Rp 20.000)
     ----------------------------------
     Total Pengeluaran : Rp 4.690.000
     Sisa Jatah Bulan Ini: Rp 1.110.000

     Dicatat rapi via ArusKas
     ```

### 3.3 Menu Kelola Anggaran & Pintasan (`shortcut`)
- Bagian atas menggantikan "📋 Sesi ST" menjadi **"Kelola Kantong Anggaran"**:
  - Tombol **"＋ Kantong Baru"**: Buka sheet modal input nama, ikon, plafon bulanan, dan kategori terkait.
  - Kartu tiap kantong memiliki tombol edit nilai jatah dan hapus.
- Menghapus modal dinas kantor lama (`settleModal`, `editDepositModal`).

---

## 4. Rencana Pengujian
1. **Unit Test Kantong Anggaran:** Memverifikasi kalkulasi keterpakaian anggaran, perhitungan sisa, deteksi *overbudget*, dan pemetaan kategori.
2. **Unit Test WhatsApp Share Generator:** Memverifikasi generator teks pesan WhatsApp menghasilkan format yang rapi dan ter-encode URL dengan benar.
3. **Integrasi UI & Tag Balance:** Memastikan tidak ada tag HTML yang rusak dan layout tetap responsif di mobile.
4. **Verifikasi PWA & Cache:** Menaikkan Service Worker ke v15 agar pembaruan langsung aktif.
