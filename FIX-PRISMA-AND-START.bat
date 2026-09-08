@echo off
echo ========================================
echo  FIX PRISMA CLIENT AND DATABASE
echo ========================================
echo.
echo This will:
echo 1. Stop any running backend processes
echo 2. Generate Prisma client
echo 3. Create and run database migration
echo 4. Start the backend
echo.
pause

echo.
echo [1/4] Stopping backend processes...
taskkill /F /IM node.exe 2>nul
timeout /t 3 /nobreak >nul

echo [2/4] Generating Prisma client...
cd backend
call npx prisma generate

echo.
echo [3/4] Creating and running migration...
call npx prisma migrate dev --name add_purchase_order_to_loan

echo.
echo [4/4] Starting backend...
start cmd /k "npm run start:dev"

echo.
echo ========================================
echo  DONE! Backend is starting...
echo ========================================
echo.
echo The backend will open in a new window.
echo Wait for "Nest application successfully started" message.
echo Then try making a sale again!
echo.
pause
