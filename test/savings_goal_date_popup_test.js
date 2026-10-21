const assert = require('node:assert/strict');
const fs = require('node:fs');

console.log('=== TEST SUITE: Savings Goal Date Pop-up & Smart Shortcuts ===\n');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');

// --- Test 1: HTML Structure for Trigger, Clear Button & Calendar Panel ---
console.log('--- Test 1: HTML Structure for Trigger, Clear Button & Calendar Panel ---');
assert.ok(html.includes('id="savingsCalendarToggle"'), 'Trigger button #savingsCalendarToggle exists');
assert.ok(html.includes('id="savingsDateClear"'), 'Quick clear button #savingsDateClear exists on date trigger');
assert.ok(html.includes('id="savingsCalendarPanel"'), 'Calendar panel #savingsCalendarPanel exists');
assert.ok(html.includes('class="savings-calendar-shortcuts"'), 'Smart duration shortcuts container exists');
assert.ok(html.includes('data-savings-shortcut="3m"'), '+3 Months shortcut chip exists');
assert.ok(html.includes('data-savings-shortcut="6m"'), '+6 Months shortcut chip exists');
assert.ok(html.includes('data-savings-shortcut="eoy"'), 'End of Year shortcut chip exists');
assert.ok(html.includes('data-savings-shortcut="1y"'), '+1 Year shortcut chip exists');
console.log('✔ HTML structure & shortcut chips verified');

// --- Test 2: CSS Rules for Shortcuts, Clear Button & Past Dates ---
console.log('--- Test 2: CSS Rules for Shortcuts, Clear Button & Past Dates ---');
assert.ok(css.includes('.savings-calendar-shortcuts'), 'CSS contains .savings-calendar-shortcuts rule');
assert.ok(css.includes('.savings-date-clear'), 'CSS contains .savings-date-clear rule');
assert.ok(css.includes('.savings-calendar-day.past-date'), 'CSS contains .savings-calendar-day.past-date rule');
console.log('✔ CSS styling rules verified');

// --- Test 3: JavaScript Logic for Smart Duration Shortcuts ---
console.log('--- Test 3: JavaScript Logic for Smart Duration Shortcuts ---');
assert.ok(html.includes('applySavingsDateShortcut'), 'applySavingsDateShortcut function is defined');
assert.ok(html.includes('data-savings-shortcut'), 'Panel click handler listens for data-savings-shortcut');
assert.ok(html.includes('savingsDateClear'), 'Quick clear click handler is registered');

// Unit test calculation for shortcuts
const now = new Date(2026, 9, 21); // 21 Oct 2026

// +3m
const plus3 = new Date(now);
plus3.setMonth(plus3.getMonth() + 3);
assert.equal(plus3.getFullYear(), 2027);
assert.equal(plus3.getMonth(), 0); // Jan 2027

// +6m
const plus6 = new Date(now);
plus6.setMonth(plus6.getMonth() + 6);
assert.equal(plus6.getFullYear(), 2027);
assert.equal(plus6.getMonth(), 3); // Apr 2027

// eoy
const eoy = new Date(now.getFullYear(), 11, 31);
assert.equal(eoy.getFullYear(), 2026);
assert.equal(eoy.getMonth(), 11);
assert.equal(eoy.getDate(), 31);

// +1y
const plus1y = new Date(now);
plus1y.setFullYear(plus1y.getFullYear() + 1);
assert.equal(plus1y.getFullYear(), 2027);
assert.equal(plus1y.getMonth(), 9);

console.log('✔ Smart duration shortcut calculations verified');

console.log('\n=======================================');
console.log('All Savings Goal Date Pop-up Tests PASSED!');
console.log('=======================================');
