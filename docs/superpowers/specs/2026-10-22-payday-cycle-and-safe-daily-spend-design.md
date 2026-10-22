# Desain Spesifikasi: Siklus Gajian (Payday Cycle) & Jatah Aman Belanja Harian (Safe-to-Spend)

**Tanggal:** 22 Oktober 2026  
**Status:** Draf Perancangan (Menunggu Review)  
**Target:** CashFlow PWA (ArusKas)  
**Persona Utama:** Pengguna yang malas mencatat (Butuh *zero-friction input* & *instant clarity*)

---

## 1. Latar Belakang & Masalah

1. **Ilusi Saldo Akuntansi (*Accounting Net Balance Trap*):**
   - Saat ini kartu utama di Beranda menampilkan `Saldo = Pemasukan - Pengeluaran`.
   - Angka ini membingungkan bagi orang yang malas mencatat: Jika gaji Rp 5.000.000 baru keluar Rp 1.000.000, saldo tertulis "Rp 4.000.000". Pengguna merasa kaya, padahal Rp 3.500.000 dari uang itu sudah menjadi hak bayar tagihan, KPR/kontrakan, dan belanja dapur.
2. **Kekakuan Kalender Masehi (1 s/d 30/31):**
   - Lebih dari 75–80% pekerja di Indonesia menerima gaji pada tanggal **25** atau **27**.
   - Pada tanggal 1 Masehi, sistem saat ini mereset seluruh perhitungan dan progres bar pos anggaran menjadi 0% (segar kembali), padahal gaji pengguna baru berjalan 6 hari. Ini merusak akurasi penganggaran di pertengahan bulan.
3. **Uang Bebas Tanpa Kontrol (*Unbudgeted Black Hole*):**
   - Opsi `⚪ Bebas` saat ini hanya berfungsi pasif (`if (t.pocketId === 'bebas') return false;`). Transaksi bebas tidak memiliki kuota dan tidak pernah diperingatkan jika sudah melebihi batas kemampuan finansial.

---

## 2. Tujuan Solusi

1. **1 Angka Utama di Beranda:** Mengganti angka saldo akuntansi dengan **Jatah Aman Dibelanjakan Hari Ini** (*Safe Daily Spend*).
2. **Siklus Gajian Fleksibel (Payday Cycle):** Pengguna mengatur tanggal gajian sekali di Pengaturan (bawaan: tanggal 25, atau 1 bagi ASN/PNS), dan sistem otomatis menghitung rentang siklus berjalan.
3. **Penyederhanaan Pos Komitmen Bawaan:** Memfokuskan pos anggaran hanya pada kebutuhan wajib (Komitmen Wajib), sehingga transaksi di luar pos otomatis memotong kuota Uang Bebas secara elegan.
4. **Zero Extra Taps:** Alur input 1 baris (`kopi 25`, suara, scan struk) tetap 100% instan tanpa menambah dropdown pemilihan akun/dompet.

---

## 3. Logika & Formula Perhitungan

### 3.1 Penentuan Rentang Siklus Gajian (`getPaydayCycle`)
Diberikan tanggal acuan `targetDate` (default: hari ini) dan tanggal gajian `payday` (integer 1..31, default: 25):

- Jika `payday === 1`: Siklus adalah awal bulan masehi (tgl 1 jam 00:00:00) hingga akhir bulan masehi (jam 23:59:59.999).
- Jika `payday > 1`:
  - Hitung tanggal gajian bulan ini: $P_{\text{current}} = \min(payday, \text{daysInMonth}(\text{year}, \text{month}))$.
  - Jika $\text{targetDate.getDate()} \ge P_{\text{current}}$:
    - **Awal Siklus:** Tahun ini, bulan ini, tanggal $P_{\text{current}}$, 00:00:00.
    - **Akhir Siklus:** Bulan berikutnya, tanggal $\min(payday, \text{daysInMonth}(\text{nextYear}, \text{nextMonth})) - 1$ hari, 23:59:59.999.
  - Jika $\text{targetDate.getDate()} < P_{\text{current}}$:
    - **Awal Siklus:** Bulan lalu, tanggal $\min(payday, \text{daysInMonth}(\text{prevYear}, \text{prevMonth}))$, 00:00:00.
    - **Akhir Siklus:** Bulan ini, tanggal $P_{\text{current}} - 1$ hari, 23:59:59.999.

### 3.2 Formula "Uang Bebas" Siklus Ini (`cycleFreeMoney`)
$$\text{Pemasukan Siklus} = \sum \text{Transaksi Masuk (tipe income) dalam rentang siklus}$$
$$\text{Komitmen Pos Wajib} = \sum \text{Plafon Pos Anggaran Aktif } (pocket.amount)$$
$$\text{Alokasi Tabungan} = \sum \text{Setoran Tabungan dalam rentang siklus}$$
$$\text{Plafon Uang Bebas Awal} = \max(0, \text{Pemasukan Siklus} - \text{Komitmen Pos Wajib} - \text{Alokasi Tabungan})$$

