const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('warm-ui.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

const shortcutListPosition = html.indexOf('id="shortcutList"');
const advancedSettingsPosition = html.indexOf('>Pengaturan Lanjutan</strong>');
assert.ok(shortcutListPosition >= 0, 'Settings must contain the shortcut manager');
assert.ok(advancedSettingsPosition >= 0, 'Settings must contain the advanced settings section');
assert.ok(shortcutListPosition > advancedSettingsPosition, 'Quick Shortcuts must be the last settings section');

const shortcutEditorMarkup = html.match(/<div class="shortcut-editor-box" id="shortcutEditor"([^>]*)>/);
assert.ok(shortcutEditorMarkup, 'Settings must contain the shortcut editor');
assert.ok(!/display\s*:\s*none/i.test(shortcutEditorMarkup[1]), 'Shortcut editor visibility must be controlled by its open class');
assert.match(css, /\.shortcut-editor-box\.editor-open\s*\{[^}]*display\s*:\s*block\s*;?[^}]*\}/s, 'Opening the shortcut editor must make its form visible');

for (const id of ['shortcutForm', 'scCode', 'scTitle', 'scCategory', 'scToggleSelectBtn', 'scBulkDelete']) {
  assert.ok(html.includes(`id="${id}"`), `Shortcut management must retain #${id}`);
}

for (const action of ['open-shortcut-editor', 'close-shortcut-editor']) {
  assert.ok(html.includes(`data-action="${action}"`), `Shortcut management must retain ${action}`);
}

assert.ok(html.includes('warm-ui.css?v=20261023.89'), 'HTML must request the new PWA stylesheet');
assert.ok(html.includes("sw.js?v=20261023.94"), 'HTML must register the new service worker');
assert.ok(sw.includes("CACHE_NAME = 'aruskas-pwa-v94'"), 'Service worker cache must be bumped');
assert.ok(html.includes('shortcut-date.js?v=20261023.2'), 'The date parser must load before the app script');
assert.ok(sw.includes('./shortcut-date.js?v=20261023.2'), 'The service worker must cache the date parser');
assert.ok(sw.includes('./warm-ui.css?v=20261023.89'), 'Service worker shell must cache the new stylesheet');

console.log('Shortcut settings order and editor visibility verified.');
