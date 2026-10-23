# Desain Pintasan Pengeluaran Multi-Tanggal

## Tujuan

Memungkinkan pengguna mencatat satu transaksi per hari dalam rentang tanggal dengan menyebut pintasan melalui tulisan atau voice, meninjau ringkasan, lalu mengonfirmasi dengan tombol atau ucapan “Oke”. Setelan pintasan—nama, kategori, tipe, nominal, dan tujuan pos—harus diterapkan sama pada semua transaksi yang dibuat.

## Kondisi saat ini

- `index.html` telah menyediakan pintasan dengan kode, judul, kategori, tipe, nominal opsional, ikon, catatan, dan visibilitas Beranda. Model `sc()` menyimpan bidang tersebut.
- `parseInput()` mengenali pintasan dan tanggal tunggal; parser rentang yang ada hanya mengenali pola numerik terbatas `D-D/M[/YYYY]`.
- Input suara memakai `SpeechRecognition` / `webkitSpeechRecognition` dengan locale `id-ID`, lalu masuk ke alur normalisasi dan parsing.
- Pembuatan transaksi tunggal saat ini memilih pos ST dari konteks input aktif. Form pintasan tidak menyimpan tujuan pos tetap.
- `addFrom()` menyimpan hasil parsing langsung. Belum ada dialog pratinjau multi-tanggal yang menahan penyimpanan sampai konfirmasi.

## Alur yang diusulkan

1. Form pintasan dapat menetapkan tujuan: otomatis, pribadi/tanpa pos, pos tertentu, atau pos ST bila tersedia. Pilihan lama yang belum memiliki tujuan tersimpan mempertahankan perilaku otomatis.
2. Pengguna menulis atau mengucapkan kode/nama pintasan disertai rentang tanggal. Nominal dapat berasal dari pintasan; nominal eksplisit dalam input menggantikan nominal pintasan untuk perintah itu saja.
3. Parser menghasilkan rentang tanggal inklusif. Aplikasi menyusun satu transaksi untuk setiap hari, menggunakan konfigurasi pintasan secara konsisten pada semua item.
4. Sebelum penyimpanan, aplikasi menampilkan dialog konfirmasi dengan pintasan, judul, kategori, pos, tanggal awal/akhir, banyak transaksi, nominal per transaksi, dan total.
5. Tombol “Oke” menyimpan seluruh batch secara atomik. Ucapan “Oke” hanya didengarkan saat dialog konfirmasi terbuka dan harus berasal dari interaksi voice yang sedang aktif/diizinkan. Tombol tetap menjadi fallback. Batal atau penutupan dialog tidak mengubah transaksi.
6. Setelah simpan, transaksi dapat ditinjau/dikoreksi melalui riwayat transaksi biasa.

## Aturan tanggal

- Rentang inklusif: `1-5` dan `1 sampai 5` berarti tanggal 1, 2, 3, 4, dan 5.
- Tanpa bulan dan tahun, gunakan bulan dan tahun saat ini. Tanpa tahun, gunakan tahun saat ini, termasuk ketika bulannya disebut.
- Nama bulan Indonesia dan variasi singkat umum seperti `Okt` dikenali.
- Bentuk tanggal tunggal berangka dengan pemisah, misalnya `1/10/2025`, dapat berarti 1 Oktober 2025.
- Bentuk berangka tanpa pemisah `1 10 2025` hanya boleh ditafsirkan sebagai tanggal tunggal 1 Oktober 2025 jika konstruksi bahasa/konteks sekelilingnya mengidentifikasi satu tanggal. Jangan menafsirkannya diam-diam sebagai rentang. Bentuk ambigu harus menghasilkan permintaan koreksi sebelum dialog simpan.
- Tanggal kalender tidak valid, rentang terbalik, bulan tidak dikenal, atau tahun yang tidak valid tidak boleh menghasilkan transaksi.
- Rentang yang melintasi bulan/tahun harus berjalan inklusif melewati batas kalender. Pop-up menampilkan tanggal lengkap agar interpretasinya dapat diperiksa.
- Batas maksimum rentang perlu mencegah salah ucap membuat batch besar; nilai final ditetapkan dalam rencana implementasi berdasarkan batas aman dan ditampilkan sebagai kesalahan bila terlampaui.

## Aturan pintasan dan transaksi

