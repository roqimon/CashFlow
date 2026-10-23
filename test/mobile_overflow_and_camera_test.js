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

console.log('--- Test 3: Photo Choice Modal & Hardware Camera Input ---');
assert.ok(html.includes('id="photoChoiceModal"'), 'photoChoiceModal must exist');
assert.ok(html.includes('id="btnTakePhoto"'), 'btnTakePhoto must exist in photo choice modal');
assert.ok(html.includes('id="btnPickGallery"'), 'btnPickGallery must exist in photo choice modal');
assert.ok(html.includes('id="cameraDirectInput" accept="image/*" capture="environment"'), 'cameraDirectInput must use capture=environment to trigger real camera');
assert.ok(html.includes('id="galleryFileInput" accept="image/*"'), 'galleryFileInput must accept images');
assert.ok(html.includes('id="receiptFileInput" accept="image/*"'), 'receiptFileInput compatibility element must exist');
console.log('✔ Photo choice modal and direct camera input verified');

console.log('--- Test 4: Mic & Speech API Secure Context Handling ---');
assert.ok(html.includes('window.isSecureContext'), 'voice input must check isSecureContext');
assert.ok(html.includes('id="voiceNoticeModal"'), 'voiceNoticeModal must exist');
assert.ok(html.includes('https://kas.bisabaca.web.id/'), 'voice input must provide direct HTTPS fallback link');
console.log('✔ Mic and secure context guidance verified');

console.log('--- Test 5: Service Worker Cache Version Bump ---');
const sw = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
assert.strictEqual(manifest.display, 'standalone', 'PWA must keep system UI visible around the app');
assert.deepStrictEqual(manifest.display_override, ['standalone'], 'display override must not prioritize fullscreen');
assert.ok(/aruskas-pwa-v(?:3[1-9]|[4-9]\d)/.test(sw), 'sw.js must be bumped to v31 or higher after fixing mobile navigation');
assert.ok(/sw\.js\?v=\d{8}\.\d+/.test(html), 'index.html must register a versioned sw.js URL');
console.log('✔ Service Worker cache version verified');

console.log('--- Test 6: Gemini Receipt AI Scanner Configuration ---');
assert.ok(html.includes("models/gemini-3.5-flash-lite:generateContent"), 'must use gemini-3.5-flash-lite endpoint');
assert.ok(html.includes("window.__APP_CONFIG__.GEMINI_API_KEY"), 'must support external config API key');
assert.ok(html.includes("responseMimeType:'application/json'"), 'must specify responseMimeType application/json');
console.log('✔ Gemini AI receipt scanner configuration verified');

console.log('--- Test 7: Mobile Layout Flexbox & Safe Render Safeguards ---');
assert.ok(html.includes("display:flex!important;flex-direction:column!important;overflow:hidden!important"), 'mobile phone container must use column flexbox to pin nav bar');
assert.ok(!html.includes("else{stContainer.style.display='none'}"), 'stContainer must not be dereferenced without null check');
console.log('✔ Mobile flexbox layout and safe render verified');

console.log('--- Test 8: Mobile Bottom Navigation Rigid Docking & Safe Padding ---');
assert.ok(html.includes('.nav{position:fixed!important;bottom:0!important'), 'nav must be fixed to bottom on mobile');
assert.ok(html.includes('padding-bottom:calc(108px + env(safe-area-inset-bottom, 0px))!important'), 'screen must have clearance padding for fixed bottom nav');
const warmCss = fs.readFileSync('warm-ui.css', 'utf8').replace(/\r\n/g, '\n');
assert.ok(warmCss.includes('position: fixed !important;\n    bottom: 0 !important;'), 'warm-ui.css must fix nav to bottom on mobile');
assert.ok(html.includes('keyboard-open'), 'keyboard awareness must be present');
console.log('✔ Mobile bottom navigation rigid docking & safe padding verified');

console.log('\n=======================================');
console.log('All Mobile Overflow & Camera/Mic tests PASSED!');
console.log('=======================================');