Jika $\text{Pemasukan Siklus} == 0$, sistem menggunakan *fallback* estimasi (misal: total pengeluaran bebas yang tercatat, dengan pesan informatif: *"Catat gaji/pemasukan untuk mengaktifkan jatah harian"*).

### 3.3 Formula "Jatah Aman Hari Ini" (`safeDailySpend`)
$$\text{Pengeluaran Bebas Terpakai} = \sum \text{Pengeluaran yang bertanda 'bebas' atau tidak masuk ke pos komitmen mana pun}$$
$$\text{Sisa Uang Bebas} = \text{Plafon Uang Bebas Awal} - \text{Pengeluaran Bebas Terpakai}$$
$$\text{Sisa Hari} = \max(1, \text{ceil}((\text{Akhir Siklus} - \text{Hari Ini}) / 86400000))$$
$$\text{Jatah Aman Dasar Hari Ini} = \max(0, \lfloor \text{Sisa Uang Bebas} / \text{Sisa Hari} \rfloor)$$
$$\text{Pengeluaran Bebas Hari Ini} = \sum \text{Pengeluaran bebas yang dicatat pada hari ini}$$
$$\text{Sisa Jatah Hari Ini} = \text{Jatah Aman Dasar Hari Ini} - \text{Pengeluaran Bebas Hari Ini}$$

---

## 4. Perubahan Komponen Antarmuka Pengguna (UI/UX)

### 4.1 Kartu Utama Beranda (`#home .hero-card`)
Mengganti blok saldo akuntansi lama dengan kartu Jatah Belanja Harian:
- **Judul Atas:** `Siklus: DD Mmm – DD Mmm · X hari lagi gajian`
- **Nominal Utama (Besar):** `Rp 45.000`
- **Label Status:**
  - Jika $\text{Sisa Jatah Hari Ini} \ge 0$: `Aman dibelanjakan hari ini` (warna teks hijau ramah).
  - Jika $\text{Sisa Jatah Hari Ini} < 0$: `Lebih Rp XX.000 dari jatah hari ini (Jatah besok otomatis menyesuaikan)` (warna oranye lembut).
- **Sub-info (Kecil):** `Sisa uang bebas siklus ini: Rp 810.000 · Komitmen pos aman`
- **Aksi Cepat:** Ketuk kartu untuk melihat rincian kalkulasi (Pemasukan, Total Pos, Sisa Uang Bebas).

### 4.2 Pos Anggaran Default yang Dirampingkan
Bawaan baru untuk pengguna baru:
1. 🛒 **Dapur & Makan** (`pocket-dapur`, Rp 2.500.000)
2. 💡 **Tagihan, Cicilan & Rumah** (`pocket-tagihan`, Rp 1.800.000)
3. 🎓 **Keluarga & Anak** (`pocket-keluarga`, Rp 1.200.000)
*(Pengguna lama yang sudah punya pos kustom tetap dipertahankan 100% tanpa di-reset).*

### 4.3 Pengaturan Tanggal Gajian (`Settings`)
- Terletak di menu Pengaturan pada kartu "Pos Anggaran & Siklus".
- Pilihan: Dropdown sederhana tanggal `1` s/d `28` (dengan opsi cepat: `25 (Umum Swasta)`, `1 (PNS/ASN)`, `27`).
- Keterangan ringkas: *"Perhitungan pos anggaran dan jatah belanja harian dihitung mulai tanggal ini."*

---

## 5. Rencana Pengujian (Test Plan)

1. **Unit Test Logika Siklus Gajian (`payday_cycle_test.js`):**
   - Uji tanggal 25 di bulan 31 hari, 30 hari, dan Februari (28/29 hari).
   - Uji batas pergantian hari (misal 24 jam 23:59 vs 25 jam 00:00).
   - Uji kasus `payday = 1` (harus identik dengan awal bulan masehi).
2. **Unit Test Kalkulasi Jatah Aman Harian:**
   - Uji siklus dengan gaji Rp 5jt, pos Rp 3,5jt, sisa uang bebas Rp 1,5jt dibagi 25 hari = Rp 60rb/hari.
   - Uji pengurangan saat transaksi `bebas` dicatat pada hari yang sama.
   - Uji kasus overspend hari ini dan penyesuaian otomatis di hari berikutnya.
   - Uji kasus jika pemasukan belum dicatat (siklus baru dimulai).
3. **Uji Kompatibilitas Data Lama:**
   - Memastikan transaksi dan pos anggaran lama pengguna tetap terbaca normal.
   - Memastikan PWA service worker diperbarui dengan versi cache baru.
