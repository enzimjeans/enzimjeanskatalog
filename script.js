// ============================================
// SİVAL Katalog
// ============================================

const NEW_COUNT = 12;          // en son eklenen kaç ürün "Yeni" rozeti alsın
const SIMILAR_COUNT = 8;       // ürün detayında kaç benzer ürün gösterilsin
const GROUP_PREVIEW = 8;       // ana sayfada her kategoriden kaç ürün gösterilsin
const FAV_KEY = 'sival_favs';
const LAST_ORDER_KEY = 'sival_last_order_v2';
const BUYER_KEY = 'sival_buyer';

let allProducts = [];
let newIds = new Set();
let activeCategory = 'all';
let cart = [];                 // [{ id, size, quantity }]
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

// ---------- Satış şekli: tekli (beden seçilir) / seri (paket) ----------
// Yönetimden kaydedilen satis/bedenler/seriAdet alanları; yoksa açıklamadan okunur.
const SZ = '(?:\\d{2}|\\d?X{0,3}[SL]|M)';
const SIZE_RANGE_RE = new RegExp(`(?:^|[^\\w%])(${SZ}(?:\\s*-\\s*${SZ})+)(?![\\w%])`, 'i');
const SIZE_PAIR_RE = new RegExp(`(${SZ}-${SZ}(?:\\s*\\/\\s*${SZ}-${SZ})+)`, 'i');
const JEAN_SIZES = [28, 29, 30, 31, 32, 33, 34, 36, 38, 40, 42, 44, 46];

function parseSizes(text) {
    const t = String(text || '');
    const pair = t.match(SIZE_PAIR_RE);                 // "XS-S / M-L / XL-2XL"
    if (pair) return pair[1].split('/').map(s => s.replace(/\s+/g, '').toUpperCase());
    const m = t.match(SIZE_RANGE_RE);
    if (!m) return [];
    let parts = m[1].split('-').map(s => s.trim().toUpperCase());
    if (parts.length === 2 && parts.every(x => /^\d{2}$/.test(x))) {   // "31-38" aralığı
        const [a, b] = parts.map(Number);
        parts = JEAN_SIZES.filter(n => n >= a && n <= b).map(String);
    }
    return parts;
}

const saleCache = new Map();
function saleOf(p) {
    if (saleCache.has(p.id)) return saleCache.get(p.id);
    const desc = trLower(p.aciklama);
    const bedenler = Array.isArray(p.bedenler) && p.bedenler.length ? p.bedenler.map(String) : parseSizes(p.aciklama);
    const satis = p.satis === 'seri' || p.satis === 'tekli' ? p.satis : (desc.includes('seri') ? 'seri' : 'tekli');
    const s = { satis, bedenler, seriAdet: Math.max(1, Number(p.seriAdet) || bedenler.length || 1) };
    saleCache.set(p.id, s);
    return s;
}

const isSeri = p => saleOf(p).satis === 'seri';

// ---------- Rozetler (yönetimden seçilir) ----------
const BADGES = {
    'cok-satan': { label: 'Çok satan', cls: 'hot' },
    'one-cikan': { label: 'Öne çıkan', cls: 'star' },
    'firsat': { label: 'Fırsat', cls: 'deal' }
};
const badgeOf = p => BADGES[p.rozet] || null;
const isFeatured = p => !!badgeOf(p) && inStock(p);

// İndirimden önceki fiyat (sadece gerçekten yüksekse gösterilir)
function oldPrice(p) {
    const old = extractPrice(p.eskiFiyat);
    return old > extractPrice(p.fiyat) ? old : 0;
}

function priceHtml(p) {
    const old = oldPrice(p);
    return (old ? `<s class="old-price">${formatPrice(old)}</s> ` : '') + escapeHtml(displayPrice(p));
}
const needsSize = p => !isSeri(p) && saleOf(p).bedenler.length > 0;

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
    loadPromo();
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
        $('sizeCta').hidden = sizeOptions().length === 0;
        renderBackIn();
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

// ---------- Duyuru bandı ----------
const PROMO_CLOSED_KEY = 'sival_promo_closed';
let promo = null;
let promoTimer = null;

async function loadPromo() {
    try {
        const res = await fetch('ayarlar.json', { cache: 'no-store' });
        if (!res.ok) return;
        const ayar = await res.json();
        if (ayar.pdf && ayar.pdf.tarih) showPdfLinks(ayar.pdf);
        setGoals(ayar.hedefler);
        renderTrust(ayar.firma);
        const a = ayar.duyuru;
        if (!a || !a.aktif || !a.metin) return;
        if (a.bitis && new Date(a.bitis) <= Date.now()) return;
        if (readStore(PROMO_CLOSED_KEY, '') === a.id) return;
        promo = a;
        renderPromo();
    } catch (e) {}
}

