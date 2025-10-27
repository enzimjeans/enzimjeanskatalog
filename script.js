// Ürün verileri
let allProducts = [];
let filteredProducts = [];

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupEventListeners();
});

// Ürünleri yükle
async function loadProducts() {
    try {
        const response = await fetch('urunler.json');

        if (!response.ok) {
            throw new Error('Ürünler yüklenemedi');
        }

        allProducts = await response.json();
        filteredProducts = [...allProducts];

        populateCategories();
        displayProducts(filteredProducts);
        hideLoading();
    } catch (error) {
        console.error('Hata:', error);
        showError('Ürünler yüklenirken bir hata oluştu.');
        hideLoading();
    }
}

// Kategorileri doldur
function populateCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    const categories = [...new Set(allProducts.map(p => p.kategori))];

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Ürünleri göster
function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    const noProducts = document.getElementById('noProducts');
    const productCount = document.getElementById('productCount');

    grid.innerHTML = '';

    if (products.length === 0) {
        noProducts.style.display = 'block';
        productCount.textContent = '0 ürün';
        return;
    }

    noProducts.style.display = 'none';

    // Stok sayısını hesapla
    const stokVar = products.filter(p => p.stok === 'Var').length;
    const stokYok = products.filter(p => p.stok === 'Yok').length;
    productCount.textContent = `${products.length} ürün (${stokVar} stokta, ${stokYok} stok dışı)`;

    // Stoka göre sırala: Stokta olanlar üstte, olmayanlar altta
    const sortedProducts = [...products].sort((a, b) => {
        if (a.stok === 'Var' && b.stok === 'Yok') return -1;
        if (a.stok === 'Yok' && b.stok === 'Var') return 1;
        return 0;
    });

    sortedProducts.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

// Ürün kartı oluştur
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Stokta yoksa özel class ekle
    if (product.stok === 'Yok') {
        card.classList.add('out-of-stock');
    }

    const imagePath = product.gorsel.startsWith('http')
        ? product.gorsel
        : `gorseller/${product.gorsel}`;

    // Stok göstergesi
    const stokBadge = product.stok === 'Yok'
        ? '<span class="stock-badge out-of-stock-badge">Stokta Yok</span>'
        : '<span class="stock-badge in-stock-badge">Stokta</span>';

    card.innerHTML = `
        <div class="product-image-container" onclick="openModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
            <img src="${imagePath}" alt="${product.urun_adi}" class="product-image"
                 onerror="this.src='https://via.placeholder.com/280x250?text=Görsel+Yok'">
        </div>
        <div class="product-info">
            <div class="product-header">
                <span class="product-category">${product.kategori}</span>
                ${stokBadge}
            </div>
            <h3 class="product-name">${product.urun_adi}</h3>
            ${product.aciklama ? `<p class="product-description">${product.aciklama}</p>` : ''}
            <div class="product-footer">
                <p class="product-price">${product.fiyat}</p>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id}); event.stopPropagation();">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    Sepete Ekle
                </button>
            </div>
        </div>
    `;

    return card;
}

// Modal aç
function openModal(product) {
    const modal = document.getElementById('productModal');
    const imagePath = product.gorsel.startsWith('http')
        ? product.gorsel
        : `gorseller/${product.gorsel}`;

    document.getElementById('modalImage').src = imagePath;
    document.getElementById('modalTitle').textContent = product.urun_adi;
    document.getElementById('modalCategory').textContent = product.kategori;
    document.getElementById('modalPrice').textContent = product.fiyat;
    document.getElementById('modalDescription').textContent = product.aciklama || 'Açıklama yok';

    // Stok durumunu göster
    const modalStock = document.getElementById('modalStock');
    if (product.stok === 'Yok') {
        modalStock.textContent = 'Stokta Yok';
        modalStock.className = 'modal-stock out-of-stock';
    } else {
        modalStock.textContent = 'Stokta';
        modalStock.className = 'modal-stock in-stock';
    }

    modal.style.display = 'block';
}

// Modal kapat
function closeModal() {
    document.getElementById('productModal').style.display = 'none';
}

// Event listener'ları ayarla
function setupEventListeners() {
    // Arama
    document.getElementById('searchInput').addEventListener('input', filterProducts);

    // Kategori filtresi
    document.getElementById('categoryFilter').addEventListener('change', filterProducts);

    // Sıralama
    document.getElementById('sortSelect').addEventListener('change', sortProducts);

    // Modal kapatma
    document.querySelector('.close').addEventListener('click', closeModal);

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('productModal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Ürünleri filtrele
function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;

    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.urun_adi.toLowerCase().includes(searchTerm) ||
                            (product.aciklama && product.aciklama.toLowerCase().includes(searchTerm));

        const matchesCategory = selectedCategory === 'all' || product.kategori === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    sortProducts();
}

// Ürünleri sırala
function sortProducts() {
    const sortValue = document.getElementById('sortSelect').value;

    switch(sortValue) {
        case 'name-asc':
            filteredProducts.sort((a, b) => a.urun_adi.localeCompare(b.urun_adi, 'tr'));
            break;
        case 'name-desc':
            filteredProducts.sort((a, b) => b.urun_adi.localeCompare(a.urun_adi, 'tr'));
            break;
        case 'price-asc':
            filteredProducts.sort((a, b) => extractPrice(a.fiyat) - extractPrice(b.fiyat));
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => extractPrice(b.fiyat) - extractPrice(a.fiyat));
            break;
        default:
            // Varsayılan sıralama (ID)
            filteredProducts.sort((a, b) => a.id - b.id);
    }

    displayProducts(filteredProducts);
}

