@echo off
REM Agent S - Production APK Build Script (Windows)
REM This script builds a production-ready APK for Android

echo.
echo 🚀 Building Agent S Production APK...
echo.

REM Check if we're in the mobile directory
if not exist "app.json" (
    echo ❌ Error: app.json not found. Please run this script from the mobile directory.
    exit /b 1
)

REM Check if EAS CLI is installed
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 📦 EAS CLI not found. Installing...
    call npm install -g eas-cli
)

REM Check if icons exist
echo 🔍 Checking for required icons...
set MISSING_ICONS=0

if not exist "assets\icon.png" (
    echo ❌ Missing: assets\icon.png (1024x1024)
    set MISSING_ICONS=1
)

if not exist "assets\adaptive-icon.png" (
    echo ❌ Missing: assets\adaptive-icon.png (1024x1024)
    set MISSING_ICONS=1
)

if not exist "assets\splash-icon.png" (
    echo ❌ Missing: assets\splash-icon.png (1284x1284)
    set MISSING_ICONS=1
)

if %MISSING_ICONS% EQU 1 (
    echo.
    echo ⚠️  Please prepare the app icons first.
    echo 📖 See ICON_PREPARATION_GUIDE.md for instructions
    exit /b 1
)

echo ✅ All icons found
echo.

REM Check if logged in to Expo
echo 🔐 Checking Expo login status...
eas whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Please login to Expo:
    call eas login
)

echo.
echo ✨ Starting production build...
echo ⏱️  This will take approximately 10-15 minutes
echo 🔗 You'll receive a link to monitor build progress
echo.

REM Build the APK
call eas build --platform android --profile production

echo.
echo ✅ Build submitted!
echo 📱 Download your APK from the link above when ready
echo 📤 Share the APK with users to install Agent S
echo.

pause
