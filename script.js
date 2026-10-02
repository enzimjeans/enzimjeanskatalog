// ============================================
// SİVAL Katalog
// ============================================

const NEW_COUNT = 12;          // en son eklenen kaç ürün "Yeni" rozeti alsın
const SIMILAR_COUNT = 8;       // ürün detayında kaç benzer ürün gösterilsin
const GROUP_PREVIEW = 8;       // ana sayfada her kategoriden kaç ürün gösterilsin
const FAV_KEY = 'sival_favs';
const LAST_ORDER_KEY = 'sival_last_order';
const BUYER_KEY = 'sival_buyer';

let allProducts = [];
let newIds = new Set();
let activeCategory = 'all';
let cart = [];                 // [{ id, quantity }]
let favs = new Set();
let colorGroups = {};          // model anahtarı -> aynı modelin renkleri

// Tarayıcı hafızası (gizli sekmede hata verebilir)
function readStore(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
}
function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

const $ = id => document.getElementById(id);

// ---------- Yardımcılar ----------
function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "Pamuk.29-30" -> "Pamuk. 29-30" (Excel'den gelen boşluksuz cümleler)
const tidyText = s => String(s || '').replace(/([^\d\s])\.(?=\S)/g, '$1. ').replace(/\s{2,}/g, ' ').trim();

const trLower = s => String(s || '').toLocaleLowerCase('tr');
// "BAGGY KAR YIKAMA" / "baggy ince" -> "Baggy Kar Yıkama" / "Baggy İnce" (Türkçe i/İ doğru)
const titleCase = s => trLower(s).split(' ')
    .map(w => w.replace(/^([("'\-\/]*)(\S)/, (m, pre, ch) => pre + ch.toLocaleUpperCase('tr')))
    .join(' ');

// "350TL", "350 Tl", "1.250 TL", "1.250,50 TL" -> sayı
function extractPrice(text) {
    const m = String(text || '').match(/\d[\d.,]*/);
    if (!m) return 0;
    let n = m[0];
    if (n.includes(',')) {
        n = n.replace(/\./g, '').replace(',', '.');       // 1.250,50
    } else if (/\.\d{3}$/.test(n)) {
        n = n.replace(/\./g, '');                          // 1.250
    }
    return parseFloat(n) || 0;
}

function formatPrice(value) {
    return value.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' TL';
}

function displayPrice(product) {
    const n = extractPrice(product.fiyat);
    return n ? formatPrice(n) : (product.fiyat || '');
}

function imagePath(product) {
    const g = product.gorsel || '';
    return g.startsWith('http') ? g : `gorseller/${encodeURIComponent(g)}`;
}

const inStock = p => p.stok !== 'Yok';
const findProduct = id => allProducts.find(p => p.id === id);

// Renk seçenekleri: aynı kategoride, adı sadece son kelime(ler)de ayrışan ürünler.
// "Baggy Mavi", "Baggy Gri", "Baggy Kar Yıkama" -> model "Baggy"
let groupOf = {};              // ürün id -> model anahtarı
let colorLabel = {};           // ürün id -> "Mavi"

const nameWords = p => titleCase(p.urun_adi).trim().split(/\s+/);

function buildColorGroups() {
    colorGroups = {};
    groupOf = {};
    colorLabel = {};
    const keyFor = (p, drop) => {
        const w = nameWords(p);
        return w.length > drop ? `${p.kategori}|${w.slice(0, -drop).join(' ')}` : null;
    };

    // 1) son kelimesi farklı olanlar
    const byOne = {};
    allProducts.forEach(p => {
        const k = keyFor(p, 1);
        if (k) (byOne[k] = byOne[k] || []).push(p);
    });
    Object.entries(byOne).forEach(([k, list]) => { if (list.length > 1) colorGroups[k] = list; });

    // "Kazak Koyu Mavi" + "Kazak Koyu Yeşil" grubu, "Kazak" grubu varsa ona katılır
    Object.keys(colorGroups).forEach(k => {
        const [cat, model] = k.split('|');
        const parent = `${cat}|${model.split(' ').slice(0, -1).join(' ')}`;
        if (parent !== k && colorGroups[parent]) {
            colorGroups[parent].push(...colorGroups[k]);
            delete colorGroups[k];
        }
    });

    // 2) iki kelimelik renkler ("Koyu Mavi") var olan bir gruba katılır
    const grouped = new Set(Object.values(colorGroups).flat().map(p => p.id));
    allProducts.forEach(p => {
        if (grouped.has(p.id)) return;
        const k2 = keyFor(p, 2);
        if (k2 && colorGroups[k2]) colorGroups[k2].push(p);
    });

    // Etiket: model adından sonra kalan kelimeler; ayırt edici değilse etiket yok
    Object.entries(colorGroups).forEach(([k, list]) => {
        const modelLen = k.split('|')[1].split(' ').length;
        const labels = list.map(p => nameWords(p).slice(modelLen).join(' '));
        const unique = labels.every(Boolean) && new Set(labels).size > 1;
        list.forEach((p, i) => {
            groupOf[p.id] = k;
            colorLabel[p.id] = unique ? labels[i] : '';
        });
    });
}

const colorsOf = p => colorGroups[groupOf[p.id]] || [];

function whatsappUrl(message) {
    const number = String(CONFIG.whatsappNumber).replace(/\D/g, '');
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function productUrl(product) {
    return `${location.origin}${location.pathname}#urun-${product.id}`;
}

let toastTimer;
function toast(message) {
    const t = $('toast');
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- Yükleme ----------
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    favs = new Set(readStore(FAV_KEY, []));
    const buyer = readStore(BUYER_KEY, {});
    $('buyerName').value = buyer.name || '';
    $('buyerCity').value = buyer.city || '';
    setupEvents();
    loadProducts();
});

async function loadProducts() {
    try {
        const response = await fetch('urunler.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Ürünler yüklenemedi');
        allProducts = (await response.json()).filter(p => p && p.urun_adi);

        const newest = [...allProducts].sort((a, b) => b.id - a.id).slice(0, NEW_COUNT);
        newIds = new Set(newest.map(p => p.id));

        // Silinmiş ürünleri sepetten ve favorilerden çıkar
        cart = cart.filter(item => findProduct(item.id));
        saveCart();
        favs = new Set([...favs].filter(id => findProduct(id)));
        writeStore(FAV_KEY, [...favs]);
        buildColorGroups();

        renderStats();
        renderReorder();
        renderChips();
        renderProducts();
        updateCartUI();
        openFromHash();
    } catch (error) {
        console.error(error);
        $('productsGrid').innerHTML = '';
        $('productCount').textContent = 'Ürünler yüklenirken bir hata oluştu. Sayfayı yenileyin.';
    } finally {
        $('loading').hidden = true;
    }
}

function renderStats() {
    const catCount = new Set(allProducts.map(p => p.kategori)).size;
    const stocked = allProducts.filter(inStock).length;
    $('heroStats').innerHTML = `
        <div><strong>${stocked}</strong><span>Stoktaki ürün</span></div>
        <div><strong>${catCount}</strong><span>Kategori</span></div>
        <div><strong>${newIds.size}</strong><span>Yeni ürün</span></div>
    `;
    const hello = whatsappUrl('Merhaba, toptan ürünleriniz hakkında bilgi almak istiyorum.');
    $('footerWhatsApp').href = hello;
    $('heroWhatsApp').href = hello;

    const fresh = newestInStock();

    // Hero: en yeni 3 ürün askılı etiketlerle
    $('heroFan').innerHTML = fresh.slice(0, 3).map((p, i) => `
        <figure class="fan-card fan-${i}" data-similar="${p.id}">
            <img src="${imagePath(p)}" alt="" decoding="async">
            <figcaption class="tag"><span>${escapeHtml(titleCase(p.urun_adi))}</span><strong>${escapeHtml(displayPrice(p))}</strong></figcaption>
        </figure>`).join('');

    // Kayan kategori şeridi
    const words = [...new Set(allProducts.map(p => p.kategori))];
    const strip = words.map(w => `<span>${escapeHtml(w)}</span><i>✦</i>`).join('');
    $('ticker').innerHTML = strip + strip + strip + strip;

    // Yeni gelenler vitrini
    $('newRail').innerHTML = fresh.map((p, i) => productCard(p, i)).join('');
    requestAnimationFrame(updateRailArrows);

    // Kategori kutuları
    const cats = {};
    allProducts.forEach(p => {
        const c = cats[p.kategori] || (cats[p.kategori] = { count: 0, cover: null });
        c.count++;
        if (!c.cover && inStock(p)) c.cover = p;
    });
    $('catTiles').innerHTML = Object.entries(cats).map(([name, c], i) => `
        <button class="cat-tile" data-goto="${escapeHtml(name)}" style="--i:${i}">
            ${c.cover ? `<img src="${imagePath(c.cover)}" alt="" loading="lazy" decoding="async">` : ''}
            <span class="cat-tile-name">${escapeHtml(name)}</span>
            <span class="cat-tile-count">${c.count} model</span>
        </button>`).join('');
}

function updateRailArrows() {
    const rail = $('newRail');
    const max = rail.scrollWidth - rail.clientWidth - 2;
    document.querySelector('.rail-arrow.prev').disabled = rail.scrollLeft <= 2;
    document.querySelector('.rail-arrow.next').disabled = rail.scrollLeft >= max;
}

function newestInStock() {
    return allProducts.filter(p => newIds.has(p.id) && inStock(p)).sort((a, b) => b.id - a.id);
}

function selectCategory(cat) {
    activeCategory = cat;
    renderChips();
    renderProducts();
    const active = document.querySelector('.chip.active');
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    const top = $('controls').offsetTop - document.querySelector('.topbar').offsetHeight;
    if (window.scrollY > top || cat !== 'all') window.scrollTo({ top, behavior: 'smooth' });
}

// ---------- Kategoriler ----------
function renderChips() {
    const counts = {};
    allProducts.forEach(p => { counts[p.kategori] = (counts[p.kategori] || 0) + 1; });
    const chip = (value, label, count) => `
        <button class="chip ${activeCategory === value ? 'active' : ''}" data-cat="${escapeHtml(value)}" role="tab"
                aria-selected="${activeCategory === value}">${escapeHtml(label)}<small>${count}</small></button>`;

    if (activeCategory === 'fav' && favs.size === 0) activeCategory = 'all';
    $('categoryChips').innerHTML =
        chip('all', 'Tümü', allProducts.length) +
        (favs.size ? chip('fav', '♥ Favorilerim', favs.size) : '') +
        chip('new', '✦ Yeni gelenler', newIds.size) +
        Object.keys(counts).map(c => chip(c, c, counts[c])).join('');
}

// ---------- Ürünler ----------
function getVisibleProducts() {
    const q = trLower($('searchInput').value.trim());
    const sort = $('sortSelect').value;

    let list = allProducts.filter(p => {
        if (activeCategory === 'new' && !newIds.has(p.id)) return false;
        if (activeCategory === 'fav' && !favs.has(p.id)) return false;
        if (!['all', 'new', 'fav'].includes(activeCategory) && p.kategori !== activeCategory) return false;
        if (!q) return true;
        return trLower(`${p.urun_adi} ${p.kategori} ${p.aciklama}`).includes(q);
    });

    const sorters = {
        'price-asc': (a, b) => extractPrice(a.fiyat) - extractPrice(b.fiyat),
        'price-desc': (a, b) => extractPrice(b.fiyat) - extractPrice(a.fiyat),
        'name-asc': (a, b) => a.urun_adi.localeCompare(b.urun_adi, 'tr'),
        'default': activeCategory === 'new' ? (a, b) => b.id - a.id : (a, b) => a.id - b.id
    };
    const sorter = sorters[sort] || sorters.default;

    // Stokta olanlar her zaman önce
    return list.sort((a, b) => (inStock(b) - inStock(a)) || sorter(a, b));
}

function renderProducts() {
    const list = getVisibleProducts();
    const grid = $('productsGrid');

    $('noProducts').hidden = list.length > 0;
    const searched = $('searchInput').value.trim();
    $('askMissing').href = whatsappUrl(searched
        ? `Merhaba, katalogda "${searched}" bulamadım. Elinizde var mı?`
        : 'Merhaba, katalogda aradığımı bulamadım, yardımcı olur musunuz?');
    const out = list.filter(p => !inStock(p)).length;
    $('productCount').textContent = list.length
        ? `${list.length} ürün` + (out ? ` · ${out} tanesi şu an stokta yok` : '')
        : '';

    const browsing = activeCategory === 'all' && !$('searchInput').value.trim() && $('sortSelect').value === 'default';
    $('spotlight').hidden = !browsing || newestInStock().length === 0;
    $('catTilesWrap').hidden = !browsing;

    if (browsing) {
        // Kategorilere göre bölümler
        const groups = {};
        list.forEach(p => (groups[p.kategori] = groups[p.kategori] || []).push(p));
        grid.innerHTML = Object.entries(groups).map(([cat, items]) => `
            <section class="group">
                <div class="section-head">
                    <h2>${escapeHtml(cat)} <small>${items.length} model</small></h2>
                    <button class="section-link" data-goto="${escapeHtml(cat)}">Sadece ${escapeHtml(cat)} →</button>
                </div>
                <div class="grid">${items.slice(0, GROUP_PREVIEW).map((p, i) => productCard(p, i)).join('')}</div>
                ${items.length > GROUP_PREVIEW
                    ? `<button class="more-btn" data-goto="${escapeHtml(cat)}">${items.length} modelin tümünü gör →</button>`
                    : ''}
            </section>`).join('');
    } else {
        grid.innerHTML = `<div class="grid">${list.map((p, i) => productCard(p, i)).join('')}</div>`;
    }
}

function productCard(p, index) {
    const badge = !inStock(p)
        ? '<span class="badge">Tükendi</span>'
        : newIds.has(p.id) ? '<span class="badge">Yeni</span>' : '';

    return `
        <article class="card ${inStock(p) ? '' : 'soldout'}" data-id="${p.id}" style="--i:${index}">
            <div class="card-media">
                <button class="media-open" data-open aria-label="${escapeHtml(p.urun_adi)} detayını aç">
                    <img src="${imagePath(p)}" alt="${escapeHtml(p.urun_adi)}" loading="lazy" decoding="async"
                         onerror="this.parentNode.classList.add('noimg')">
                </button>
                ${badge}
                ${favButton(p)}
                <div class="card-action quick" data-compact>${actionHtml(p, true)}</div>
            </div>
            <div class="card-body">
                <h3 class="card-name" data-open>${escapeHtml(titleCase(p.urun_adi))}</h3>
                ${colorsOf(p).length > 1 ? `<span class="card-colors" data-open>${colorsOf(p).length} renk seçeneği</span>` : ''}
                <div class="card-meta">
                    <span class="card-price">${escapeHtml(displayPrice(p))}</span>
                    <span class="card-cat">${escapeHtml(p.kategori)}</span>
                </div>
            </div>
        </article>`;
}

// Sepette yoksa "Sepete ekle", varsa adet kontrolü
function actionHtml(p, compact = false) {
    const item = cart.find(i => i.id === p.id);
    if (compact) {
        if (!inStock(p)) return '';
        if (!item) return `<button class="plus" data-add="${p.id}" aria-label="Sepete ekle">+</button>`;
        return `
            <div class="pill">
                <button data-dec="${p.id}" aria-label="Azalt">−</button>
                <span>${item.quantity}</span>
                <button data-inc="${p.id}" aria-label="Arttır">+</button>
            </div>`;
    }
    if (!inStock(p)) return '<button class="add-btn" disabled>Stokta yok</button>';
    if (!item) return `<button class="add-btn" data-add="${p.id}">Sepete ekle</button>`;
    return stepperHtml(p.id, item.quantity, 'adet');
}

// Toptan alımda adet elle yazılabilsin (50 kez + basmak yerine)
function stepperHtml(id, quantity, unit = '') {
    return `
        <div class="stepper">
            <button data-dec="${id}" aria-label="Azalt">−</button>
            <label class="qty-wrap">
                <input class="qty" type="number" inputmode="numeric" min="0" step="1" value="${quantity}"
                       data-qty="${id}" aria-label="Adet">
                ${unit ? `<small>${unit}</small>` : ''}
            </label>
            <button data-inc="${id}" aria-label="Arttır">+</button>
        </div>`;
}

function favButton(p) {
    const on = favs.has(p.id);
    return `
        <button class="fav ${on ? 'on' : ''}" data-fav="${p.id}" aria-pressed="${on}" aria-label="Favorilere ekle">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.4C.9 8 3 4 6.9 4c2.2 0 3.7 1.2 5.1 3 1.4-1.8 2.9-3 5.1-3C21 4 23.1 8 21.6 11.6 19.5 16.4 12 21 12 21z"/></svg>
        </button>`;
}

function toggleFav(id) {
    const p = findProduct(id);
    if (!p) return;
    if (favs.has(id)) {
        favs.delete(id);
        toast('Favorilerden çıkarıldı');
    } else {
        favs.add(id);
        toast('Favorilere eklendi ♥');
    }
    writeStore(FAV_KEY, [...favs]);
    document.querySelectorAll(`[data-fav="${id}"]`).forEach(btn => {
        btn.classList.toggle('on', favs.has(id));
        btn.setAttribute('aria-pressed', favs.has(id));
    });
    renderChips();
    if (activeCategory === 'fav' || favs.size === 0) renderProducts();
}

// Sepet değişince sadece ilgili kartların butonlarını güncelle (resimler yeniden yüklenmesin)
function refreshActions(id) {
    const p = findProduct(id);
    document.querySelectorAll(`[data-id="${id}"] .card-action, #modalActions[data-id="${id}"]`)
        .forEach(el => { el.innerHTML = actionHtml(p, 'compact' in el.dataset); });
}

// ---------- Ürün detayı ----------
function openModal(id, { updateHash = true } = {}) {
    const p = findProduct(id);
    if (!p) return;

    $('modalImage').src = imagePath(p);
    $('modalImage').alt = p.urun_adi;
    $('modalTitle').textContent = titleCase(p.urun_adi);
    $('modalCategory').textContent = p.kategori + (newIds.has(p.id) ? ' · Yeni' : '');
    $('modalPrice').textContent = displayPrice(p);
    $('modalDescription').textContent = tidyText(p.aciklama);

    const stock = $('modalStock');
    stock.textContent = inStock(p) ? 'Stokta' : 'Şu an stokta yok';
    stock.className = 'detail-stock ' + (inStock(p) ? 'in' : 'out');

    const actions = $('modalActions');
    actions.dataset.id = p.id;
    actions.innerHTML = actionHtml(p);

    // Aynı modelin diğer renkleri
    const colors = colorsOf(p);
    $('colorsWrap').hidden = colors.length < 2;
    $('colorsList').innerHTML = colors.map(x => `
        <button class="color-opt ${x.id === p.id ? 'current' : ''} ${inStock(x) ? '' : 'out'}" data-similar="${x.id}"
                title="${escapeHtml(colorLabel[x.id] || titleCase(x.urun_adi))}">
            <img src="${imagePath(x)}" alt="" loading="lazy" decoding="async">
            ${colorLabel[x.id] ? `<span>${escapeHtml(colorLabel[x.id])}</span>` : ''}
        </button>`).join('');

    const askText = `Merhaba, "${p.urun_adi}" (${displayPrice(p)}) hakkında bilgi almak istiyorum.\n${productUrl(p)}`;
    $('modalExtras').innerHTML = `
        <a class="ask-btn" href="${whatsappUrl(askText)}" target="_blank" rel="noopener">WhatsApp'tan sor</a>
        <button class="ask-btn" data-share="${p.id}">Linki paylaş</button>
        ${favButton(p).replace('class="fav', 'class="fav fav-inline')}`;

    renderSimilar(p);

    const modal = $('productModal');
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
    modal.querySelector('.detail-info').scrollTop = 0;
    document.body.classList.add('no-scroll');
    if (updateHash) history.replaceState(null, '', `#urun-${p.id}`);
}

function renderSimilar(p) {
    const sameModel = new Set(colorsOf(p).map(x => x.id));
    const similar = allProducts
        .filter(x => x.id !== p.id && !sameModel.has(x.id) && x.kategori === p.kategori && inStock(x))
        .sort((a, b) => Math.abs(extractPrice(a.fiyat) - extractPrice(p.fiyat)) - Math.abs(extractPrice(b.fiyat) - extractPrice(p.fiyat)))
        .slice(0, SIMILAR_COUNT);

    $('similarWrap').hidden = similar.length === 0;
    $('similarList').innerHTML = similar.map(x => `
        <button class="similar-item" data-similar="${x.id}">
            <img src="${imagePath(x)}" alt="" loading="lazy" decoding="async">
            <span>${escapeHtml(titleCase(x.urun_adi))}</span>
            <strong>${escapeHtml(displayPrice(x))}</strong>
        </button>`).join('');
}

function openFromHash() {
    const m = location.hash.match(/^#urun-(\d+)$/);
    if (m && findProduct(Number(m[1]))) openModal(Number(m[1]), { updateHash: false });
}

async function shareProduct(id) {
    const p = findProduct(id);
    const url = productUrl(p);
    if (navigator.share) {
        try { await navigator.share({ title: p.urun_adi, text: `${p.urun_adi} - ${displayPrice(p)}`, url }); } catch (e) {}
        return;
    }
    try {
        await navigator.clipboard.writeText(url);
        toast('Ürün linki kopyalandı');
    } catch (e) {
        prompt('Ürün linki:', url);
    }
}

// ---------- Sepet ----------
function loadCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(CONFIG.cart.storageKey) || '[]');
        cart = Array.isArray(saved)
            ? saved.filter(i => i && Number.isFinite(i.id) && i.quantity > 0).map(i => ({ id: i.id, quantity: i.quantity }))
            : [];
    } catch (e) {
        cart = [];
    }
}

function saveCart() {
    try { localStorage.setItem(CONFIG.cart.storageKey, JSON.stringify(cart)); } catch (e) {}
}

function addToCart(id) {
    const p = findProduct(id);
    if (!p || !inStock(p)) return;
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity++;
    } else {
        if (cart.length >= CONFIG.cart.maxItems) return toast(`Sepete en fazla ${CONFIG.cart.maxItems} farklı ürün eklenebilir`);
        cart.push({ id, quantity: 1 });
    }
    afterCartChange(id);
    toast(`Sepete eklendi: ${titleCase(p.urun_adi)}`);
    const count = $('cartCount');
    count.classList.remove('bump');
    void count.offsetWidth;
    count.classList.add('bump');
}

function changeQuantity(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    setQuantity(id, item.quantity + delta);
}

function setQuantity(id, quantity) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    quantity = Math.max(0, Math.min(9999, Math.floor(Number(quantity) || 0)));
    if (quantity === 0) cart = cart.filter(i => i.id !== id);
    else item.quantity = quantity;
    afterCartChange(id);
}

function afterCartChange(id) {
    saveCart();
    updateCartUI();
    refreshActions(id);
    if ($('cartModal').open) renderCart();
}

function cartTotals() {
    let items = 0, total = 0;
    cart.forEach(i => {
        const p = findProduct(i.id);
        if (!p || !inStock(p)) return;
        items += i.quantity;
        total += extractPrice(p.fiyat) * i.quantity;
    });
    return { items, total };
}

function updateCartUI() {
    const { items, total } = cartTotals();
    $('cartCount').textContent = items;
    $('cartCount').hidden = items === 0;
    $('cartBar').hidden = items === 0;
    document.body.classList.toggle('has-cart-bar', items > 0);
    $('cartBarCount').textContent = items;
    $('cartBarTotal').textContent = formatPrice(total);
}

function renderCart() {
    const body = $('cartBody');
    const { items, total } = cartTotals();

    if (cart.length === 0) {
        body.innerHTML = '<p class="empty-cart">Sepetiniz boş.<br>Beğendiğiniz ürünleri ekleyin, siparişi WhatsApp\'tan iletin.</p>';
        $('cartFooter').hidden = true;
        return;
    }

    body.innerHTML = cart.map(i => {
        const p = findProduct(i.id);
        if (!p) return '';
        const price = extractPrice(p.fiyat);
        return `
            <div class="cart-item">
                <img src="${imagePath(p)}" alt="">
                <div>
                    <h4>${escapeHtml(titleCase(p.urun_adi))}</h4>
                    <p class="cart-item-meta">${escapeHtml(p.kategori)} · ${escapeHtml(displayPrice(p))}</p>
                    <p class="cart-item-total">${formatPrice(price * i.quantity)}</p>
                </div>
                ${stepperHtml(p.id, i.quantity)}
                ${inStock(p) ? '' : '<p class="cart-item-warning">Bu ürün stokta kalmadı, siparişe eklenmeyecek.</p>'}
            </div>`;
    }).join('');

    // Sepetteki her şey stoktan düşse bile "Sepeti temizle" görünsün
    $('cartFooter').hidden = false;
    $('whatsappOrder').disabled = items === 0;
    $('cartTotalItems').textContent = items;
    $('cartTotalPrice').textContent = formatPrice(total);
}

function openCart() {
    renderCart();
    $('cartModal').showModal();
    document.body.classList.add('no-scroll');
}

function clearCart() {
    if (!cart.length || !confirm('Sepeti tamamen temizlemek istiyor musunuz?')) return;
    const ids = cart.map(i => i.id);
    cart = [];
    saveCart();
    updateCartUI();
    ids.forEach(refreshActions);
    renderCart();
}

function sendWhatsAppOrder() {
    const lines = cart
        .map(i => ({ ...i, p: findProduct(i.id) }))
        .filter(i => i.p && inStock(i.p));
    if (!lines.length) return toast('Sepetiniz boş');

    const buyer = { name: $('buyerName').value.trim(), city: $('buyerCity').value.trim() };
    writeStore(BUYER_KEY, buyer);

    let message = `${CONFIG.welcomeMessage}\n\n`;
    if (buyer.name) message += `Firma / Ad: ${buyer.name}\n`;
    if (buyer.city) message += `Şehir: ${buyer.city}\n`;
    if (buyer.name || buyer.city) message += '\n';
    lines.forEach((i, n) => {
        const price = extractPrice(i.p.fiyat);
        message += `${n + 1}. ${i.p.urun_adi} (${i.p.kategori})\n`;
        message += `   ${i.quantity} adet x ${formatPrice(price)} = ${formatPrice(price * i.quantity)}\n\n`;
    });
    const { items, total } = cartTotals();
    message += `─────────────────────\n`;
    message += `Toplam: ${items} adet\n`;
    message += `Toplam tutar: ${formatPrice(total)}`;

    // Bir dahaki ziyarette "Siparişi tekrarla" için sakla
    writeStore(LAST_ORDER_KEY, {
        date: new Date().toISOString(),
        items: lines.map(i => ({ id: i.id, quantity: i.quantity }))
    });

    window.open(whatsappUrl(message), '_blank');
}

// ---------- Siparişi tekrarla ----------
function reorderableItems() {
    const last = readStore(LAST_ORDER_KEY, null);
    if (!last || !Array.isArray(last.items)) return { last: null, items: [] };
    const items = last.items.filter(i => { const p = findProduct(i.id); return p && inStock(p); });
    return { last, items };
}

function renderReorder() {
    const { last, items } = reorderableItems();
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('sival_reorder_closed') === '1'; } catch (e) {}
    const show = !!last && items.length > 0 && !dismissed;
    $('reorderBox').hidden = !show;
    if (!show) return;

    const date = new Date(last.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const pieces = items.reduce((s, i) => s + i.quantity, 0);
    const missing = last.items.length - items.length;
    $('reorderInfo').textContent = `${date} tarihli siparişiniz: ${items.length} ürün, ${pieces} adet` +
        (missing ? ` (${missing} ürün şu an stokta yok)` : '');
}

function reorder() {
    const { items } = reorderableItems();
    items.forEach(i => {
        const existing = cart.find(c => c.id === i.id);
        if (existing) existing.quantity = Math.max(existing.quantity, i.quantity);
        else cart.push({ id: i.id, quantity: i.quantity });
        refreshActions(i.id);
    });
    saveCart();
    updateCartUI();
    openCart();
}

// ---------- Olaylar ----------
function closeDialog(dialog) {
    dialog.close();
}

function setupEvents() {
    let searchTimer;
    $('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(renderProducts, 180);
    });
    $('sortSelect').addEventListener('change', renderProducts);

    $('categoryChips').addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        selectCategory(chip.dataset.cat);
    });

    $('resetFilters').addEventListener('click', () => {
        $('searchInput').value = '';
        activeCategory = 'all';
        renderChips();
        renderProducts();
    });

    // Kart, detay ve sepet içindeki tüm butonlar
    document.addEventListener('click', e => {
        const t = e.target.closest('[data-add],[data-inc],[data-dec],[data-open],[data-similar],[data-share],[data-close],[data-goto],[data-fav]');
        if (!t) return;
        const d = t.dataset;
        if (d.fav) toggleFav(Number(d.fav));
        else if (d.goto) selectCategory(d.goto);
        else if (d.add) addToCart(Number(d.add));
        else if (d.inc) changeQuantity(Number(d.inc), 1);
        else if (d.dec) changeQuantity(Number(d.dec), -1);
        else if (d.similar) openModal(Number(d.similar));
        else if (d.share) shareProduct(Number(d.share));
        else if ('open' in d) openModal(Number(t.closest('.card').dataset.id));
        else if ('close' in d) closeDialog(t.closest('dialog'));
    });

    $('cartButton').addEventListener('click', openCart);
    $('cartBar').addEventListener('click', openCart);
    $('clearCart').addEventListener('click', clearCart);
    $('whatsappOrder').addEventListener('click', sendWhatsAppOrder);

    // Elle adet yazma
    document.addEventListener('change', e => {
        if (e.target.dataset && e.target.dataset.qty) setQuantity(Number(e.target.dataset.qty), e.target.value);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.dataset && e.target.dataset.qty) e.target.blur();
    });

    // Firma / şehir bir kez yazılsın, hatırlansın
    ['buyerName', 'buyerCity'].forEach(id => $(id).addEventListener('change', () =>
        writeStore(BUYER_KEY, { name: $('buyerName').value.trim(), city: $('buyerCity').value.trim() })));

    $('reorderBtn').addEventListener('click', reorder);
    $('reorderClose').addEventListener('click', () => {
        $('reorderBox').hidden = true;
        try { sessionStorage.setItem('sival_reorder_closed', '1'); } catch (e) {}
    });

    // Pencere dışına tıklayınca kapat; kapanınca kaydırmayı geri aç
    document.querySelectorAll('dialog').forEach(dialog => {
        dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(dialog); });
        dialog.addEventListener('close', () => {
            if (!document.querySelector('dialog[open]')) document.body.classList.remove('no-scroll');
            if (dialog.id === 'productModal' && location.hash.startsWith('#urun-')) {
                history.replaceState(null, '', location.pathname + location.search);
            }
        });
    });

    window.addEventListener('hashchange', openFromHash);

    // Vitrin okları
    const rail = $('newRail');
    document.querySelectorAll('[data-rail]').forEach(btn => btn.addEventListener('click', () => {
        rail.scrollBy({ left: Number(btn.dataset.rail) * rail.clientWidth * 0.8, behavior: 'smooth' });
    }));
    rail.addEventListener('scroll', updateRailArrows, { passive: true });
    window.addEventListener('resize', updateRailArrows);
}
