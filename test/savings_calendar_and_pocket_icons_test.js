const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../savings-core.js');

assert.equal(typeof core.calendarDays, 'function', 'savings core exposes a testable month grid builder');

const leapFebruary = core.calendarDays(2028, 1, '2028-02-29', '2028-02-15');
assert.equal(leapFebruary.length, 35, 'February 2028 uses five rows, with Monday as the first weekday');
assert.equal(leapFebruary[0], null, 'a Tuesday month begins with one Monday placeholder');
assert.deepEqual(leapFebruary[1], {
  date: '2028-02-01',
  day: 1,
  selected: false,
  today: false,
});
assert.deepEqual(leapFebruary[29], {
  date: '2028-02-29',
  day: 29,
  selected: true,
  today: false,
});
assert.equal(leapFebruary.find(cell => cell?.today)?.date, '2028-02-15', 'today is marked independently from selection');

const sixWeekMonth = core.calendarDays(2026, 7, '', '2026-08-01');
assert.equal(sixWeekMonth.length, 42, 'months that need six weeks keep a complete grid');
assert.equal(sixWeekMonth[5]?.date, '2026-08-01', 'Saturday dates align under a Monday-first header');
assert.equal(sixWeekMonth.filter(Boolean).at(-1)?.date, '2026-08-31');
assert.equal(core.calendarDays(2026, 13).length, 0, 'invalid month indexes return no cells');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');
assert.ok(html.includes('id="savingsCalendarGrid"'), 'goal form includes the custom calendar grid');
assert.ok(html.includes('data-savings-calendar-action="today"'), 'calendar exposes a Today action');
assert.ok(html.includes('id="savingsGoalDate" type="hidden"'), 'the saved date remains a stable date-only value');
assert.ok(html.includes('updateSavingsCalendar()'), 'calendar updates when the month or selected date changes');
assert.ok(html.includes('</span></button><button type="button" class="savings-date-clear"'), 'clear action is a sibling button, so the date control remains valid HTML');
assert.ok(html.includes('panel.getBoundingClientRect().bottom-actions.getBoundingClientRect().top'), 'opening the calendar scrolls it above the sticky save actions');
assert.ok(html.includes('id="pocketIconPreview"'), 'budget icon choice has a contained visual preview');
assert.match(html, /#pocketIconPicker\.open\s*\{\s*display:\s*block\s*!important/s, 'the icon gallery itself does not become a narrow outer grid');
assert.match(css, /\.pocket-icon\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/s, 'budget icons use a fixed square box');
assert.match(css, /\.savings-calendar-grid\s*\{[^}]*grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/s, 'calendar dates use seven equal columns');

console.log('Savings calendar dates and budget icon containment tests passed.');
