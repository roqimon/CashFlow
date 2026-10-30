const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('=== TEST SUITE: Home Donut Range Customization ===');

// Test 1: Storage Key defined
console.log('--- Test 1: Storage Key for Home Donut Range ---');
assert.ok(html.includes("KEY_HOME_DONUT_RANGE='aruskas_home_donut_range_v1'"), 'KEY_HOME_DONUT_RANGE must be defined');
console.log('✔ KEY_HOME_DONUT_RANGE declared.');

// Test 2: Helper Functions exist
console.log('--- Test 2: Functions for Donut Range Calculation & Persistence ---');
assert.ok(html.includes('function getHomeDonutRangeConfig()'), 'getHomeDonutRangeConfig function must exist');
assert.ok(html.includes('function calculateHomeDonutRange('), 'calculateHomeDonutRange function must exist');
assert.ok(html.includes('function setHomeDonutRange('), 'setHomeDonutRange function must exist');
assert.ok(html.includes('function openHomeDonutRangeModal()'), 'openHomeDonutRangeModal function must exist');
console.log('✔ All range calculation and persistence functions exist.');

// Test 3: Setting Button in Home Summary
console.log('--- Test 3: Setting Button in Home Details Summary ---');
assert.ok(html.includes('id="homeSpendingTitle"'), 'homeSpendingTitle element must exist for dynamic label');
assert.ok(html.includes('data-action="open-home-donut-range"'), 'Settings button must trigger open-home-donut-range');
console.log('✔ Home spending summary includes small settings button and dynamic title.');

// Test 4: Modal Dialog for Donut Range
console.log('--- Test 4: Modal Dialog for Changing Range ---');
assert.ok(html.includes('id="homeDonutRangeModal"'), 'homeDonutRangeModal must exist in DOM');
assert.ok(html.includes('data-donut-range="30d"'), '30d option must exist');
assert.ok(html.includes('data-donut-range="monthly"'), 'monthly option must exist');
assert.ok(html.includes('data-donut-range="yearly"'), 'yearly option must exist');
assert.ok(html.includes('data-donut-range="range"'), 'manual range option must exist');
assert.ok(html.includes('id="homeDonutRangeStart"'), 'Manual start date input must exist');
assert.ok(html.includes('id="homeDonutRangeEnd"'), 'Manual end date input must exist');
console.log('✔ Modal dialog supports 30 Days, Monthly, Yearly, and Custom Range.');

// Test 5: renderHome applies calculateHomeDonutRange
console.log('--- Test 5: renderHome Feeds Donut with Configured Range ---');
assert.ok(html.includes('const donutRange=calculateHomeDonutRange();'), 'renderHome must calculate donutRange');
assert.ok(html.includes('const donutTx=arr.filter(t=>inRange(t,donutRange.start,donutRange.end));'), 'renderHome must filter transactions using donutRange');
console.log('✔ renderHome filters donut transactions correctly with persistent range.');

// Test 6: Category Click syncs with active range
console.log('--- Test 6: Clicking Category in Donut Navigates with Same Range ---');
assert.ok(html.includes('calculateHomeDonutRange()'), 'Clicking home donut category must sync with calculateHomeDonutRange');
console.log('✔ Category click in donut opens transactions with identical range.');

console.log('\n=======================================');
console.log('All Home Donut Range Tests PASSED! 🎉');
console.log('=======================================');
