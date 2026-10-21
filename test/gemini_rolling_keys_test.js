// test/gemini_rolling_keys_test.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('=== TEST SUITE: Gemini Multi-API Auto-Rolling Keys Engine ===\n');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Static codebase assertions
console.log('--- Test 1: Codebase Contains Rolling Keys Engine ---');
assert.ok(html.includes('function getGeminiApiKeys()'), 'index.html must define getGeminiApiKeys');
assert.ok(html.includes('async function callGeminiWithRollingKeys('), 'index.html must define callGeminiWithRollingKeys');
assert.ok(html.includes('GEMINI_API_KEYS'), 'index.html must support GEMINI_API_KEYS from config');
assert.ok(html.includes('models/gemini-3.5-flash-lite:generateContent'), 'must use active gemini-3.5-flash-lite');
console.log('✔ Engine functions and constants verified');

// 2. Unit test: getGeminiApiKeys parsing
console.log('--- Test 2: Multi-Key Resolution & De-duplication ---');
function extractFunction(source, fnName) {
  const isAsync = source.indexOf(`async function ${fnName}(`) !== -1;
  const start = isAsync ? source.indexOf(`async function ${fnName}(`) : source.indexOf(`function ${fnName}(`);
  if (start === -1) return null;
  let braceCount = 0;
  let started = false;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') {
      braceCount++;
      started = true;
    } else if (source[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  return null;
}

const getKeysCode = extractFunction(html, 'getGeminiApiKeys');
assert.ok(getKeysCode, 'getGeminiApiKeys must be extractable');

// Test Case A: Config only with array of 4 keys
const mockWindowA = {
  __APP_CONFIG__: {
    GEMINI_API_KEYS: ['key-1', 'key-2', 'key-3', 'key-4']
  }
};
const getKeysFnA = new Function('window', 'localStorage', 'KEY_GEMINI_API',
  `return (${getKeysCode})();`
);
const resolvedKeysA = getKeysFnA(mockWindowA, { getItem: () => null }, 'aruskas_gemini_api_key');
assert.deepStrictEqual(resolvedKeysA, ['key-1', 'key-2', 'key-3', 'key-4'], 'Should load all 4 keys from config');

// Test Case B: User entered keys via textarea/comma in localStorage
const mockWindowB = { __APP_CONFIG__: {} };
const mockStorageB = {
  aruskas_gemini_api_key: 'custom-1, custom-2\ncustom-3, custom-1'
};
const resolvedKeysB = getKeysFnA(mockWindowB, { getItem: (k) => mockStorageB[k] }, 'aruskas_gemini_api_key');
assert.deepStrictEqual(resolvedKeysB, ['custom-1', 'custom-2', 'custom-3'], 'Should parse, trim, and de-duplicate custom keys');
console.log('✔ getGeminiApiKeys parsing & precedence verified');

// 3. Unit test: Failover simulation in callGeminiWithRollingKeys using Node vm context
console.log('--- Test 3: Simulation of Automatic Key Failover on 429 / Error ---');
const rollingCode = extractFunction(html, 'callGeminiWithRollingKeys');
assert.ok(rollingCode, 'callGeminiWithRollingKeys must be extractable');

let attemptCount = 0;
const usedKeys = [];

const fakeFetch = async (url, options) => {
  attemptCount++;
  const key = options.headers['x-goog-api-key'];
  usedKeys.push(key);

  if (key === 'key-fail-429') {
    return {
      ok: false,
      status: 429,
      text: async () => 'RESOURCE_EXHAUSTED: Quota exceeded'
    };
  }
  if (key === 'key-fail-403') {
    return {
      ok: false,
      status: 403,
      text: async () => 'PERMISSION_DENIED: API key not valid'
    };
  }
  if (key === 'key-success') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"title":"BBM","amount":50000}' }] } }]
      })
    };
  }
  return { ok: false, status: 500, text: async () => 'Internal Server Error' };
};

const sandbox = {
  getGeminiApiKeys: () => ['key-fail-429', 'key-fail-403', 'key-success'],
  fetch: fakeFetch,
  console: { warn: () => {}, info: () => {}, error: () => {} },
  result: null
};

vm.createContext(sandbox);
vm.runInContext(`${rollingCode}; (async () => { sandboxResult = await callGeminiWithRollingKeys({ contents: [{ parts: [{ text: "test" }] }] }); })()`, sandbox);

setTimeout(() => {
  assert.ok(sandbox.sandboxResult && sandbox.sandboxResult.candidates, 'Call must succeed on 3rd key after first 2 keys fail');
  assert.strictEqual(attemptCount, 3, 'Must have attempted exactly 3 times before succeeding');
  assert.deepStrictEqual(usedKeys, ['key-fail-429', 'key-fail-403', 'key-success'], 'Must roll sequentially through keys');
  console.log('✔ Automatic failover on 429 / 403 verified successfully');

  console.log('\n=======================================');
  console.log('All Gemini Rolling Keys Tests PASSED! 🎉');
  console.log('=======================================');
}, 50);
