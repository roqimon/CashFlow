const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');

function sourceFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) return '';
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`Unclosed function: ${name}`);
}

test('home cash summary does not count dedicated ST budget limits as cash', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${sourceFunction('isDedicatedSTPocket')}\n${sourceFunction('summarizeHomeBudgetPockets')};this.summarizeHomeBudgetPockets=summarizeHomeBudgetPockets`, context);

  const result = context.summarizeHomeBudgetPockets([
    { pocket: { id: 'st-oct', name: 'ST Oktober' }, usage: { amount: 4980000, remaining: 4980000, allocated: 0 } },
    { pocket: { id: 'bebas', name: 'Uang Bebas' }, usage: { amount: 0, remaining: 5000000, allocated: 0 } },
  ]);

  assert.deepEqual({ ...result }, { totalPlafond: 4980000, totalRemaining: 5000000, totalAllocated: 0 });
});

test('home cash summary counts funded personal budgets once alongside free cash', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${sourceFunction('isDedicatedSTPocket')}\n${sourceFunction('summarizeHomeBudgetPockets')};this.summarizeHomeBudgetPockets=summarizeHomeBudgetPockets`, context);

  const result = context.summarizeHomeBudgetPockets([
    { pocket: { id: 'food', name: 'Dapur' }, usage: { amount: 1000000, remaining: 1000000, allocated: 0 } },
    { pocket: { id: 'bebas', name: 'Uang Bebas' }, usage: { amount: 0, remaining: 4000000, allocated: 0 } },
  ]);

  assert.deepEqual({ ...result }, { totalPlafond: 1000000, totalRemaining: 5000000, totalAllocated: 0 });
});
