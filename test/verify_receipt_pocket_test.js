const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// 1. Scan modal has pocket select
assert(html.includes('id="scanManualPocketSelect"'), 'scanManualPocketSelect must exist');

// 2. getReceiptDestination checks activeInputDestination
assert(html.includes('if(activeInputDestination&&activeInputDestination!=='), 'getReceiptDestination must check activeInputDestination');

// 3. syncScanModalWorkTypeVisibility function exists
assert(html.includes('syncScanModalWorkTypeVisibility'), 'syncScanModalWorkTypeVisibility must exist');

// 4. populateScanPocketOptions exists
assert(html.includes('populateScanPocketOptions'), 'populateScanPocketOptions must exist');

// 5. scanManualPocketSelect listener exists
assert(html.includes("$('scanManualPocketSelect')?.addEventListener('change'"), 'scanManualPocketSelect change listener must exist');

// 6. editPocketSelect listener exists
assert(html.includes("$('editPocketSelect')?.addEventListener('change'"), 'editPocketSelect change listener must exist');

console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
