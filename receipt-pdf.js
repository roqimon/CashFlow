(function (root) {
  const encoder = new TextEncoder();
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const margin = 32;

  function escapePdfText(value) {
    return String(value).replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
  }
  function asciiBytes(value) { return encoder.encode(value); }
  function concatBytes(chunks) {
    const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
    return output;
  }
  function streamObject(dictionary, data) {
    return concatBytes([asciiBytes(`${dictionary}\nstream\n`), data, asciiBytes('\nendstream')]);
  }
  async function readImage(blob) {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const jpeg = await new Promise((resolve, reject) => canvas.toBlob(blobResult => blobResult ? resolve(blobResult) : reject(new Error('Foto nota gagal diproses.')), 'image/jpeg', 0.88));
    const bytes = new Uint8Array(await jpeg.arrayBuffer());
    const image = await createImageBitmap(jpeg);
    const dimensions = { width: image.width, height: image.height };
    image.close();
    canvas.width = 0;
    canvas.height = 0;
    return { bytes, ...dimensions };
  }
  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia' : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  async function create(pages) {
    if (!Array.isArray(pages) || !pages.length) throw new Error('PDF memerlukan setidaknya satu foto nota.');
    const objects = [null];
    const add = body => { objects.push(body); return objects.length - 1; };
    const catalogId = add(null);
    const pagesId = add(null);
    const fontId = add(asciiBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
    const pageIds = [];
    for (let index = 0; index < pages.length; index++) {
      const source = pages[index];
      const image = await readImage(source.image);
      const imageId = add(streamObject(`/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length}`, image.bytes));
      const title = escapePdfText(source.title || 'Nota');
      const date = escapePdfText(formatDate(source.capturedAt));
      const header = `BT /F1 15 Tf ${margin} ${PAGE_H - margin - 18} Td (${title}) Tj 0 -19 Td /F1 10 Tf (${date}  |  Nota ${index + 1} dari ${pages.length}) Tj ET`;
      const top = PAGE_H - margin - 48;
      const availableW = PAGE_W - margin * 2;
      const availableH = top - margin;
      const scale = Math.min(availableW / image.width, availableH / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (PAGE_W - width) / 2;
      const y = margin + (availableH - height) / 2;
      const content = asciiBytes(`${header}\nq ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`);
      const contentId = add(streamObject(`/Length ${content.length}`, content));
      pageIds.push(add(asciiBytes(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontId} 0 R >> /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`)));
    }
    objects[catalogId] = asciiBytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    objects[pagesId] = asciiBytes(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
    const chunks = [asciiBytes('%PDF-1.4\n%ArusKas\n')];
    const offsets = [0];
    let position = chunks[0].length;
    for (let id = 1; id < objects.length; id++) {
      const objectBytes = concatBytes([asciiBytes(`${id} 0 obj\n`), objects[id], asciiBytes('\nendobj\n')]);
      offsets[id] = position;
      chunks.push(objectBytes);
      position += objectBytes.length;
    }
    const xrefOffset = position;
    const xref = [`xref\n0 ${objects.length}\n0000000000 65535 f \n`, ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`)].join('');
    chunks.push(asciiBytes(`${xref}trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
    return new Blob(chunks, { type: 'application/pdf' });
  }
  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ReceiptPdf = api;
})(typeof window !== 'undefined' ? window : null);
