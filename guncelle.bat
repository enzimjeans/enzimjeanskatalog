@echo off
cls
echo ================================
echo   KATALOG GUNCELLEME
echo ================================
echo.

echo [1/3] Excel -^> JSON cevriliyor...
echo.
echo ONEMLI: Excel dosyasini kapatin!
echo.

REM Excel2JSON.exe varsa onu kullan, yoksa Python'u kullan
if exist "Excel2JSON.exe" (
    echo Excel2JSON.exe kullaniliyor...
    Excel2JSON.exe
    set EXITCODE=%errorlevel%
) else (
    echo Python kullaniliyor...
    python excel_to_json.py
    set EXITCODE=%errorlevel%
)

if %EXITCODE% neq 0 (
    echo.
    echo ================================
    echo   HATA!
    echo ================================
    echo Excel JSON'a cevrilemedi!
    echo.
    echo Sebepler:
    echo 1. Excel acik - KAPATIN!
    echo 2. Excel2JSON.exe veya Python yok
    echo 3. urunler.xlsx bulunamadi
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Git'e ekleniyor...
git add .
git status

echo.
echo [3/3] GitHub'a yukleniyor...
set /p commit_msg="Commit mesaji (bos birakirsaniz otomatik): "

if "%commit_msg%"=="" (
    set commit_msg=Katalog guncellendi
)

git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo.
    echo Degisiklik yok veya zaten commit edilmis.
)

git push origin main

if %errorlevel% neq 0 (
    echo.
    echo HATA: GitHub'a yukleme basarisiz!
    echo - Internet kontrol edin
    echo - GitHub giris yaptiginizdan emin olun
    pause
    exit /b 1
)

echo.
echo ================================
echo   BASARILI!
echo ================================
echo.
echo Excel -^> JSON: OK
echo GitHub: OK
echo.
echo NOT:
echo - Site 2-3 dakika sonra guncellenecek
echo - Tarayici: Ctrl+F5 basin
echo - Site: https://mayakozmetikbijuteri-prog.github.io
echo.
pause
