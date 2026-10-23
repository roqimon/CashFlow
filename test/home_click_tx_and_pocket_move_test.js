const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

function setupTestContext() {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('id="pocketActionViewTx"'), 'pocketActionViewTx button must exist in modal');
  assert.ok(html.includes('data-action="view-pocket-tx"'), 'view-pocket-tx action must exist');
  assert.ok(html.includes('function navPocket('), 'navPocket function must exist');
  assert.ok(html.includes('function quickMoveTxPocket('), 'quickMoveTxPocket function must exist');
  assert.ok(html.includes('quick-move-pocket-select'), 'quick-move-pocket-select must exist');
}

test('Home click pocket navigation and quick move transaction', () => {
  setupTestContext();
});
