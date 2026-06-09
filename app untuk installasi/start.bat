@echo off
title Distrib.App
color 0A

echo.
echo  ==========================================
echo    Distrib.App - Memulai server...
echo  ==========================================
echo.

:: Cek Node.js
node -v >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js belum terinstall!
    echo  Download dari: https://nodejs.org
    pause
    start https://nodejs.org
    exit /b
)

:: Masuk ke folder tempat start.bat berada
cd /d "%~dp0"

:: Install dependencies kalau node_modules belum ada
if not exist "node_modules\" (
    echo  Instalasi pertama kali...
    npm install
    echo.
)

echo  Membuka browser dan menjalankan server...
echo  Tekan Ctrl+C untuk berhenti.
echo.

node server.js

pause