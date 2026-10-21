(function(root){
  function receiptDate(value, uploadedAt = new Date()) {
    const fallback = uploadedAt.toISOString();
    if (typeof value !== 'string') return fallback;
    const input = value.trim();
    const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const local = input.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (!iso && !local) return fallback;
    const year = Number(iso ? iso[1] : local[3]);
    const month = Number(iso ? iso[2] : local[2]);
    const day = Number(iso ? iso[3] : local[1]);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || year < 2000 || date.getTime() > uploadedAt.getTime() + 86400000) return fallback;
    return date.toISOString();
  }
  function positiveAmount(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : 0;
  }
  function chooseTransactions(data, categories = []) {
    const merchant = String(data?.merchant || 'Nota').trim().slice(0, 100) || 'Nota';
    const total = positiveAmount(data?.total);
    const rows = Array.isArray(data?.items) ? data.items : [];
    const items = rows.map(row => ({
      title: String(row?.title || '').trim().slice(0, 100),
      amount: positiveAmount(row?.amount),
      category: categories.includes(row?.category) ? row.category : null
    }));
    const complete = total && items.length > 1 && items.length <= 50 && items.every(item => item.title && item.amount) && items.reduce((sum, item) => sum + item.amount, 0) === total;
    if (complete) return { mode:'items', merchant, items };
    if (total) return { mode:'total', merchant, items:[{title:merchant,amount:total,category:null}] };
    return { mode:'manual', merchant, items:[] };
  }
  const api = { receiptDate, chooseTransactions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ReceiptAnalysis = api;
})(typeof window !== 'undefined' ? window : null);
