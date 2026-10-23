const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const WorkReport = require('../work-report.js');

test('work report maps the selected ST expense types to the declaration columns', () => {
  const result = WorkReport.buildRows([
    { id: 'fuel', source: 'st', type: 'expense', workType: 'Fuel', amount: 70000, createdAt: '2026-10-07T12:00:00.000Z', note: 'SPBU' },
    { id: 'family', source: 'personal', type: 'expense', workType: 'Fuel', amount: 10000, createdAt: '2026-10-07T13:00:00.000Z' },
    { id: 'income', source: 'st', type: 'income', workType: 'Fuel', amount: 100000, createdAt: '2026-10-07T14:00:00.000Z' }
  ], { from: '2026-10-01', to: '2026-10-31' });

  assert.deepEqual(result.errors, []);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].date, '2026-10-07');
  assert.equal(result.rows[0].amounts.K, 70000);
  assert.equal(result.rows[0].note, 'SPBU');
  assert.equal(result.rows[0].noWo, '');
});

test('work report rejects an ST expense without a declaration type', () => {
  const result = WorkReport.buildRows([
    { id: 'unknown', source: 'st', type: 'expense', amount: 1000, createdAt: '2026-10-07T12:00:00.000Z' }
  ], { from: '2026-10-01', to: '2026-10-31' });

  assert.equal(result.rows.length, 0);
  assert.deepEqual(result.errors, [{ id: 'unknown', title: 'Transaksi', message: 'Pilih jenis pengeluaran deklarasi.' }]);
});

test('work report recognizes common declaration labels from existing ST transaction details', () => {
  const result = WorkReport.buildRows([
    { id: 'tol-old', source: 'st', type: 'expense', category: 'Transportasi', title: 'Tol Palembang', amount: 25000, createdAt: '2026-10-07T12:00:00.000Z' }
  ], { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(result.errors, []);
  assert.equal(result.rows[0].type, 'Tol');
  assert.equal(result.rows[0].amounts.I, 25000);
});

test('generated workbook is a readable xlsx with the expected sheets, dates, columns, and blank No WO', () => {
  const bytes = WorkReport.createWorkbook([
    { date: '2026-10-07', type: 'Fuel', amount: 70000, note: 'Sesi kerja · SPBU' },
    { date: '2026-10-10', type: 'Tol', amount: 25000, note: 'Sesi kerja · Tol' }
  ]);
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);

  const script = String.raw`import io, json, sys, openpyxl
wb = openpyxl.load_workbook(io.BytesIO(sys.stdin.buffer.read()), data_only=True)
ws = wb['Deklarasi']
assert wb.sheetnames == ['Deklarasi', 'Lainnya']
assert ws['A3'].value.strftime('%Y-%m-%d') == '2026-10-07'
assert ws['K3'].value == 70000
assert ws['M3'].value is None
assert ws['A4'].value.strftime('%Y-%m-%d') == '2026-10-10'
assert ws['I4'].value == 25000
assert ws['M4'].value is None
print('xlsx-ok')`;
  const checked = spawnSync('python', ['-c', script], { input: Buffer.from(bytes), encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  assert.match(checked.stdout, /xlsx-ok/);
});

test('export workbook filename follows the full selected date range', () => {
  assert.equal(WorkReport.fileName('2026-10-07', '2026-10-10'), 'ST 07-10-2026 - 10-10-2026.xlsx');
});

test('report archive preserves workbook and receipt bytes', () => {
  const archive = WorkReport.createZip([
    { name: 'ST 07-10-2026 - 10-10-2026.xlsx', data: new Uint8Array([0x50,0x4b,0x03,0x04]) },
    { name: 'pengeluaran_2026-10-07_SPBU.jpg', data: new Uint8Array([0xff,0xd8,0xff,0xd9]) }
  ]);
  const script = String.raw`import io, sys, zipfile
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert z.namelist()==['ST 07-10-2026 - 10-10-2026.xlsx','pengeluaran_2026-10-07_SPBU.jpg']
assert z.read(z.namelist()[0])==bytes([0x50,0x4b,0x03,0x04])
assert z.read(z.namelist()[1])==bytes([0xff,0xd8,0xff,0xd9])
print('zip-ok')`;
  const checked = spawnSync('python', ['-c', script], { input: Buffer.from(archive), encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  assert.match(checked.stdout, /zip-ok/);
});
