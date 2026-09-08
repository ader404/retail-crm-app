@echo off
REM ============================================================================
REM Quick Diagnostic - Check Login Issue
REM ============================================================================

echo.
echo Checking Desktop CRM Services...
echo.

echo [1/4] Checking MySQL...
netstat -an | find "3306" | find "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] MySQL is running on port 3306
) else (
    echo [FAIL] MySQL is NOT running
)

echo.
echo [2/4] Checking Backend API...
netstat -an | find "3001" | find "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend API is running on port 3001
) else (
    echo [FAIL] Backend API is NOT running
)

echo.
echo [3/4] Checking Frontend App...
netstat -an | find "3000" | find "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend App is running on port 3000
) else (
    echo [FAIL] Frontend App is NOT running
)

echo.
echo [4/4] Checking Database User...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p136083153Aderdour retail_crm -e "SELECT email, role, isActive FROM users LIMIT 1;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] User found in database
) else (
    echo [INFO] No users in database or MySQL error
)

echo.
echo ============================================================================
echo.
echo Now testing backend login API...
echo.
echo Please enter the password you used during setup:
set /p TEST_PASSWORD=Password:

echo.
echo Testing login to http://localhost:3001/auth/login ...
echo.

powershell -Command "$body = @{email='mmm@gmail.com';password='%TEST_PASSWORD%'} | ConvertTo-Json; try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing; Write-Host '[SUCCESS] Status:' $response.StatusCode; $response.Content | ConvertFrom-Json | ConvertTo-Json } catch { Write-Host '[FAILED] Status:' $_.Exception.Response.StatusCode.value__; Write-Host 'Error:' $_.Exception.Message }"

echo.
echo ============================================================================
echo.
echo If login succeeded above but fails in the desktop app:
echo   1. Open the Electron window
echo   2. Press Ctrl+Shift+I to open DevTools
echo   3. Check the Console tab for errors
echo   4. Try login and check Network tab for the API request
echo.
echo If login failed above:
echo   - Wrong password
echo   - Backend API not responding properly
echo   - User account might be locked
echo.
pause
