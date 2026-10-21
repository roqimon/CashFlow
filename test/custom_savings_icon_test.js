const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../savings-core.js');
const icons = require('../ui-icons.js');

const saved = core.upsertGoal(core.emptySavings(), {
  id: 'goal-books',
  name: 'Biaya buku',
  targetAmount: 750000,
  targetDate: '2027-06-01',
  iconKey: 'general',
  customIcon: '📚',
});
assert.equal(saved.goals[0].customIcon, '📚', 'chosen icon survives goal normalization');
assert.equal(core.mergeSavings(core.emptySavings(), saved).goals[0].customIcon, '📚', 'chosen icon survives backup restore');
assert.equal(icons.assetFor('📚'), './icons/category/book-open.svg', 'the searchable catalog returns its local SVG asset');

const html = fs.readFileSync('index.html', 'utf8');
assert.ok(html.includes('id="savingsCustomIconPicker"'), 'goal form includes the searchable icon picker');
assert.ok(html.includes('data-savings-custom-icon'), 'icon choices have an event hook');
assert.ok(html.includes("customIcon:$('savingsGoalCustomIcon').value"), 'the selected icon is stored on a goal');
assert.ok((html.match(/savingsIconHtml\(goal\.iconKey,goal\.customIcon\)/g) || []).length >= 3, 'home, list, and detail render a custom goal icon');

console.log('Custom savings icon selection, persistence, backup, catalog asset, and display tests passed.');
