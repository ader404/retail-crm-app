@echo off
echo ========================================
echo  FIXING BACKEND - KILLING PROCESSES
echo ========================================
echo.

echo Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ Node processes killed
) else (
    echo ℹ No Node processes running
)

echo.
echo Killing all Prisma processes...
taskkill /F /IM prisma.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ Prisma processes killed
) else (
    echo ℹ No Prisma processes running
)

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  REGENERATING PRISMA CLIENT
echo ========================================
echo.

cd /d "%~dp0"
call npm run db:generate

if %errorlevel% neq 0 (
    echo.
    echo ❌ Prisma generation failed!
    echo Try closing VS Code and running this script again.
    echo.
    pause
    exit /b 1
)

echo.
echo ✓ Prisma client generated successfully!
echo.

echo ========================================
echo  APPLYING DATABASE MIGRATION
echo ========================================
echo.

call npm run db:migrate

if %errorlevel% neq 0 (
    echo.
    echo ⚠ Migration failed (database might be offline)
    echo You can skip this and run it later when DB is online
    echo.
)

echo.
echo ========================================
echo  SEEDING DATABASE
echo ========================================
echo.

call npm run db:seed

if %errorlevel% neq 0 (
    echo.
    echo ⚠ Seed failed (database might be offline)
    echo You can skip this and run it later when DB is online
    echo.
)

echo.
echo ========================================
echo  STARTING BACKEND SERVER
echo ========================================
echo.

call npm run start:dev

pause
