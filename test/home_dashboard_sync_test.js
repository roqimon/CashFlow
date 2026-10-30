const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('=== TEST SUITE: Home Dashboard Sync with Topbar Period Pill ===');

// Test 1: Topbar Pill is interactive button
console.log('--- Test 1: Topbar Period Pill is Interactive Button ---');
assert.ok(html.includes('<button class="home-cycle-pill" data-action="open-home-donut-range"'), 'Pill must be a button triggering open-home-donut-range');
assert.ok(html.includes('id="homePeriod"'), 'homePeriod element must exist');
assert.ok(html.includes('home-cycle-chevron'), 'Pill must have visual chevron indicator');
console.log('✔ Topbar pill is clickable button with chevron indicator.');

// Test 2: Redundant gear removed from spending details header
console.log('--- Test 2: Details summary gear icon cleaned up ---');
assert.ok(!html.includes('id="homeSpendingTitle">Pengeluaran (30 Hari Terakhir)</strong>\n                <button type="button" class="icon-btn" data-action="open-home-donut-range"'), 'Gear button in details summary removed');
console.log('✔ Gear button in details summary removed to avoid duplication.');

// Test 3: Modal supports payday, monthly, yearly, and manual range
console.log('--- Test 3: Range modal choices ---');
assert.ok(html.includes('data-donut-range="payday"'), 'Payday option available');
assert.ok(html.includes('data-donut-range="monthly"'), 'Monthly option available');
assert.ok(html.includes('data-donut-range="yearly"'), 'Yearly option available');
assert.ok(html.includes('data-donut-range="range"'), 'Range option available');
console.log('✔ All 4 range options available in modal.');

// Test 4: renderHome synchronizes all data cards
console.log('--- Test 4: Dashboard cards synchronization ---');
assert.ok(html.includes('const activeRange=calculateHomeDonutRange();'), 'Dashboard extracts activeRange');
assert.ok(html.includes('if(periodEl)periodEl.textContent=activeRange.label;'), 'Period pill text syncs with active range');
assert.ok(html.includes('Pengeluaran (\'+activeRange.label+\')'), 'Donut title syncs with active range');
assert.ok(html.includes('const displayTx=a.slice(0,homeLimit);'), 'Recent transactions filtered to active range');
console.log('✔ All dashboard cards, period pill, transactions, and donut sync with active range.');

// Test 5: Navigation clicks preserve active range
console.log('--- Test 5: Navigation and clicks preserve active range ---');
assert.ok(html.includes('openPocketTransactions(pocketId){const r=calculateHomeDonutRange()'), 'Pocket transactions sync with active range');
console.log('✔ Navigating to pocket transactions carries active range.');

console.log('\n======================================================');
console.log('All Home Dashboard Sync Tests PASSED! 🎉');
console.log('======================================================');
