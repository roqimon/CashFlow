const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: Catat Cepat, Autofill Bugfix, & Pos Anggaran Refinements ===\n');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Test 1: Catat Cepat "contoh cepat" is removed
console.log('--- Test 1: Hapus Contoh Cepat di Modal Catat Cepat ---');
assert.ok(!html.includes('focus-examples'), '❌ .focus-examples harus sudah dihapus dari index.html');
assert.ok(!html.includes('data-focus-example'), '❌ atribut data-focus-example harus sudah dihapus');
console.log('✔ Contoh cepat pada Catat Cepat berhasil dihapus.');

// Test 2: Tidak ada type="password" yang memicu autofill email & password browser
console.log('\n--- Test 2: Mencegah Autofill Email & Password Browser ---');
const passwordMatches = html.match(/type=["']password["']/gi);
assert.strictEqual(passwordMatches, null, '❌ Tidak boleh ada type="password" di index.html');
assert.ok(html.includes('api-key-masked'), '✔ Class api-key-masked digunakan untuk masking token');
assert.ok(html.includes('-webkit-text-security: disc'), '✔ Styling text-security disc diimplementasikan');
assert.ok(html.includes('toggle-api-key-btn'), '✔ Tombol toggle eye (lihat/sembunyikan key) tersedia');
assert.ok(html.includes('id="pocketForm" autocomplete="off"'), '✔ pocketForm memiliki autocomplete="off"');
assert.ok(html.includes('id="shortcutForm" autocomplete="off"'), '✔ shortcutForm memiliki autocomplete="off"');
console.log('✔ Penyebab autofill email & sandi browser berhasil diperbaiki!');

// Test 3: Kolom Modal Pos Anggaran Baru rapi & proporsional
console.log('\n--- Test 3: Tata Letak Kolom Modal Pos Anggaran Baru ---');
assert.ok(html.includes('grid-template-columns:1fr 72px'), '✔ Nama Pos (1fr) dan Ikon (72px) menggunakan proporsi kolom rapi');
assert.ok(html.includes('id="pocketIconPicker"'), '✔ Emoji picker untuk pos anggaran tersedia');
console.log('✔ Kolom icon dibuat kecil/kompak (72px) dan nama pos mendapatkan ruang lega!');

// Test 4: Contoh langsung ditulis agar user mudah memahami
console.log('\n--- Test 4: Contoh Langsung Ditulis di Form & Template Cepat ---');
assert.ok(html.includes('id="pocketPresetBox"'), '✔ Bagian contoh siap pakai pos anggaran tersedia');
assert.ok(html.includes('pocket-sample-btn'), '✔ Tombol template contoh siap pakai tersedia');
assert.ok(html.includes('Contoh:</strong> Belanja Dapur, Uang Sekolah, Bensin'), '✔ Contoh Nama Pos tertulis langsung di bawah input');
assert.ok(html.includes('Contoh:</strong> 2.500.000 atau ketik 2500000'), '✔ Contoh Jatah Bulanan tertulis langsung di bawah input');
assert.ok(html.includes('Contoh:</strong> makan, belanja, dapur, sayur, beras'), '✔ Contoh Kategori Terkait tertulis langsung di bawah input');
console.log('✔ Seluruh contoh langsung tertulis jelas dan informatif bagi user!');

// Test 5: Pintasan Form Refinements
console.log('\n--- Test 5: Form Pintasan di Menu Pintasan ---');
assert.ok(html.includes('id="shortcutForm"'), '✔ shortcutForm tersedia');
assert.ok(html.includes('id="scCode" required placeholder="Contoh: bbm, kopi"'), '✔ Contoh kode pintasan jelas');
console.log('✔ Form pintasan terverifikasi rapi.');

console.log('\n=======================================');
console.log('All Refinements & Bugfix Tests PASSED! 🎉');
console.log('=======================================');
