const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('=== TEST SUITE: Active Pocket Chips & Prefix Trigger ===');

// Test 1: pocketFormShortName field exists in pocketModal
console.log('--- Test 1: Shortcut Label Field in Pocket Edit Modal ---');
assert.ok(html.includes('id="pocketFormShortName"'), 'pocketFormShortName field must exist in pocket modal');
assert.ok(html.includes('shortName:shortName||undefined') || html.includes('shortName: shortName || undefined'), 'savePocketEdit must persist shortName');
console.log('✔ Pocket edit modal supports custom shortcut label!');

// Test 2: renderDestinationChips uses pocket icon, shortName, and no Uang Bebas chip
console.log('--- Test 2: Destination Chips Rendering ---');
assert.ok(html.includes('p.shortName ? p.shortName.trim() : shortPocketName(p.name)'), 'renderDestinationChips prioritizes custom shortName');
assert.ok(!html.includes('data-dest="bebas" title="Uang Bebas"'), 'renderDestinationChips does not display default Uang Bebas chip');
assert.ok(html.includes("const iconHtml = renderIcon(p.icon || (isST ? '📋' : '•'))"), 'renderDestinationChips uses custom pocket icon');
console.log('✔ Destination chips render correctly without redundant default chip!');

// Test 3: Sticky chip selection (no reset after addFrom)
console.log('--- Test 3: Sticky Selection (No auto-reset after save) ---');
const addFromSection = html.slice(html.indexOf('async function addFrom('), html.indexOf('function pratinjau('));
assert.ok(!addFromSection.includes("setInputDestination('auto')"), 'addFrom must not reset activeInputDestination to auto');
console.log('✔ Active chip remains sticky after transaction saved!');

// Test 4: matchPocketPrefix function exists and prefix triggers pocket
console.log('--- Test 4: Prefix Trigger Matching ---');
assert.ok(html.includes('function matchPocketPrefix('), 'matchPocketPrefix function must be defined');
assert.ok(html.includes('const pfxMatch=matchPocketPrefix(rawWork)'), 'parseInput must check pocket prefix before shortcut/title parsing');
console.log('✔ Pocket prefix trigger implemented in parser!');

// Test 5: Drag and Drop with long-press support
console.log('--- Test 5: Touch Long-Press Drag-Drop ---');
assert.ok(html.includes('touchHoldTimer = setTimeout('), 'Long-press timer must exist for touch drag');
assert.ok(html.includes('reorderDestChips(touchDragChip.dataset.dest, targetChip.dataset.dest)'), 'Touch reordering calls reorderDestChips');
console.log('✔ Touch long-press drag-drop verified!');

console.log('\n=======================================');
console.log('All Active Pocket & Trigger Tests PASSED! 🎉');
console.log('=======================================');