function showPdfLinks(pdf) {
    const date = new Date(pdf.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const href = `katalog.pdf?v=${new Date(pdf.tarih).getTime()}`;     // yeni PDF'te eskisi önbellekten gelmesin
    ['heroPdf', 'footerPdf'].forEach(id => { $(id).href = href; $(id).hidden = false; });
    $('footerPdf').innerHTML = `<i class="ic ic-file" aria-hidden="true"></i> PDF katalog indir (${date})`;
}

// ---------- Sepet hedefleri: kargo bedava ve kademeli indirim ----------
let goals = { kargo: 0, kademeler: [] };     // kargo: TL eşiği (0 = yok), kademeler: [{ min, indirim }]

function setGoals(h) {
    if (!h || h.aktif === false) return;
    goals = {
        kargo: Number(h.kargo) || 0,
        kademeler: (Array.isArray(h.kademeler) ? h.kademeler : [])
            .map(k => ({ min: Number(k.min) || 0, indirim: Number(k.indirim) || 0 }))
            .filter(k => k.min > 0 && k.indirim > 0 && k.indirim < 100)
            .sort((a, b) => a.min - b.min)
    };
    updateCartUI();
    if ($('cartModal').open) renderCart();
}

// Sepet tutarına göre: kazanılan indirim, kargo durumu ve bir sonraki hedef
function goalState(total) {
    const won = goals.kademeler.filter(k => total >= k.min).pop() || null;
    const discount = won ? Math.round(total * won.indirim) / 100 : 0;
    const freeShip = goals.kargo > 0 && total >= goals.kargo;
    // Sıradaki hedef: en yakın ulaşılmamış eşik
    const targets = [];
    if (goals.kargo > 0 && !freeShip) targets.push({ min: goals.kargo, label: 'kargo bedava' });
    goals.kademeler.filter(k => total < k.min).forEach(k => targets.push({ min: k.min, label: `%${k.indirim} indirim` }));
    targets.sort((a, b) => a.min - b.min);
    const next = targets[0] ? { ...targets[0], remaining: targets[0].min - total } : null;
    return { won, discount, final: total - discount, freeShip, next, any: goals.kargo > 0 || goals.kademeler.length > 0 };
}

function goalProgressHtml(total) {
    const g = goalState(total);
    if (!g.any || !total) return '';
    const wins = [];
    if (g.won) wins.push(`%${g.won.indirim} indirim`);
    if (g.freeShip) wins.push('kargo bedava');
    let html = '';
    if (wins.length) html += `<p class="goal-won"><i class="ic ic-check" aria-hidden="true"></i> Kazandınız: <b>${wins.join(' + ')}</b></p>`;
    if (g.next) {
        const prev = [0, goals.kargo, ...goals.kademeler.map(k => k.min)].filter(m => m <= total).sort((a, b) => b - a)[0] || 0;
        const pct = Math.max(4, Math.min(100, ((total - prev) / (g.next.min - prev)) * 100));
        html += `
            <p class="goal-next"><b>${formatPrice(g.next.remaining)}</b> daha ekleyin → <b>${g.next.label}</b></p>
            <div class="goal-bar"><span style="width:${pct.toFixed(1)}%"></span></div>`;
    }
    return html;
}

// ---------- Bizi tanıyın (firma bilgileri yönetimden girilir; boş olan gösterilmez) ----------
function renderTrust(f) {
    if (!f) return;
    const t = v => String(v || '').trim();
    const year = t(f.kurulus);
    const since = /^\d{4}$/.test(year) ? `${year} yılından beri` : year;   // "2010'dan/1999'dan" ek derdi olmasın

    // Üstte kısa şerit: en güven veren 3 bilgi
    const strip = [
        t(f.kargo) && ['truck', t(f.kargoKisa) || t(f.kargo)],
        t(f.degisim) && ['refresh', t(f.degisimKisa) || 'Değişim imkânı'],
        since && ['store', since]
    ].filter(Boolean).slice(0, 3);
    $('trustStrip').innerHTML = strip.map(([ic, s]) => `<span><i class="ic duo ic-${ic}" aria-hidden="true"></i> ${escapeHtml(s)}</span>`).join('');
    $('trustStrip').hidden = !strip.length;

    const tel = t(f.telefon).replace(/[^\d+]/g, '');
    const mapUrl = t(f.harita) || (t(f.adres) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t(f.adres))}` : '');
    const ig = t(f.instagram).replace(/^@/, '');
    const cards = [
        since && { icon: 'store', title: since, text: t(f.hakkinda) },
        t(f.adres) && { icon: 'pin', title: 'Mağazamız', text: t(f.adres), link: mapUrl, linkText: 'Yol tarifi al' },
        t(f.saatler) && { icon: 'clock', title: 'Çalışma saatleri', text: t(f.saatler) },
        t(f.kargo) && { icon: 'truck', title: 'Kargo', text: t(f.kargo) },
        t(f.odeme) && { icon: 'card', title: 'Ödeme', text: t(f.odeme) },
        t(f.degisim) && { icon: 'refresh', title: 'Değişim', text: t(f.degisim) },
        tel && { icon: 'phone', title: 'Telefon', text: t(f.telefon), link: `tel:${tel}`, linkText: 'Hemen ara', big: true },
        ig && { icon: 'instagram', title: 'Instagram', text: `@${ig}`, link: `https://instagram.com/${encodeURIComponent(ig)}`, linkText: 'Takip et' }
    ].filter(Boolean);
    $('trustGrid').innerHTML = cards.map(c => `
        <div class="trust-card">
            <span class="trust-icon"><i class="ic duo ic-${c.icon}" aria-hidden="true"></i></span>
            <div>
                <b>${escapeHtml(c.title)}</b>
                ${c.text ? `<p>${escapeHtml(c.text)}</p>` : ''}
                ${c.link ? `<a class="trust-link ${c.big ? 'big' : ''}" href="${escapeHtml(c.link)}" ${c.link.startsWith('tel:') ? '' : 'target="_blank" rel="noopener"'}>${escapeHtml(c.linkText)} →</a>` : ''}
            </div>
        </div>`).join('');
    $('trust').hidden = !cards.length;
}

