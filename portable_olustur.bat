@echo off
echo Portable klasor olusturuluyor...

set SOURCE=C:\Users\PC\Desktop\katalog
set TARGET=C:\Users\PC\Desktop\ENZIM_JEANS_KATALOG_PORTABLE

REM Ana dosyalar
copy "%SOURCE%\Excel2JSON.exe" "%TARGET%\" 2>nul
copy "%SOURCE%\urunler.xlsx" "%TARGET%\"
copy "%SOURCE%\guncelle.bat" "%TARGET%\"
copy "%SOURCE%\ilk_kurulum.bat" "%TARGET%\"
copy "%SOURCE%\config.js" "%TARGET%\"
copy "%SOURCE%\index.html" "%TARGET%\"
copy "%SOURCE%\style.css" "%TARGET%\"
copy "%SOURCE%\script.js" "%TARGET%\"
copy "%SOURCE%\logo.png" "%TARGET%\"
copy "%SOURCE%\excel_to_json.py" "%TARGET%\"
copy "%SOURCE%\urunler.json" "%TARGET%\"

REM Belgeler
copy "%SOURCE%\OKUBUCU.txt" "%TARGET%\"
copy "%SOURCE%\HIZLI_BASLANGIC.txt" "%TARGET%\"
copy "%SOURCE%\README.md" "%TARGET%\"

REM Gorseller klasoru
xcopy "%SOURCE%\gorseller" "%TARGET%\gorseller\" /E /I /Y

echo.
echo Tamamlandi!
echo Klasor: %TARGET%
pause
