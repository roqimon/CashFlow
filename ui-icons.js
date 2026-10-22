/* Local Phosphor SVGs, MIT license: icons/category/PHOSPHOR-LICENSE.txt */
(function (root) {
  const rows = [
    ['🍽️', 'Makan', 'fork-knife', 'Sehari-hari'],
    ['🛍️', 'Belanja', 'shopping-bag', 'Sehari-hari'],
    ['🛒', 'Belanja bulanan', 'shopping-cart', 'Sehari-hari'],
    ['☕', 'Kopi', 'coffee', 'Sehari-hari'],
    ['🍿', 'Jajan', 'popcorn', 'Sehari-hari'],
    ['🚌', 'Bus', 'bus', 'Sehari-hari'],
    ['🚙', 'Mobil', 'car', 'Sehari-hari'],
    ['🛵', 'Ojek', 'motorcycle', 'Sehari-hari'],
    ['🚲', 'Sepeda', 'bicycle', 'Sehari-hari'],
    ['⛽', 'Bensin', 'gas-pump', 'Sehari-hari'],
    ['🥗', 'Sayur', 'bowl-food', 'Sehari-hari'],
    ['🍞', 'Roti', 'bread', 'Sehari-hari'],
    ['🍔', 'Makanan cepat saji', 'hamburger', 'Sehari-hari'],
    ['🐟', 'Ikan', 'fish', 'Sehari-hari'],
    ['🍳', 'Masak', 'cooking-pot', 'Sehari-hari'],

    ['🏠', 'Rumah', 'house', 'Rumah & keluarga'],
    ['🏫', 'Sekolah', 'student', 'Rumah & keluarga'],
    ['📚', 'Buku', 'book-open', 'Rumah & keluarga'],
    ['👶', 'Anak', 'baby', 'Rumah & keluarga'],
    ['👥', 'Keluarga', 'users-three', 'Rumah & keluarga'],
    ['🏥', 'Kesehatan', 'first-aid-kit', 'Rumah & keluarga'],
    ['💊', 'Obat', 'pill', 'Rumah & keluarga'],
    ['🐾', 'Hewan', 'paw-print', 'Rumah & keluarga'],
    ['👕', 'Pakaian', 't-shirt', 'Rumah & keluarga'],
    ['🧺', 'Cucian', 'basket', 'Rumah & keluarga'],
    ['🏢', 'Gedung', 'buildings', 'Rumah & keluarga'],
    ['🍃', 'Taman', 'leaf', 'Rumah & keluarga'],
    ['🎁', 'Hadiah', 'gift', 'Rumah & keluarga'],
    ['📍', 'Lokasi', 'map-pin', 'Rumah & keluarga'],
    ['🛡️', 'Perlindungan', 'shield-check', 'Rumah & keluarga'],

    ['💡', 'Listrik', 'lightning', 'Tagihan & keuangan'],
    ['📶', 'Internet', 'wifi-high', 'Tagihan & keuangan'],
    ['📱', 'Pulsa', 'device-mobile', 'Tagihan & keuangan'],
    ['💳', 'Kartu', 'credit-card', 'Tagihan & keuangan'],
    ['🐷', 'Tabungan', 'piggy-bank', 'Tagihan & keuangan'],
    ['💰', 'Gaji', 'wallet', 'Tagihan & keuangan'],
    ['🏦', 'Bank', 'bank', 'Tagihan & keuangan'],
    ['🧾', 'Tagihan', 'receipt', 'Tagihan & keuangan'],
    ['📆', 'Langganan', 'calendar', 'Tagihan & keuangan'],
    ['💸', 'Uang keluar', 'hand-coins', 'Tagihan & keuangan'],
    ['💵', 'Uang masuk', 'money', 'Tagihan & keuangan'],
    ['📈', 'Investasi', 'chart-line-up', 'Tagihan & keuangan'],
    ['💼', 'Pekerjaan', 'briefcase', 'Tagihan & keuangan'],
    ['🪙', 'Koin', 'coins', 'Tagihan & keuangan'],
    ['🏪', 'Toko', 'storefront', 'Tagihan & keuangan'],

    ['🎬', 'Hiburan', 'film-strip', 'Lainnya'],
    ['🎮', 'Gim', 'game-controller', 'Lainnya'],
    ['🎵', 'Musik', 'music-notes', 'Lainnya'],
    ['🏋️', 'Olahraga', 'barbell', 'Lainnya'],
    ['🏃', 'Lari', 'person-simple-run', 'Lainnya'],
    ['✈️', 'Penerbangan', 'airplane', 'Lainnya'],
    ['🧳', 'Liburan', 'suitcase', 'Lainnya'],
    ['📷', 'Foto', 'camera', 'Lainnya'],
    ['💻', 'Digital', 'laptop', 'Lainnya'],
    ['🌐', 'Website', 'globe', 'Lainnya'],
    ['🎨', 'Seni', 'paint-brush', 'Lainnya'],
    ['🙏', 'Sedekah', 'hands-praying', 'Lainnya'],
    ['🌞', 'Cuaca', 'sun', 'Lainnya'],
    ['☁️', 'Awan', 'cloud', 'Lainnya'],
    ['🖥️', 'Komputer', 'desktop', 'Lainnya'],
    ['❓', 'Lainnya', 'question', 'Lainnya'],
  ];

  const catalog = rows.map(([value, label, file, group]) => ({ value, label, file, group }));
  const byValue = new Map(catalog.map(item => [item.value, item]));
  const aliases = new Map([
    ['🍴', 'fork-knife'], ['🥄', 'fork-knife'], ['🍛', 'bowl-food'], ['🍜', 'bowl-food'],
    ['🚗', 'car'], ['🚕', 'car'], ['🚘', 'car'], ['🏍️', 'motorcycle'],
    ['📖', 'book-open'], ['🎓', 'student'], ['🩺', 'first-aid-kit'], ['🐱', 'paw-print'], ['🐶', 'paw-print'],
    ['🔥', 'lightning'], ['🚿', 'drop'], ['🔑', 'laptop'], ['🔄', 'calendar'],
    ['📉', 'chart-line-up'], ['🎯', 'chart-line-up'], ['🤝', 'hand-heart'],
    ['🏖️', 'suitcase'], ['🚬', 'question'], ['🅿️', 'map-pin'],
    ['＋', 'money'], ['•', 'squares-four'],
    ['⚡', 'lightning'], ['⚪', 'wallet'], ['📋', 'briefcase'], ['🏷️', 'receipt'],
    ['🎨', 'paint-brush'], ['🗓️', 'calendar'],
    ['📱', 'device-mobile'],
  ]);
  const pathFor = file => `./icons/category/${file}.svg`;
  const assetFor = value => {
    const item = byValue.get(value);
    const file = item ? item.file : aliases.get(value);
    return file ? pathFor(file) : null;
  };
  const escapeAttr = value => String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const picker = (selected, attr) => {
    const groups = ['Sehari-hari', 'Rumah & keluarga', 'Tagihan & keuangan', 'Lainnya'];
    return `<div class="icon-picker-search"><input type="search" class="icon-search" placeholder="Cari ikon atau kategori" aria-label="Cari ikon kategori"></div><div class="icon-gallery">${groups.map(group => `<div class="icon-group" data-group="${escapeAttr(group)}"><div class="icon-group-title">${group}</div><div class="icon-grid">${catalog.filter(item => item.group === group).map(item => `<button type="button" ${attr}="${escapeAttr(item.value)}" data-icon-search="${escapeAttr((item.label + ' ' + group).toLowerCase())}" class="${item.value === selected ? 'active' : ''}" title="${escapeAttr(item.label)}"><img src="${pathFor(item.file)}" alt=""><span>${escapeAttr(item.label)}</span></button>`).join('')}</div></div>`).join('')}</div>`;
  };

  if (root) {
    root.AruskasIcons = { catalog, assetFor, picker };
    root.document?.addEventListener('input', event => {
      if (!event.target.matches('.icon-search')) return;
      const query = event.target.value.trim().toLowerCase();
      const gallery = event.target.closest('.emoji-picker')?.querySelector('.icon-gallery');
      if (!gallery) return;
      gallery.querySelectorAll('.icon-group').forEach(group => {
        let visible = 0;
        group.querySelectorAll('[data-icon-search]').forEach(button => {
          button.hidden = Boolean(query) && !button.dataset.iconSearch.includes(query);
          if (!button.hidden) visible++;
        });
        group.hidden = visible === 0;
      });
    });
  }
  if (typeof module !== 'undefined') module.exports = { catalog, assetFor, picker };
})(typeof window !== 'undefined' ? window : null);
