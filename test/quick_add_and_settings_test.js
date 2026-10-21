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

console.log('--- Test 4: Trigger Add Action Routing Across All Pages ---');
const triggerFnCode = extractFunction(html, 'triggerAddAction');
assert.ok(triggerFnCode, 'triggerAddAction must be extractable');

let page = 'home';
let navigatedTo = '';
let voiceToggled = false;
let photoChoiceOpened = false;

const triggerAddAction = new Function('getAddClickAction', 'navigate', 'toggleVoiceInput', 'openPhotoChoice', '$', 'getPage',
  `return (function(action){
    var page = getPage();
    var fn = (${triggerFnCode});
    return fn(action);
  });`
)(
  getAddClickAction,
  (p) => { navigatedTo = p; page = p; },
  () => { voiceToggled = true; },
  () => { photoChoiceOpened = true; },
  (id) => ({ focus: () => {} }),
  () => page
);

// Test 4.1: From settings page with voice action -> must navigate to home first, then trigger voice
page = 'settings';
navigatedTo = '';
voiceToggled = false;
triggerAddAction('voice');
assert.strictEqual(navigatedTo, 'home', 'Voice from settings must navigate back to home');
assert.strictEqual(voiceToggled, true, 'Voice input must be triggered');

// Test 4.2: From report page with voice action -> must navigate to home first, then trigger voice
page = 'report';
navigatedTo = '';
voiceToggled = false;
triggerAddAction('voice');
assert.strictEqual(navigatedTo, 'home', 'Voice from report must navigate back to home');
assert.strictEqual(voiceToggled, true, 'Voice input must be triggered');

// Test 4.3: From add page with chat action -> toggles back to home
page = 'add';
navigatedTo = '';
triggerAddAction('chat');
assert.strictEqual(navigatedTo, 'home', 'Chat from add page must toggle back to home');

// Test 4.4: From home page with chat action -> navigates to add
page = 'home';
navigatedTo = '';
triggerAddAction('chat');
assert.strictEqual(navigatedTo, 'add', 'Chat from home page must navigate to add');

// Test 4.5: Foto action -> opens photo choice modal
photoChoiceOpened = false;
triggerAddAction('foto');
assert.strictEqual(photoChoiceOpened, true, 'Foto action should open photo choice modal');

console.log('✔ triggerAddAction routing across pages verified');

console.log('--- Test 5: Event Listener & Boot Hooks for Setting Toggle ---');
assert.ok(html.includes("$('addActionModeSeg')") && html.includes("setAddClickAction"), 'addActionModeSeg must have click listener calling setAddClickAction');
assert.ok(html.includes("renderAddClickActionControls();"), 'renderAddClickActionControls must be called in navigate/boot');

// Unit test setAddClickAction & renderAddClickActionControls
const setFnCode = extractFunction(html, 'setAddClickAction');
const renderFnCode = extractFunction(html, 'renderAddClickActionControls');
assert.ok(setFnCode && renderFnCode, 'setAddClickAction and renderAddClickActionControls must be extractable');

const buttons = [
  { dataset: { addActionMode: 'chat' }, classList: { toggle: (cls, on) => { buttons[0].active = on; } }, active: true },
  { dataset: { addActionMode: 'voice' }, classList: { toggle: (cls, on) => { buttons[1].active = on; } }, active: false },
  { dataset: { addActionMode: 'foto' }, classList: { toggle: (cls, on) => { buttons[2].active = on; } }, active: false }
];
const labelEl = { textContent: 'Mode Tulis' };
let toasted = '';

const fakeDom = {
  querySelectorAll: (sel) => sel === '[data-add-action-mode]' ? buttons : [],
  getElementById: (id) => id === 'addActionLabel' ? labelEl : null
};

const renderAddClickActionControls = new Function('getAddClickAction', 'document', '$',
  `return (${renderFnCode});`
)(getAddClickAction, fakeDom, (id) => fakeDom.getElementById(id));

const setAddClickAction = new Function('KEY_ADD_ACTION', 'localStorage', 'renderAddClickActionControls', 'toast',
  `return (${setFnCode});`
)('aruskas_add_action_v1', fakeLocalStorage, renderAddClickActionControls, (msg) => { toasted = msg; });

// Switch to voice
setAddClickAction('voice');
assert.strictEqual(fakeLocalStorage.getItem('aruskas_add_action_v1'), 'voice', 'localStorage should be updated to voice');
assert.strictEqual(buttons[1].active, true, 'voice button should be active');
assert.strictEqual(buttons[0].active, false, 'chat button should be inactive');
assert.strictEqual(labelEl.textContent, 'Suara', 'addActionLabel should display Suara');

// Switch to foto
setAddClickAction('foto');
assert.strictEqual(fakeLocalStorage.getItem('aruskas_add_action_v1'), 'foto', 'localStorage should be updated to foto');
assert.strictEqual(buttons[2].active, true, 'foto button should be active');
assert.strictEqual(buttons[1].active, false, 'voice button should be inactive');
assert.strictEqual(labelEl.textContent, 'Foto Struk', 'addActionLabel should display Foto Struk');

// Switch back to chat
setAddClickAction('chat');
assert.strictEqual(fakeLocalStorage.getItem('aruskas_add_action_v1'), 'chat', 'localStorage should be updated to chat');
assert.strictEqual(buttons[0].active, true, 'chat button should be active');
assert.strictEqual(labelEl.textContent, 'Mode Tulis', 'addActionLabel should display Mode Tulis');

console.log('✔ Settings event bindings & UI toggle state verified');

console.log('\n=======================================');
console.log('All Quick Add & Settings Tests PASSED!');
console.log('=======================================');
