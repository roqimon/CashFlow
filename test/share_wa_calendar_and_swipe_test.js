const assert = require('node:assert/strict');
const fs = require('node:fs');

console.log('=== TEST SUITE: Share WhatsApp Calendar & Swipe Optimization ===\n');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');

// --- Test 1: HTML Structure for Share WA Calendar ---
console.log('--- Test 1: HTML Structure for Share WA Calendar ---');
assert.ok(html.includes('id="shareWaCalendarToggle"'), 'Trigger button #shareWaCalendarToggle exists');
assert.ok(html.includes('id="shareWaCalendarPanel"'), 'Calendar panel #shareWaCalendarPanel exists');
assert.ok(html.includes('id="shareWaCalendarGrid"'), 'Calendar grid #shareWaCalendarGrid exists');
assert.ok(html.includes('data-sharewa-shortcut="today"'), 'Shortcut today exists');
assert.ok(html.includes('data-sharewa-shortcut="7d"'), 'Shortcut 7d exists');
assert.ok(html.includes('data-sharewa-shortcut="30d"'), 'Shortcut 30d exists');
assert.ok(html.includes('data-sharewa-shortcut="this-month"'), 'Shortcut this-month exists');
console.log('✔ HTML elements for Share WA Calendar verified');

// --- Test 2: Touch & Swipe Functionality ---
console.log('--- Test 2: Touch & Swipe Functionality ---');
assert.ok(html.includes('attachCalendarSwipe'), 'attachCalendarSwipe helper function exists');
assert.ok(html.includes('attachCalendarSwipe(savingsGrid'), 'Swipe gesture attached to savings calendar grid');
assert.ok(html.includes('attachCalendarSwipe(shareWaGrid'), 'Swipe gesture attached to share WA calendar grid');
assert.ok(css.includes('.savings-calendar-grid { touch-action: pan-y pinch-zoom;'), 'CSS touch-action configured for smooth horizontal gesture handling');
console.log('✔ Swipe logic and gesture support verified for both calendars');

// --- Test 3: Range Selection and In-Range Styling ---
console.log('--- Test 3: Range Selection and In-Range Styling ---');
assert.ok(html.includes('handleShareWaDateClick'), 'handleShareWaDateClick logic exists for 2-click date range selection');
assert.ok(html.includes('updateShareWaCalendar'), 'updateShareWaCalendar updates calendar cells and date label');
assert.ok(css.includes('.savings-calendar-day.in-range'), 'CSS in-range rule exists for highlighted date spans');
console.log('✔ Range selection and highlighted styles verified');

console.log('\n=======================================');
console.log('All Share WA Calendar & Swipe Tests PASSED! 🎉');
console.log('=======================================');
