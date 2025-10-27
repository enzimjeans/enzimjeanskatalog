# -*- coding: utf-8 -*-
"""
Excel'e ürün ekleyen script
"""
import pandas as pd
import os

# Ürün bilgileri
# NOT: gorsel kolonuna sadece dosya adı yazın (elma.jpg)
# "gorseller/" otomatik eklenir, tekrar yazmanıza gerek yok!
urunler = [
    {"urun_adi": "Elma", "fiyat": "110₺", "kategori": "Takı", "gorsel": "elma.jpg", "aciklama": ""},
    {"urun_adi": "Armut", "fiyat": "120₺", "kategori": "Kozmetik", "gorsel": "armut.jpg", "aciklama": ""},
    {"urun_adi": "Muz", "fiyat": "100₺", "kategori": "Bijuteri", "gorsel": "muz.jpg", "aciklama": ""},
    {"urun_adi": "İncir", "fiyat": "200₺", "kategori": "Takı", "gorsel": "incir.jpg", "aciklama": ""},
    {"urun_adi": "Kivi", "fiyat": "250₺", "kategori": "Kozmetik", "gorsel": "kivi.jpg", "aciklama": ""},
]

# DataFrame oluştur
df = pd.DataFrame(urunler)

# Excel'e yaz
df.to_excel('urunler.xlsx', index=False)

print("✓ 5 ürün başarıyla eklendi!")
print("\nEklenen ürünler:")
for i, urun in enumerate(urunler, 1):
    print(f"{i}. {urun['urun_adi']} - {urun['kategori']} - {urun['fiyat']}")
