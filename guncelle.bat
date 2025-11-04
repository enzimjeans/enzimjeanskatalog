@echo off
setlocal enabledelayedexpansion
cls
echo ================================
echo   KATALOG GUNCELLEME
echo ================================
echo.

REM ============================================
REM ADIM 0: Otomatik Kontroller ve Kurulum
REM ============================================

REM Git kontrol
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Git kurulu degil!
    echo Git indiriliyor...
    start https://git-scm.com/download/win
    echo.
    echo Git'i kurduktan sonra bu dosyayi tekrar calistirin.
    pause
    exit /b 1
)

REM Git repository kontrol
if not exist ".git" (
    echo [!] Ilk kurulum yapiliyor...
    git init
    git config user.name "enzimjeans"
    git config user.email "enzimjeans@users.noreply.github.com"

    REM SSH key var mi kontrol et
    if exist "%USERPROFILE%\.ssh\id_ed25519" (
        echo [OK] SSH key bulundu, SSH kullanilacak
        git remote add origin git@github.com:enzimjeans/enzimjeanskatalog.git
    ) else if exist "%USERPROFILE%\.ssh\id_rsa" (
        echo [OK] SSH key bulundu, SSH kullanilacak
        git remote add origin git@github.com:enzimjeans/enzimjeanskatalog.git
    ) else (
        echo [!] SSH key yok, HTTPS kullanilacak
        git remote add origin https://github.com/enzimjeans/enzimjeanskatalog.git
        echo.
        echo ONEMLI: Ilk push'ta GitHub kullanici adi ve token sorulacak.
        echo Token: https://github.com/settings/tokens/new
        echo Ayarlar: repo yetkisi, 90 gun sure
        echo.
    )
    echo [OK] Git repository hazir
    echo.
)

REM Remote URL kontrol - SSH varsa HTTPS'den SSH'ye cevir
if exist "%USERPROFILE%\.ssh\id_ed25519" (
    git remote get-url origin 2>nul | findstr "https://" >nul
    if !errorlevel! equ 0 (
        echo [!] SSH key bulundu, HTTPS'den SSH'ye cevriliyor...
        git remote set-url origin git@github.com:enzimjeans/enzimjeanskatalog.git
        echo [OK] SSH kullanilacak
        echo.
    )
) else if exist "%USERPROFILE%\.ssh\id_rsa" (
    git remote get-url origin 2>nul | findstr "https://" >nul
    if !errorlevel! equ 0 (
        echo [!] SSH key bulundu, HTTPS'den SSH'ye cevriliyor...
        git remote set-url origin git@github.com:enzimjeans/enzimjeanskatalog.git
        echo [OK] SSH kullanilacak
        echo.
    )
)

REM ============================================
REM ADIM 1: Excel -> JSON
REM ============================================
echo [1/3] Excel -^> JSON cevriliyor...
echo.

if exist "Excel2JSON.exe" (
    Excel2JSON.exe
    set EXITCODE=!errorlevel!
) else if exist "excel_to_json.py" (
    python excel_to_json.py
    set EXITCODE=!errorlevel!
) else (
    echo [X] Excel2JSON.exe veya excel_to_json.py bulunamadi!
    pause
    exit /b 1
)

if !EXITCODE! neq 0 (
    echo.
    echo [X] HATA: Excel JSON'a cevrilemedi!
    echo.
    echo Sebepler:
    echo 1. Excel acik - KAPATIN!
    echo 2. urunler.xlsx bulunamadi
    echo.
    pause
    exit /b 1
)

echo [OK] JSON olusturuldu
echo.

REM ============================================
REM ADIM 2: Git Add & Commit
REM ============================================
echo [2/3] Degisiklikler kaydediliyor...
git add .

REM Degisiklik var mi kontrol et
git diff --staged --quiet
if %errorlevel% equ 0 (
    echo.
    echo [!] Degisiklik yok, guncelleme gerekmiyor.
    echo.
    pause
    exit /b 0
)

git commit -m "Katalog guncellendi - %date% %time%"
echo [OK] Commit yapildi
echo.

REM ============================================
REM ADIM 3: Push
REM ============================================
echo [3/3] GitHub'a yukleniyor...

REM Mevcut branch'i bul
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set CURRENT_BRANCH=%%i
if "!CURRENT_BRANCH!"=="" set CURRENT_BRANCH=main

REM master ise main'e cevir
if "!CURRENT_BRANCH!"=="master" (
    echo [!] Branch 'main'e cevriliyor...
    git branch -M main
    set CURRENT_BRANCH=main
)

REM Push yap
git push -u origin !CURRENT_BRANCH!

if %errorlevel% neq 0 (
    echo.
    echo [!] Push basarisiz, otomatik force push deneniyor...
    echo.

    git push -u origin !CURRENT_BRANCH! --force

    if !errorlevel! equ 0 (
        echo.
        echo [OK] Force push basarili!
        goto :success
    )

    REM Hala basarisiz, SSH/HTTPS kontrol et
    echo.
    echo ========================================
    echo   PUSH BASARISIZ!
    echo ========================================
    echo.

    REM SSH hatasi mi?
    git remote get-url origin 2>nul | findstr "git@github.com" >nul
    if !errorlevel! equ 0 (
        echo SSH baglanti hatasi.
        echo.
        echo COZUM 1: SSH Key Olustur
        echo -------------------------
        echo 1. Komutu calistir:
        echo    ssh-keygen -t ed25519 -C "sival-katalog"
        echo    (Her soru icin ENTER basin)
        echo.
        echo 2. Public key'i kopyala:
        echo    type %USERPROFILE%\.ssh\id_ed25519.pub
        echo.
        echo 3. GitHub'a ekle:
        echo    https://github.com/settings/ssh/new
        echo.
        echo 4. Bu dosyayi tekrar calistir
        echo.
        echo ========================================
        echo.
        echo COZUM 2: HTTPS Kullan (Daha Kolay)
        echo -------------------------
        echo Remote URL'i HTTPS'ye cevir:
        git remote set-url origin https://github.com/enzimjeans/enzimjeanskatalog.git
        echo [OK] HTTPS'ye cevrildi
        echo.
        echo Simdi tekrar push yapiliyor...
        echo Token sorulacak: https://github.com/settings/tokens/new
        echo.
        git push -u origin !CURRENT_BRANCH!

        if !errorlevel! equ 0 (
            echo.
            echo [OK] HTTPS ile basarili!
            goto :success
        ) else (
            echo.
            echo [X] HTTPS ile de basarisiz oldu.
            echo Internet baglantisinizi kontrol edin.
        )
    ) else (
        echo HTTPS kullaniliyor.
        echo.
        echo GitHub kullanici adi: enzimjeans
        echo Sifre: TOKEN girin (https://github.com/settings/tokens/new)
        echo.
        echo Token ayarlari:
        echo - Note: SIVAL Katalog
        echo - Expiration: 90 days
        echo - Scopes: [X] repo
    )

    echo.
    pause
    exit /b 1
)

:success
echo.
echo ================================
echo   BASARILI!
echo ================================
echo.
echo [OK] Excel -^> JSON
echo [OK] Commit yapildi
echo [OK] GitHub'a yuklendi
echo.
echo Site 2-3 dakika sonra guncellenecek:
echo https://enzimjeans.github.io/enzimjeanskatalog
echo.
echo Tarayicida Ctrl+F5 yapin (on bellek temizleme)
echo.
pause
