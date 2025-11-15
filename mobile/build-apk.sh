#!/bin/bash

# Agent S - Production APK Build Script
# This script builds a production-ready APK for Android

echo "🚀 Building Agent S Production APK..."
echo ""

# Check if we're in the mobile directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found. Please run this script from the mobile directory."
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if icons exist
echo "🔍 Checking for required icons..."
MISSING_ICONS=false

if [ ! -f "assets/icon.png" ]; then
    echo "❌ Missing: assets/icon.png (1024x1024)"
    MISSING_ICONS=true
fi

if [ ! -f "assets/adaptive-icon.png" ]; then
    echo "❌ Missing: assets/adaptive-icon.png (1024x1024)"
    MISSING_ICONS=true
fi

if [ ! -f "assets/splash-icon.png" ]; then
    echo "❌ Missing: assets/splash-icon.png (1284x1284)"
    MISSING_ICONS=true
fi

if [ "$MISSING_ICONS" = true ]; then
    echo ""
    echo "⚠️  Please prepare the app icons first."
    echo "📖 See ICON_PREPARATION_GUIDE.md for instructions"
    exit 1
fi

echo "✅ All icons found"
echo ""

# Check if logged in to Expo
echo "🔐 Checking Expo login status..."
if ! eas whoami &> /dev/null; then
    echo "Please login to Expo:"
    eas login
fi

echo ""
echo "✨ Starting production build..."
echo "⏱️  This will take approximately 10-15 minutes"
echo "🔗 You'll receive a link to monitor build progress"
echo ""

# Build the APK
eas build --platform android --profile production

echo ""
echo "✅ Build submitted!"
echo "📱 Download your APK from the link above when ready"
echo "📤 Share the APK with users to install Agent S"
echo ""