function countdownText(end) {
    const ms = new Date(end) - Date.now();
    if (!(ms > 0)) return '';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return (d ? `${d} gün ` : '') + `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function renderPromo() {
    $('promoText').textContent = promo.metin;
    $('promoGo').hidden = !promo.hedef;
    $('promoMain').disabled = !promo.hedef;
    $('promo').hidden = false;
    if (promo.bitis) {
        const tick = () => {
            const t = countdownText(promo.bitis);
            if (!t) { hidePromo(); return; }      // süre bitti
            $('promoTimer').innerHTML = `<i class="ic ic-clock" aria-hidden="true"></i> ${t}`;
            $('promoTimer').hidden = false;
        };
        tick();
        promoTimer = setInterval(tick, 1000);
    }
}

function hidePromo() {
    clearInterval(promoTimer);
    $('promo').hidden = true;
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

    // Hero: güncel ürünler. Arka planda mozaik, önde dönen 3'lü vitrin.
    heroPool = heroProducts();
    $('heroMosaic').innerHTML = heroPool.slice(0, 12).map(p =>
        `<img src="${imagePath(p)}" alt="" decoding="async" loading="lazy">`).join('');
    heroStart = 0;
    renderHeroFan();
    clearInterval(heroTimer);
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (heroPool.length > 3 && !calm) {
        heroTimer = setInterval(() => {
            if (document.hidden) return;
            heroStart = (heroStart + 3) % heroPool.length;
            renderHeroFan(true);
        }, 5000);
    }

    // Kayan kategori şeridi
    const words = [...new Set(allProducts.map(p => p.kategori))];
    const strip = words.map(w => `<span>${escapeHtml(w)}</span><i class="tick-sep"></i>`).join('');
    $('ticker').innerHTML = strip + strip + strip + strip;

    // Yeni gelenler vitrini
    $('newRail').innerHTML = fresh.map((p, i) => productCard(p, i)).join('');
    // Öne çıkanlar: çok satan, öne çıkan, fırsat sırasıyla
    const order = Object.keys(BADGES);
    $('featRail').innerHTML = allProducts.filter(isFeatured)
        .sort((a, b) => order.indexOf(a.rozet) - order.indexOf(b.rozet) || b.id - a.id)
        .map((p, i) => productCard(p, i)).join('');
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

// ---------- Hero vitrini ----------
let heroPool = [], heroStart = 0, heroTimer = null;

// Çeşitli olsun: önce rozetliler, sonra her kategorinin en yenisi, sonra kalan yeniler
function heroProducts() {
    const stocked = allProducts.filter(inStock).sort((a, b) => b.id - a.id);
    const pool = [], seen = new Set();
    const add = p => { if (p && !seen.has(p.id)) { seen.add(p.id); pool.push(p); } };
    stocked.filter(p => badgeOf(p)).forEach(add);
    [...new Set(stocked.map(p => p.kategori))].forEach(cat => add(stocked.find(p => p.kategori === cat)));
    stocked.forEach(add);
    return pool.slice(0, 15);
}

function renderHeroFan(animate) {
    const three = [0, 1, 2].map(i => heroPool[(heroStart + i) % heroPool.length]).filter(Boolean);
    const fan = $('heroFan');
    const html = three.map((p, i) => {
        const b = badgeOf(p);
        return `
        <figure class="fan-card fan-${i}" data-similar="${p.id}">
            <img src="${imagePath(p)}" alt="${escapeHtml(titleCase(p.urun_adi))}" decoding="async">
            ${b ? `<span class="badge ${b.cls}">${b.label}</span>` : ''}
            <figcaption class="tag"><span>${escapeHtml(titleCase(p.urun_adi))}</span><strong>${escapeHtml(displayPrice(p))}</strong></figcaption>
        </figure>`;
    }).join('');
    if (!animate) { fan.innerHTML = html; return; }
    fan.classList.add('swap');
    setTimeout(() => { fan.innerHTML = html; fan.classList.remove('swap'); }, 350);
}

function updateRailArrows() {
    document.querySelectorAll('.rail-wrap').forEach(wrap => {
        const rail = wrap.querySelector('.rail');
        const max = rail.scrollWidth - rail.clientWidth - 2;
        wrap.querySelector('.rail-arrow.prev').disabled = rail.scrollLeft <= 2;
        wrap.querySelector('.rail-arrow.next').disabled = rail.scrollLeft >= max;
    });
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
        (favs.size ? chip('fav', 'Favorilerim', favs.size) : '') +
        (allProducts.some(badgeOf) ? chip('featured', 'Öne çıkanlar', allProducts.filter(badgeOf).length) : '') +
        chip('new', 'Yeni gelenler', newIds.size) +
        (sizeOptions().length ? chip('beden', 'Eksik beden tamamla', allProducts.filter(p => needsSize(p) && inStock(p)).length) : '') +
        Object.keys(counts).map(c => chip(c, c, counts[c])).join('');
}

// ---------- Ürünler ----------
function getVisibleProducts() {
    const q = trLower($('searchInput').value.trim());
    const sort = $('sortSelect').value;

    // Telefonda "52 numara" denen ürün: sadece sayı yazılırsa önce o numaralı ürün gelir
    const num = (q.match(/^(?:no\s*[.:]?\s*)?(\d+)$/) || [])[1];

    let list = allProducts.filter(p => {
        if (num && String(p.id) === num) return true;
        if (activeCategory === 'new' && !newIds.has(p.id)) return false;
        if (activeCategory === 'fav' && !favs.has(p.id)) return false;
        if (activeCategory === 'featured' && !badgeOf(p)) return false;
        if (activeCategory === 'beden' && !matchesWantedSize(p)) return false;
        if (!['all', 'new', 'fav', 'featured', 'beden'].includes(activeCategory) && p.kategori !== activeCategory) return false;
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
    // Stokta olanlar önce; "Önerilen" sıralamada rozetli ürünler de öne çıkar
    const rank = p => badgeOf(p) ? Object.keys(BADGES).indexOf(p.rozet) : 99;   // çok satan > öne çıkan > fırsat
    const featuredFirst = sort === 'default' ? (a, b) => rank(a) - rank(b) : () => 0;
    const exact = p => num && String(p.id) === num ? 0 : 1;
    return list.sort((a, b) => exact(a) - exact(b) || (inStock(b) - inStock(a)) || featuredFirst(a, b) || sorter(a, b));
}

function renderProducts() {
    if (activeCategory === 'beden' && !wantedSizes.size) activeCategory = 'all';
    renderSizeBanner();
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
    $('featured').hidden = !browsing || !allProducts.some(isFeatured);
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
    const b = badgeOf(p);
    const badge = !inStock(p)
        ? '<span class="badge">Tükendi</span>'
        : b ? `<span class="badge ${b.cls}">${b.label}</span>`
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
                ${p.video ? '<span class="video-chip" aria-hidden="true"><i class="ic ic-play"></i> Video</span>' : ''}
            </div>
            <div class="card-body">
                <h3 class="card-name" data-open>${escapeHtml(titleCase(p.urun_adi))}</h3>
                <div class="card-sub">
                    <span class="sale-tag ${isSeri(p) ? 'seri' : ''}">${isSeri(p) ? `Seri · ${saleOf(p).seriAdet}'li` : 'Tekli'}</span>
                    ${colorsOf(p).length > 1 ? `<span class="card-colors">${colorsOf(p).length} renk</span>` : ''}
                    ${activeCategory === 'beden' && matchesWantedSize(p) ? `<span class="size-hit">${escapeHtml(wantedIn(p).join(' · '))} var</span>` : ''}
                </div>
                <div class="card-meta">
                    <span class="card-price">${priceHtml(p)}</span>
                    <span class="card-no">No ${p.id}</span>
                </div>
                <div class="card-action" data-compact>${actionHtml(p, true)}</div>
            </div>
        </article>`;
}

// Kart: seri -> "+" bir seri ekler; tekli -> "+" beden seçimi için detayı açar
function actionHtml(p, compact = false) {
    const unit = isSeri(p) ? 'seri' : 'adet';
    // Kartta yazılı, büyük düğmeler: herkesin anlayacağı dil
    if (compact) {
        if (!inStock(p)) return notifyButton(p, 'card-btn');
        if (needsSize(p)) {
            const pieces = productPieces(p.id);
            return pieces
                ? `<button class="card-btn done" data-open>✓ ${pieces} adet · Değiştir</button>`
                : `<button class="card-btn" data-open>Beden seç</button>`;
        }
        const q = cartQty(p.id, '');
        if (!q) return `<button class="card-btn" data-add="${p.id}">Sepete ekle</button>`;
        return `
            <div class="card-step">
                <button data-dec="${p.id}" data-size="" aria-label="Azalt">−</button>
                <span>${q} ${unit}</span>
                <button data-inc="${p.id}" data-size="" aria-label="Arttır">+</button>
            </div>`;
    }

    if (!inStock(p)) return notifyButton(p, 'add-btn notify-big');
    const price = extractPrice(p.fiyat);
    const s = saleOf(p);

    // Tekli: her beden için ayrı adet
    if (needsSize(p)) {
        const pieces = productPieces(p.id);
        return `
            <p class="pick-title">Beden ve adet seçin</p>
            <div class="size-grid">
                ${s.bedenler.map(b => {
                    const q = cartQty(p.id, b);
                    return `
                    <div class="size-cell ${q ? 'on' : ''} ${sizeWanted(b) ? 'wanted' : ''}">
                        <span class="size-name">${escapeHtml(b)}</span>
                        ${stepperHtml(p.id, b, q)}
                    </div>`;
                }).join('')}
            </div>
            <p class="pick-sum">${pieces
                ? `Sepette <b>${pieces} adet</b> · ${formatPrice(pieces * price)}`
                : 'Bedenin altındaki <b>+</b> ile ekleyin'}</p>
            ${pieces ? goCartHtml() : ''}`;
    }

    // Seri: seri sayısı
    const q = cartQty(p.id, '');
    const info = isSeri(p)
        ? `<p class="seri-info">1 seri = ${s.bedenler.length ? escapeHtml(s.bedenler.join(', ')) + ' · ' : ''}<b>${s.seriAdet} adet</b> · ${formatPrice(s.seriAdet * price)}</p>`
        : '';
    if (!q) return info + `<button class="add-btn" data-add="${p.id}">${isSeri(p) ? '1 seri sepete ekle' : 'Sepete ekle'}</button>`;
    return info + stepperHtml(p.id, '', q, unit) +
        (isSeri(p) ? `<p class="pick-sum">${q} seri · <b>${q * s.seriAdet} adet</b> · ${formatPrice(q * s.seriAdet * price)}</p>` : '') +
        goCartHtml();
}

const goCartHtml = () => '<button class="go-cart" data-go-cart>Sepete git ve siparişi gönder →</button>';

// Toptan alımda adet elle yazılabilsin (50 kez + basmak yerine)
function stepperHtml(id, size, quantity, unit = '') {
    const sz = escapeHtml(size);
    return `
        <div class="stepper">
            <button data-dec="${id}" data-size="${sz}" aria-label="Azalt">−</button>
            <label class="qty-wrap">
                <input class="qty" type="number" inputmode="numeric" min="0" step="1" value="${quantity}"
                       data-qty="${id}" data-size="${sz}" aria-label="${unit === 'seri' ? 'Seri sayısı' : 'Adet'}">
                ${unit ? `<small>${unit}</small>` : ''}
            </label>
            <button data-inc="${id}" data-size="${sz}" aria-label="Arttır">+</button>
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
        toast('Favorilere eklendi');
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
    if (!p) return;
    document.querySelectorAll(`[data-id="${id}"] .card-action, #modalActions[data-id="${id}"]`)
        .forEach(el => {
            // Elle adet yazılırken o kutuyu yeniden çizip imleci kaçırma
            const focused = el.contains(document.activeElement) && document.activeElement.matches('.qty')
                ? { size: document.activeElement.dataset.size } : null;
            el.innerHTML = actionHtml(p, 'compact' in el.dataset);
            if (focused) {
                const again = el.querySelector(`.qty[data-size="${CSS.escape(focused.size)}"]`);
                if (again) { again.focus(); again.select(); }
            }
        });
}

