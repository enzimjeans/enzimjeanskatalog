# -*- coding: utf-8 -*-
"""
Excel'den Katalog JSON Oluşturucu
Ürün bilgilerini Excel'den okuyup JSON formatına çevirir
"""

import pandas as pd
import json
import os

def excel_to_json():
    """Excel dosyasını okuyup JSON'a çevirir"""

    excel_file = 'urunler.xlsx'
    json_file = 'urunler.json'

    # Excel dosyası var mı kontrol et
    if not os.path.exists(excel_file):
        print(f"HATA: {excel_file} bulunamadı!")
        print("Lütfen önce urunler.xlsx dosyasını oluşturun.")
        return False

    try:
        # Excel'i oku
        df = pd.read_excel(excel_file)

        # Boş satırları temizle
        df = df.dropna(how='all')

        # Gerekli kolonlar var mı kontrol et
        required_columns = ['urun_adi', 'fiyat', 'kategori', 'gorsel']
        for col in required_columns:
            if col not in df.columns:
                print(f"HATA: '{col}' kolonu bulunamadı!")
                print(f"Excel'de şu kolonlar olmalı: {', '.join(required_columns)}")
                return False

        # NaN değerleri temizle
        df = df.fillna('')

        # JSON formatına çevir
        urunler = []
        for _, row in df.iterrows():
            # Stok durumu - default 'Var'
            stok = str(row.get('stok', 'Var')).strip()
            if stok not in ['Var', 'Yok']:
                stok = 'Var'

            urun = {
                'id': len(urunler) + 1,
                'urun_adi': str(row['urun_adi']),
                'fiyat': str(row['fiyat']),
                'kategori': str(row['kategori']),
                'gorsel': str(row['gorsel']),
                'aciklama': str(row.get('aciklama', '')),
                'stok': stok
            }
            urunler.append(urun)

        # JSON dosyasına yaz
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(urunler, f, ensure_ascii=False, indent=2)

        print(f"✓ Başarılı! {len(urunler)} ürün {json_file} dosyasına aktarıldı.")
        return True

    except Exception as e:
        print(f"HATA: {str(e)}")
        return False

if __name__ == '__main__':
    excel_to_json()