- Pencocokan kode pintasan harus mendahulukan kecocokan terpanjang, sehingga `UPD Full` tidak tertangkap sebagai `UPD`.
- Semua transaksi batch mewarisi tipe, kategori, ikon, catatan, kode pintasan, dan tujuan dari pintasan; tanggal lokal yang diminta disimpan dengan waktu tengah hari lokal agar tidak bergeser hari saat konversi zona waktu.
- Untuk pengeluaran ST, setiap transaksi memiliki `source: "st"`, `stSessionId` sesi ST aktif bila tersedia, `pocketId` pos ST sesuai pilihan pintasan, dan status reimburse yang konsisten dengan aturan ST saat ini.
- Jika tujuan pintasan menunjuk pos yang telah dihapus/tidak tersedia, jangan diam-diam mengalihkan ke pos lain. Tampilkan error untuk memperbaiki setelan.
- Jika nominal pintasan kosong dan tidak ada nominal eksplisit, jangan buka dialog simpan.
- Satu batch tersimpan seluruhnya atau tidak sama sekali; klik/ucapan konfirmasi berulang tidak boleh menggandakan batch.

## Voice dan batas kemampuan

Voice pengenalannya tetap bergantung pada dukungan browser/perangkat dan transkripsi `id-ID`; sistem harus memvalidasi teks hasil transkripsi melalui parser yang sama dengan input tulisan. Ucapan “Oke” hanya boleh mengonfirmasi ketika dialog batch terlihat dan sesi pengenalan konfirmasi dimulai secara eksplisit; jangan menjalankan pengenalan mikrofon tersembunyi terus-menerus. Jika browser tidak menyediakan SpeechRecognition atau transkripsinya tidak jelas, dialog tetap dapat diselesaikan dengan tombol.

## Pengujian penerimaan

### Parser rentang tulisan

- `UPD Full dari tanggal 1-5 Oktober` → lima tanggal inklusif di Oktober tahun berjalan.
- `UPD Full dari tanggal 1 sampai 5 Oktober 2026` → lima tanggal inklusif Oktober 2026.
- `UPD Full 1-5` → lima tanggal di bulan/tahun berjalan.
- `UPD Full 1 Okt` → tanggal tunggal; tidak membuat lima transaksi.
- `UPD Full tanggal 1/10/2025` dan konteks jelas `UPD Full tanggal 1 10 2025` → satu transaksi pada 1 Oktober 2025.
- Rentang dengan tahun, misalnya `1-5 Oktober 2025`, menghasilkan lima tanggal pada tahun itu.
- Uji batas bulan, tahun kabisat, tanggal mustahil, rentang terbalik, frasa ambigu, nomor nominal berdekatan, serta pintasan prefix-overlap `UPD` dan `UPD Full`.

### Transkripsi voice

Uji integrasi input dengan transkrip hasil recognizer untuk variasi ekuivalen: `satu sampai lima Oktober`, `tanggal satu sampai lima Oktober dua ribu dua puluh enam`, `satu Oktober dua ribu dua puluh lima`, dan variasi tanda hubung/angka yang benar-benar dikeluarkan perangkat. Catat hasil transkrip aktual dan hasil parser secara terpisah; unit test dengan string simulasi bukan bukti pengenalan voice nyata.

### Setelan dan konfirmasi

- Pintasan UPD Rp79.500 dan UPD Full Rp132.500 tetap memilih pintasan yang tepat, kategori, tipe, dan pos ST sesuai setelan.
- Pratinjau menampilkan 5 transaksi dan total tepat Rp397.500 untuk UPD, atau Rp662.500 untuk UPD Full.
- Pastikan source, pocket, sesi ST, status reimburse, tanggal, kategori, shortcutCode, dan nominal setiap item benar.
- Batal tidak menyimpan; tombol Oke menyimpan tepat satu batch; ucapan Oke hanya berlaku saat dialog terbuka; konfirmasi ganda tidak menggandakan transaksi.
- Ketidaktersediaan microphone/recognizer mempertahankan jalur tombol dan tidak menyimpan otomatis.

## Bukan bagian dari perubahan

- Tidak ada pengulangan transaksi berkala yang berjalan sendiri; hanya satu batch eksplisit dari satu perintah pengguna.
- Tidak ada pengiriman suara/teks ke layanan AI tambahan untuk menafsirkan tanggal.
- Tidak ada perubahan ke laporan, alokasi anggaran, atau definisi nominal pintasan selain dukungan override nominal pada satu input.

## Catatan kerja

Spesifikasi ini dibuat setelah pengguna menyetujui arah desain dalam percakapan. Checkout sudah berisi perubahan lokal sebelum pekerjaan ini dimulai; jangan menimpa atau memasukkannya ke commit tanpa tinjauan terpisah. Tidak ada implementasi aplikasi yang dilakukan pada tahap spesifikasi ini.