// ---------- Ürün detayı ----------
function openModal(id, { updateHash = true } = {}) {
    const p = findProduct(id);
    if (!p) return;

    $('modalImage').src = imagePath(p);
    $('modalImage').alt = p.urun_adi;
    setupMedia(p);
    $('modalTitle').textContent = titleCase(p.urun_adi);
    $('modalPrice').innerHTML = `${priceHtml(p)} <small>/ adet</small>`;
    const mb = badgeOf(p);
    $('modalCategory').textContent = `No ${p.id} · ${p.kategori}` + (mb ? ` · ${mb.label}` : newIds.has(p.id) ? ' · Yeni' : '');
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

    const askText = `Merhaba, No ${p.id} "${p.urun_adi}" (${displayPrice(p)}) hakkında bilgi almak istiyorum.\n${productUrl(p)}`;
    $('modalExtras').innerHTML = `
        <a class="ask-btn" href="${whatsappUrl(askText)}" target="_blank" rel="noopener">WhatsApp'tan sor</a>
        <button class="ask-btn" data-share="${p.id}">Linki paylaş</button>
        ${favButton(p).replace('class="fav', 'class="fav fav-inline')}`;

    renderSimilar(p);

    const modal = $('productModal');
    openDialog(modal);
    modal.scrollTop = 0;
    modal.querySelector('.detail-info').scrollTop = 0;
    document.body.classList.add('no-scroll');
    if (updateHash) history.replaceState(history.state, '', `#urun-${p.id}`);   // geri tuşu kaydı korunsun
}

