const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: Home Header Cleanup, Setting Navigation & Full Settings Page (v42) ===\n');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');
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

// Test 4: Version and Service Worker Integrity (v42)
console.log('--- Test 4: Version and Service Worker v42 ---');
assert.ok(html.includes('id="appVersionBadge" style="font-weight:800">v42</span>'), 'HTML version badge bumped to v42');
assert.ok(html.includes("u.searchParams.set('updated','v42')"), 'Force update parameter set to v42');
assert.ok(sw.includes("CACHE_NAME = 'aruskas-pwa-v42'"), 'Service worker CACHE_NAME bumped to v42');
assert.ok(html.includes('warm-ui.css?v=20261021.22'), 'HTML warm-ui.css query bumped');
assert.ok(sw.includes('./warm-ui.css?v=20261021.22'), 'SW warm-ui.css query bumped');
console.log('✔ App version and Service Worker cache successfully synchronized to v42!');

console.log('\n=======================================');
console.log('All Setting Navigation & Page Tests PASSED! 🎉');
console.log('=======================================');
