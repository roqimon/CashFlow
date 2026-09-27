const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('--- Test 1: Container Containment Rules ---');
assert.ok(html.includes('max-width:100vw;height:100%;overflow-x:hidden'), 'html, body must have overflow-x: hidden');
assert.ok(html.includes('.screen{overscroll-behavior:contain;overflow-x:hidden!important;width:100%;max-width:100%}'), 'screen must prevent horizontal overflow');
assert.ok(html.includes('.shell,.phone,.screen,.card,.list,.dialog-card,.sheet,.page,section,article,form{max-width:100%;box-sizing:border-box}'), 'universal containment on containers');
console.log('✔ Container containment rules present');

console.log('--- Test 2: Report Period Tabs and Summary Grid ---');
assert.ok(html.includes('grid-template-columns:repeat(5,minmax(0,1fr))!important'), 'period tabs must use 5-column minmax(0, 1fr) grid');
assert.ok(html.includes('.report-summary{margin-top:12px!important;width:100%!important;max-width:100%!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important'), 'report summary must use repeat(3, minmax(0,1fr))');
console.log('✔ Report period tabs and summary grid responsive');

console.log('--- Test 3: Camera Label & File Input ---');
assert.ok(html.includes('<label class="icon-btn" id="scanBtn" for="receiptFileInput"'), 'scanBtn must be native label for receiptFileInput');
assert.ok(html.includes('<label class="icon-btn" id="scanBtnFocus" for="receiptFileInput"'), 'scanBtnFocus must be native label for receiptFileInput');
assert.ok(html.includes('id="receiptFileInput" accept="image/*" style="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none"'), 'receiptFileInput must use accessible sr-only positioning instead of display:none');
console.log('✔ Camera label and accessible file input verified');

console.log('--- Test 4: Mic & Speech API Secure Context Handling ---');
assert.ok(html.includes('window.isSecureContext'), 'voice input must check isSecureContext');
assert.ok(html.includes('https://roqimon.github.io/CashFlow/'), 'voice input must provide direct HTTPS fallback link');
console.log('✔ Mic and secure context guidance verified');

console.log('--- Test 5: Service Worker Cache Version Bump ---');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("CACHE_NAME = 'aruskas-pwa-v11'"), 'sw.js must be bumped to v11');
assert.ok(html.includes('sw.js?v=20260927.6'), 'index.html must register sw.js?v=20260927.6');
console.log('✔ Service Worker cache version verified');

console.log('\n=======================================');
console.log('All Mobile Overflow & Camera/Mic tests PASSED!');
console.log('=======================================');