// ---------- Ürün videosu ----------
let mediaProduct = null;

function youtubeId(url) {
    const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/i);
    return m ? m[1] : null;
}

const isInstagram = url => /instagram\.com\//i.test(url || '');

function setupMedia(p) {
    stopMedia();
    mediaProduct = p;
    const has = !!p.video;
    $('mediaSwitch').hidden = !has;
    showMedia('photo');
}

function showMedia(which) {
    const p = mediaProduct;
    if (!p) return;
    const v = $('modalVideo'), f = $('modalEmbed'), img = $('modalImage');
    document.querySelectorAll('#mediaSwitch button').forEach(b => b.classList.toggle('active', b.dataset.media === which));

    if (which === 'video' && isInstagram(p.video)) {
        window.open(p.video, '_blank', 'noopener');        // Instagram gömülemiyor: uygulamada açılır
        which = 'photo';
        document.querySelectorAll('#mediaSwitch button').forEach(b => b.classList.toggle('active', b.dataset.media === 'photo'));
    }

    const yt = which === 'video' ? youtubeId(p.video) : null;
    img.hidden = which === 'video';
    v.hidden = !(which === 'video' && !yt);
    f.hidden = !yt;

    if (which !== 'video') { stopMedia(true); return; }
    if (yt) {
        f.src = `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&playsinline=1&rel=0`;
    } else {
        if (v.dataset.src !== p.video) {
            v.src = p.video;
            v.dataset.src = p.video;
            v.poster = imagePath(p);
        }
        v.play().catch(() => {});
    }
}

function stopMedia(keepProduct) {
    const v = $('modalVideo'), f = $('modalEmbed');
    v.pause();
    if (!keepProduct) { v.removeAttribute('src'); v.dataset.src = ''; v.load(); }
    f.src = 'about:blank';
}

// ---------- Eksik beden tamamla ----------
// Esnaf rafında biten bedenleri seçer; o bedenlerde tekli alınabilen ürünler listelenir.
const wantedSizes = new Set();
const LETTER_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
const sizeParts = b => String(b).split('-').map(x => x.trim()).filter(Boolean);   // "M-L" -> M, L
const sizeWanted = b => sizeParts(b).some(x => wantedSizes.has(x));
const matchesWantedSize = p => needsSize(p) && inStock(p) && saleOf(p).bedenler.some(sizeWanted);
const wantedIn = p => [...new Set(saleOf(p).bedenler.flatMap(sizeParts).filter(x => wantedSizes.has(x)))];

// Katalogdaki tekli ürünlerden çıkan bedenler, iki grupta
function sizeOptions() {
    const all = new Set();
    allProducts.filter(p => needsSize(p) && inStock(p)).forEach(p => saleOf(p).bedenler.flatMap(sizeParts).forEach(x => all.add(x)));
    return [...all];
}

function renderSizeGroups() {
    const opts = sizeOptions();
    const letters = opts.filter(x => /[A-Z]/.test(x)).sort((a, b) => (LETTER_ORDER.indexOf(a) + 99) % 99 - (LETTER_ORDER.indexOf(b) + 99) % 99);
    const numbers = opts.filter(x => /^\d+$/.test(x)).sort((a, b) => a - b);
    const group = (title, list) => list.length ? `
        <p class="size-group-title">${title}</p>
        <div class="size-pick">${list.map(x => `<button type="button" class="${wantedSizes.has(x) ? 'on' : ''}" data-want="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('')}</div>` : '';
    $('sizeGroups').innerHTML = group('Üst giyim (gömlek, tişört, mont...)', letters) + group('Pantolon (bel ölçüsü)', numbers);
    const n = allProducts.filter(matchesWantedSize).length;
    $('sizeShow').disabled = !wantedSizes.size || !n;
    $('sizeShow').textContent = !wantedSizes.size ? 'Beden seçin' : n ? `${n} ürünü göster` : 'Bu bedenlerde ürün yok';
}

function openSizeFinder() {
    renderSizeGroups();
    openDialog($('sizeModal'));
    document.body.classList.add('no-scroll');
}

function showSizeResults() {
    $('sizeModal').close();
    selectCategory('beden');
}

