# Galeri Nota pada Laporan — Spesifikasi Desain

**Tanggal:** 21 Oktober 2026

**Status:** Rancangan disetujui dalam percakapan; dokumen menunggu tinjauan

**Produk:** ArusKas di `https://kas.bisabaca.web.id/`

## Tujuan dan batasan

Pengguna dapat menemukan kembali foto nota yang dicatat mulai dari versi fitur ini, melihat gambarnya, menyaring daftar, memilih beberapa foto, dan membagikannya lewat pilihan berbagi perangkat sehingga bisa memilih WhatsApp. Foto cukup tersedia di browser/perangkat tempat foto dicatat. Foto dari transaksi lama tidak dapat dipulihkan: implementasi saat ini hanya memakai file selama pratinjau dan scan AI lalu menyimpan data transaksi di `localStorage`.

Berbagi foto berbeda dari tombol **Kirim Rekap Belanja ke WhatsApp** yang sekarang mengirim teks. Fitur teks itu tetap bekerja. Aplikasi tidak menjanjikan bahwa WhatsApp selalu muncul di pilihan berbagi atau bahwa pengiriman berhasil; keputusan aplikasi tujuan dan pengiriman ada pada perangkat/pengguna.

## Pendekatan yang dipilih

Simpan file foto terkompresi sebagai `Blob` dalam IndexedDB pada origin aplikasi. Simpan metadata nota dan ID foto di basis data yang sama; tautkan transaksi melalui properti opsional `receiptId` dalam model transaksi di `localStorage`. IndexedDB dipilih karena file gambar tidak cocok disimpan sebagai string base64 di `localStorage`, yang kapasitasnya kecil. Tidak ada unggahan foto ke VPS untuk arsip. Alur scan AI yang sudah ada tetap mengirim gambar sementara ke Gemini saat diaktifkan.

Alternatif yang ditolak:

- Menaruh base64 foto pada tiap transaksi di `localStorage`: cepat diterapkan, tetapi mengulang satu gambar saat satu scan menghasilkan banyak transaksi dan berisiko memenuhi kuota.
- Menaruh foto di server: memungkinkan lintas perangkat, tetapi memerlukan akun, aturan akses, penyimpanan privat, dan operasi server; pengguna memilih cakupan satu perangkat.

Penyimpanan browser dapat dihapus pengguna atau terbuang karena tekanan ruang. Antarmuka menjelaskan batas ini dan menyediakan cadangan foto yang dapat diunduh serta dipulihkan.

## Model data dan alur pencatatan

Object store `receipts` memakai `id` acak sebagai key. Satu record berisi `id`, `blob` JPEG, `capturedAt`, `title`, `categoryNames` (array), dan `transactionIds` (array) sebagai cuplikan metadata saat pencatatan. Cuplikan ini menjaga foto tetap dapat ditampilkan dan dicari bila transaksi terkait dihapus. Satu foto disimpan sekali. Satu atau lebih transaksi dapat memiliki `receiptId` yang sama; normalisasi `tx()` wajib mempertahankan properti itu saat baca, edit, ekspor, dan impor. Tampilan memakai metadata transaksi terkini jika ada, lalu cuplikan sebagai cadangan. Transaksi duplikat yang dibuat dari tombol duplikasi tidak otomatis mewarisi foto bukti.

Saat foto dipilih, pratinjau tetap langsung muncul. Aplikasi membuat salinan arsip JPEG yang cukup tajam untuk membaca nota (sisi terpanjang hingga 1600 px, kualitas sekitar 0,82; tidak memperbesar gambar kecil). Salinan arsip disimpan ketika transaksi hasil scan AI atau input manual benar-benar berhasil dicatat. Jika scan AI menghasilkan beberapa transaksi, semuanya merujuk ke satu `receiptId`. Bila scan batal atau tidak menghasilkan transaksi, file tidak diarsipkan. Penyimpanan foto dan transaksi harus dicek hasilnya; bila transaksi gagal tersimpan setelah foto dibuat, hapus record foto baru. Bila penyimpanan foto gagal, aplikasi menjelaskan kegagalan dan memberi pilihan coba lagi atau simpan transaksi tanpa foto; tidak boleh menampilkan pesan seolah foto berhasil tersimpan.

Menghapus satu transaksi tidak otomatis menghapus foto yang mungkin dipakai transaksi lain. Pengguna dapat menghapus foto secara eksplisit dari galeri; transaksi tetap ada dan `receiptId` yang merujuk ke foto tersebut dibersihkan. Aksi **Hapus semua data** juga menghapus arsip foto dan menyebutnya dalam dialog. Impor transaksi lama tanpa `receiptId` tetap berhasil.

