@echo off
cd /d "%~dp0"
call npm run setup
if errorlevel 1 goto done
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0security\Setup-LocalTLS.ps1"
:done
pause
