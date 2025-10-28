$source = "C:\Users\PC\Desktop\katalog"
$dest = "C:\Users\PC\Desktop\MAYA_KATALOG_PORTABLE"

$files = @(
    'urunler.xlsx',
    'guncelle.bat',
    'ilk_kurulum.bat',
    'config.js',
    'index.html',
    'style.css',
    'script.js',
    'logo.png',
    'excel_to_json.py',
    'urunler.json',
    'OKUBUCU.txt',
    'HIZLI_BASLANGIC.txt',
    'README.md'
)

foreach($file in $files) {
    $sourcePath = Join-Path $source $file
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $dest -Force
        Write-Host "Kopyalandi: $file"
    }
}

# Gorseller klasoru
Copy-Item "$source\gorseller" "$dest\gorseller" -Recurse -Force
Write-Host "Gorseller klasoru kopyalandi"

Write-Host "`nTamamlandi!"
