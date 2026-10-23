(function (root) {
  const COLUMNS = { UPD: 'B', Hotel: 'C', Laundry: 'D', Tiket: 'E', Wrapping: 'F', 'Cuci Mobil': 'G', Taxi: 'H', Tol: 'I', Parkir: 'J', Fuel: 'K' };
  const HEADERS = ['Tanggal', 'UPD', 'Hotel', 'Laundry', 'Tiket', 'Wrapping', 'CuciMobil', 'Taxi', 'TOL', 'Parkir', 'Fuel', 'Keterangan', 'NoWO', 'TOTAL'];
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const colNumber = column => column.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
  const cell = (ref, value, type) => {
    if (value === '' || value === null || value === undefined) return `<c r="${ref}"/>`;
    if (type === 'date') { const [y,m,d] = value.split('-').map(Number); const serial = Math.floor(Date.UTC(y,m-1,d) / 86400000) + 25569; return `<c r="${ref}" s="1"><v>${serial}</v></c>`; }
    if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
  };
  function buildRows(transactions, range) {
    const rows = [], errors = [];
    for (const tx of transactions || []) {
      if (tx.type !== 'expense') continue;
      const fuelReceipt = /\b(spbu|pertamina|bensin|bbm|fuel)\b/i.test(`${tx.title || ''} ${tx.note || ''}`);
      if (tx.source !== 'st' && !fuelReceipt) continue;
      const date = String(tx.date || tx.createdAt || '').slice(0, 10);
      if (!/^\d{4}-\d\d-\d\d$/.test(date) || (range?.from && date < range.from) || (range?.to && date > range.to)) continue;
      const label = `${tx.category || ''} ${tx.title || ''} ${tx.note || ''}`;
      const inferred = fuelReceipt ? 'Fuel'
        : /\b(tol|toll)\b/i.test(label) ? 'Tol'
        : /\bhotel\b/i.test(label) ? 'Hotel'
        : /laundry|cuci\s+(?:baju|pakaian)/i.test(label) ? 'Laundry'
        : /\b(tiket|ticket|pesawat|kereta)\b/i.test(label) ? 'Tiket'
        : /wrapping/i.test(label) ? 'Wrapping'
        : /cuci\s+mobil/i.test(label) ? 'Cuci Mobil'
        : /\b(taxi|taksi)\b/i.test(label) ? 'Taxi'
        : /\bparkir\b/i.test(label) ? 'Parkir'
        : /\bupd\b|upah perjalanan dinas/i.test(label) ? 'UPD' : '';
      const name = tx.workType || tx.declarationType || tx.deklarasiType || inferred;
      if (!COLUMNS[name]) { errors.push({ id: tx.id, title: tx.title || 'Transaksi', message: 'Pilih jenis pengeluaran deklarasi.' }); continue; }
      const amounts = Object.fromEntries(Object.values(COLUMNS).map(col => [col, col === COLUMNS[name] ? Number(tx.amount) || 0 : 0]));
      rows.push({ date, type: name, amount: Number(tx.amount) || 0, amounts, note: tx.note || tx.title || tx.sessionName || '', noWo: '' });
    }
    rows.sort((a,b) => a.date.localeCompare(b.date));
    return { rows, errors };
  }
  function createWorkbook(rows) {
    const xmlRows = [];
    xmlRows.push(`<row r="1">${cell('A1', 'Deklarasi ST', 'text')}</row>`);
    xmlRows.push(`<row r="2">${HEADERS.map((v,i)=>cell(`${String.fromCharCode(65+i)}2`,v,'text')).join('')}</row>`);
    rows.forEach((row,i) => {
      const rn=i+3, cells=[];
      cells.push(cell(`A${rn}`,row.date,'date'));
      for (const col of Object.values(COLUMNS)) cells.push(cell(`${col}${rn}`,col===COLUMNS[row.type]?row.amount:'number'));
      cells.push(cell(`L${rn}`,row.note,'text'),cell(`M${rn}`,row.noWo || '', 'text'),cell(`N${rn}`,Object.values(row.amounts||{}).reduce((sum,amount)=>sum+(Number(amount)||0),0)||Number(row.amount)||0));
      xmlRows.push(`<row r="${rn}">${cells.join('')}</row>`);
    });
    const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:N${Math.max(2,rows.length+2)}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${Array.from({length:14},(_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===0?14:i===11?34:i===12?14:13}" customWidth="1"/>`).join('')}</cols><sheetData>${xmlRows.join('')}</sheetData><autoFilter ref="A2:M${Math.max(2,rows.length+2)}"/></worksheet>`;
    const other = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Lainnya</t></is></c></row></sheetData></worksheet>';
    const files = [
      ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Deklarasi" sheetId="1" r:id="rId1"/><sheet name="Lainnya" sheetId="2" r:id="rId2"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml','<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>'],
      ['xl/worksheets/sheet1.xml',sheet],['xl/worksheets/sheet2.xml',other]
    ];
    return zipStore(files);
  }
  function createZip(files) { return zipStore(files.map(file => [file.name, file.data])); }
  function fileName(from, to) {
    const date = value => { const [y,m,d] = value.split('-'); return `${d}-${m}-${y}`; };
    return `ST ${date(from)} - ${date(to)}.xlsx`;
  }
  function zipStore(files) {
    const enc = new TextEncoder(), chunks=[], central=[]; let offset=0;
    const u16=n=>[n&255,(n>>>8)&255], u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
    for (const [name, content] of files) {
      const nb=enc.encode(name), data=content instanceof Uint8Array?content:enc.encode(content), crc=crc32(data);
      const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...nb,...data]); chunks.push(local);
      central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...nb])); offset+=local.length;
    }
    const centralBytes=central.reduce((n,a)=>n+a.length,0), end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralBytes),...u32(offset),...u16(0)]);
    return new Uint8Array([...chunks.flatMap(a=>Array.from(a)),...central.flatMap(a=>Array.from(a)),...end]);
  }
  function crc32(bytes) { let crc=0xffffffff; for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);} return (crc^0xffffffff)>>>0; }
  const api={COLUMNS,buildRows,createWorkbook,createZip,fileName};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root) root.WorkReport=api;
})(typeof window!=='undefined'?window:null);
