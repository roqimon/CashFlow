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
  function filterByDateInputs(receipts, transactions, { from = '', to = '', category = '', query = '' } = {}) {
    if (!from && !to) return filter(receipts, transactions, { allDates: true, category, query });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return [];
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    return filter(receipts, transactions, { start, end, category, query });
  }
  async function prepareShareFiles(ids, store = root?.ReceiptStore, FileType = File) {
    const files = [];
    for (const id of ids) {
      const record = await store.get(id);
      if (!record?.blob) continue;
      const label = String(record.title || 'nota').replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-') || 'nota';
      files.push(new FileType([record.blob], `${label}-${String(id).slice(0,8)}.jpg`, { type: 'image/jpeg' }));
    }
    return files;
  }
  async function shareSelectedReceipts(files, text, navigatorApi = root?.navigator) {
    if (!files?.length || !navigatorApi || typeof navigatorApi.share !== 'function') return 'unsupported';
    if (typeof navigatorApi.canShare === 'function') {
      try { if (!navigatorApi.canShare({ files })) return 'unsupported'; }
      catch { return 'unsupported'; }
    }
    try {
      await navigatorApi.share({ files, text });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  const api = { filter, filterByDateInputs, prepareShareFiles, shareSelectedReceipts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ReceiptGallery = api;
})(typeof window !== 'undefined' ? window : null);
