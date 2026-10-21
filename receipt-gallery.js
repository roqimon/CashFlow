(function (root) {
  function filter(receipts, transactions, { start, end, allDates = false, category = '', query = '' } = {}) {
    const relatedByReceipt = new Map();
    for (const item of transactions) {
      if (!item.receiptId) continue;
      if (!relatedByReceipt.has(item.receiptId)) relatedByReceipt.set(item.receiptId, []);
      relatedByReceipt.get(item.receiptId).push(item);
    }
    const needle = String(query || '').trim().toLocaleLowerCase('id-ID');
    return receipts.flatMap(receipt => {
      const captured = new Date(receipt.capturedAt).getTime();
      if (!allDates && (!(captured >= start?.getTime() && captured <= end?.getTime()))) return [];
      const related = relatedByReceipt.get(receipt.id) || [];
      const candidateMatches = item => {
        const categories = item.category ? [item.category] : (receipt.categoryNames || []);
        const name = [item.title, receipt.title].filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
        return (!category || categories.includes(category)) && (!needle || name.includes(needle));
      };
      if (related.length ? !related.some(candidateMatches) : !candidateMatches({ title: receipt.title })) return [];
      const categoryNames = [...new Set(related.map(item => item.category).filter(Boolean))];
      return [{ ...receipt, displayTitle: related[0]?.title || receipt.title || 'Nota', categoryNames: categoryNames.length ? categoryNames : (receipt.categoryNames || []), transactionCount: related.length }];
    }).sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt));
  }
  const api = { filter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ReceiptGallery = api;
})(typeof window !== 'undefined' ? window : null);
