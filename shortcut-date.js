(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShortcutDate = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const months = {
    januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3,
    april: 4, apr: 4, mei: 5, may: 5, juni: 6, jun: 6,
    juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8,
    september: 9, sep: 9, oktober: 10, okt: 10,
    november: 11, nov: 11, desember: 12, des: 12,
  };
  const monthPattern = Object.keys(months).sort((a, b) => b.length - a.length).join('|');
  const rangeSeparatorPattern = '(?:sampai(?:\\s+dengan)?|hingga|s\\s*\\.?\\s*(?:\\/\\s*\\.?\\s*)?d\\.?)';
  const numberWords = {
    nol: 0, kosong: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4,
    lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
    sebelas: 11,
  };
  const numberWordPattern = Object.keys(numberWords).concat(['belas', 'puluh', 'ratus', 'ribu']).join('|');

  function spokenNumbers(text) {
    const re = new RegExp(`\\b(?:${numberWordPattern})(?:\\s+(?:${numberWordPattern}))*\\b`, 'gi');
    return String(text).replace(re, phrase => {
      const tokens = phrase.toLowerCase().split(/\s+/);
      let total = 0, sub = 0, current = 0, recognized = false;
      for (const token of tokens) {
        if (Object.hasOwn(numberWords, token)) {
          recognized = true;
          current = numberWords[token];
        } else if (token === 'belas') {
          recognized = true; sub += (current || 1) + 10; current = 0;
        } else if (token === 'puluh') {
          recognized = true; sub += (current || 1) * 10; current = 0;
        } else if (token === 'ratus') {
          recognized = true; sub += (current || 1) * 100; current = 0;
        } else if (token === 'ribu') {
          recognized = true; total += ((sub + current) || 1) * 1000; sub = 0; current = 0;
        }
      }
      const value = total + sub + current;
      return recognized && value > 0 ? String(value) : phrase;
    });
  }

  function normalizeTranscript(text) {
    const source = String(text || '');
    const numeric = `(?:\\d{1,4}|(?:${numberWordPattern})(?:\\s+(?:${numberWordPattern}))*)`;
    const range = new RegExp(`\\b((?:dari\\s+)?(?:tanggal|tgl)\\s+)?(${numeric})\\s+(${rangeSeparatorPattern}|[-–—])\\s+(${numeric})(?:\\s+(${monthPattern})(?:\\s+(${numeric}))?)?\\b`, 'gi');
    const dateRanges = source.replace(range, (whole, prefix, start, separator, end, month, year) => {
      return `${prefix || ''}${spokenNumbers(start)} ${separator} ${spokenNumbers(end)}${month ? ` ${month}` : ''}${year ? ` ${spokenNumbers(year)}` : ''}`;
    });
    const single = new RegExp(`\\b((?:dari\\s+)?(?:tanggal|tgl)\\s+)?(${numeric})\\s+(${monthPattern})(?:\\s+(${numeric}))?\\b`, 'gi');
    return dateRanges.replace(single, (whole, prefix, day, month, year) => {
      return `${prefix || ''}${spokenNumbers(day)} ${month}${year ? ` ${spokenNumbers(year)}` : ''}`;
    });
  }

  function localDate(year, month, day) {
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function iso(date) {
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function cleanText(text, start, end) {
    return `${text.slice(0, start)} ${text.slice(end)}`
      .replace(/\b(?:dari\s+)?(?:tanggal|tgl)\b/gi, ' ')
      .replace(/\b(?:dari|sampai|hingga)\b/gi, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function fail(kind, text, start = 0, end = text.length, message = 'Tanggal tidak valid.') {
    return { kind, start: null, end: null, dates: [], cleanText: cleanText(text, start, end), error: message };
  }

  function enumerate(startDate, endDate) {
    const span = Math.round((Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) - Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) / 86400000);
    if (span < 0) return null;
    if (span >= 31) return { tooLong: true };
    const dates = [];
    for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) dates.push(iso(cursor));
    return { dates };
  }

  function result(kind, text, start, end, startDate, endDate = startDate) {
    const listed = enumerate(startDate, endDate);
    if (!listed) return fail('error', text, start, end, 'Tanggal akhir lebih awal dari tanggal awal.');
    if (listed.tooLong) return fail('error', text, start, end, 'Rentang maksimal 31 hari.');
    return { kind, start: iso(startDate), end: iso(endDate), dates: listed.dates, cleanText: cleanText(text, start, end), error: null };
  }

  function parse(input, now = new Date()) {
    const text = spokenNumbers(String(input || '')).trim();
    if (!text) return { kind: 'none', start: null, end: null, dates: [], cleanText: '', error: null };
    const yearNow = now.getFullYear(), monthNow = now.getMonth() + 1;
    let match;

    // Numeric day/month ranges such as 1/10-4/10/2025 or 1/10/2025 sampai 4/10/2025.
    match = text.match(new RegExp(`\\b(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?\\s*(?:${rangeSeparatorPattern}|[-–—])\\s*(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?\\b`, 'i'));
    if (match) {
      const [, d1s, m1s, y1s, d2s, m2s, y2s] = match;
      const m1 = Number(m1s), m2 = Number(m2s);
      const normalizeYear = value => {
        if (!value) return null;
        const year = Number(value);
        return year < 100 ? year + 2000 : year;
      };
      const explicitYear1 = normalizeYear(y1s), explicitYear2 = normalizeYear(y2s);
      const y1 = explicitYear1 || explicitYear2 || yearNow;
      let y2 = explicitYear2 || explicitYear1 || yearNow;
      if (!explicitYear1 && !explicitYear2 && m2 < m1) y2++;
      const d1 = localDate(y1, m1, Number(d1s)), d2 = localDate(y2, m2, Number(d2s));
      if (!d1 || !d2) return fail('error', text, match.index, match.index + match[0].length);
      return result('range', text, match.index, match.index + match[0].length, d1, d2);
    }

    // Explicit month on both endpoints permits crossing a month or year boundary.
    match = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})(?:\\s+(\\d{4}))?\\s+(?:${rangeSeparatorPattern}|[-–—])\\s*(\\d{1,2})\\s+(${monthPattern})(?:\\s+(\\d{4}))?\\b`, 'i'));
    if (match) {
      const [, d1s, m1s, y1s, d2s, m2s, y2s] = match;
      const m1 = months[m1s.toLowerCase()], m2 = months[m2s.toLowerCase()];
      const y1 = y1s ? Number(y1s) : (y2s ? Number(y2s) : yearNow);
      let y2 = y2s ? Number(y2s) : (y1s ? y1 : yearNow);
      if (!y2s && !y1s && m2 < m1) y2++;
      const d1 = localDate(y1, m1, Number(d1s)), d2 = localDate(y2, m2, Number(d2s));
      if (!d1 || !d2) return fail('error', text, match.index, match.index + match[0].length);
      return result('range', text, match.index, match.index + match[0].length, d1, d2);
    }

    // Same-month ranges: 1-5 Oktober, 1 sampai 5 Oktober 2026, or bare 1-5.
    match = text.match(new RegExp(`\\b(\\d{1,2})\\s*(?:[-–—]|${rangeSeparatorPattern})\\s*(\\d{1,2})(?:\\s+(${monthPattern})(?:\\s+(\\d{4}))?)?\\b`, 'i'));
    if (match) {
      const [, d1s, d2s, monthName, yearStr] = match;
      const month = monthName ? months[monthName.toLowerCase()] : monthNow;
      const year = yearStr ? Number(yearStr) : yearNow;
      const d1 = localDate(year, month, Number(d1s)), d2 = localDate(year, month, Number(d2s));
      if (!d1 || !d2) return fail('error', text, match.index, match.index + match[0].length);
      return result('range', text, match.index, match.index + match[0].length, d1, d2);
    }

    // Numeric single date with separators (day/month[/year]).
    match = text.match(/\b(?:tanggal\s+|tgl\s+|dari\s+tanggal\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i);
    if (match) {
      let year = match[3] ? Number(match[3]) : yearNow;
      if (year < 100) year += 2000;
      const date = localDate(year, Number(match[2]), Number(match[1]));
      if (!date) return fail('error', text, match.index, match.index + match[0].length);
      return result('single', text, match.index, match.index + match[0].length, date);
    }

    // Single date with an Indonesian month name.
    match = text.match(new RegExp(`\\b(?:tanggal\\s+|tgl\\s+|dari\\s+tanggal\\s+)?(\\d{1,2})\\s+(${monthPattern})(?:\\s+(\\d{4}))?\\b`, 'i'));
    if (match) {
      const date = localDate(match[3] ? Number(match[3]) : yearNow, months[match[2].toLowerCase()], Number(match[1]));
      if (!date) return fail('error', text, match.index, match.index + match[0].length);
      return result('single', text, match.index, match.index + match[0].length, date);
    }

    // Three bare numbers only become a date when the user explicitly said "tanggal".
    match = text.match(/\b(?:dari\s+)?tanggal\s+(\d{1,2})\s+(\d{1,2})\s+(\d{4})\b/i);
    if (match) {
      const date = localDate(Number(match[3]), Number(match[2]), Number(match[1]));
      if (!date) return fail('error', text, match.index, match.index + match[0].length);
      return result('single', text, match.index, match.index + match[0].length, date);
    }
    if (/\b\d{1,2}\s+\d{1,2}\s+\d{4}\b/.test(text)) {
      const ambiguous = text.match(/\b\d{1,2}\s+\d{1,2}\s+\d{4}\b/);
      return fail('ambiguous', text, ambiguous.index, ambiguous.index + ambiguous[0].length, 'Tambahkan kata “tanggal” atau pemisah / agar format tanggal jelas.');
    }

    return { kind: 'none', start: null, end: null, dates: [], cleanText: text, error: null };
  }

  function formatDate(localIsoDate) {
    const match = String(localIsoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  }

  return { parse, formatDate, normalizeTranscript };
});
