const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');
const balanceCard = html.match(/<section class="card balance">([\s\S]*?)<\/section>/)?.[1] || '';

test('home balance card keeps approved concise copy and compact 2 by 2 summary', () => {
  assert.match(html, /class="daily-guidance-label">✦ Saran belanja harian<\/small>/);
  assert.match(html, /class="daily-guidance-note">Berdasarkan catatanmu\.<\/small>/);
  assert.ok(balanceCard, 'home balance card should exist');
  assert.match(css, /\.balance\s*\{[^}]*padding:\s*17px\s+18px\s+16px\s*!important/s);
  assert.match(css, /\.balance \.grid2\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)\s+minmax\(0,1fr\)/s);
  assert.match(css, /\.balance \.grid2 > div\s*\{[^}]*background:\s*rgba\(255,255,255,\.08\)/s);
  assert.match(css, /\.balance \.grid2 > div:nth-child\(n\+3\)\s*\{[^}]*grid-column:\s*auto\s*!important/s);
  assert.doesNotMatch(css, /\.balance::after\s*\{[^}]*dashed/s);
});
