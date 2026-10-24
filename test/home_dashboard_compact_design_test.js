const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');
const balanceCard = html.match(/<section class="card balance">([\s\S]*?)<\/section>/)?.[1] || '';

test('orange home dashboard follows the approved header and single-card balance layout', () => {
  assert.ok(balanceCard, 'home balance card should exist');
  assert.match(balanceCard, /Sisa Uang Bebas/);
  assert.match(balanceCard, /id="freeMoneyTotal"/);
  assert.match(balanceCard, /Aman dibelanjakan hari ini/);
  assert.match(balanceCard, /id="dailySafeAmount"[^>]*title=/);
  assert.match(balanceCard, /class="home-cash-stats"[\s\S]*Pemasukan[\s\S]*id="homeCycleIncome"[\s\S]*Terpakai[\s\S]*id="homeFreeMoneySpent"/);
  assert.match(balanceCard, /class="home-safe-row"[\s\S]*id="safeStatusBadge"/);
  assert.doesNotMatch(balanceCard, /homePeriod|home-safe-spend|daily-guidance-note/);
  const header = html.match(/<header class="topbar home-topbar">([\s\S]*?)<\/header>/)?.[1] || '';
  assert.match(header, /id="pageTitle">Beranda/);
  assert.match(header, /id="pageSubtitle"/);
  assert.match(header, /class="home-cycle-pill"[\s\S]*id="homePeriod"/);
  assert.match(header, /class="home-settings-btn" data-nav="settings"/);
  assert.match(html, /if\(page==='home'\)\{label\.textContent='Pintasan'/);
  assert.match(css, /\.page\[data-page="home"\] \.balance/);
  assert.match(css, /\.home-safe-row\s*\{/);
  assert.match(css, /\.home-cash-stats\s*\{/);
});

test('active positions and a single recent transaction match the compact mockup hierarchy', () => {
  const quickEntryIndex = html.indexOf('id="home-quick"');
  const budgetIndex = html.indexOf('id="budgetContainer"');
  const savingsIndex = html.indexOf('id="homeSavingsGoals"');
  const categoryIndex = html.indexOf('id="homeCategories"');
  const transactionSectionIndex = html.indexOf('class="card home-recent-transactions"');
  const transactionIndex = html.indexOf('id="homeTxList"');
  assert.equal((html.match(/id="homeTxList"/g) || []).length, 1, 'recent transaction list must have one unique home target');
  assert.ok(quickEntryIndex < budgetIndex, 'the Pos aktif toggle should follow quick entry');
  assert.ok(budgetIndex < categoryIndex, 'the spending chart should follow the Pos aktif toggle');
  assert.match(html, /id="home-quick">[\s\S]*?<\/section>\s*<details class="home-active-pockets-details" id="budgetContainer">/);
  assert.match(html, /<details class="home-active-pockets-details" id="budgetContainer">\s*<summary[\s\S]*?<strong>Pos aktif<\/strong>[\s\S]*?id="homeActivePocketsStatus"/);
  assert.ok(categoryIndex < savingsIndex, 'the spending chart should appear before savings');
  assert.ok(categoryIndex < transactionSectionIndex, 'the spending chart should be visible before recent transactions');
  assert.doesNotMatch(html, /<details class="home-active-pockets-details" id="budgetContainer" open>/);
  assert.match(html, /<details class="home-active-pockets-details" id="budgetContainer">\s*<summary[\s\S]*?<strong>Pos aktif<\/strong>/);
  assert.match(html, /home-pocket-progress-row[\s\S]*home-pocket-percent/);
  assert.match(html, /arr\.slice\(0,1\)\.map\(homeTxItem\)/);
  assert.match(html, /home-recent-head"><h3>Transaksi terbaru<\/h3>/);
  assert.match(css, /\.page\[data-page="home"\] \.home-pocket-progress-row/);
  assert.match(html, /<details class="home-spending-details" open>/);
  assert.match(css, /\.page\[data-page="home"\] \.home-spending-details/);
  assert.ok(categoryIndex < transactionIndex, 'the category chart should appear before recent transactions');
});
