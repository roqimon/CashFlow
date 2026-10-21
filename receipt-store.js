(function (root) {
  function createReceiptStore(indexedDBApi) {
    let databasePromise;
    function database() {
      if (!indexedDBApi) return Promise.reject(new Error('Penyimpanan foto tidak tersedia di browser ini.'));
      if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
          const request = indexedDBApi.open('aruskas_receipts_v1', 1);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('receipts')) db.createObjectStore('receipts', { keyPath: 'id' });
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error || new Error('Gagal membuka penyimpanan foto.'));
        }).catch(error => { databasePromise = null; throw error; });
      }
      return databasePromise;
    }
    async function operate(method, argument, write = false) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('receipts', write ? 'readwrite' : 'readonly');
        const store = transaction.objectStore('receipts');
        const request = argument === undefined ? store[method]() : store[method](argument);
        let result;
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(request.error || new Error('Gagal membaca foto.'));
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error || new Error('Gagal menyimpan foto.'));
        transaction.onabort = () => reject(transaction.error || new Error('Penyimpanan foto dibatalkan.'));
      });
    }
    return {
      put: record => operate('put', record, true),
      get: async id => (await operate('get', id)) || null,
      list: async () => (await operate('getAll')) || [],
      remove: id => operate('delete', id, true),
      clear: () => operate('clear', undefined, true)
    };
  }

  function unlinkReceipt(transactions, receiptId) {
    return transactions.map(item => item.receiptId === receiptId ? { ...item, receiptId: null } : item);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createReceiptStore, unlinkReceipt };
  if (root) {
    root.ReceiptStore = createReceiptStore(root.indexedDB);
    root.unlinkReceipt = unlinkReceipt;
  }
})(typeof window !== 'undefined' ? window : null);
