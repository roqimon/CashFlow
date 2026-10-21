const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function setupContext() {
  const domScriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  if (!domScriptMatch) throw new Error('Script block not found');
  const code = domScriptMatch[1];

  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => storage[k] !== undefined ? storage[k] : null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };

  const elements = {};
  function makeEl(id) {
    return {
      id,
      value: '',
      innerHTML: '',
      textContent: '',
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        toggle(c, force) {
          if (force === undefined) {
            if (this._set.has(c)) this._set.delete(c);
            else this._set.add(c);
          } else if (force) this._set.add(c);
          else this._set.delete(c);
          return this._set.has(c);
        },
        contains(c) { return this._set.has(c); }
      },
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      addEventListener: () => {},
      closest: () => null,
      querySelectorAll: () => [],
      focus: () => {}
    };
  }

  const context = {
    console,
    localStorage: mockLocalStorage,
    window: {},
    document: {
      getElementById: (id) => {
        if (!elements[id]) elements[id] = makeEl(id);
        return elements[id];
      },
      querySelectorAll: (sel) => {
        if (sel === '.st-toggle') {
          return [elements['stToggle'] || (elements['stToggle'] = makeEl('stToggle')), elements['stToggleFocus'] || (elements['stToggleFocus'] = makeEl('stToggleFocus'))];
        }
        return [];
      },
      addEventListener: () => {}
    },
    navigator: { serviceWorker: { register: () => Promise.resolve() } },
    location: { hash: '' },
    alert: () => {},
    setTimeout: (fn) => fn(),
    requestAnimationFrame: (fn) => fn()
  };

  context.window = context;
  context.$ = context.document.getElementById;

  const p1 = code.indexOf('function getSTPocket(');
  const nextFn = code.indexOf('function monthlyPersonalExpense(', p1);
  const inferSlice = code.slice(p1, nextFn);

  const pParseStart = code.indexOf('function parseInput(');
  const pParseEnd = code.indexOf('function applyFuzzy(', pParseStart);
  const parseSlice = code.slice(pParseStart, pParseEnd);

  return { context, inferSlice, parseSlice };
}

test('ST Budget Pocket: Tanpa pos ST', () => {
  const { context, inferSlice, parseSlice } = setupContext();
  vm.createContext(context);
  vm.runInContext(`
    var pockets = [];
    function getPockets() { return pockets; }
    var shortcuts = [];
    function getSC() { return shortcuts; }
    function parseDateInfo(t) { return { hasDate: false, date: null, note: '', cleanText: t }; }
    function matchShortcut() { return null; }
    function parseAmount(t) { return parseInt(t.replace(/[^0-9]/g, '')) * (t.includes('rb') || t.includes('ribu') || t.includes('k') ? 1000 : 1); }
    function title(t) { return t; }
    function norm(t) { return t.toLowerCase(); }
    function findCatRecordByCode() { return null; }
    function inferType() { return 'expense'; }
    function getCatMem() { return {}; }
    function smartInferCat() { return 'Transportasi'; }
    function getCatList() { return []; }
    function getTX() { return []; }
    function tx(props) { return Object.assign({}, props); }
    function icon() { return '🚗'; }
    function fmt(it) { return it.title; }
    var stMode = false;
    var INDONESIAN_STOPWORDS = new Set(['pribadi', 'belanja']);
    ${inferSlice}
    ${parseSlice}
  `, context);

  // 1. getSTPocket should be null
  assert.equal(context.getSTPocket(), null);

  // 2. st bbm 50rb should fail with friendly message
  const resST = context.parseInput('st bbm 50rb');
  assert.equal(resST.ok, false);
  assert.match(resST.msg, /Pos Anggaran ST belum dibuat/i);

  // 3. Regular input without ST pocket
  const resReg = context.parseInput('bbm 50rb');
  assert.equal(resReg.ok, true);
  assert.equal(resReg.item.source, 'personal');
  assert.equal(resReg.item.pocketId, null);
});

test('ST Budget Pocket: Dengan pos ST', () => {
  const { context, inferSlice, parseSlice } = setupContext();
  vm.createContext(context);
  vm.runInContext(`
    var pockets = [
      { id: 'pkt-dinas', name: 'Perjalanan Dinas (ST)', categories: ['st', 'dinas', 'bbm', 'hotel'] },
      { id: 'pkt-bbm', name: 'BBM Motor Harian', categories: ['bbm', 'bensin'] }
    ];
    function getPockets() { return pockets; }
    var shortcuts = [];
    function getSC() { return shortcuts; }
    function parseDateInfo(t) { return { hasDate: false, date: null, note: '', cleanText: t }; }
    function matchShortcut() { return null; }
    function parseAmount(t) { return parseInt(t.replace(/[^0-9]/g, '')) * (t.includes('rb') || t.includes('ribu') || t.includes('k') ? 1000 : 1); }
    function title(t) { return t; }
    function norm(t) { return t.toLowerCase(); }
    function findCatRecordByCode() { return null; }
    function inferType() { return 'expense'; }
    function getCatMem() { return {}; }
    function smartInferCat() { return 'Transportasi'; }
    function getCatList() { return []; }
    function getTX() { return []; }
    function tx(props) { return Object.assign({}, props); }
    function icon() { return '🚗'; }
    function fmt(it) { return it.title; }
    var stMode = false;
    var INDONESIAN_STOPWORDS = new Set(['pribadi', 'belanja']);
    ${inferSlice}
    ${parseSlice}
  `, context);

  // 1. getSTPocket should detect pkt-dinas
  const stPocket = context.getSTPocket();
  assert.ok(stPocket);
  assert.equal(stPocket.id, 'pkt-dinas');

  // 2. inferPocket should NOT return pkt-dinas for personal expenses
  const inferred = context.inferPocket('bbm', 'bbm motor');
  assert.equal(inferred, 'pkt-bbm');

  // 3. Awalan 'st bbm 50rb' -> source 'st', pocketId 'pkt-dinas', reimburseStatus 'pending'
  const resST = context.parseInput('st bbm 50rb');
  assert.equal(resST.ok, true);
  assert.equal(resST.item.source, 'st');
  assert.equal(resST.item.pocketId, 'pkt-dinas');
  assert.equal(resST.item.reimburseStatus, 'pending');

  // 4. stMode = true, input biasa -> source 'st', pocketId 'pkt-dinas'
  context.stMode = true;
  const resAutoST = context.parseInput('bbm 50rb');
  assert.equal(resAutoST.ok, true);
  assert.equal(resAutoST.item.source, 'st');
  assert.equal(resAutoST.item.pocketId, 'pkt-dinas');

  // 5. stMode = true, tapi ada awalan 'pribadi bbm 50rb' -> override to personal!
  const resOverride = context.parseInput('pribadi bbm 50rb');
  assert.equal(resOverride.ok, true);
  assert.equal(resOverride.item.source, 'personal');
  assert.equal(resOverride.item.pocketId, null); // targetPocketId explicitly null for personal override
});
