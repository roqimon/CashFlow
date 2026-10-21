// test/quick_add_and_settings_test.js
const assert = require('assert');
const fs = require('fs');

console.log('=== TEST SUITE: Quick Add Radial Gesture & Click Action Settings ===\n');

// 1. Static codebase assertions
const html = fs.readFileSync('index.html', 'utf8');

console.log('--- Test 1: Codebase Contains Radial Quick-Action Elements ---');
assert.ok(html.includes('id="quickAddRadial"'), 'index.html must define #quickAddRadial element');
assert.ok(html.includes('data-radial-action="voice"'), 'index.html must have voice radial action');
assert.ok(html.includes('data-radial-action="foto"'), 'index.html must have foto radial action');
assert.ok(html.includes('data-radial-action="chat"'), 'index.html must have chat radial action');
console.log('✔ Quick Add Radial menu elements verified');

console.log('--- Test 2: Codebase Contains Settings for Add Click Action ---');
assert.ok(html.includes('KEY_ADD_ACTION'), 'index.html must define KEY_ADD_ACTION constant');
assert.ok(html.includes('data-add-action-mode="chat"'), 'index.html must have chat setting option');
assert.ok(html.includes('data-add-action-mode="voice"'), 'index.html must have voice setting option');
assert.ok(html.includes('data-add-action-mode="foto"'), 'index.html must have foto setting option');
assert.ok(html.includes('function getAddClickAction'), 'index.html must implement getAddClickAction');
assert.ok(html.includes('function setAddClickAction'), 'index.html must implement setAddClickAction');
assert.ok(html.includes('function triggerAddAction'), 'index.html must implement triggerAddAction');
console.log('✔ Settings and helper functions definitions verified');

console.log('--- Test 3: Logic Unit Test for Action Helpers ---');
function extractFunction(source, fnName) {
  const start = source.indexOf(`function ${fnName}(`);
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

const getFnCode = extractFunction(html, 'getAddClickAction');
assert.ok(getFnCode, 'getAddClickAction must be extractable');

// Mock localStorage
const mockStorage = {};
const fakeLocalStorage = {
  getItem: (k) => (k in mockStorage ? mockStorage[k] : null),
  setItem: (k, v) => { mockStorage[k] = String(v); }
};

const getAddClickAction = new Function('localStorage', 'KEY_ADD_ACTION',
  `return (${getFnCode});`
)(fakeLocalStorage, 'aruskas_add_action_v1');

assert.strictEqual(getAddClickAction(), 'chat', 'Default add click action should be chat');

mockStorage['aruskas_add_action_v1'] = 'voice';
assert.strictEqual(getAddClickAction(), 'voice', 'Should return voice when set');

mockStorage['aruskas_add_action_v1'] = 'foto';
assert.strictEqual(getAddClickAction(), 'foto', 'Should return foto when set');

mockStorage['aruskas_add_action_v1'] = 'invalid_action';
assert.strictEqual(getAddClickAction(), 'chat', 'Should fall back to chat on invalid action');

console.log('✔ getAddClickAction logic verified');

console.log('--- Test 4: Trigger Add Action Routing ---');
let navigatedTo = '';
let voiceToggled = false;
let photoChoiceOpened = false;

const triggerFnCode = extractFunction(html, 'triggerAddAction');
assert.ok(triggerFnCode, 'triggerAddAction must be extractable');

const triggerAddAction = new Function('getAddClickAction', 'navigate', 'toggleVoiceInput', 'openPhotoChoice', '$',
  `return (${triggerFnCode});`
)(
  getAddClickAction,
  (p) => { navigatedTo = p; },
  () => { voiceToggled = true; },
  () => { photoChoiceOpened = true; },
  (id) => ({ focus: () => {} })
);

// Test chat
navigatedTo = '';
triggerAddAction('chat');
assert.strictEqual(navigatedTo, 'add', 'chat action should navigate to add page');

// Test voice
voiceToggled = false;
triggerAddAction('voice');
assert.strictEqual(voiceToggled, true, 'voice action should call toggleVoiceInput');

// Test foto
photoChoiceOpened = false;
triggerAddAction('foto');
assert.strictEqual(photoChoiceOpened, true, 'foto action should call openPhotoChoice');

console.log('✔ triggerAddAction routing verified');

console.log('\n=======================================');
console.log('All Quick Add & Settings Tests PASSED!');
console.log('=======================================');
