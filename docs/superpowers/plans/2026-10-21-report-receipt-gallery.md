# Galeri Nota pada Laporan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pengguna bisa menyimpan foto nota baru, menemukan dan menyaringnya di Laporan, memilih beberapa foto untuk dibagikan ke WhatsApp, serta mencadangkan dan memulihkannya.

**Architecture:** Foto JPEG dan metadata berada di IndexedDB; transaksi `localStorage` menyimpan `receiptId` opsional. Galeri membaca record foto dan metadata transaksi, sedangkan berbagi file memakai Web Share API dengan unduh manual sebagai fallback. Cadangan JSON menggabungkan data aplikasi dan gambar; CSV tetap hanya transaksi.

**Tech Stack:** HTML/CSS/JavaScript tanpa bundler, IndexedDB, Web Share API, Node.js built-in test runner, PWA service worker.

**Spec:** `docs/superpowers/specs/2026-10-21-report-receipt-gallery-design.md`

## Global Constraints

- Domain resmi: `https://kas.bisabaca.web.id/`.
- Arsip foto hanya di browser/perangkat yang memfoto; tidak ada upload arsip ke VPS.
- Foto transaksi lama tidak dapat dipulihkan otomatis.
- Satu foto dapat terkait dengan beberapa transaksi hasil scan AI; foto hanya disimpan sekali.
- Tombol rekap WhatsApp berbasis teks yang sudah ada tetap berfungsi.
- Tidak ada klaim bahwa pilihan WhatsApp atau keberhasilan pengiriman selalu tersedia.
- Jangan menambah library runtime atau bundler; pertahankan pola JavaScript biasa dalam repo.

## Review Focus

- Browser mematikan/menolak IndexedDB: pencatatan tidak boleh diam-diam mengaku menyimpan foto (Task 2).
- Satu scan AI menghasilkan lebih dari satu transaksi: galeri hanya menampilkan satu foto dan filter kategori tetap menemukan semua kategori terkait (Task 2 dan 3).
- Klik berbagi kehilangan user activation saat menunggu file: file disiapkan sebelum tombol aktif dan `share()` langsung dipanggil dari klik (Task 4).
- Pengguna mengekspor CSV lalu menghapus data browser: layar menjelaskan bahwa CSV tidak mencadangkan foto dan tersedia cadangan JSON dengan foto (Task 5).
- Impor cadangan lama, impor berulang, dan kuota penuh: tidak menggandakan foto atau merusak transaksi lama; kegagalan terlihat (Task 5).

---

### Task 1: Penyimpanan foto dan tautan transaksi

**Files:** Create `receipt-store.js`; modify `index.html` (script include, `tx()`, `duplicateTx()`, hapus foto/transaksi); create `test/receipt_store_test.js`.

**Interfaces:** `createReceiptStore(indexedDBApi)` diekspor untuk tes dan dipasang sebagai `window.ReceiptStore` di browser. Hasilnya punya `put(record): Promise<void>`, `get(id): Promise<record|null>`, `list(): Promise<record[]>`, `remove(id): Promise<void>`, `clear(): Promise<void>`. Record: `{id, blob, capturedAt, title, categoryNames, transactionIds}`. `tx(o)` mempertahankan `receiptId` atau `null`.

- [ ] Tulis tes kontrak store dengan IndexedDB stub: `put/get/list/remove/clear` mempertahankan Blob dan metadata; `tx()` mempertahankan `receiptId`, sedangkan duplikasi mengosongkannya.
- [ ] Jalankan `node --test test/receipt_store_test.js`; pastikan gagal karena store/model belum ada.
- [ ] Implementasikan `receipt-store.js` memakai object store `receipts` key `id`; tambah script di `index.html`, normalisasi `receiptId`, serta logika hapus foto yang membersihkan tautan transaksi tanpa menghapus transaksinya.
- [ ] Jalankan tes yang sama hingga lulus; periksa `git diff --check`.
- [ ] Commit: `feat(receipts): add local photo store and transaction link`.

### Task 2: Arsipkan foto saat pencatatan berhasil

**Files:** Modify `index.html` (`handleReceiptFileSelected`, `executeReceiptAiScan`, `saveScanManualTransaction`, utilitas gambar); create `test/receipt_capture_test.js`.

**Interfaces:** `prepareReceiptBlob(file): Promise<Blob>` menghasilkan JPEG dengan sisi terpanjang maksimum 1600 px dan kualitas sekitar 0,82. `persistScannedReceipt({file, items}): Promise<{receiptId, items}>` menyimpan satu record, menautkan semua transaksi valid, dan memverifikasi penyimpanan transaksi.

- [ ] Tulis tes untuk input manual, beberapa hasil AI, scan batal, dan kegagalan IndexedDB/penyimpanan transaksi; setiap hasil memeriksa jumlah record foto, `receiptId`, serta pesan kegagalan.
- [ ] Jalankan `node --test test/receipt_capture_test.js`; pastikan gagal pada perilaku baru.
- [ ] Implementasikan arsip JPEG terpisah dari kompresi 800 px untuk AI. Simpan foto hanya pada tindakan catat yang berhasil; bersihkan record baru bila transaksi gagal; sediakan pilihan coba lagi atau simpan tanpa foto saat arsip gagal. Kosongkan `currentReceiptFile` saat alur scan berakhir agar foto lama tidak terpakai lagi.
- [ ] Jalankan tes Task 1 dan 2; cek pencatatan manual dan AI pada browser lokal.
- [ ] Commit: `feat(receipts): archive photos from scan and manual entry`.

### Task 3: Galeri dan filter di Laporan

