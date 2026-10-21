const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Savings Allocation & Sweep Feature Test Suite', async (t) => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  await t.test('1. UI Elements exist for Source of Funds & Sweep', () => {
    // Check Source selector in savingsEntryModal
    assert.ok(html.includes('id="savingsSourceSeg"'), 'savingsSourceSeg exists');
    assert.ok(html.includes('data-savings-source="free"'), 'free source option exists');
    assert.ok(html.includes('data-savings-source="pocket"'), 'pocket source option exists');
    assert.ok(html.includes('data-savings-source="goal"'), 'goal source option exists');
    assert.ok(html.includes('id="savingsPocketSourceWrap"'), 'savingsPocketSourceWrap exists');
    assert.ok(html.includes('id="savingsGoalSourceWrap"'), 'savingsGoalSourceWrap exists');
    assert.ok(html.includes('id="savingsPocketUseAllBtn"'), 'savingsPocketUseAllBtn exists');
    assert.ok(html.includes('id="savingsGoalSourceUseAllBtn"'), 'savingsGoalSourceUseAllBtn exists');

    // Check Sweep Modal
    assert.ok(html.includes('id="sweepPocketModal"'), 'sweepPocketModal exists');
    assert.ok(html.includes('id="sweepPocketSelect"'), 'sweepPocketSelect exists');
    assert.ok(html.includes('id="sweepGoalSelect"'), 'sweepGoalSelect exists');
    assert.ok(html.includes('id="sweepAmount"'), 'sweepAmount input exists');
    assert.ok(html.includes('id="sweepMaxBtn"'), 'sweepMaxBtn exists');
    assert.ok(html.includes('data-action="sweep-pocket-modal"'), 'sweep-pocket-modal action button exists in budget container');
  });

  await t.test('2. Logic functions are defined in script', () => {
    assert.ok(html.includes('function updateSavingsSourceUI'), 'updateSavingsSourceUI is defined');
    assert.ok(html.includes('function refreshSavingsPocketSelect'), 'refreshSavingsPocketSelect is defined');
    assert.ok(html.includes('function refreshSavingsGoalSourceSelect'), 'refreshSavingsGoalSourceSelect is defined');
    assert.ok(html.includes('function openSweepPocketModal'), 'openSweepPocketModal is defined');
    assert.ok(html.includes('function saveSweepPocket'), 'saveSweepPocket is defined');
  });

  await t.test('3. Simulation of Pocket to Goal Allocation Logic', () => {
    const savingsCore = require('../savings-core.js');

    // Initial state
    let savings = {
      goals: [
        { id: 'goal-qurban', name: 'Qurban', targetAmount: 3500000, targetDate: null, iconKey: 'qurban', status: 'active', createdAt: new Date().toISOString() },
        { id: 'goal-darurat', name: 'Dana Darurat', targetAmount: 10000000, targetDate: null, iconKey: 'emergency', status: 'active', createdAt: new Date().toISOString() }
      ],
      entries: [
        { id: 'e1', goalId: 'goal-qurban', type: 'deposit', amount: 500000, date: '2026-10-21', note: 'Setoran awal', createdAt: new Date().toISOString() }
      ]
    };

    assert.equal(savingsCore.goalBalance(savings, 'goal-qurban'), 500000);
    assert.equal(savingsCore.goalBalance(savings, 'goal-darurat'), 0);

    // Simulate Inter-Goal Transfer: Move 200,000 from goal-qurban to goal-darurat
    const transferAmount = 200000;
    const nowStr = new Date().toISOString();
    const todayStr = '2026-10-21';

    // 1. Withdrawal from Qurban
    savings = savingsCore.addEntry(savings, {
      id: 'tx-withdraw-1',
      goalId: 'goal-qurban',
      type: 'withdrawal',
      amount: transferAmount,
      date: todayStr,
      note: 'Pindah ke Dana Darurat',
      createdAt: nowStr
    });

    // 2. Deposit to Dana Darurat
    savings = savingsCore.addEntry(savings, {
      id: 'tx-deposit-1',
      goalId: 'goal-darurat',
      type: 'deposit',
      amount: transferAmount,
      date: todayStr,
      note: 'Dari Qurban',
      createdAt: nowStr
    });

    assert.equal(savingsCore.goalBalance(savings, 'goal-qurban'), 300000, 'Qurban balance decreased');
    assert.equal(savingsCore.goalBalance(savings, 'goal-darurat'), 200000, 'Dana Darurat balance increased');
  });

  await t.test('4. App and service worker versions stay in sync', () => {
    const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
    const appVersion=html.match(/id="appVersionBadge"[^>]*>v(\d+)</)?.[1];
    const cacheVersion=sw.match(/aruskas-pwa-v(\d+)/)?.[1];
    assert.ok(appVersion, 'index.html exposes an app version');
    assert.ok(cacheVersion, 'sw.js exposes a cache version');
    assert.equal(appVersion,cacheVersion,'app and service worker versions match');
  });
});
