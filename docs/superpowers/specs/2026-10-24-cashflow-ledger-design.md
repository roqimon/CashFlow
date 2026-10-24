# Spesifikasi: Pendanaan budget pos dari Uang Bebas

Tanggal: 2026-10-24
Status: Disetujui pengguna untuk implementasi v10.8

## Tujuan

Seluruh uang harus punya saldo dan riwayat yang dapat ditelusuri. Uang Bebas adalah sumber pemasukan pribadi yang belum dialokasikan. Budget pos pribadi yang aktif menjadi alokasi dana; pemasukan ST tetap terpisah.

## Aturan yang disepakati

- Semua pemasukan pribadi, termasuk gaji dan input “uang masuk”, menambah Uang Bebas. Dana ST masuk ke sesi/pos ST yang sesuai dan tidak otomatis bercampur dengan saldo pribadi.
- Saat budget pos pribadi dibuat atau dinaikkan, dana sebesar perubahan budget langsung dialihkan dari Uang Bebas ke pos. Nominal budget tidak boleh membuat Uang Bebas menjadi negatif pada saat alokasi; jika dana belum cukup, budget baru/perubahan budget ditolak dengan pemberitahuan saldo yang tersedia.
- Pos aktif yang sudah ada dan belum memiliki pendanaan pada siklus berjalan dialokasikan satu kali saat aplikasi menghitung saldo, jika Uang Bebas cukup. Pos diproses menurut urutan yang tersimpan. Pos yang dananya belum cukup tetap belum didanai sampai pengguna mengubah budget atau melakukan alokasi manual.
- Pengeluaran yang cocok dengan pos aktif mengurangi dana pos. Jika belanja melebihi dana pos, saldo pos menunjukkan kekurangan dan Uang Bebas menanggung selisih satu kali. Penanda “lebih dari jatah” tetap membandingkan belanja dengan nominal budget.
- Pengeluaran yang tidak cocok dengan pos aktif atau ditujukan ke Uang Bebas mengurangi Uang Bebas secara langsung.
- Mengurangi budget mengembalikan ke Uang Bebas sebanyak selisih yang masih tersedia pada pos. Jika sudah terpakai, pengembalian dibatasi oleh saldo aktual pos.
- Menonaktifkan pos mengembalikan seluruh sisa dana positif ke Uang Bebas, lalu menonaktifkan pos. Mengaktifkan kembali pos mencatat alokasi baru dari Uang Bebas sesuai kebutuhan budget berjalan; jika dana tidak cukup, pos tetap nonaktif.
- Sisa pos dapat dipindahkan manual ke Uang Bebas, pos lain, atau tabungan. Perpindahan itu tercatat sebagai transfer/alokasi, bukan belanja.
- Pos yang memiliki riwayat transfer, transaksi, atau tabungan tidak dapat dihapus; pos dapat dinonaktifkan agar dana sisanya kembali dan riwayatnya tetap tersedia.
- Transfer dan alokasi menggunakan siklus tanggal gajian yang sama dengan pemasukan dan pengeluaran. Pemasukan baru pada siklus yang sama tetap dicatat dahulu sebagai pemasukan Uang Bebas; budget berjalan yang belum didanai dicoba dialokasikan saat perhitungan saldo berikutnya.

## Rumus saldo

- Saldo Uang Bebas pada siklus berjalan = pemasukan pribadi + koreksi saldo + transfer masuk − transfer keluar/alokasi tabungan − belanja langsung Uang Bebas − kekurangan belanja pos yang belum tertutup.
- Dana pos = transfer masuk aktual + pemasukan ST untuk pos ST − belanja yang cocok − transfer keluar − setoran tabungan dari pos.
- “Dialihkan” pada Uang Bebas hanya menampilkan arus bersih keluar ke pos/tabungan; belanja tidak dihitung sebagai pengalihan.
- Kartu ringkasan menghitung saldo tersedia dari Uang Bebas bertanda plus/minus dan sisa positif pada pos. Nilai kekurangan pos tidak dijumlahkan lagi ke ringkasan karena sudah dibebankan ke Uang Bebas.
- Saran belanja harian = nilai bulat ke bawah dari sisa Uang Bebas dibagi jumlah hari yang tersisa pada siklus. Belanja hari ini sudah masuk ke sisa Uang Bebas, jadi tidak boleh dikurangi untuk kedua kalinya.

## Data lama dan kompatibilitas

- Jangan menghapus atau menulis ulang transaksi, sumber pemasukan, data ST, transfer, tabungan, maupun format ekspor/impor yang sudah tersimpan.
- Riwayat transfer pos yang sudah ada tetap menjadi bukti pendanaan. Pos lama yang belum didanai dapat memperoleh satu transfer pendanaan pada siklus berjalan jika saldonya cukup; penanda siklus disimpan pada data pos agar render/navigasi tidak menggandakan transfer.
- Pos dengan dana yang tidak cukup untuk satu budget penuh tidak dialokasikan sebagian secara otomatis. Pemasukan tetap berada di Uang Bebas sampai alokasi penuh dapat dilakukan atau pengguna mengubah nominal budget.
- Catatan tabungan lama tanpa sumber tetap ditafsirkan sesuai aturan kompatibilitas yang sudah ada; jangan membuat potongan kedua.

## Antarmuka

- Kartu Uang Bebas menunjukkan pemasukan siklus, belanja yang dibebankan ke Uang Bebas, pengalihan bersih, dan sisa/minus.
- Kartu pos membedakan jatah budget, dana aktual, belanja, jumlah yang ditanggung Uang Bebas, dan kelebihan atas jatah.
- Angka harian disebut “Saran Uang Bebas per Hari” dan menunjukkan basisnya: sisa Uang Bebas dibagi hari tersisa.
- Tampilan tetap ringkas; informasi defisit ditandai jelas tanpa menghitung uang yang sama dua kali.

## Kriteria penerimaan

- Pemasukan pribadi Rp5 juta tanpa pos terdanai, tabungan, atau belanja menghasilkan Uang Bebas Rp5 juta.
- Budget pos aktif Rp3 juta mengalihkan Rp3 juta dari Uang Bebas ke pos jika saldo cukup.
- Belanja Rp2,5 juta dari pos berdana Rp3 juta menyisakan dana pos Rp500 ribu dan tidak mengurangi Uang Bebas lagi.
- Belanja Rp3,1 juta dari pos berdana Rp3 juta membuat pos menunjukkan lebih Rp100 ribu dan mengurangi Uang Bebas Rp100 ribu satu kali.
- Menonaktifkan pos yang masih memiliki dana mengembalikan saldo aktual pos ke Uang Bebas dan status tetap nonaktif setelah navigasi/pemuatan ulang.
- Perubahan budget lebih kecil mengembalikan dana yang tersedia; perubahan budget lebih besar tercatat sebagai transfer dari Uang Bebas.
- Pengeluaran langsung, tabungan, transfer antarpos, dan dana ST tidak menggandakan atau mencampur saldo.
- Saran harian tidak mengurangi belanja hari ini dua kali.
- Setelah deployment, PWA menampilkan versi baru dan saldo mengikuti riwayat transaksi serta transfer.