**Files:** Create `receipt-gallery.js`; modify `index.html` (bagian Laporan, modal foto, render dan event); modify `warm-ui.css`; create `test/receipt_gallery_filter_test.js`.

**Interfaces:** `ReceiptGallery.filter(receipts, transactions, {start, end, allDates, category, query})` diekspor untuk tes dan browser, mengembalikan daftar unik terbaru. `renderReceiptGallery()` memuat record secara async, menjaga pilihan hanya untuk hasil yang masih tampak, dan merender status kosong yang tepat.

- [ ] Tulis tes filter untuk periode, semua tanggal, kategori, pencarian, satu foto dengan beberapa transaksi, dan foto yang transaksinya sudah dihapus.
- [ ] Jalankan `node --test test/receipt_gallery_filter_test.js`; pastikan gagal.
- [ ] Implementasikan fungsi filter serta UI **Nota Tersimpan** setelah ringkasan Laporan: thumbnail, jumlah hasil, kategori, pencarian, pilihan banyak, modal foto, dan tampilan mobile/desktop.
- [ ] Jalankan tes filter; cek secara visual pada lebar ponsel dan desktop, termasuk keadaan kosong dan tanpa gulir horizontal.
- [ ] Commit: `feat(report): add searchable receipt gallery`.

### Task 4: Berbagi beberapa foto

**Files:** Modify `receipt-gallery.js`, `index.html`, dan `warm-ui.css`; create `test/receipt_share_test.js`.

**Interfaces:** `prepareShareFiles(ids): Promise<File[]>` selesai sebelum tombol berbagi aktif. `shareSelectedReceipts(files, text, navigatorApi): Promise<'shared'|'cancelled'|'unsupported'>` memanggil `canShare` lalu `share` pada handler klik tanpa `await` sebelum `share()`; hasil `unsupported` menampilkan tautan unduh per foto.

- [ ] Tulis tes mock untuk beberapa File, `canShare=false`, `share` sukses, `AbortError`, dan error lain; pastikan pembatalan tidak menampilkan pesan terkirim.
- [ ] Jalankan `node --test test/receipt_share_test.js`; pastikan gagal.
- [ ] Implementasikan pilihan beberapa nota dan berbagi native, dengan tombol unduh per foto bila tidak didukung; pertahankan tombol rekap teks yang sudah ada.
- [ ] Jalankan tes berbagi dan cek alur native di ponsel yang mendukung serta fallback desktop/browser yang tidak mendukung.
- [ ] Commit: `feat(receipts): share selected photos through native share`.

### Task 5: Cadangan, pemulihan, hapus data, dan cache PWA

**Files:** Modify `index.html` (`exportData`, `importJsonData`, Pengaturan, `clear-data`); modify `sw.js`; create `test/receipt_backup_test.js`.

**Interfaces:** `exportData('json')` secara async menyertakan `receipts` sebagai metadata + JPEG base64; `importJsonData(file)` menerima cadangan lama atau baru dan melakukan upsert menurut ID. `exportData('csv')` tidak berubah format dan layar menyatakan foto tidak termasuk.

- [ ] Tulis tes round-trip JSON dengan foto, impor JSON lama tanpa foto, impor berulang, kuota gagal, serta `clear-data` membersihkan foto; cek label CSV menyatakan foto tidak ikut.
- [ ] Jalankan `node --test test/receipt_backup_test.js`; pastikan gagal.
- [ ] Tampilkan aksi cadangkan/pulihkan JSON yang sekarang tersembunyi; tambahkan konversi Blob/base64, pelaporan ukuran dan kegagalan, serta penghapusan arsip pada **Hapus Semua Data**. Impor foto lebih dulu lalu tautan transaksi; jangan menampilkan pemulihan sukses bila foto gagal. Bump cache PWA dan sertakan `receipt-store.js` serta `receipt-gallery.js` dalam app shell.
- [ ] Jalankan semua `node --test`; cek ekspor/impor nyata, PWA offline, scan, galeri, dan berbagi; jalankan `git diff --check`.
- [ ] Commit: `feat(receipts): back up photos and refresh PWA cache`.

## Handoff

### Task 6: Revisi alur kirim WhatsApp sesuai arahan pengguna

Setelah rencana awal disetujui, pengguna meminta pilihan kirim **Daftar saja**, **Daftar + nota**, atau **Nota saja** pada saat membuka dialog WhatsApp. Pemilihan foto manual diganti dengan filter tanggal di dialog; galeri tetap bisa difilter untuk mencari arsip tetapi kontrolnya disimpan dalam bagian yang dapat dibuka agar tampilan Laporan ringkas.

**Files:** Modify `index.html`, `receipt-gallery.js`, `warm-ui.css`, spec, service worker; extend `test/receipt_share_test.js`.

- [ ] Uji perencanaan tiga mode dan batas tanggal, lihat tes gagal sebelum helper baru dibuat.
- [ ] Integrasikan tanggal dan tiga mode ke dialog WA; daftar memuat transaksi periode, mode foto menyiapkan semua foto di rentang tanggal, dan fallback memberi unduh per foto serta teks.
- [ ] Periksa browser lokal pada ketiga mode dan layar ponsel; jalankan seluruh tes, cek sintaks dan diff.
- [ ] Commit dan lakukan review keseluruhan sebelum handoff.

Setelah semua task lulus, lakukan review seluruh perubahan terhadap spesifikasi, lalu laporkan commit dan hasil uji. Push/deploy hanya setelah implementasi lokal dan pemeriksaan selesai; verifikasi domain resmi bila deployment memang diminta.
