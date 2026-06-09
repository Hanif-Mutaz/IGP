@echo off
title Distrib.App - Setup Shortcut
color 0A

echo.
echo  ==========================================
echo    Distrib.App - Membuat Shortcut Desktop
echo  ==========================================
echo.

:: Path tetap ke lokasi start.bat
set APP_PATH=D:\1. Aplikasi\aplikasi\start.bat
set APP_DIR=D:\1. Aplikasi\aplikasi

:: Cek apakah file start.bat ada di lokasi yang benar
if not exist "%APP_PATH%" (
    color 0C
    echo  [ERROR] File aplikasi tidak ditemukan!
    echo.
    echo  Pastikan folder aplikasi ada di lokasi:
    echo  D:\1. Aplikasi\aplikasi\
    echo.
    echo  Jika folder berbeda, hubungi teknisi.
    echo.
    pause
    exit /b
)

:: Hapus shortcut lama kalau ada
if exist "%USERPROFILE%\Desktop\Distrib.App.lnk" (
    del "%USERPROFILE%\Desktop\Distrib.App.lnk" >nul 2>nul
)

:: Buat shortcut baru di Desktop
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%USERPROFILE%\Desktop\Distrib.App.lnk'); $s.TargetPath = '%APP_PATH%'; $s.WorkingDirectory = '%APP_DIR%'; $s.IconLocation = '%SystemRoot%\System32\SHELL32.dll,43'; $s.Description = 'Jalankan Distrib.App'; $s.Save()" >nul 2>nul

if exist "%USERPROFILE%\Desktop\Distrib.App.lnk" (
    color 0A
    echo  [BERHASIL] Shortcut Distrib.App berhasil dibuat di Desktop!
    echo.
    echo  Sekarang Anda bisa membuka aplikasi dengan cara:
    echo  Dobel klik ikon "Distrib.App" di Desktop
    echo.
) else (
    color 0C
    echo  [GAGAL] Shortcut gagal dibuat.
    echo  Hubungi teknisi untuk bantuan.
    echo.
)

pause