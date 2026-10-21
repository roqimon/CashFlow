const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('index.html', 'utf8');
const start = source.indexOf('function convertSpokenIndonesianNumbers(');
assert.ok(start >= 0, 'konversi angka tidak ditemukan');
let depth = 0, opened = false, end = -1;
for (let i = start; i < source.length; i++) {
  if (source[i] === '{') { depth++; opened = true; }
  if (source[i] === '}') { depth--; if (opened && depth === 0) { end = i + 1; break; } }
}
assert.ok(end > start, 'fungsi konversi tidak lengkap');

const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);
const convert = context.convertSpokenIndonesianNumbers;

assert.equal(convert('gaji 5 juta'), 'gaji 5 juta');
assert.equal(convert('makan siang 35 ribu'), 'makan siang 35 ribu');
assert.equal(convert('bensin 30 rb'), 'bensin 30 rb');
assert.equal(convert('gaji lima juta'), 'gaji 5000000');
assert.equal(convert('bensin lima puluh ribu'), 'bensin 50000');
