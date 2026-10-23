const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'ui-icons.js');
assert.ok(fs.existsSync(modulePath), 'katalog ikon SVG lokal belum dibuat');
const { catalog } = require(modulePath);
assert.ok(catalog.length >= 50, 'pemilih ikon perlu sedikitnya 50 pilihan terkurasi');

const values = new Set();
for (const item of catalog) {
  assert.ok(item.value && item.label && item.file && item.group);
  assert.ok(!values.has(item.value), `ikon ${item.value} berulang`);
  values.add(item.value);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'icons', 'category', `${item.file}.svg`)), `aset ${item.file} hilang`);
}

for (const group of ['Sehari-hari', 'Rumah & keluarga', 'Tagihan & keuangan', 'Lainnya']) {
  assert.ok(catalog.some(item => item.group === group), `kelompok ${group} kosong`);
}

for (const label of ['Kerja', 'Dinas', 'Rapat', 'Proyek', 'Transportasi dinas', 'Penginapan']) {
  assert.ok(catalog.some(item => item.label === label), `katalog perlu ikon ${label}`);
}
assert.ok(catalog.some(item => item.group === 'Kerja & dinas'), 'ikon kerja dan dinas perlu kelompok tersendiri');

const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const precacheNames = serviceWorker.match(/const ICON_NAMES = '([^']+)'\.split/)[1].split(' ');
for (const name of precacheNames) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'icons', 'category', `${name}.svg`)), `aset PWA ${name} hilang`);
}
