const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const savings = require('../savings-core.js');
const html = fs.readFileSync('index.html', 'utf8');

test('deleting a savings goal also removes only its linked history', () => {
  const data = {
    goals: [
      { id: 'qurban', name: 'Qurban', targetAmount: 3000000 },
      { id: 'emergency', name: 'Darurat', targetAmount: 5000000 },
    ],
    entries: [
      { id: 'q1', goalId: 'qurban', type: 'deposit', amount: 100000, date: '2026-10-24' },
      { id: 'e1', goalId: 'emergency', type: 'deposit', amount: 200000, date: '2026-10-24' },
    ],
  };

  const updated = savings.deleteGoal(data, 'qurban');

  assert.deepEqual(updated.goals.map(goal => goal.id), ['emergency']);
  assert.deepEqual(updated.entries.map(entry => entry.id), ['e1']);
  assert.equal(data.goals.length, 2, 'deleting is immutable and leaves the input unchanged');
});

test('unknown savings goal cannot be deleted accidentally', () => {
  assert.throws(() => savings.deleteGoal(savings.emptySavings(), 'missing'), /tidak ditemukan/i);
});

test('home daily amount explains that it is a record-based suggestion, not a spending requirement', () => {
  assert.match(html, /id="dailySafeAmount"/);
  assert.match(html, /bukan saldo|bukan jumlah wajib/i);
  assert.match(html, /dari catatan|transaksi yang belum dicatat/i);
});

test('savings detail exposes edit and delete actions', () => {
  assert.match(html, /data-action="edit-savings-goal"/);
  assert.match(html, /data-action="delete-savings-goal"/);
});
