@echo off
cls
echo ================================================
echo   SIVAL GIYIM KATALOG - ILK KURULUM
echo ================================================
echo.
echo Hosgeldiniz! Bu klasoru yeni PC'ye kopyaladiniz.
echo Simdi SSH kurulumunu yapip sistemi hazir hale getirecegiz.
echo.
pause

echo.
echo [1/2] SSH Key Yerlestirilecek...
echo.

REM .ssh klasoru var mi kontrol
if not exist "%USERPROFILE%\.ssh" (
    echo .ssh klasoru olusturuluyor...
    mkdir "%USERPROFILE%\.ssh"
)

REM _ssh_backup'tan kopyala
if exist "_ssh_backup" (
    echo SSH key dosyalari kopyalaniyor...
    xcopy "_ssh_backup\*" "%USERPROFILE%\.ssh\" /E /Y >nul

    if %errorlevel% equ 0 (
        echo [OK] SSH key yerlestirildi!
        echo Konum: %USERPROFILE%\.ssh\
        echo.
        echo ARTIK TOKEN GEREKMEYECEK!
        echo.
    ) else (
        echo [X] SSH key kopyalanamadi!
        echo.
        echo Sorun degil, guncelle.bat token ile calisacak.
        echo.
    )
) else (
    echo [!] _ssh_backup klasoru bulunamadi.
    echo.
    echo Sorun degil, guncelle.bat token ile calisacak.
    echo.
)

echo ================================================
echo [2/2] Sistem Hazirlaniyor...
echo ================================================
echo.
echo Simdi guncelle.bat calistirilacak.
echo Ilk kurulum tamamlanacak.
echo.
pause

echo.
echo guncelle.bat calistiriliyor...
echo.

call guncelle.bat

echo.
echo ================================================
echo   KURULUM TAMAMLANDI!
echo ================================================
echo.
echo Artik sadece guncelle.bat kullanin:
echo.
echo 1. urunler.xlsx duzenleyin
echo 2. gorseller/ klasorune resim ekleyin
echo 3. guncelle.bat'a TIKLAYIN
echo.
echo Bu dosyayi (BASLAT.bat) bir daha calistirmaniza gerek yok!
echo.
pause
