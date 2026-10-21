const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: Pocket Manager Modal & openSavingsDetail ===\n');

const html = fs.readFileSync('index.html', 'utf8');

// Test 1: Pocket Manage Modal markup exists
console.log('--- Test 1: Pocket Manage Modal markup exists ---');
assert(html.includes('id="pocketManageModal"'), 'pocketManageModal modal layer must exist');
assert(html.includes('id="pocketModalManagerList"'), 'pocketModalManagerList container must exist');
assert(html.includes('id="pocketModalBulkBar"'), 'pocketModalBulkBar must exist');
assert(html.includes('id="pocketModalToggleSelectBtn"'), 'pocketModalToggleSelectBtn must exist');
assert(html.includes('id="pocketModalSelectAllBtn"'), 'pocketModalSelectAllBtn must exist');
assert(html.includes('id="pocketModalBulkDelete"'), 'pocketModalBulkDelete must exist');
assert(html.includes('data-action="close-pocket-manager"'), 'close-pocket-manager button must exist');
console.log('✔ Pocket Manage Modal HTML elements verified');

// Test 2: "Atur pos" buttons trigger manage-pockets
console.log('--- Test 2: "Atur pos" triggers data-action="manage-pockets" ---');
const homeBudgetMatch = html.match(/id="budgetContainer"[\s\S]*?Atur pos<\/button>/);
assert(homeBudgetMatch, 'Beranda budgetContainer must have Atur pos button');
assert(homeBudgetMatch[0].includes('data-action="manage-pockets"'), 'Home Atur pos must use data-action="manage-pockets"');

const reportBudgetMatch = html.match(/id='reportBudgetCard'[\s\S]*?Atur pos<\/button>/);
assert(reportBudgetMatch, 'Report budget card must have Atur pos button');
assert(reportBudgetMatch[0].includes('data-action="manage-pockets"'), 'Report Atur pos must use data-action="manage-pockets"');
console.log('✔ "Atur pos" buttons correctly invoke manage-pockets action');

// Test 3: openPocketManager and openSavingsDetail functions
console.log('--- Test 3: openPocketManager & openSavingsDetail functions defined ---');
assert(html.includes('function openPocketManager()'), 'openPocketManager must be defined');
assert(html.includes("openModalLayer('pocketManageModal')"), 'openPocketManager must open pocketManageModal');
assert(html.includes('function openSavingsDetail(goalId)'), 'openSavingsDetail must be defined');
assert(html.includes("openModalLayer('savingsDetailModal')"), 'openSavingsDetail must open savingsDetailModal');
console.log('✔ Functions openPocketManager and openSavingsDetail verified');

// Test 4: renderPocketManager populates both containers
console.log('--- Test 4: renderPocketManager handles both containers ---');
assert(html.includes("$('pocketModalManagerList')"), 'renderPocketManager must reference pocketModalManagerList');
assert(html.includes("$('pocketManager')"), 'renderPocketManager must reference pocketManager');
console.log('✔ renderPocketManager updates both settings and modal lists');

// Test 5: updatePocketSelectUI syncs both bulk bars & buttons
console.log('--- Test 5: updatePocketSelectUI syncs UI ---');
assert(html.includes("'pocketModalBulkBar'"), 'updatePocketSelectUI must sync pocketModalBulkBar');
assert(html.includes("'pocketModalSelCount'"), 'updatePocketSelectUI must sync pocketModalSelCount');
assert(html.includes("'pocketModalToggleSelectBtn'"), 'updatePocketSelectUI must sync pocketModalToggleSelectBtn');
console.log('✔ updatePocketSelectUI sync verified');

console.log('\n=======================================');
console.log('All Pocket Manager Modal tests PASSED!');
console.log('=======================================');
