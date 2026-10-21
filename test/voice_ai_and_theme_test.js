const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

console.log('=== TEST SUITE: Voice Stutter Fix, Gemini AI Correction & Theme Banner ===');

// --- Test 1: Update Banner Theme & Auto Dismiss ---
console.log('--- Test 1: Update Banner Theme & Auto Dismiss ---');
assert.ok(html.includes('id="updateSuccessBanner"'), 'updateSuccessBanner element must exist');
assert.ok(!html.includes('background:linear-gradient(135deg,#1f8a5b,#166341)'), 'Banner must NOT use hardcoded dark green gradient');
assert.ok(html.includes('background:var(--card-glass)'), 'Banner must use active theme background token');
assert.ok(html.includes('border-left:4px solid var(--green)'), 'Banner must use theme accent color');
assert.ok(html.includes('setTimeout(()=>{'), 'checkUpdateNotice must set a timer');
assert.ok(/setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?b\.style\.opacity\s*=\s*'0'[\s\S]*?\},\s*1000\)/.test(html), 'Banner must auto-dismiss after exactly 1000ms (1 second)');
console.log('✔ Update Banner theme styling and 1-second auto-dismiss verified');

// --- Test 2: Speech Recognition Deduplication (Stutter Fix) ---
console.log('--- Test 2: Speech Recognition Deduplication (Stutter Fix) ---');
assert.ok(html.includes('function cleanSpeechDuplicates'), 'cleanSpeechDuplicates function must exist');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = html.indexOf(marker);
  if (start === -1) throw new Error(`Function ${name} not found`);
  let depth = 0;
  let started = false;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') {
      depth++;
      started = true;
    } else if (html[i] === '}') {
      depth--;
      if (started && depth === 0) {
        return html.substring(start, i + 1);
      }
    }
  }
  throw new Error(`Could not extract function ${name}`);
}

const context = { console };
vm.createContext(context);
vm.runInContext(extractFunction('cleanSpeechDuplicates'), context);

assert.strictEqual(
  context.cleanSpeechDuplicates('bbm bbm bbm bbm rp200.000'),
  'bbm rp200.000',
  'Must collapse repeated bbm in stuttered voice input'
);
assert.strictEqual(
  context.cleanSpeechDuplicates('bbm bbm 200rb'),
  'bbm 200rb',
  'Must collapse 2-word duplicate bbm'
);
assert.strictEqual(
  context.cleanSpeechDuplicates('kopi susu kopi susu 15 ribu'),
  'kopi susu 15 ribu',
  'Must collapse repeated 2-word phrase'
);
assert.strictEqual(
  context.cleanSpeechDuplicates('bbm, bbm, bbm 200rb'),
  'bbm 200rb',
  'Must collapse repeated words with punctuation'
);
assert.strictEqual(
  context.cleanSpeechDuplicates('makan siang 35000'),
  'makan siang 35000',
  'Must preserve clean non-repeated words'
);
console.log('✔ Speech deduplication algorithm passes all stutter edge cases');

// --- Test 3: BBM Category Inference ---
console.log('--- Test 3: BBM Category Inference ---');
assert.ok(html.includes('function smartInferCat'), 'smartInferCat must exist');
const incomeRulesMatch = html.match(/const INCOME_RULES=(\[\[.*?\]\]);/);
const expenseRulesMatch = html.match(/const EXPENSE_RULES=(\[\[.*?\]\]);/);

vm.runInContext(`
  const INCOME_RULES = ${incomeRulesMatch[1]};
  const EXPENSE_RULES = ${expenseRulesMatch[1]};
  function getCatMem() { return {}; }
  ${extractFunction('smartInferCat')}
`, context);

const catResult = context.smartInferCat('bbm 200000', 'expense', ['Makan', 'Transport', 'Belanja'], []);
assert.strictEqual(catResult, 'Transport', 'BBM input must be categorized as Transport');
console.log('✔ BBM input accurately categorized as Transport');

// --- Test 4: Gemini AI Typo & Voice Correction Functions ---
console.log('--- Test 4: Gemini AI Typo & Voice Correction Functions ---');
assert.ok(html.includes('async function aiCorrectTransactionText'), 'aiCorrectTransactionText function exists');
assert.ok(html.includes('async function triggerAiCorrection'), 'triggerAiCorrection function exists');
assert.ok(html.includes('saveDirectTransaction'), 'saveDirectTransaction helper exists');
assert.ok(html.includes('data-action="ai-fix"'), 'ai-fix action button is present in HTML/script');
assert.ok(html.includes('id="aiCorrectBtnFocus"'), 'aiCorrectBtnFocus button exists in focus mode tools');
assert.ok(html.includes('Digunakan untuk scan foto struk otomatis, koreksi salah ketik (typo)'), 'Settings describes AI typo and voice correction');
console.log('✔ Gemini AI correction functions and UI hooks verified');

// --- Test 5: Version Bump and Service Worker ---
console.log('--- Test 5: Version Bump and Service Worker ---');
assert.ok(sw.includes("CACHE_NAME = 'aruskas-pwa-v30'"), 'sw.js is bumped to v30');
assert.ok(html.includes('sw.js?v=20261021.18'), 'index.html registers sw.js?v=20261021.18');
assert.ok(html.includes('v30'), 'index.html displays v30 in settings');
console.log('✔ App version and service worker bumped to v30');

console.log('\n=======================================');
console.log('All Voice Stutter, AI Correction & Theme Tests PASSED!');
console.log('=======================================');
