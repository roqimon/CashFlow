const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: Home Header Cleanup & Modern Icons (v38) ===\n');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

// Test 1: Redundant Home Header Cleanup
console.log('--- Test 1: Redundant Home Header Elements & Dynamic Toggle ---');
assert.ok(html.includes('class="topbar home-topbar"'), 'Header starts with home-topbar class');
assert.ok(html.includes('class="topbar-title-wrap"'), 'Title & Subtitle wrapped in topbar-title-wrap');
assert.ok(html.includes(".classList.toggle('home-topbar',p==='home')"), 'navigate() dynamically toggles home-topbar class');
assert.ok(css.includes('.topbar.home-topbar .topbar-title-wrap'), 'CSS hides title wrap on home-topbar');
assert.ok(css.includes('.topbar.home-topbar'), 'CSS configures home-topbar flex alignment');
console.log('✔ Home header redundant text successfully hidden on Home page!');

// Test 2: Modern SVG Settings Icon in Topbar
console.log('--- Test 2: Modern SVG Settings Icon ---');
assert.ok(html.includes('class="icon-btn topbar-settings-btn"'), 'Settings button uses modern icon button class');
assert.ok(html.includes('aria-label="Pengaturan"'), 'Settings button has accessible aria-label');
assert.ok(html.includes('<svg class="topbar-svg"'), 'Settings button contains clean modern SVG icon instead of raw unicode text');
assert.ok(css.includes('.topbar-settings-btn'), 'CSS styles topbar-settings-btn cleanly');
console.log('✔ Modern SVG settings icon verified!');

// Test 3: Modern SVG Report Icon in Bottom Navigation
console.log('--- Test 3: Modern SVG Report Icon ---');
assert.ok(html.includes('<button data-nav="report" type="button" aria-label="Laporan">'), 'Report navigation button exists');
assert.ok(html.includes('M21.21 15.89A10 10 0 1 1 8 2.83'), 'Report icon uses modern Lucide pie chart SVG path');
assert.ok(html.includes('M22 12A10 10 0 0 0 12 2v10z'), 'Pie slice SVG path present');
console.log('✔ Modern SVG report navigation icon verified!');

// Test 4: Version and Service Worker Integrity (v38)
console.log('--- Test 4: Version and Service Worker v38 ---');
assert.ok(html.includes('id="appVersionBadge" style="font-weight:800">v38</span>'), 'HTML version badge bumped to v38');
assert.ok(html.includes("u.searchParams.set('updated','v38')"), 'Force update parameter set to v38');
assert.ok(sw.includes("CACHE_NAME = 'aruskas-pwa-v38'"), 'Service worker CACHE_NAME bumped to v38');
assert.ok(html.includes('warm-ui.css?v=20261021.18'), 'HTML warm-ui.css query bumped');
assert.ok(sw.includes('./warm-ui.css?v=20261021.18'), 'SW warm-ui.css query bumped');
console.log('✔ App version and Service Worker cache successfully synchronized to v38!');

console.log('\n=======================================');
console.log('All Home Header & Modern Icons Tests PASSED! 🎉');
console.log('=======================================');
