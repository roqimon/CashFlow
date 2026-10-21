const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const galleryPlacementMatch = html.match(/function placeReceiptGalleryLast\(root,gallery\)\s*\{[\s\S]*?\n\}/);
assert.ok(galleryPlacementMatch, 'saved receipt gallery must have a placement rule at the bottom of the report');
const galleryVm = {};
vm.runInNewContext(galleryPlacementMatch[0] + '\nthis.placeReceiptGalleryLast = placeReceiptGalleryLast;', galleryVm);
const reportSections = ['period', 'summary', 'chart', 'budget', 'breakdown', 'receipt-gallery'];
const gallery = { name: 'receipt-gallery', parentElement: null };
const reportRoot = {
  children: reportSections.map(name => name === 'receipt-gallery' ? gallery : { name, parentElement: null }),
  append(node) {
    this.children = this.children.filter(child => child !== node);
    this.children.push(node);
    node.parentElement = this;
  }
};
gallery.parentElement = reportRoot;
galleryVm.placeReceiptGalleryLast(reportRoot, gallery);
assert.equal(reportRoot.children.at(-1), gallery, 'saved receipts must appear after category breakdown');

const helperMatch = html.match(/function reportDonutLegendItems\(totals\)\s*\{[\s\S]*?\n\}/);
assert.ok(helperMatch, 'report donut must expose percentages from current category totals');

const sandbox = {};
vm.runInNewContext(helperMatch[0] + '\nthis.reportDonutLegendItems = reportDonutLegendItems;', sandbox);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(sandbox.reportDonutLegendItems([
    { category: 'Makan', total: 300 },
    { category: 'Transport', total: 100 }
  ]))),
  [
    { category: 'Makan', total: 300, percent: 75 },
    { category: 'Transport', total: 100, percent: 25 }
  ],
  'percentages must use real category totals from the active report period'
);
assert.equal(sandbox.reportDonutLegendItems([]).length, 0, 'empty report periods have no fabricated slices');
assert.ok(html.includes('id="reportCalendarPanel"'), 'report range must use the in-app calendar');
assert.ok(html.includes('data-report-calendar-date'), 'report calendar days must be selectable');
assert.ok(html.includes('report-range-calendar'), 'report calendar must be styled as a modern range picker');
assert.ok(/const r=range\(\),p=arr\.filter\(t=>inRange\(t,r\.start,r\.end\)\),s=sum\(p\)/.test(html), 'report totals and categories must come from transactions in the selected range');
assert.ok(/scope==='monthly'\?\{start:startMonth\(new Date\(\)\),end:endMonth\(new Date\(\)\)\}:range\(\)/.test(html), 'WhatsApp active-period sharing must follow the report range');
console.log('Report donut percentages and range calendar verified.');
