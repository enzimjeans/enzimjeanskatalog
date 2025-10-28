@echo off
cls
echo ========================================
echo   SİVAL KATALOG - YENI PC KURULUM
echo ========================================
echo.
echo Bu script yeni bir bilgisayarda katalogu
echo kullanmaya baslamak icin gerekli her seyi
echo otomatik olarak kuracak.
echo.
pause
echo.

echo [1/5] Git kontrolu yapiliyor...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [X] Git kurulu degil!
    echo.
    echo Git'i indirmek icin:
    echo https://git-scm.com/download/win
    echo.
    echo Git'i kurduktan sonra bu dosyayi tekrar calistirin.
    pause
    exit /b 1
)
echo [OK] Git kurulu
echo.

echo [2/5] Python kontrolu yapiliyor...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [X] Python kurulu degil!
    echo.
    echo Python'u indirmek icin:
    echo https://www.python.org/downloads/
    echo.
    echo ONEMLI: Kurulumda "Add Python to PATH" secenegini isaretleyin!
    echo.
    echo Python'u kurduktan sonra bu dosyayi tekrar calistirin.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo [OK] %%i kurulu
echo.

echo [3/5] Gerekli Python kutuphaneleri kuruluyor...
echo.
echo pandas ve openpyxl kurulacak (birkac dakika surebilir)...
python -m pip install --upgrade pip >nul 2>&1
python -m pip install pandas openpyxl
if %errorlevel% neq 0 (
    echo.
    echo [X] Kutuphane kurulumu basarisiz!
    echo.
    echo Manuel kurulum icin:
    echo pip install pandas openpyxl
    pause
    exit /b 1
)
echo [OK] Kutuphaneler kuruldu
echo.

echo [4/5] Katalog dosyalari indiriliyor...
echo.
echo Repository adresi:
echo https://github.com/enzimjeans/enzimjeanskatalog.git
echo.
set /p CLONE_PATH="Bu klasoru nereye indirmek istersiniz? (or: C:\Users\%USERNAME%\Desktop): "

if "%CLONE_PATH%"=="" (
    set CLONE_PATH=C:\Users\%USERNAME%\Desktop
)

cd /d "%CLONE_PATH%"
git clone https://github.com/enzimjeans/enzimjeanskatalog.git katalog

if %errorlevel% neq 0 (
    echo.
    echo [X] Repository indirme basarisiz!
    echo.
    echo Olasi sebepler:
    echo 1. Internet baglantisi yok
    echo 2. Repository adresi yanlis
    echo 3. Bu klasor zaten var
    pause
    exit /b 1
)
echo [OK] Dosyalar indirildi: %CLONE_PATH%\katalog
echo.

echo [5/5] GitHub kimlik bilgileri ayarlaniyor...
echo.
echo GitHub'a yukleme yapabilmek icin kimlik bilgileriniz gerekli.
echo.
set /p GIT_USERNAME="GitHub kullanici adiniz: "
set /p GIT_EMAIL="GitHub e-mail adresiniz: "

cd /d "%CLONE_PATH%\katalog"
git config user.name "%GIT_USERNAME%"
git config user.email "%GIT_EMAIL%"

echo.
echo [OK] Git kullanici bilgileri kaydedildi
echo.
echo ========================================
echo ONEMLI: GitHub Personal Access Token
echo ========================================
echo.
echo Ilk push yaparken GitHub sifreniz yerine
echo "Personal Access Token" girmeniz gerekecek.
echo.
echo Token olusturmak icin:
echo 1. https://github.com/settings/tokens
echo 2. "Generate new token (classic)"
echo 3. "repo" yetkisini secin
echo 4. Token'i kopyalayin (SIFRE YERINE BUNU GIRIN!)
echo.
echo Token'inizi simdi olusturun (tarayiciniz acilacak)...
pause
start https://github.com/settings/tokens
echo.

cls
echo.
echo ========================================
echo   KURULUM TAMAMLANDI!
echo ========================================
echo.
echo Katalog klasoru: %CLONE_PATH%\katalog
echo.
echo SONRAKI ADIMLAR:
echo 1. GitHub Token'inizi olusturdunuz mu? (yukaridaki link)
echo 2. Excel dosyasini duzenleyin: urunler.xlsx
echo 3. Gorselleri ekleyin: gorseller\ klasorune
echo 4. guncelle.bat'a cift tiklayin
echo 5. Ilk push'ta TOKEN'i sifre olarak girin!
echo.
echo DOSYALARA GIT:
explorer "%CLONE_PATH%\katalog"
echo.
pause
