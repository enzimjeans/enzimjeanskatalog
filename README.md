# Ürün Kataloğu

Giyim ve tekstil ürünleri için modern, web tabanlı katalog sistemi.

## Özellikler

- 🎨 Modern ve mobil uyumlu tasarım
- 🔍 Ürün arama ve filtreleme
- 📂 Kategori bazlı gruplandırma
- 💰 Fiyat sıralaması
- 🖼️ Detaylı ürün görüntüleme
- 📊 Excel ile kolay güncelleme
- 📦 Stok takibi (Var/Yok)
- 🛒 Sepet sistemi
- 💬 WhatsApp ile sipariş verme

## Nasıl Kullanılır?

### 1. İlk Kurulum

#### GitHub'a Yükleme
```bash
git init
git remote add origin https://github.com/enzimjeans/enzimjeanskatalog.git
git add .
git commit -m "İlk yükleme"
git branch -M main
git push -u origin main
```

#### GitHub Pages Aktifleştirme
1. GitHub reposuna gidin
2. Settings → Pages
3. Source: "main" branch seçin
4. Save'e tıklayın
5. Site hazır: `https://enzimjeans.github.io/enzimjeanskatalog`

### 2. Ürün Ekleme/Güncelleme

#### Adım 1: Excel'i Düzenleyin
`urunler.xlsx` dosyasını açın ve ürünleri düzenleyin:

| Kolon | Açıklama | Örnek |
|-------|----------|-------|
| urun_adi | Ürün ismi | Altın Kolye |
| fiyat | Fiyat | 450 TL |
| kategori | Kategori | Takı |
| gorsel | Resim dosya adı (jpg, png, webp, gif desteklenir) | kolye1.webp |
| aciklama | Açıklama (opsiyonel) | 14 ayar altın |
| stok | Stok durumu: Var veya Yok | Var |

**ÖNEMLİ:**
- `gorsel` kolonuna sadece dosya adı yazın (örn: `kolye1.jpg`). `gorseller/` yazmayın, otomatik eklenir!
- `stok` kolonuna sadece **Var** veya **Yok** yazın. Stokta olmayanlar sitede en altta soluk görünür.

#### Adım 2: Görselleri Ekleyin
- Ürün resimlerini `gorseller/` klasörüne kopyalayın
- Dosya adları Excel'deki "gorsel" kolonuyla eşleşmeli

#### Adım 3: Yayınlayın
`guncelle.bat` dosyasına çift tıklayın. Program:
1. Excel'i JSON'a çevirir
2. Değişiklikleri GitHub'a yükler
3. Site otomatik güncellenir (2-3 dakika)

### 3. WhatsApp Numarası Ayarla

**ÖNEMLİ:** Müşterilerin sipariş gönderebilmesi için WhatsApp numaranızı ayarlayın:

1. `config.js` dosyasını açın
2. `whatsappNumber` satırına kendi numaranızı yazın
3. Format: `+90XXXXXXXXXX` (ülke kodu + numara, boşluksuz)

Örnek:
```javascript
whatsappNumber: '+905551234567',
```

### 4. Yerel Test

Yayınlamadan önce test etmek için:
```bash
python excel_to_json.py
```
Sonra `index.html` dosyasını tarayıcıda açın.

## Dosya Yapısı

```
katalog/
├── urunler.xlsx          # Ürün veritabanı (burası düzenlenir)
├── gorseller/            # Ürün görselleri (resimler buraya)
│   ├── kolye1.jpg
│   ├── kupe1.jpg
│   └── ...
├── index.html            # Ana sayfa
├── style.css             # Tasarım
├── script.js             # Fonksiyonlar
├── config.js             # Ayarlar (WhatsApp numarası)
├── urunler.json          # Otomatik oluşturulur
├── guncelle.bat          # Tek tık güncelleme
└── excel_to_json.py      # Dönüştürme scripti
```

## Sık Sorulan Sorular

### Ürün eklerken görseller gözükmüyor?
- Görsellerin `gorseller/` klasöründe olduğundan emin olun
- Dosya adlarının Excel'deki isimlerle birebir eşleştiğini kontrol edin
- Büyük/küçük harf önemlidir: `Kolye.jpg` ≠ `kolye.jpg`

### Güncelleme sonrası site değişmedi?
- GitHub Pages 2-3 dakika bekleyin
- Tarayıcı önbelleğini temizleyin (Ctrl+F5)
- Commit'in GitHub'a gittiğini kontrol edin

### Excel dosyası açık hatası?
- Excel'i kapatın
- Tekrar `guncelle.bat`'ı çalıştırın

### Kategoriler otomatik mı?
- Evet! Excel'deki kategoriler otomatik filtrelemelere eklenir
- Yeni kategori eklemek için sadece Excel'de yazmanız yeterli

### Sepet nasıl çalışıyor?
- Müşteriler "Sepete Ekle" butonuyla ürün seçer
- Sepet tarayıcıda kaydedilir (sayfa yenilenince kaybolmaz)
- Sağ üstteki sepet ikonundan sepete gidilir
- "WhatsApp'tan Sipariş Ver" ile tüm ürünler sana iletilir

### WhatsApp siparişi nasıl geliyor?
- Müşteri sepeti doldurup WhatsApp butonuna basınca
- Otomatik hazırlanmış mesajla senin numarana yönlendirilir
- Mesajda: ürün adı, kategori, fiyat, adet bilgileri var
- Müşteri "Gönder" yapınca sen siparişi görürsün

## Gereksinimler

- Python 3.x
- pandas kütüphanesi: `pip install pandas openpyxl`
- Git
- GitHub hesabı

## Destek

Sorun yaşarsanız:
1. README'yi tekrar okuyun
2. Dosya yapısını kontrol edin
3. Hata mesajlarını okuyun
4. GitHub Issues'da sorun açın
