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

test('savings goals keep an independent home visibility flag through normalization and edits', () => {
  const legacy = savings.normalizeSavings({ goals: [
    { id: 'old', name: 'Tujuan lama', targetAmount: 100000 },
    { id: 'hidden', name: 'Tujuan disembunyikan', targetAmount: 200000, isActive: false },
  ] });

  assert.equal(legacy.goals.find(goal => goal.id === 'old').isActive, true, 'legacy goals remain visible by default');
  assert.equal(legacy.goals.find(goal => goal.id === 'hidden').isActive, false);
  assert.equal(savings.upsertGoal(legacy, { ...legacy.goals[1], name: 'Tujuan diperbarui' }).goals.find(goal => goal.id === 'hidden').isActive, false);
  assert.equal(savings.upsertGoal(legacy, { id: 'new', name: 'Tujuan baru', targetAmount: 300000 }).goals.find(goal => goal.id === 'new').isActive, true);
});

test('Settings has a collapsed savings manager and Home only renders active savings goals', () => {
  assert.match(html, /data-settings-toggle="savings"[^>]*aria-expanded="false"[^>]*aria-controls="settingsSavingsPanel"/);
  assert.match(html, /<div id="settingsSavingsPanel" hidden>/);
  assert.match(html, /data-toggle-savings-home/);
  assert.match(html, /goal\.status==='active'&&goal\.isActive!==false/);
  assert.match(html, /homeSavingsGoals'\);\s*if\(section\)section\.hidden=!active\.length/);
  assert.match(html, /budgetContainer'\);\s*const visibleBudgetPockets=activePockets\.filter/);
});

test('savings goals keep an independent home visibility flag through normalization and edits', () => {
  const legacy = savings.normalizeSavings({ goals: [
    { id: 'old', name: 'Tujuan lama', targetAmount: 100000 },
    { id: 'hidden', name: 'Tujuan disembunyikan', targetAmount: 200000, isActive: false },
  ] });

  assert.equal(legacy.goals.find(goal => goal.id === 'old').isActive, true, 'legacy goals remain visible by default');
  assert.equal(legacy.goals.find(goal => goal.id === 'hidden').isActive, false);
  assert.equal(savings.upsertGoal(legacy, { ...legacy.goals[1], name: 'Tujuan diperbarui' }).goals.find(goal => goal.id === 'hidden').isActive, false);
  assert.equal(savings.upsertGoal(legacy, { id: 'new', name: 'Tujuan baru', targetAmount: 300000 }).goals.find(goal => goal.id === 'new').isActive, true);
});

test('Settings has a collapsed savings manager and Home only renders active savings goals', () => {
  assert.match(html, /data-settings-toggle="savings"[^>]*aria-expanded="false"[^>]*aria-controls="settingsSavingsPanel"/);
  assert.match(html, /<div id="settingsSavingsPanel" hidden>/);
  assert.match(html, /data-toggle-savings-home/);
  assert.match(html, /goal\.status==='active'&&goal\.isActive!==false/);
  assert.match(html, /homeSavingsGoals'\);\s*if\(section\)section\.hidden=!active\.length/);
  assert.match(html, /budgetContainer'\);\s*if\(section\)section\.hidden=activePockets\.length===0/);
});

test('home daily amount explains that it is a record-based suggestion, not a spending requirement', () => {
  assert.match(html, /id="dailySafeAmount"/);
  assert.match(html, /Saran belanja harian/);
  assert.match(html, /Berdasarkan catatanmu/);
});

test('savings detail exposes edit and delete actions', () => {
  assert.match(html, /data-action="edit-savings-goal"/);
  assert.match(html, /data-action="delete-savings-goal"/);
});