function renderSizeBanner() {
    const on = activeCategory === 'beden' && wantedSizes.size > 0;
    $('sizeBanner').hidden = !on;
    if (!on) return;
    $('sizeBannerSizes').textContent = [...wantedSizes].join(', ');
    $('sizeBannerCount').textContent = allProducts.filter(matchesWantedSize).length;
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
// Her satır: { id, size, quantity }. Seri üründe size boş ve quantity = seri sayısı;
// tekli üründe her beden ayrı satır ve quantity = adet.
const CART_KEY = () => `${CONFIG.cart.storageKey}_v2`;

const cartQty = (id, size) => (cart.find(i => i.id === id && i.size === size) || {}).quantity || 0;

function piecesOf(item) {
    const p = findProduct(item.id);
    if (!p) return 0;
    return isSeri(p) ? item.quantity * saleOf(p).seriAdet : item.quantity;
}

const productPieces = id => cart.filter(i => i.id === id).reduce((s, i) => s + piecesOf(i), 0);

function loadCart() {
    const saved = readStore(CART_KEY(), []);
    cart = Array.isArray(saved)
        ? saved.filter(i => i && Number.isFinite(i.id) && i.quantity > 0)
            .map(i => ({ id: i.id, size: String(i.size || ''), quantity: Math.floor(i.quantity) }))
        : [];
}

function saveCart() {
    writeStore(CART_KEY(), cart);
}

function bumpCartCount() {
    const count = $('cartCount');
    count.classList.remove('bump');
    void count.offsetWidth;
    count.classList.add('bump');
}

// Seri üründe 1 seri, bedensiz tekli üründe 1 adet ekler
function addToCart(id) {
    const p = findProduct(id);
    if (!p || !inStock(p)) return;
    if (needsSize(p)) return openModal(id);              // beden seçmeden eklenmesin
    changeQuantity(id, '', 1);
}

function changeQuantity(id, size, delta) {
    setQuantity(id, size, cartQty(id, size) + delta);
}

function setQuantity(id, size, quantity) {
    const p = findProduct(id);
    if (!p || !inStock(p)) return;
    quantity = Math.max(0, Math.min(9999, Math.floor(Number(quantity) || 0)));
    const item = cart.find(i => i.id === id && i.size === size);
    const before = productPieces(id);

    if (quantity === 0) {
        cart = cart.filter(i => !(i.id === id && i.size === size));
    } else if (item) {
        item.quantity = quantity;
    } else {
        const distinct = new Set(cart.map(i => i.id));
        if (!distinct.has(id) && distinct.size >= CONFIG.cart.maxItems) {
            return toast(`Sepete en fazla ${CONFIG.cart.maxItems} farklı ürün eklenebilir`);
        }
        cart.push({ id, size, quantity });
    }

    saveCart();
    updateCartUI();
    refreshActions(id);
    if ($('cartModal').open) renderCart();
    if (productPieces(id) > before) {
        bumpCartCount();
        if (before === 0) toast(`Sepete eklendi ✓ ${titleCase(p.urun_adi)}`);
    }
}

function cartTotals() {
    let items = 0, total = 0;
    cart.forEach(i => {
        const p = findProduct(i.id);
        if (!p || !inStock(p)) return;
        const pieces = piecesOf(i);
        items += pieces;
        total += extractPrice(p.fiyat) * pieces;
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
    const g = goalState(total);
    $('cartBarTotal').textContent = formatPrice(g.final);
    const goalText = !g.any || !items ? ''
        : g.next ? `${formatPrice(g.next.remaining)} daha → ${g.next.label}`
        : '✓ Tüm hedeflere ulaştınız';
    $('cartBarGoal').textContent = goalText;
    $('cartBarGoal').hidden = !goalText;
}

// Sepette ürün başına tek kart; tekli üründe bedenler alt alta
function renderCart() {
    const body = $('cartBody');
    const { items, total } = cartTotals();

    if (cart.length === 0) {
        body.innerHTML = '<p class="empty-cart">Sepetiniz boş.<br>Beğendiğiniz ürünleri ekleyin, siparişi WhatsApp\'tan iletin.</p>';
        $('cartFooter').hidden = true;
        return;
    }

    const ids = [...new Set(cart.map(i => i.id))];
    body.innerHTML = ids.map(id => {
        const p = findProduct(id);
        if (!p) return '';
        const price = extractPrice(p.fiyat);
        const lines = cart.filter(i => i.id === id);
        const pieces = productPieces(id);
        const s = saleOf(p);

        let detail;
        if (isSeri(p)) {
            detail = `
                <p class="cart-item-meta">Seri: ${escapeHtml(s.bedenler.join('-'))} · 1 seri ${s.seriAdet} adet</p>
                <div class="cart-line">${stepperHtml(id, '', lines[0].quantity, 'seri')}</div>`;
        } else {
            detail = lines.map(i => `
                <div class="cart-line">
                    <span class="cart-size">${i.size ? `Beden <b>${escapeHtml(i.size)}</b>` : 'Adet'}</span>
                    ${stepperHtml(id, i.size, i.quantity)}
                </div>`).join('') +
                (needsSize(p) ? `<button class="link-btn small" data-open-id="${id}">+ Başka beden ekle</button>` : '');
        }

        return `
            <div class="cart-item">
                <img src="${imagePath(p)}" alt="">
                <div class="cart-item-body">
                    <h4>${escapeHtml(titleCase(p.urun_adi))}</h4>
                    <p class="cart-item-meta">${escapeHtml(displayPrice(p))} / adet</p>
                    ${detail}
                    <p class="cart-item-total">${pieces} adet · ${formatPrice(price * pieces)}</p>
                    ${inStock(p) ? '' : '<p class="cart-item-warning">Bu ürün stokta kalmadı, siparişe eklenmeyecek.</p>'}
                </div>
            </div>`;
    }).join('');

    // Sepetteki her şey stoktan düşse bile "Sepeti temizle" görünsün
    $('cartFooter').hidden = false;
    $('whatsappOrder').disabled = items === 0;
    $('cartTotalItems').textContent = items;
    const g = goalState(total);
    $('goalBox').innerHTML = goalProgressHtml(total);
    $('goalBox').hidden = !$('goalBox').innerHTML.trim();
    $('cartLines').innerHTML = g.discount
        ? `<p><span>Ara toplam</span><span>${formatPrice(total)}</span></p>
           <p class="disc"><span>İndirim (%${g.won.indirim})</span><span>−${formatPrice(g.discount)}</span></p>`
        : '';
    $('cartTotalPrice').textContent = formatPrice(g.final);
}

function openCart() {
    renderCart();
    openDialog($('cartModal'));
    document.body.classList.add('no-scroll');
}

// Pencere açılınca tarayıcı geçmişine bir adım ekle: telefonun geri tuşu pencereyi kapatır
let closingFromHistory = false, skipNextPop = false;
function openDialog(d) {
    if (d.open) return;
    d.showModal();
    history.pushState({ dlg: d.id }, '', location.href);
}

function clearCart() {
    if (!cart.length || !confirm('Sepeti tamamen temizlemek istiyor musunuz?')) return;
    const ids = [...new Set(cart.map(i => i.id))];
    cart = [];
    saveCart();
    updateCartUI();
    ids.forEach(refreshActions);
    renderCart();
}

function sendWhatsAppOrder() {
    const ids = [...new Set(cart.map(i => i.id))].filter(id => { const p = findProduct(id); return p && inStock(p); });
    if (!ids.length) return toast('Sepetiniz boş');

    const buyer = { name: $('buyerName').value.trim(), city: $('buyerCity').value.trim() };
    writeStore(BUYER_KEY, buyer);

    let message = `${CONFIG.welcomeMessage}\n\n`;
    if (buyer.name) message += `Firma / Ad: ${buyer.name}\n`;
    if (buyer.city) message += `Şehir: ${buyer.city}\n`;
    if (buyer.name || buyer.city) message += '\n';

    ids.forEach((id, n) => {
        const p = findProduct(id);
        const price = extractPrice(p.fiyat);
        const lines = cart.filter(i => i.id === id);
        const pieces = productPieces(id);
        const s = saleOf(p);
        message += `${n + 1}. [No ${p.id}] ${p.urun_adi} (${p.kategori})\n`;
        if (isSeri(p)) {
            message += `   ${lines[0].quantity} seri (${s.bedenler.join('-')}, seri başı ${s.seriAdet} adet)\n`;
        } else if (needsSize(p)) {
            message += `   Bedenler: ${lines.map(i => `${i.size} → ${i.quantity} adet`).join(', ')}\n`;
        }
        message += `   ${pieces} adet x ${formatPrice(price)} = ${formatPrice(price * pieces)}\n\n`;
    });

    const { items, total } = cartTotals();
    message += `─────────────────────\n`;
    message += `Toplam: ${items} adet\n`;
    const g = goalState(total);
    if (g.discount) {
        message += `Ara toplam: ${formatPrice(total)}\n`;
        message += `İndirim (%${g.won.indirim}): -${formatPrice(g.discount)}\n`;
    }
    message += `Toplam tutar: ${formatPrice(g.final)}`;
    if (g.freeShip) message += `\nKargo: Bedava`;

    // Bir dahaki ziyarette "Siparişi tekrarla" için sakla
    writeStore(LAST_ORDER_KEY, {
        date: new Date().toISOString(),
        items: cart.filter(i => ids.includes(i.id)).map(i => ({ id: i.id, size: i.size, quantity: i.quantity }))
    });

    window.open(whatsappUrl(message), '_blank');
    setTimeout(() => offerInstall(true), 2500);     // sipariş gönderildi: tam zamanı
}

// ---------- Telefona uygulama gibi ekle ----------
const INSTALL_KEY = 'sival_install_later';
let installPrompt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canInstall = () => !isStandalone() && (!!installPrompt || isIOS());

function updateInstallButton() {
    $('installBtn').hidden = !canInstall();
}

// Kendiliğinden sorma: reddettiyse 14 gün sorma
function offerInstall(auto) {
    if (!canInstall()) return;
    if (auto) {
        const later = readStore(INSTALL_KEY, 0);
        if (later && Date.now() - later < 14 * 86400000) return;
    }
    $('installAndroid').hidden = !installPrompt;
    $('installIos').hidden = !!installPrompt || !isIOS();
    openDialog($('installModal'));
    document.body.classList.add('no-scroll');
}

async function runInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    $('installModal').close();
    updateInstallButton();
    if (choice && choice.outcome === 'accepted') toast('Eklendi ✓ Ana ekranınızda SİVAL simgesi var');
}

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();               // kendi sade düğmemizle soralım
    installPrompt = e;
    updateInstallButton();
});
window.addEventListener('appinstalled', () => { installPrompt = null; updateInstallButton(); });

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ---------- Siparişi tekrarla ----------
function reorderableItems() {
    const last = readStore(LAST_ORDER_KEY, null);
    if (!last || !Array.isArray(last.items)) return { last: null, items: [] };
    const items = last.items.filter(i => {
        const p = findProduct(i.id);
        if (!p || !inStock(p) || !(i.quantity > 0)) return false;
        const size = String(i.size || '');
        // beden artık yoksa ya da satış şekli değiştiyse atla
        return needsSize(p) ? saleOf(p).bedenler.includes(size) : size === '';
    });
    return { last, items };
}

