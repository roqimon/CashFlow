const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const bindings = [...html.matchAll(/\$\('([^']+)'\)\.addEventListener\(/g)].map(match => match[1]);
const missing = [...new Set(bindings.filter(id => !ids.has(id)))];

assert.deepEqual(missing, [], `Event listeners target missing elements: ${missing.join(', ')}`);
console.log('All direct event listener targets exist.');

assert.ok(html.includes('models/gemini-3.5-flash-lite:generateContent'), 'Receipt scan must use an active image-capable Gemini model (gemini-3.5-flash-lite).');
assert.ok(!html.includes('models/gemini-1.5-flash:generateContent'), 'Receipt scan must not call Gemini 1.5 Flash.');
assert.ok(!html.includes('models/gemini-2.0-flash:generateContent'), 'Receipt scan must not fall back to retired Gemini 2.0 Flash.');
console.log('Receipt scan uses an active Gemini model.');
