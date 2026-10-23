(function (root) {
  function bytesToBase64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return btoa(binary);
  }

  async function buildReceiptBackup(data, store = root?.ReceiptStore) {
    const records = await store.list();
    const receipts = [];
    for (const record of records) {
      if (!record.blob) throw new Error(`Foto nota ${record.id} tidak tersedia.`);
      receipts.push({
        id: record.id,
        capturedAt: record.capturedAt,
        title: record.title,
        fileName: record.fileName || '',
        source: record.source || 'personal',
        categoryNames: record.categoryNames || [],
        transactionIds: record.transactionIds || [],
        mimeType: record.blob.type || record.mimeType || 'image/jpeg',
        imageBase64: bytesToBase64(new Uint8Array(await record.blob.arrayBuffer()))
      });
    }
    return { ...data, receipts };
  }

  async function restoreReceiptBackup(receipts, store = root?.ReceiptStore) {
    if (receipts == null) return 0;
    if (!Array.isArray(receipts)) throw new Error('Format daftar foto nota tidak sesuai.');
    const decoded = receipts.map(record => {
      if (!record || typeof record.id !== 'string' || !record.id || typeof record.imageBase64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(record.imageBase64)) {
        throw new Error('Data foto nota atau base64 tidak valid.');
      }
      let binary;
      try { binary = atob(record.imageBase64); }
      catch { throw new Error('Data foto nota base64 tidak dapat dibaca.'); }
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      const mimeType = record.mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg';
      return {
        id: record.id,
        blob: new Blob([bytes], { type: mimeType }),
        mimeType,
        fileName: typeof record.fileName === 'string' ? record.fileName : '',
        source: record.source === 'st' ? 'st' : 'personal',
        capturedAt: record.capturedAt,
        title: record.title || 'Nota',
        categoryNames: Array.isArray(record.categoryNames) ? record.categoryNames : [],
        transactionIds: Array.isArray(record.transactionIds) ? record.transactionIds : []
      };
    });
    const previous = [];
    try {
      for (const record of decoded) {
        previous.push({ id: record.id, value: await store.get(record.id) });
        await store.put(record);
      }
    } catch (error) {
      for (const entry of previous.reverse()) {
        try { if (entry.value) await store.put(entry.value); else await store.remove(entry.id); }
        catch (rollbackError) { console.error('Gagal membatalkan impor foto nota:', rollbackError); }
      }
      throw error;
    }
    return decoded.length;
  }

  const api = { buildReceiptBackup, restoreReceiptBackup };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ReceiptBackup = api;
})(typeof window !== 'undefined' ? window : null);