## Galeri dan filter Laporan

Bagian **Nota Tersimpan** tampil di menu Laporan, terpisah dari grafik dan rekap WhatsApp. Daftar memakai thumbnail, judul, tanggal, dan jumlah transaksi terkait, diurutkan terbaru. Status kosong membedakan belum ada foto tersimpan dengan hasil filter kosong. Ketuk kartu untuk membuka foto penuh dan rincian terkait. Tampilan ponsel menjaga teks serta tombol tetap terbaca tanpa gulir horizontal.

Filter bawaan mengikuti periode Laporan yang aktif. Pengguna dapat mengganti cakupan galeri ke **Semua tanggal** tanpa mengubah grafik Laporan. Filter tambahan: kategori transaksi dan pencarian nama toko/transaksi; keduanya bisa dipakai bersama. Satu nota hasil beberapa transaksi tampil sekali; nota cocok bila sedikitnya satu transaksi terkait memenuhi kategori dan pencarian, sementara periode didasarkan pada tanggal foto dicatat. Metadata arsip tetap dapat dicari bila transaksi terkait sudah dihapus. Perubahan filter memperbarui hitungan hasil dan mengosongkan pilihan foto yang tak lagi tampak.

Pengguna dapat memilih beberapa nota dari hasil filter, melihat jumlah terpilih, membatalkan pilihan, dan memulai berbagi. Pratinjau satu nota juga menyediakan tindakan berbagi dan unduh.

## Berbagi ke WhatsApp dan fallback

Aplikasi menyiapkan `File` gambar terpilih sebelum tombol berbagi diaktifkan. Pada klik pengguna, aplikasi memeriksa `navigator.canShare({files})` lalu memanggil `navigator.share({files, text})` secara langsung agar syarat interaksi pengguna terpenuhi. Sistem menampilkan daftar tujuan; pengguna memilih WhatsApp. Pesan pendek menyebut jumlah nota dan periode, tanpa memuat data keuangan tambahan yang tidak dipilih. Pembatalan lembar berbagi tidak dilaporkan sebagai pengiriman berhasil.

Jika browser/perangkat tidak mendukung berbagi file sebanyak yang dipilih, antarmuka menjelaskan batasnya dan menyediakan tombol unduh untuk setiap foto terpilih agar pengguna bisa melampirkannya manual di WhatsApp. Tiap unduhan tetap dimulai dari klik pengguna sehingga browser tidak memblokir rentetan unduhan otomatis. Tautan `wa.me`/`api.whatsapp.com` tidak dipakai untuk foto karena mekanisme itu hanya mengisi teks, bukan lampiran lokal. Bila batas tujuan tertentu menolak sejumlah file, pengguna dapat mengurangi pilihan dan mencoba lagi.

## Cadangan, pemulihan, dan privasi

CSV tetap berisi data transaksi dan diberi keterangan jelas bahwa CSV tidak memuat foto. Pengaturan menampilkan tindakan terpisah **Cadangkan data dan foto (JSON)** serta **Pulihkan cadangan JSON**. Format JSON memuat transaksi dan data aplikasi yang saat ini diekspor, plus daftar nota dengan metadata dan JPEG dalam base64. Impor format lama yang tidak punya foto tetap didukung. Impor format baru memulihkan foto dan tautan transaksi secara idempoten menurut ID. Kegagalan baca/kuota dilaporkan jelas; berkas besar diberi informasi ukuran sebelum diunduh atau dipulihkan.

Foto tidak diberi URL publik. Foto tetap lokal hingga pengguna memilih tujuan dari lembar berbagi atau mengekspor cadangan. Aplikasi tidak mengirim foto ke WhatsApp secara otomatis.

## Verifikasi

- Uji penyimpanan foto manual dan scan AI, termasuk satu scan yang menghasilkan beberapa transaksi, kegagalan penyimpanan, serta batal scan.
- Uji penyaringan periode, semua tanggal, kategori, dan pencarian, termasuk satu nota dengan beberapa transaksi dan hasil kosong.
- Uji pilihan beberapa nota, berbagi file lewat mock Web Share API, pembatalan, dan fallback saat `canShare` menolak.
- Uji edit/duplikasi/hapus transaksi, hapus foto, serta hapus semua data agar tautan tidak rusak.
- Uji ekspor/impor cadangan baru dan cadangan lama; CSV tetap jelas tanpa foto.
- Periksa tampilan Laporan pada lebar ponsel dan desktop, serta versi cache PWA agar aset baru termuat.
