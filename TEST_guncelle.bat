@echo off
echo Guncelle.bat test ediliyor...
echo.
cd /d "%~dp0"
echo Konum: %CD%
echo.
pause
echo.
echo Simdi gercek guncelle.bat calistiriliyor...
echo.
call guncelle.bat
echo.
echo ========================================
echo   HATA KODU: %errorlevel%
echo ========================================
echo.
pause
