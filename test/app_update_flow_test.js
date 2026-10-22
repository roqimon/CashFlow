const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf("if(a==='force-update'){");
const end = html.indexOf("}if(a==='manual')", start);
assert.ok(start >= 0 && end > start, 'update handler exists');
const update = html.slice(start, end + 1);

assert.ok(!update.includes('caches.delete('), 'update does not delete the entire PWA cache');
assert.ok(!update.includes('.unregister()'), 'update keeps the service worker registered');
assert.ok(!update.includes("u.hash='#home'"), 'update does not force the home page');
assert.match(update, /u\.hash\s*=\s*['"]#['"]\s*\+\s*page/, 'update retains the current page');
assert.match(update, /reg\.update\(\)/, 'update asks the registered worker to check for new assets');
