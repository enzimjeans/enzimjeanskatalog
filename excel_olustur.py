# -*- coding: utf-8 -*-
"""
Örnek Ürün Excel Dosyası Oluşturucu
İlk kullanım için örnek verilerle Excel şablonu oluşturur
"""

import pandas as pd

# Örnek ürün verileri
ornek_urunler = [
    {
        'urun_adi': 'Altın Kolye',
        'fiyat': '450 TL',
        'kategori': 'Takı',
        'gorsel': 'kolye1.jpg',
        'aciklama': '14 ayar altın kolye',
        'stok': 'Var'
    },
    {
        'urun_adi': 'Gümüş Küpe',
        'fiyat': '180 TL',
        'kategori': 'Takı',
        'gorsel': 'kupe1.jpg',
        'aciklama': '925 ayar gümüş küpe',
        'stok': 'Var'
    },
    {
        'urun_adi': 'Ruj Seti',
        'fiyat': '120 TL',
        'kategori': 'Kozmetik',
        'gorsel': 'ruj1.jpg',
        'aciklama': '5\'li mat ruj seti',
        'stok': 'Yok'
    },
    {
        'urun_adi': 'Parfüm',
        'fiyat': '280 TL',
        'kategori': 'Kozmetik',
        'gorsel': 'parfum1.jpg',
        'aciklama': '50ml kadın parfümü',
        'stok': 'Var'
    },
    {
        'urun_adi': 'Bilezik',
        'fiyat': '320 TL',
        'kategori': 'Takı',
        'gorsel': 'bilezik1.jpg',
        'aciklama': 'Zarif zincir bilezik',
        'stok': 'Yok'
    }
]

# DataFrame oluştur
df = pd.DataFrame(ornek_urunler)

# Excel'e kaydet
df.to_excel('urunler.xlsx', index=False, engine='openpyxl')

print("✓ Örnek urunler.xlsx dosyası oluşturuldu!")
print("\nKolonlar:")
print("- urun_adi: Ürün ismi")
print("- fiyat: Fiyat bilgisi")
print("- kategori: Ürün kategorisi")
print("- gorsel: Görsel dosya adı (gorseller/ klasöründe olmalı)")
print("- aciklama: Ürün açıklaması (opsiyonel)")
print("- stok: Stok durumu (Var/Yok) - 'Yok' seçenler en altta gösterilir")
