@echo off
chcp 65001 >nul
echo ================================
echo   ILK KURULUM
echo ================================
echo.

echo Python kutuphaneleri yukleniyor...
pip install pandas openpyxl

echo.
echo Git repository olusturuluyor...
git init
git remote add origin https://github.com/enzimjeans/enzimjeanskatalog.git

echo.
echo Ilk commit hazirlaniyor...
git add .
git commit -m "Ilk yukleme"
git branch -M main

echo.
echo GitHub'a yukleniyor...
git push -u origin main

echo.
echo ================================
echo   KURULUM TAMAMLANDI!
echo ================================
echo.
echo Simdi GitHub'da yapmaniz gerekenler:
echo 1. https://github.com/enzimjeans/enzimjeanskatalog adresine gidin
echo 2. Settings tiklayin
echo 3. Sol menuden Pages'i secin
echo 4. Source: main branch secin
echo 5. Save'e tiklayin
echo.
echo Siteniz hazir olacak:
echo https://enzimjeans.github.io/enzimjeanskatalog
echo.
pause
