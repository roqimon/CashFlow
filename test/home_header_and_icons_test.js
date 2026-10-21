const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: Home Header Cleanup, Setting Navigation & Full Settings Page (v47) ===\n');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8').replace(/\r\n/g, '\n');
const sw = fs.readFileSync('sw.js', 'utf8');

// Test 1: Redundant Home Header Cleanup
console.log('--- Test 1: Redundant Home Header Elements & Dynamic Toggle ---');
assert.ok(html.includes('class="topbar home-topbar"'), 'Header starts with home-topbar class');
assert.ok(html.includes(".classList.toggle('home-topbar',p==='home')"), 'navigate() dynamically toggles home-topbar class');
assert.ok(css.includes('.topbar.home-topbar { display: none !important; }'), 'CSS hides topbar completely on home page');
console.log('✔ Home header redundant text & button successfully hidden on Home page!');

// Test 2: Modern SVG Settings Icon in Bottom Navigation
console.log('--- Test 2: Setting Bottom Navigation Button & Gear SVG ---');
assert.ok(html.includes('<button data-nav="settings" type="button" aria-label="Setting">'), 'Setting bottom nav button exists');
assert.ok(html.includes('<span class="nav-label">Setting</span>'), 'Nav label is Setting');
assert.ok(html.includes('d="M19.4 15a1.65 1.65 0 0 0 .33 1.82'), 'Setting nav button contains modern gear SVG icon');
assert.ok(!html.includes('class="icon-btn topbar-settings-btn"'), 'Topbar setting button is removed from header as setting is now in bottom nav');
console.log('✔ Modern SVG setting navigation icon verified!');

// Test 3: Dedicated Full Settings Page with All Cards Integrated & Clean
console.log('--- Test 3: Dedicated Full Settings Page ---');
assert.ok(html.includes('data-page="settings"'), 'Settings page exists');
assert.ok(html.includes('data-legacy-page="shortcut"'), 'Legacy shortcut page alias exists');
assert.ok(html.includes('id="themeSeg"'), 'Theme selector card present on settings page');
assert.ok(html.includes('id="pocketManager"'), 'Pocket manager card present on settings page');
assert.ok(html.includes('id="shortcutForm"'), 'Shortcut form present on settings page');
assert.ok(html.includes('id="catManager"'), 'Category manager card present on settings page');
assert.ok(html.includes('data-action="export-csv"'), 'Export CSV button present on settings page');
assert.ok(html.includes('id="geminiApiKeyInput"'), 'Gemini API key hidden compatibility input present on settings page');
assert.ok(html.includes('data-action="reload-sample"'), 'Reload sample button present on settings page');
assert.ok(html.includes('data-action="clear-data"'), 'Clear all data button present on settings page');
assert.ok(!html.includes('Masukkan Gemini API Key'), 'Gemini API Key input is removed from visible UI');
console.log('✔ Dedicated Settings page successfully contains clean, modern configuration cards without API Key jargon!');

// Test 4: Version and Service Worker Integrity (v47)
console.log('--- Test 4: Version and Service Worker v47 ---');
assert.ok(html.includes('id="appVersionBadge" style="font-weight:800">v47</span>'), 'HTML version badge bumped to v47');
assert.ok(html.includes("u.searchParams.set('updated','v47')"), 'Force update parameter set to v47');
assert.ok(sw.includes("CACHE_NAME = 'aruskas-pwa-v47'"), 'Service worker CACHE_NAME bumped to v47');
assert.ok(html.includes('warm-ui.css?v=20261021.29'), 'HTML warm-ui.css query bumped');
assert.ok(sw.includes('./warm-ui.css?v=20261021.29'), 'SW warm-ui.css query bumped');
console.log('✔ App version and Service Worker cache successfully synchronized to v47!');

// Test 5: Isolation of Settings Page (Prevent leaking across other pages)
console.log('--- Test 5: Page Isolation & Specificity Guard ---');
assert.ok(css.includes('.page:not(.active) {\n  display: none !important;'), 'Inactive pages must be hidden with !important');
assert.ok(css.includes('.page[data-page="settings"]:not(.active) {\n  display: none !important;'), 'Settings page explicitly hidden when not active');
assert.ok(css.includes('.page[data-page="settings"].active {\n  display: flex !important;'), 'Settings page flex only when active');
console.log('✔ Settings page strictly hidden when inactive, preventing display leaks!');

// Test 6: Precision Centering of Pos Anggaran Icons
console.log('--- Test 6: Precision Centering of Pos Anggaran Icons ---');
assert.ok(css.includes('.pocket-icon {') && css.includes('display: grid !important;') && css.includes('place-items: center !important;'), 'Pocket icons use grid place-items: center');
assert.ok(css.includes('.pocket-icon .category-svg {') && css.includes('margin: auto !important;'), 'Pocket SVG icons centered with auto margin');
assert.ok(css.includes('.pocket-icon-trigger {') && css.includes('display: grid !important;'), 'Pocket icon modal trigger centered');
assert.ok(css.includes('.destination-chip .category-svg {') && css.includes('width: 16px !important;'), 'Destination chips have constrained icon dimensions');
console.log('✔ Pocket icon containers and SVGs strictly mathematically centered!');

console.log('\n=======================================');
console.log('All Setting Navigation & Page Tests PASSED! 🎉');
console.log('=======================================');
