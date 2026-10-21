const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../savings-core.js');

const qurban = {
  id: 'goal-qurban',
  name: 'Qurban 2027',
  targetAmount: 3500000,
  targetDate: '2027-05-17',
  iconKey: 'qurban',
  status: 'active',
  createdAt: '2026-10-21T00:00:00.000Z',
};
const education = {
  id: 'goal-school',
  name: 'Pendidikan',
  targetAmount: 10000000,
  targetDate: null,
  iconKey: 'education',
  status: 'active',
  createdAt: '2026-10-21T00:00:00.000Z',
};

const empty = core.emptySavings();
assert.deepEqual(empty, { goals: [], entries: [] });

const customIconGoal = core.upsertGoal(empty, {
  id: 'goal-custom-icon', name: 'Biaya buku', targetAmount: 750000,
  targetDate: '2027-06-01', iconKey: 'general', customIcon: '📚',
}).goals.find(goal => goal.id === 'goal-custom-icon');
assert.equal(customIconGoal.customIcon, '📚', 'custom catalog icons persist on a goal');

let savings = core.upsertGoal(empty, qurban);
savings = core.upsertGoal(savings, education);
savings = core.addEntry(savings, {
  id: 'entry-1', goalId: qurban.id, type: 'deposit', amount: 1250000,
  date: '2026-10-21', note: 'Setoran awal',
});
savings = core.addEntry(savings, {
  id: 'entry-2', goalId: qurban.id, type: 'deposit', amount: 100000,
  date: '2026-10-22', note: '',
});
assert.deepEqual(core.goalStats(savings, qurban.id), {
  balance: 1350000,
  targetAmount: 3500000,
  remaining: 2150000,
  percent: 39,
  progressPercent: 39,
  overTarget: 0,
  isComplete: false,
});

savings = core.addEntry(savings, {
  id: 'entry-3', goalId: qurban.id, type: 'withdrawal', amount: 50000,
  date: '2026-10-23', note: 'Koreksi setoran',
});
assert.equal(core.goalBalance(savings, qurban.id), 1300000);
assert.throws(() => core.addEntry(savings, {
  id: 'entry-too-large', goalId: qurban.id, type: 'withdrawal', amount: 1300001,
  date: '2026-10-23', note: '',
}), /saldo tabungan/i, 'withdrawals cannot exceed a goal balance');
assert.throws(() => core.addEntry(savings, {
  id: 'entry-zero', goalId: qurban.id, type: 'deposit', amount: 0,
  date: '2026-10-23', note: '',
}), /nominal/i, 'entries must have a positive amount');
assert.throws(() => core.addEntry(savings, {
  id: 'entry-bad-date', goalId: qurban.id, type: 'deposit', amount: 1000,
  date: '2026-02-30', note: '',
}), /tanggal/i, 'entry dates must be real calendar dates');

const overTarget = core.addEntry(savings, {
  id: 'entry-finish', goalId: qurban.id, type: 'deposit', amount: 3000000,
  date: '2026-10-24', note: '',
});
assert.deepEqual(core.goalStats(overTarget, qurban.id), {
  balance: 4300000,
  targetAmount: 3500000,
  remaining: 0,
  percent: 123,
  progressPercent: 100,
  overTarget: 800000,
  isComplete: true,
});

const imported = {
  goals: [{ ...qurban, name: 'Qurban keluarga' }],
  entries: [
    { id: 'entry-1', goalId: qurban.id, type: 'deposit', amount: 1250000, date: '2026-10-21', note: 'Cadangan terbaru' },
    { id: 'entry-import', goalId: qurban.id, type: 'deposit', amount: 50000, date: '2026-10-25', note: 'Impor' },
    { id: 'orphan', goalId: 'missing-goal', type: 'deposit', amount: 90000, date: '2026-10-25', note: '' },
  ],
};
const merged = core.mergeSavings(savings, imported);
assert.equal(merged.goals.length, 2, 'backup merge keeps local goals and adds imported goals');
assert.equal(merged.goals.find(goal => goal.id === qurban.id).name, 'Qurban keluarga', 'matching goal IDs accept the backup version');
assert.equal(merged.entries.filter(entry => entry.id === 'entry-1').length, 1, 'backup entries merge by stable ID');
assert.equal(merged.entries.find(entry => entry.id === 'entry-1').note, 'Cadangan terbaru');
assert.equal(merged.entries.some(entry => entry.id === 'orphan'), false, 'entries without a goal are ignored');
assert.equal(core.goalBalance(merged, qurban.id), 1350000);

const archived = core.upsertGoal(savings, { ...education, status: 'archived' });
assert.throws(() => core.addEntry(archived, {
  id: 'entry-archived', goalId: education.id, type: 'deposit', amount: 1000,
  date: '2026-10-26', note: '',
}), /arsip/i, 'archived goals cannot receive new entries');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(html, /savings-core\.js/, 'production page loads the tested savings core');
assert.match(html, /id="homeSavingsGoals"/, 'home page renders a savings section after quick input');
assert.match(html, /savings:getSavings\(\)/, 'JSON backup includes savings goals and their entries');
assert.match(html, /mergeSavings\(/, 'JSON restore merges savings data');
assert.match(html, /saveSavings\(savingsCore\.emptySavings\(\)\)/, 'clear all data clears savings records');
assert.match(html, /data-action="open-savings"/, 'home section links to the savings overview');
assert.match(html, /id="savingsCustomIconPicker"/, 'goal form provides the searchable app icon catalog');
assert.match(html, /data-savings-custom-icon/, 'custom savings icon choices can be selected');
assert.match(html, /customIcon:\$\('savingsGoalCustomIcon'\)\.value/, 'goal form saves the selected custom icon');

const homePage = html.slice(html.indexOf('data-page="home"'), html.indexOf('data-page="transactions"'));
assert.ok(homePage.indexOf('id="home-quick"') < homePage.indexOf('id="homeSavingsGoals"'), 'quick transaction input stays above savings');
assert.ok(homePage.indexOf('id="homeSavingsGoals"') < homePage.indexOf('id="homeCategories"'), 'savings appears before spending categories');
assert.match(homePage, /id="voiceBtn"/, 'voice input remains available on home');
assert.match(homePage, /id="scanBtn"/, 'receipt photo input remains available on home');

const serviceWorker = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
assert.match(serviceWorker, /savings-core\.js/, 'PWA precaches savings logic');
assert.match(serviceWorker, /savings-sheep/, 'PWA precaches the Qurban sheep icon');
assert.match(serviceWorker, /graduation-cap/, 'PWA precaches the Education cap icon');
for (const icon of ['savings-sheep', 'graduation-cap']) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'icons', 'category', `${icon}.svg`)), `${icon} asset exists locally`);
}

console.log('Savings goal balance, validation, backup, home order, and PWA asset tests passed.');