// Fiyatı çıkar (sayısal)
function extractPrice(priceString) {
    const match = priceString.match(/[\d,.]+/);
    if (match) {
        return parseFloat(match[0].replace(',', '.'));
    }
    return 0;
}

// Yüklemeyi gizle
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Hata göster
function showError(message) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = `<div class="no-products"><p>${message}</p></div>`;
}

// ============================================
// SEPET SİSTEMİ
// ============================================

let cart = [];

// Sayfa yüklendiğinde sepeti yükle
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
});

// LocalStorage'dan sepeti yükle
function loadCart() {
    const savedCart = localStorage.getItem(CONFIG.cart.storageKey);
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

// LocalStorage'a sepeti kaydet
function saveCart() {
    localStorage.setItem(CONFIG.cart.storageKey, JSON.stringify(cart));
}

// Sepete ürün ekle
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);

    if (!product) {
        alert('Ürün bulunamadı!');
        return;
    }

    // Stokta yoksa ekleme
    if (product.stok === 'Yok') {
        alert('Bu ürün stokta yok!');
        return;
    }

    // Zaten sepette mi?
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            urun_adi: product.urun_adi,
            fiyat: product.fiyat,
            kategori: product.kategori,
            gorsel: product.gorsel,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();

    // Başarı bildirimi
    showCartNotification(`${product.urun_adi} sepete eklendi!`);
}

// Sepetten ürün çıkar
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    renderCartItems();
    updateCartSummary(); // Toplam tutarı güncelle
}

// Sepeti temizle
function clearCart() {
    if (cart.length === 0) return;

    if (confirm('Sepeti tamamen temizlemek istediğinizden emin misiniz?')) {
        cart = [];
        saveCart();
        updateCartUI();
        renderCartItems();
        updateCartSummary(); // Toplam tutarı sıfırla
    }
}

// Sepet UI'ını güncelle
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Sepet butonuna animasyon
    if (totalItems > 0) {
        cartCount.style.display = 'flex';
    } else {
        cartCount.style.display = 'none';
    }

    // Sepet modalı açıksa içeriği güncelle
    const cartModal = document.getElementById('cartModal');
    if (cartModal && cartModal.style.display === 'block') {
        updateCartSummary();
    }
}

// Sepet özetini güncelle (toplam ürün ve tutar)
function updateCartSummary() {
    const cartTotalItems = document.getElementById('cartTotalItems');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    const cartFooter = document.getElementById('cartFooter');

    if (!cartTotalItems || !cartTotalPrice) return;

    if (cart.length === 0) {
        if (cartFooter) cartFooter.style.display = 'none';
        return;
    }

    if (cartFooter) cartFooter.style.display = 'block';

    // Toplam ürün sayısı
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartTotalItems.textContent = totalItems;

    // Toplam tutar
    const totalPrice = cart.reduce((sum, item) => {
        const price = extractPrice(item.fiyat);
        return sum + (price * item.quantity);
    }, 0);
    cartTotalPrice.textContent = totalPrice.toFixed(2) + ' TL';
}

// Sepeti aç
function openCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'block';
    renderCartItems();
    updateCartSummary(); // Kesinlikle güncelle
}

// Sepeti kapat
function closeCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'none';
}

// Sepet öğelerini render et
function renderCartItems() {
    const cartBody = document.getElementById('cartBody');

    if (cart.length === 0) {
        cartBody.innerHTML = '<p class="empty-cart">Sepetiniz boş</p>';
        updateCartSummary();
        return;
    }

    // Sepet özetini güncelle
    updateCartSummary();

    // Sepet öğelerini render et
    cartBody.innerHTML = cart.map(item => {
        const imagePath = item.gorsel.startsWith('http')
            ? item.gorsel
            : `gorseller/${item.gorsel}`;

        return `
            <div class="cart-item">
                <img src="${imagePath}" alt="${item.urun_adi}" class="cart-item-image">
                <div class="cart-item-info">
                    <h4>${item.urun_adi}</h4>
                    <p class="cart-item-category">${item.kategori}</p>
                    <p class="cart-item-price">${item.fiyat}</p>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <button class="remove-item-btn" onclick="removeFromCart(${item.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Miktar güncelle
function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        updateCartUI();
        renderCartItems();
        updateCartSummary(); // Toplam tutarı güncelle
    }
}

// WhatsApp siparişi gönder
function sendWhatsAppOrder() {
    if (cart.length === 0) {
        alert('Sepetiniz boş!');
        return;
    }

    // Mesaj formatı
    let message = `${CONFIG.welcomeMessage}\n\n`;

    let subtotal = 0;
    cart.forEach((item, index) => {
        const itemPrice = extractPrice(item.fiyat);
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;

        message += `${index + 1}. ${item.urun_adi}\n`;
        message += `   ${item.kategori} - ${item.fiyat}\n`;
        message += `   Adet: ${item.quantity} x ${itemPrice.toFixed(2)} TL = ${itemTotal.toFixed(2)} TL\n\n`;
    });

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    message += `─────────────────────\n`;
    message += `Toplam: ${totalItems} ürün\n`;
    message += `Toplam Tutar: ${subtotal.toFixed(2)} TL`;

    // WhatsApp URL
    const whatsappURL = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;

    // Yeni sekmede aç
    window.open(whatsappURL, '_blank');
}

// Sepet bildirimi göster
function showCartNotification(message) {
    // Basit bir bildirim (isterseniz daha fancy yapabiliriz)
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// Modal dışına tıklanınca kapat
window.addEventListener('click', function(event) {
    const cartModal = document.getElementById('cartModal');
    if (event.target === cartModal) {
        closeCart();
    }
});
