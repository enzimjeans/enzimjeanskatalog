@echo off
setlocal enabledelayedexpansion
cls
echo ========================================
echo   MAYA KATALOG - ILK KURULUM
echo ========================================
echo.
echo Bu klasoru baska bilgisayara kopyaladiysaniz
echo bu dosyayi bir kez calistirin.
echo.
echo Kontrol edilecekler:
echo - Git kurulu mu?
echo - Python kurulu mu?
echo - Gerekli kutuphaneler var mi?
echo.
pause
cls

echo.
echo [Kontrol 1/3] Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Git kurulu degil
    echo.
    echo Git'i indirin: https://git-scm.com/download/win
    echo Kurduktan sonra bu dosyayi tekrar calistirin.
    echo.
    start https://git-scm.com/download/win
    pause
    exit /b 1
)
echo [OK] Git hazir

echo.
echo [Kontrol 2/3] Excel2JSON.exe...
if exist "Excel2JSON.exe" (
    echo [OK] Excel2JSON.exe hazir - Python gerektirmez!
    set PYTHON_NEEDED=0
) else (
    echo [!] Excel2JSON.exe bulunamadi
    echo Python kontrol ediliyor...
    python --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [X] Python kurulu degil
        echo.
        echo Python'u indirin: https://www.python.org/downloads/
        echo ONEMLI: "Add Python to PATH" isaretleyin!
        echo Kurduktan sonra bu dosyayi tekrar calistirin.
        echo.
        start https://www.python.org/downloads/
        pause
        exit /b 1
    )
    for /f "tokens=*" %%i in ('python --version') do echo [OK] %%i hazir
    set PYTHON_NEEDED=1
)

if %PYTHON_NEEDED%==1 (
    echo.
    echo [Kontrol 3/3] Python kutuphaneleri...
    python -c "import pandas, openpyxl" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [!] Kutuphaneler eksik, kuruluyor...
        echo.
        python -m pip install --upgrade pip
        python -m pip install pandas openpyxl
        if %errorlevel% neq 0 (
            echo [X] Kurulum basarisiz!
            pause
            exit /b 1
        )
        echo [OK] Kutuphaneler kuruldu
    ) else (
        echo [OK] Kutuphaneler hazir
    )
) else (
    echo.
    echo [Kontrol 3/3] Python gerekmez - EXE kullaniliyor
)

echo.
echo ========================================
echo   GitHub Ayarlari
echo ========================================
echo.
echo GitHub'a yukleme yapabilmek icin
echo kullanici bilgilerinizi girin:
echo.
set /p GIT_USERNAME="GitHub kullanici adi: "
set /p GIT_EMAIL="GitHub e-mail: "

git config user.name "%GIT_USERNAME%"
git config user.email "%GIT_EMAIL%"

echo.
echo [OK] Kullanici bilgileri kaydedildi
echo.

echo ========================================
echo   GitHub Repository Baglantisi
echo ========================================
echo.

REM Git klasoru kontrol et
if not exist ".git" (
    echo [!] Git repository yok, olusturuluyor...
    git init
    echo [OK] Git repository olusturuldu
)

REM Remote kontrol et
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] GitHub remote baglantisi yok
    echo.
    echo GitHub repository URL'nizi girin:
    echo Ornek: https://github.com/kullaniciadi/repo-adi.git
    echo.
    set /p REPO_URL="Repository URL: "

    git remote add origin !REPO_URL!
    echo [OK] Remote baglanti eklendi
) else (
    for /f "tokens=*" %%i in ('git remote get-url origin') do echo [OK] Remote: %%i
)

echo.

echo ========================================
echo   ONEMLI: GitHub Token
echo ========================================
echo.
echo Ilk push yaparken SIFRE YERINE TOKEN girin!
echo.
echo Token olusturmak icin (tarayici aciliyor):
echo 1. GitHub Settings -^> Tokens
echo 2. "Generate new token (classic)"
echo 3. "repo" yetkisi secin
echo 4. Token'i kopyalayin
echo.
echo Token'inizi simdi olusturmak ister misiniz? (E/H)
set /p OPEN_TOKEN="Secim: "
if /i "%OPEN_TOKEN%"=="E" start https://github.com/settings/tokens

cls
echo.
echo ========================================
echo   KURULUM TAMAMLANDI!
echo ========================================
echo.
echo [OK] Git hazir
echo [OK] Python hazir
echo [OK] Kutuphaneler hazir
echo [OK] Kullanici bilgileri kaydedildi
echo.
echo ARTIK KULLANABILIRSINIZ:
echo.
echo 1. urunler.xlsx dosyasini duzenleyin
echo 2. Gorselleri gorseller\ klasorune ekleyin
echo 3. guncelle.bat'a cift tiklayin
echo 4. Ilk push'ta TOKEN'i sifre yerine girin
echo.
echo NOT: Bu dosyayi tekrar calistirmaniza gerek yok.
echo.
pause
