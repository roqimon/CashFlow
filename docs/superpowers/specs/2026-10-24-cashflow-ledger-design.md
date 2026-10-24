# Spesifikasi: Saldo Uang Bebas dan alokasi pos manual

Tanggal: 2026-10-24

Status: Disetujui pengguna; implementasi v9.9

## Tujuan

Pemasukan pribadi harus menambah saldo Uang Bebas secara utuh. Dana hanya berpindah ke pos anggaran atau tabungan saat pengguna melakukan alokasi. Dengan demikian, pos yang sudah aktif tidak otomatis mengambil pemasukan baru.

## Aturan yang disepakati

- Semua pemasukan pribadi, termasuk gaji dan input “uang masuk”, masuk ke Uang Bebas. Pengecualian dana ST tetap masuk ke sesi/pos ST yang sesuai.
- Pos anggaran menyimpan batas/jatah dan aturan kategori untuk mencocokkan pengeluaran. Status aktif menentukan apakah pos boleh menerima pencocokan transaksi; status nonaktif tetap persisten.
- Pembuatan atau pengaktifan pos tidak otomatis mendanainya. Alokasi dana ke pos adalah tindakan terpisah yang memindahkan nominal dari Uang Bebas ke pos.
- Pengeluaran yang cocok dengan pos aktif mengurangi dana yang sudah dialokasikan ke pos tersebut. Bila dana pos kurang, kekurangannya dibebankan ke Uang Bebas satu kali; riwayat pos dapat menampilkan saldo minus/kekurangan sebagai informasi tanpa mengurangi saldo total untuk kedua kalinya.
- Pengeluaran yang tidak cocok dengan pos aktif atau secara eksplisit ditujukan ke Uang Bebas langsung mengurangi Uang Bebas.
- Setoran tabungan pribadi hanya berasal dari Uang Bebas atau saldo pos yang tersedia. Sumber dana dicatat dan dikurangi tepat satu kali. Perpindahan antar tujuan tabungan tidak menambah pengeluaran.
- Dana ST tetap terpisah dari Uang Bebas dan tidak dapat dialokasikan ke pos pribadi secara otomatis.
- Transfer/alokasi menggunakan siklus tanggal gajian yang sama dengan pemasukan dan pengeluaran.

## Aturan saldo

- Saldo Uang Bebas = saldo awal yang tersedia + seluruh pemasukan pribadi pada siklus + dana yang kembali ke Uang Bebas − alokasi aktual ke pos/tabungan − pengeluaran langsung dari Uang Bebas − kekurangan belanja pos yang melampaui dana pos tersedia.
- Saldo pos = alokasi aktual yang diterima pada siklus − pengeluaran yang dicocokkan ke pos − alokasi keluar dari pos. Batas anggaran pos tidak dihitung sebagai dana.
- Belanja pos yang melebihi dana tersedia mengurangi Uang Bebas sebesar bagian yang tidak tertutup alokasi. Jika juga melewati batas anggaran, beranda memberi penanda ringkas berapa pos yang melewati batas dan total kelebihannya.
- Contoh: pemasukan pribadi Rp5 juta tanpa alokasi, tabungan, atau belanja membuat Uang Bebas Rp5 juta. Setelah Rp500 ribu dialokasikan ke BBM dan Rp1 juta ke jajan, Uang Bebas menjadi Rp3,5 juta. Belanja BBM Rp300 ribu hanya mengurangi saldo pos BBM. Belanja BBM kumulatif Rp700 ribu menghabiskan alokasi BBM dan membebankan kekurangan Rp200 ribu ke Uang Bebas satu kali.

## Data lama dan kompatibilitas

- Jangan menghapus atau menulis ulang transaksi pengguna, sumber pemasukan, data ST, transfer, tabungan, maupun format ekspor/impor.
- Saldo pos lama yang tidak mempunyai catatan transfer/alokasi tidak dianggap sebagai dana baru. Pengeluaran lama yang tercatat pada pos tetap dipakai untuk menghitung pemakaian dan selisihnya hanya dibebankan sekali pada Uang Bebas.
- Catatan tabungan lama tanpa sumber ditafsirkan sebagai Uang Bebas kecuali transaksi lama membuktikan setoran berasal dari pos. Jika sumber tetap ambigu, jangan membuat potongan kedua.
- Input pemasukan pribadi harus tetap diklasifikasikan sebagai pemasukan, disimpan dengan tujuan Uang Bebas, dan masuk ke saldo siklus yang benar.

## Dampak antarmuka

- Sediakan tindakan yang jelas untuk mengalokasikan sejumlah dana dari Uang Bebas ke pos anggaran aktif, dengan pemeriksaan agar alokasi tidak melebihi dana tersedia.
- Ringkasan Uang Bebas di beranda menunjukkan saldo yang belum dialokasikan dan benar-benar dapat digunakan; dana pada pos dan tabungan tidak dihitung ganda.
- Pertahankan tampilan bersih. Informasi kekurangan/alokasi ditampilkan ringkas dan tidak mengganggu.

## Verifikasi penerimaan

- Pemasukan pribadi Rp5 juta tanpa alokasi mengubah Uang Bebas sebesar tepat Rp5 juta.
- Pos aktif yang sudah dibuat tidak mengurangi Uang Bebas sampai ada alokasi aktual.
- Alokasi ke pos mengurangi Uang Bebas dan menambah saldo pos dengan jumlah yang sama.
- Belanja pos mengurangi dana pos; hanya kekurangan dana pos yang mengurangi Uang Bebas.
- Pengeluaran bebas, setoran tabungan, penarikan tabungan, dan transfer antar-pos tidak dihitung ganda.
- Dana ST tidak menambah atau mengurangi saldo Uang Bebas.
- Pos nonaktif tetap nonaktif setelah navigasi dan pemuatan ulang.
- Setelah deployment, aplikasi menampilkan versi rilis baru dan saldo di beranda mengikuti aturan di atas.
