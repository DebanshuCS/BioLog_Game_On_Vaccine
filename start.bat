@echo off
title ViroQuest - Open Day Game Launcher
color 0B
cd /d "%~dp0"

echo.
echo  =======================================================
echo    ViroQuest - Virology ^& Vaccine Design Interactive
echo    College Open Day Edition (100%% Offline)
echo  =======================================================
echo.

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo  [OK] Python found — launching http://localhost:8000 ...
    start "" "http://localhost:8000"
    python -m http.server 8000
    goto :eof
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if %errorlevel% neq 0 (
    echo  [OK] Opening index.html directly in your default browser...
    start "" "%~dp0index.html"
)
