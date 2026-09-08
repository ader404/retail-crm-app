@echo off
echo ========================================
echo Testing Retail CRM Desktop App
echo ========================================
echo.
echo This will start the desktop app in development mode.
echo Make sure you have:
echo   - MySQL running
echo   - Backend and frontend dependencies installed
echo.
pause

cd /d "%~dp0"
echo Starting desktop app...
call npm start