// ---------- Gelince haber ver ----------
const NOTIFY_KEY = 'sival_notify';
const notifyList = () => readStore(NOTIFY_KEY, []).filter(n => n && Number.isFinite(n.id));

function notifyButton(p, cls) {
    const asked = notifyList().some(n => n.id === p.id);
    return asked
        ? `<button class="${cls} notified" data-notify="${p.id}">✓ Haber verilecek</button>`
        : `<button class="${cls} notify" data-notify="${p.id}"><i class="ic duo ic-bell" aria-hidden="true"></i> Gelince haber ver</button>`;
}

// Müşteri: WhatsApp'tan "gelince haber verin" yazar; bu cihaz da hatırlar
function requestNotify(id) {
    const p = findProduct(id);
    if (!p) return;
    const buyer = readStore(BUYER_KEY, {});
    let msg = `Merhaba, No ${p.id} "${p.urun_adi}" şu an stokta yok. Stoğa girince bana haber verir misiniz?`;
    if (buyer.name) msg += `\nFirma / Ad: ${buyer.name}`;
    if (buyer.city) msg += `\nŞehir: ${buyer.city}`;
    window.open(whatsappUrl(msg), '_blank');
    const list = notifyList().filter(n => n.id !== id);
    list.push({ id, date: new Date().toISOString() });
    writeStore(NOTIFY_KEY, list);
    refreshActions(id);
    toast('Tamam, ürün gelince size haber vereceğiz.');
}

// Siteye dönen müşteriye: beklediği ürün stoğa girdiyse en üstte göster
function renderBackIn() {
    const back = notifyList().map(n => findProduct(n.id)).filter(p => p && inStock(p));
    $('backInBox').hidden = back.length === 0;
    if (!back.length) return;
    $('backInList').innerHTML = back.map(p => `
        <button class="back-in-item" data-similar="${p.id}">
            <img src="${imagePath(p)}" alt="">
            <span><b>${escapeHtml(titleCase(p.urun_adi))}</b><small>No ${p.id} · ${escapeHtml(displayPrice(p))}</small></span>
            <em>Göster →</em>
        </button>`).join('');
}

