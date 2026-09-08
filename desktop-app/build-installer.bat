@echo off
echo ========================================
echo Building Retail CRM Desktop Installer
echo ========================================
echo.

echo Step 1: Installing desktop app dependencies...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo Failed to install desktop app dependencies
    pause
    exit /b 1
)
echo.

echo Step 2: Installing backend dependencies...
cd /d "%~dp0\..\backend"
call npm install
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)
echo.

echo Step 3: Building backend...
call npx prisma generate
if %errorlevel% neq 0 (
    echo Failed to generate the Prisma client
    pause
    exit /b 1
)

call npm run build
if %errorlevel% neq 0 (
    echo Failed to build backend
    pause
    exit /b 1
)
echo.

echo Step 4: Installing frontend dependencies...
cd /d "%~dp0\..\frontend"
call npm install
if %errorlevel% neq 0 (
    echo Failed to install frontend dependencies
    pause
    exit /b 1
)
echo.

echo Step 5: Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Failed to build frontend
    pause
    exit /b 1
)
echo.

echo Step 6: Building desktop installer...
cd /d "%~dp0"
call npm run dist:win
if %errorlevel% neq 0 (
    echo Failed to build installer
    pause
    exit /b 1
)
echo.

echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Installer location: %~dp0dist\
echo.
pause
