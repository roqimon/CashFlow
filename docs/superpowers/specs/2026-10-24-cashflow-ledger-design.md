# Rancangan: Alokasi pos dan saldo Uang Bebas

Tanggal: 2026-10-24
Status: Disetujui untuk implementasi lewat percakapan 2026-10-24

## Aturan yang disepakati

- Pemasukan pribadi, termasuk gaji/uang masuk, masuk ke Uang Bebas. Pemasukan ST masuk hanya ke pos/sesi ST.
- Jatah bulanan pos aktif adalah alokasi yang bersumber dari Uang Bebas. Total alokasi pos dan tabungan mengurangi Uang Bebas pada siklus gajian yang sama; nominal pos tidak boleh ikut mengurangi Uang Bebas pada tampilan lain secara ganda.
- Pengeluaran yang cocok dengan pos aktif mengurangi saldo pos. Pengeluaran yang tidak cocok atau diarahkan ke Uang Bebas mengurangi Uang Bebas.
- Jika belanja pos melampaui jatahnya, saldo uang nyata tetap berkurang: bagian sampai jatah dibebankan ke pos, sedangkan kelebihannya mengurangi Uang Bebas satu kali. Pos menampilkan pelampauan sebagai informasi (contoh: “Melewati jatah Rp500 ribu”), bukan saldo negatif yang dihitung lagi sebagai utang.
- Setoran tabungan pribadi hanya berasal dari Uang Bebas atau pos dengan dana tersedia. Setiap setoran mencatat sumber dan mengurangi sumber itu satu kali. Pindah antar tujuan tabungan tidak menambah pengeluaran.
- Pos nonaktif tetap nonaktif. Pengeluaran baru tidak otomatis diarahkan kepadanya. Riwayat tetap terkait pos asal.
- Tampilan beranda menyampaikan jumlah pos yang melampaui jatah dan total kelebihannya dengan penanda merah lembut, ringkas, dan tidak mengganggu.

## Perhitungan dan kompatibilitas

Saldo operasional memakai siklus tanggal gajian yang sama untuk pemasukan, anggaran, tabungan, belanja, dan transfer. ST dikecualikan dari uang pribadi termasuk alokasi pos ST. Pencocokan kategori tetap menjadi jalur kompatibilitas untuk transaksi historis tanpa tujuan; transaksi baru menyimpan tujuan secara eksplisit.

Data tabungan lama tanpa sumber ditafsirkan sebagai Uang Bebas kecuali ada transaksi lama yang jelas merupakan alokasi dari pos (judul alokasi, tujuan tabungan, jumlah, dan tanggal cocok). Data tidak dihapus dan format ekspor/impor tetap dipertahankan. Jika sumber lama tetap ambigu, jangan membuat potongan kedua.

## Ruang lingkup

Satukan perhitungan di `index.html`, perbaiki pencatatan sumber di alur tabungan pada `index.html`, pertahankan normalisasi sumber di `savings-core.js`, tambah ringkasan pelampauan yang bersih pada beranda, dan naikkan versi aplikasi ke 9.8. Tanpa perubahan desain lain atau migrasi destruktif.

## Verifikasi penerimaan

Dengan pemasukan pribadi Rp5 juta dan jatah BBM Rp500 ribu serta jajan Rp1 juta, Uang Bebas menampilkan Rp3,5 juta sebelum pengeluaran lain. Belanja BBM Rp300 ribu mengurangi pos BBM saja. Belanja BBM kumulatif Rp1,5 juta membuat sisa Uang Bebas berkurang Rp500 ribu dan beranda menampilkan satu pos melewati jatah sebesar Rp500 ribu. Pengeluaran tidak cocok mengurangi Uang Bebas. Setoran tabungan mengurangi hanya sumber yang dipilih. Pemasukan/biaya ST tidak mengubah Uang Bebas. Pos nonaktif tetap nonaktif setelah navigasi/muat ulang.