function clearBackIn() {
    // Stoğa girenleri listeden çıkar, beklemeye devam edenler kalsın
    writeStore(NOTIFY_KEY, notifyList().filter(n => { const p = findProduct(n.id); return p && !inStock(p); }));
    $('backInBox').hidden = true;
}

function renderReorder() {
    const { last, items } = reorderableItems();
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('sival_reorder_closed') === '1'; } catch (e) {}
    const show = !!last && items.length > 0 && !dismissed;
    $('reorderBox').hidden = !show;
    if (!show) return;

    const date = new Date(last.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    const products = new Set(items.map(i => i.id)).size;
    const pieces = items.reduce((s, i) => s + piecesOf(i), 0);
    const missing = new Set(last.items.map(i => i.id)).size - products;
    $('reorderInfo').textContent = `${date} tarihli siparişiniz: ${products} ürün, ${pieces} adet` +
        (missing > 0 ? ` (${missing} ürün şu an stokta yok)` : '');
}

function reorder() {
    const { items } = reorderableItems();
    items.forEach(i => {
        const size = String(i.size || '');
        const existing = cart.find(c => c.id === i.id && c.size === size);
        if (existing) existing.quantity = Math.max(existing.quantity, i.quantity);
        else cart.push({ id: i.id, size, quantity: i.quantity });
    });
    new Set(items.map(i => i.id)).forEach(refreshActions);
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
        if (chip.dataset.cat === 'beden') return openSizeFinder();
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
        const t = e.target.closest('[data-add],[data-inc],[data-dec],[data-open],[data-open-id],[data-similar],[data-share],[data-close],[data-goto],[data-fav],[data-go-cart],[data-notify]');
        if (!t) return;
        const d = t.dataset;
        if (d.notify) requestNotify(Number(d.notify));
        else if ('goCart' in d) { $('productModal').close(); setTimeout(openCart, 50); }
        else if (d.fav) toggleFav(Number(d.fav));
        else if (d.goto) selectCategory(d.goto);
        else if (d.add) addToCart(Number(d.add));
        else if (d.inc) changeQuantity(Number(d.inc), d.size || '', 1);
        else if (d.dec) changeQuantity(Number(d.dec), d.size || '', -1);
        else if (d.openId) { $('cartModal').close(); openModal(Number(d.openId)); }
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
        if (e.target.dataset && e.target.dataset.qty) setQuantity(Number(e.target.dataset.qty), e.target.dataset.size || '', e.target.value);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.dataset && e.target.dataset.qty) e.target.blur();
    });

    // Firma / şehir bir kez yazılsın, hatırlansın
    ['buyerName', 'buyerCity'].forEach(id => $(id).addEventListener('change', () =>
        writeStore(BUYER_KEY, { name: $('buyerName').value.trim(), city: $('buyerCity').value.trim() })));

    $('promoMain').addEventListener('click', () => { if (promo && promo.hedef) selectCategory(promo.hedef); });
    $('promoClose').addEventListener('click', () => {
        if (promo) writeStore(PROMO_CLOSED_KEY, promo.id);
        hidePromo();
    });

    $('mediaSwitch').addEventListener('click', e => {
        const b = e.target.closest('[data-media]');
        if (b) showMedia(b.dataset.media);
    });

    $('reorderBtn').addEventListener('click', reorder);
    $('sizeCta').addEventListener('click', openSizeFinder);
    $('sizeChange').addEventListener('click', openSizeFinder);
    $('sizeClear').addEventListener('click', () => { wantedSizes.clear(); selectCategory('all'); });
    $('sizeShow').addEventListener('click', showSizeResults);
    $('sizeGroups').addEventListener('click', e => {
        const b = e.target.closest('[data-want]');
        if (!b) return;
        const v = b.dataset.want;
        wantedSizes.has(v) ? wantedSizes.delete(v) : wantedSizes.add(v);
        renderSizeGroups();
    });
    $('installBtn').addEventListener('click', () => offerInstall(false));
    $('installGo').addEventListener('click', runInstall);
    $('installLater').addEventListener('click', () => { writeStore(INSTALL_KEY, Date.now()); $('installModal').close(); });
    updateInstallButton();
    $('backInClose').addEventListener('click', clearBackIn);
    $('reorderClose').addEventListener('click', () => {
        $('reorderBox').hidden = true;
        try { sessionStorage.setItem('sival_reorder_closed', '1'); } catch (e) {}
    });

    // Pencere dışına tıklayınca kapat; kapanınca kaydırmayı geri aç
    document.querySelectorAll('dialog').forEach(dialog => {
        dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(dialog); });
        dialog.addEventListener('close', () => {
            // ✕ veya Esc ile kapandıysa eklediğimiz geçmiş adımını geri al
            if (!closingFromHistory && history.state && history.state.dlg === dialog.id) {
                skipNextPop = true;
                history.back();
            }
            if (!document.querySelector('dialog[open]')) document.body.classList.remove('no-scroll');
            if (dialog.id === 'productModal') stopMedia();
            if (dialog.id === 'productModal' && location.hash.startsWith('#urun-')) {
                history.replaceState(null, '', location.pathname + location.search);
            }
        });
    });

    window.addEventListener('hashchange', openFromHash);
    window.addEventListener('popstate', () => {
        if (skipNextPop) { skipNextPop = false; return; }
        const open = document.querySelector('dialog[open]');
        if (open) {
            closingFromHistory = true;
            open.close();
            closingFromHistory = false;
        }
    });

    // Vitrin okları
    document.querySelectorAll('[data-rail]').forEach(btn => btn.addEventListener('click', () => {
        const rail = btn.closest('.rail-wrap').querySelector('.rail');
        rail.scrollBy({ left: Number(btn.dataset.rail) * rail.clientWidth * 0.8, behavior: 'smooth' });
    }));
    document.querySelectorAll('.rail').forEach(r => r.addEventListener('scroll', updateRailArrows, { passive: true }));
    window.addEventListener('resize', updateRailArrows);
}
