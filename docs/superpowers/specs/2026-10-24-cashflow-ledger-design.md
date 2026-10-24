# Rancangan: Saldo cashflow dan alokasi Uang Bebas

Tanggal: 2026-10-24
Status: Menunggu tinjauan pengguna

## Tujuan dan aturan produk

Aplikasi harus menampilkan saldo uang pribadi yang benar-benar masih tersedia. Semua pemasukan pribadi, termasuk gaji, menambah Uang Bebas. Nominal bulanan pada pos anggaran adalah batas belanja dan tidak otomatis mengurangi Uang Bebas. Uang khusus ST/RT tetap berada pada pos khususnya, terpisah dari uang pribadi.

Saldo hanya berpindah saat ada kejadian nyata: pengeluaran, alokasi dari Uang Bebas ke pos/tabungan, transfer antar-pos, atau penarikan dari tabungan. Setiap perpindahan mencatat sumber dan tujuan agar satu rupiah hanya berpengaruh satu kali.

## Model saldo

- **Uang Bebas**: pemasukan pribadi pada siklus gajian, ditambah transfer masuk, dikurangi pengeluaran yang dibebankan kepadanya, alokasi ke pos, dan setoran tabungan yang bersumber darinya.
- **Pos anggaran**: memiliki batas bulanan terpisah dari dana yang dialokasikan. Saldo terdanai bertambah dari alokasi/transfer masuk, berkurang oleh belanja pos dan transfer/alokasi keluar. Tampilan membedakan sisa batas belanja dari saldo dana yang tersedia.
- **Tabungan**: setiap setoran memiliki sumber. Setoran dari Uang Bebas mengurangi Uang Bebas; setoran dari pos mengurangi saldo pos sumber. Pemindahan antar tujuan tabungan tidak mengubah total uang pribadi dan tidak dicatat sebagai pengeluaran baru.
- **ST/RT**: pemasukan dan pengeluaran yang ditandai sebagai dana khusus hanya memengaruhi pos/sesi khususnya, tidak menambah Uang Bebas pribadi.

Pengeluaran yang cocok dengan pos aktif tetap dicatat pada pos itu. Jika dana terdanainya kurang, kekurangan diambil dari Uang Bebas secara otomatis dan dicatat sebagai perpindahan internal, sehingga input tetap praktis tanpa menggandakan pengeluaran. Peringatan batas anggaran tetap ditampilkan terpisah dari ketersediaan kas.

## Konsistensi perhitungan

Satu fungsi inti menghitung saldo sumber/tujuan berdasarkan transaksi, alokasi, dan transfer. Beranda, indikator uang harian, kartu pos, tabungan, serta ringkasan yang berkaitan membaca hasil yang sama. Rentang siklus gajian menjadi dasar saldo operasional; data lama yang disimpan per bulan kalender perlu diperlakukan dengan aturan tanggal yang eksplisit agar tidak berpindah siklus secara diam-diam.

Status aktif pos hanya menentukan apakah pos dapat dipilih untuk perutean pengeluaran baru. Menonaktifkan pos tidak mengaktifkannya kembali dan tidak mengubah klasifikasi historis transaksinya. Pengeluaran historis yang telah memiliki `pocketId` tetap tercatat pada pos tersebut.

## Data lama dan kompatibilitas

Transaksi yang memiliki `pocketId` dipertahankan. Catatan setoran tabungan lama yang tidak mencatat sumber tidak boleh otomatis dipotong lagi dari Uang Bebas atau pos karena asalnya tidak dapat dibuktikan dan berisiko menghitung ganda. Transaksi tanpa pos tetap mengikuti pencocokan kategori lama hanya untuk kompatibilitas; transaksi baru menyimpan tujuan secara eksplisit.

Format ekspor/impor yang sudah ada tetap didukung. Catatan transfer/alokasi baru harus divalidasi agar sumber, tujuan, nominal, dan tanggal valid; impor lama dinormalisasi tanpa menghapus histori pengguna. Tidak ada migrasi destruktif atau penghapusan data.

## Cakupan implementasi dan verifikasi

Perubahan mencakup perhitungan di `index.html`, pencatatan asal setoran/transfer di `index.html` dan `savings-core.js`, tampilan saldo terkait, dan nomor/catatan versi aplikasi. Perubahan terfokus pada aturan cashflow yang dijelaskan di atas.

Verifikasi manual mencakup: gaji 5 juta tanpa pos aktif; gaji dengan pos aktif tetapi belum dialokasikan; alokasi sebagian ke pos/tabungan; belanja pos dan belanja umum; transfer bolak-balik; setoran tabungan dari Uang Bebas/pos; pos dinonaktifkan lalu navigasi/refresh; ST/RT; serta beranda dibandingkan dengan kartu Uang Bebas dan saldo pos. Pengujian otomatis tidak dijalankan kecuali diminta pengguna.

## Risiko dan keputusan

Risiko utama adalah histori tabungan lama yang tidak memiliki asal dana. Spesifikasi memilih untuk tidak menebak asalnya. Pencocokan otomatis kategori historis juga dapat salah untuk nama kategori ambigu; transaksi baru menggunakan tujuan eksplisit, sementara histori tidak ditulis ulang.

Keputusan yang perlu ditinjau: apakah perilaku kekurangan dana pos melalui pengambilan otomatis dari Uang Bebas sudah sesuai, dan apakah aturan bahwa saldo historis tidak ditulis ulang dapat diterima. Rekomendasi: ya untuk keduanya, karena transaksi tetap cepat dicatat dan data masa lalu tidak ditebak ulang.
