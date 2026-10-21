const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('=== TEST SUITE: Clean & Accelerated Receipt Scanning UX ===');

console.log('--- Test 1: Intimidating Technical Jargon Removed from Scan Modal ---');
assert.ok(!html.includes('Gemini Vision AI'), 'scanModal must not display "Gemini Vision AI"');
assert.ok(!html.includes('aistudio.google.com'), 'scanModal must not display "aistudio.google.com"');
assert.ok(!html.includes('🤖 Scan AI'), 'scanModal must not display "🤖 Scan AI" button');
assert.ok(!html.includes('ATAU INPUT MANUAL CEPAT'), 'scanModal must not display "ATAU INPUT MANUAL CEPAT" divider');
console.log('✔ Intimidating developer jargon removed from scan modal');

console.log('--- Test 2: Friendly Human Language in Scan Modal ---');
assert.ok(html.includes('<h3 style="margin:0">Catat dari Nota</h3>'), 'Modal header should say Catat dari Nota');
assert.ok(html.includes('id="scanManualAmount" inputmode="numeric" placeholder="Contoh: 45.000"'), 'Manual amount field is present and numeric');
assert.ok(html.includes('id="scanManualTitle" placeholder="Contoh: Indomaret, Makan Siang"'), 'Manual title field is present');
assert.ok(html.includes('id="scanManualSaveBtn"'), 'Manual save button is present');
console.log('✔ Human-friendly Indonesian labels and controls verified');

console.log('--- Test 3: Image Compression & Speed Optimization ---');
assert.ok(html.includes('compressImage(file, 800, 0.7)'), 'Image compression uses 800px and 0.7 quality for fast upload');
assert.ok(html.includes('maxOutputTokens:256') || html.includes('maxOutputTokens: 256'), 'Gemini API call uses maxOutputTokens limit for fast token response');
assert.ok(html.includes('temperature:0.1') || html.includes('temperature: 0.1'), 'Gemini API call uses temperature 0.1 for deterministic concise output');
console.log('✔ Speed optimization safeguards verified');

console.log('--- Test 4: Gentle Non-Intrusive Fallbacks ---');
assert.ok(!html.includes("alert('Silakan masukkan Gemini API Key terlebih dahulu.')"), 'Must not throw blocking alert for missing API key');
assert.ok(html.includes('Foto nota terpasang.</strong> Silakan isi nominal di bawah'), 'Friendly prompt when key not configured');
assert.ok(html.includes('Nota belum terbaca otomatis.</strong> Silakan masukkan nominal'), 'Friendly fallback when OCR cannot read blurry image');
console.log('✔ Non-intrusive fallback messages verified');

console.log('\n=======================================');
console.log('All Receipt Clean UX Tests PASSED! 🎉');
console.log('=======================================');
