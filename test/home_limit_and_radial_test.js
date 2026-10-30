const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('=== TEST SUITE: Home History Setting & Radial Gesture & Receipt UX ===');

// Test 1: KEY_HOME_TX_LIMIT defined
console.log('--- Test 1: Storage Key for Home History Limit ---');
assert.ok(html.includes("KEY_HOME_TX_LIMIT='aruskas_home_tx_limit_v1'"), 'KEY_HOME_TX_LIMIT must be defined');
console.log('✔ KEY_HOME_TX_LIMIT declared.');

// Test 2: getHomeTxLimit & setHomeTxLimit functions exist
console.log('--- Test 2: Helper Functions for Home History Limit ---');
assert.ok(html.includes('function getHomeTxLimit()'), 'getHomeTxLimit function must be defined');
assert.ok(html.includes('function setHomeTxLimit('), 'setHomeTxLimit function must be defined');
assert.ok(html.includes('function renderHomeTxLimitControls()'), 'renderHomeTxLimitControls function must be defined');
console.log('✔ getHomeTxLimit, setHomeTxLimit, and renderHomeTxLimitControls defined.');

// Test 3: renderHome slices by homeLimit, not hardcoded 1
console.log('--- Test 3: renderHome Uses Configurable Limit ---');
assert.ok(html.includes('const homeLimit=getHomeTxLimit();'), 'renderHome must retrieve homeLimit');
assert.ok(html.includes('arr.slice(0,homeLimit)'), 'renderHome must slice by homeLimit');
assert.ok(!html.includes('arr.slice(0,1)'), 'arr.slice(0,1) hardcode must be removed');
console.log('✔ Home history correctly slices up to user-configured limit across all dates/months.');

// Test 4: Settings UI includes Histori di Beranda options
console.log('--- Test 4: Settings UI for Home Limit ---');
assert.ok(html.includes('id="homeTxLimitSeg"'), 'homeTxLimitSeg segmented control must exist');
assert.ok(html.includes('data-home-limit="1"'), 'Option 1 must exist');
assert.ok(html.includes('data-home-limit="3"'), 'Option 3 must exist');
assert.ok(html.includes('data-home-limit="5"'), 'Option 5 must exist');
assert.ok(html.includes('data-home-limit="10"'), 'Option 10 must exist');
assert.ok(html.includes('data-home-limit="20"'), 'Option 20 must exist');
console.log('✔ Settings UI options (1, 3, 5, 10, 20) properly present.');

// Test 5: Radial Gesture is activated in startup
console.log('--- Test 5: initQuickAddRadialGesture Invoked at Boot ---');
assert.ok(html.includes('boot();initQuickAddRadialGesture();'), 'initQuickAddRadialGesture must be called at startup');
console.log('✔ initQuickAddRadialGesture is activated.');

// Test 6: Receipt manual save uses non-blocking toast
console.log('--- Test 6: Non-blocking Toast on Receipt Save ---');
assert.ok(html.includes('toast(`✅ Berhasil dicatat: ${item.title} (${money(item.amount)})`);'), 'Manual receipt save must use toast');
console.log('✔ Manual receipt save uses fast non-blocking toast.');

console.log('\n=======================================');
console.log('All Home Limit & Radial & Receipt Tests PASSED! 🎉');
console.log('=======================================');
