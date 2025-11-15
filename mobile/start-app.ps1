# Quick Start Script for Mobile App
# Run this from PowerShell in the mobile directory

Write-Host "🚀 Starting Calling Agent Mobile App..." -ForegroundColor Cyan
Write-Host ""

# Check if in mobile directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found" -ForegroundColor Red
    Write-Host "Please run this script from the mobile directory" -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Kill existing Expo server if running
$expoProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*expo*" }
if ($expoProcess) {
    Write-Host "🔄 Stopping existing Expo server..." -ForegroundColor Yellow
    $expoProcess | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Start Expo
Write-Host ""
Write-Host "✅ Starting Expo Dev Server..." -ForegroundColor Green
Write-Host "📱 Scan the QR code with Expo Go app on your phone" -ForegroundColor Cyan
Write-Host ""
Write-Host "Logs will appear below:" -ForegroundColor Yellow
Write-Host "  🚀 = App start"
Write-Host "  ✅ = Success"
Write-Host "  ❌ = Error"
Write-Host "  🔐 = Authentication"
Write-Host ""

npm start
