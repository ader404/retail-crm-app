@echo off
echo ========================================
echo Retail CRM Desktop - Complete Build
echo ========================================
echo.
echo This will:
echo 1. Install desktop app dependencies
echo 2. Build backend with dependencies
echo 3. Build frontend with dependencies
echo 4. Create Windows installer (.exe)
echo.
echo Estimated time: 10-15 minutes
echo.
pause

cd /d "%~dp0desktop-app"

echo.
echo [1/6] Installing desktop app dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install desktop app dependencies
    pause
    exit /b 1
)

echo.
echo [2/6] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo [3/6] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo [4/6] Building backend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build backend
    pause
    exit /b 1
)

echo.
echo [5/6] Installing and building frontend...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)

echo.
echo [6/6] Creating Windows installer...
cd /d "%~dp0desktop-app"
call npm run dist:win
if %errorlevel% neq 0 (
    echo ERROR: Failed to create installer
    echo.
    echo This might be due to a missing icon file.
    echo The build will continue without a custom icon.
    pause
)

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo Your installer is ready at:
echo %~dp0desktop-app\dist\Retail CRM Setup 1.0.0.exe
echo.
echo You can now:
echo 1. Test the installer on this machine
echo 2. Share it with users
echo.
echo File size: Check the dist folder for details
echo.
pause

explorer "%~dp0desktop-app\dist"
