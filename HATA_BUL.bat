@echo off
cls
echo ================================================
echo   HATA TESPITI
echo ================================================
echo.
echo guncelle.bat calistiriliyor...
echo Hata olursa buraya yazilacak.
echo.
pause
echo.

call guncelle.bat

echo.
echo ================================================
echo   TAMAMLANDI - HATA KODU: %errorlevel%
echo ================================================
echo.
echo Eger hata olduysa yukarida gorunuyor.
echo.
pause
