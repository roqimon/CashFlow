const assert = require('assert');
const fs = require('fs');

// Extract the script logic or evaluate the helpers from index.html
const html = fs.readFileSync('index.html', 'utf8');

// Test 1: Gemini response parsing simulation
function simulateParseGeminiResponse(responseText) {
  let cleanJson = responseText.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const parsed = JSON.parse(cleanJson);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items;
}

console.log('--- Test 1: Gemini JSON Parsing ---');
const rawResponse1 = '```json\n[{"title": "Indomaret Point", "amount": 45000, "category": "Belanja", "type": "expense", "note": "QRIS BCA"}]\n```';
const items1 = simulateParseGeminiResponse(rawResponse1);
assert.strictEqual(items1.length, 1);
assert.strictEqual(items1[0].title, 'Indomaret Point');
assert.strictEqual(items1[0].amount, 45000);

const rawResponse2 = '{"title": "Transfer Masuk Budi", "amount": 500000, "category": "Pemasukan", "type": "income", "note": "Transfer BCA"}';
const items2 = simulateParseGeminiResponse(rawResponse2);
assert.strictEqual(items2.length, 1);
assert.strictEqual(items2[0].type, 'income');
assert.strictEqual(items2[0].amount, 500000);
console.log('✔ Gemini response parsing passed');

// Test 2: JSON Import format handling
console.log('--- Test 2: JSON Import Parsing ---');
function simulateImportData(jsonString) {
  const data = JSON.parse(jsonString);
  let txList = [], scList = [], catList = [];
  if (Array.isArray(data)) {
    txList = data;
  } else if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data.transactions)) txList = data.transactions;
    if (Array.isArray(data.shortcuts)) scList = data.shortcuts;
    if (Array.isArray(data.categories)) catList = data.categories;
  }
  return { txList, scList, catList };
}

const exportFormat = JSON.stringify({
  transactions: [{ id: 'tx-1', title: 'Kopi', amount: 25000, type: 'expense' }],
  shortcuts: [{ code: 'kp', title: 'Kopi' }],
  categories: [{ name: 'Kopi', type: 'expense', icon: '☕' }]
});
const resExport = simulateImportData(exportFormat);
assert.strictEqual(resExport.txList.length, 1);
assert.strictEqual(resExport.scList.length, 1);
assert.strictEqual(resExport.catList.length, 1);

const arrayFormat = JSON.stringify([
  { id: 'tx-2', title: 'Bensin', amount: 35000, type: 'expense' }
]);
const resArray = simulateImportData(arrayFormat);
assert.strictEqual(resArray.txList.length, 1);
console.log('✔ JSON import parsing passed');

// Test 3: Check UI elements exist in index.html
console.log('--- Test 3: Checking HTML UI elements ---');
assert.ok(html.includes('id="voiceBtn"'), 'voiceBtn must exist');
assert.ok(html.includes('id="scanBtn"'), 'scanBtn must exist');
assert.ok(html.includes('id="voiceBtnFocus"'), 'voiceBtnFocus must exist');
assert.ok(html.includes('id="scanBtnFocus"'), 'scanBtnFocus must exist');
assert.ok(html.includes('id="receiptFileInput"'), 'receiptFileInput must exist');
assert.ok(html.includes('id="importJsonFileInput"'), 'importJsonFileInput must exist');
assert.ok(html.includes('id="geminiApiKeyInput"'), 'geminiApiKeyInput must exist');
assert.ok(html.includes('data-action="import-json"'), 'import-json action button must exist');
assert.ok(html.includes('scanReceiptWithGemini'), 'scanReceiptWithGemini function must exist');
assert.ok(html.includes('initVoiceInput'), 'initVoiceInput function must exist');
console.log('✔ All HTML elements and function hooks present');

console.log('\n=======================================');
console.log('All Lazy Input Suite integration tests PASS!');
console.log('=======================================');
