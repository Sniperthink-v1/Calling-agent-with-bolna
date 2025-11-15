# Agent S - Production APK Build Guide

## 📱 App Configuration

**App Name**: Agent S  
**Package Name**: com.agents.agentscalling  
**Version**: 1.0.0  
**Bundle ID (iOS)**: com.agents.agentscalling

---

## 🎨 Step 1: Prepare App Icons

You need to create the following icon files from your logo:

### Required Icons:

1. **icon.png** (1024x1024px) - Main app icon
2. **adaptive-icon.png** (1024x1024px) - Android adaptive icon (foreground)
3. **splash-icon.png** (1284x1284px) - Splash screen logo
4. **favicon.png** (48x48px) - Web favicon (optional)

### How to Create Icons from Your SVG:

#### Option A: Use Online Tool (Easiest)
1. Go to https://www.appicon.co/
2. Upload your PNG logo
3. Select "Android" and "iOS"
4. Download and extract

#### Option B: Use ImageMagick (Command Line)
```bash
# Install ImageMagick first: https://imagemagick.org/script/download.php

# Create icon.png (1024x1024)
magick convert agent-s-logo.png -resize 1024x1024 -background black -gravity center -extent 1024x1024 icon.png

# Create adaptive-icon.png (1024x1024)
magick convert agent-s-logo.png -resize 1024x1024 -background transparent -gravity center -extent 1024x1024 adaptive-icon.png

# Create splash-icon.png (1284x1284)
magick convert agent-s-logo.png -resize 800x800 -background black -gravity center -extent 1284x1284 splash-icon.png

# Create favicon.png (48x48)
magick convert agent-s-logo.png -resize 48x48 -background black -gravity center -extent 48x48 favicon.png
```

#### Option C: Use Figma/Photoshop
1. Create a 1024x1024px canvas with black background
2. Center your logo (resize to fit nicely)
3. Export as PNG
4. Repeat for other sizes

### 📁 Place Icons Here:
```
mobile/
  assets/
    icon.png              (1024x1024)
    adaptive-icon.png     (1024x1024)
    splash-icon.png       (1284x1284)
    favicon.png           (48x48)
```

---

## 🔧 Step 2: Install EAS CLI (if not installed)

```bash
npm install -g eas-cli
```

---

## 🔐 Step 3: Login to Expo

```bash
eas login
```

If you don't have an Expo account:
```bash
eas register
```

---

## 🏗️ Step 4: Configure the Build

The build is already configured in `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## 🚀 Step 5: Build Production APK

### Build the APK:

```bash
cd mobile
eas build --platform android --profile production
```

### What happens:
1. EAS will ask if you want to generate a new keystore - **Say YES** (first time only)
2. Build will be queued on Expo servers
3. You'll get a link to monitor build progress
4. Build typically takes 10-15 minutes

### Monitor Build:
- Click the link provided in terminal
- Or visit: https://expo.dev/accounts/[your-account]/projects/agent-s/builds

---

## 📥 Step 6: Download APK

Once the build completes:

1. **From Terminal**: The download link will be shown
2. **From Web**: Go to https://expo.dev → Your Project → Builds
3. Click "Download" button next to your completed build

### APK Location:
The APK will be named something like:
```
build-[build-id].apk
```

Rename it to something user-friendly:
```
Agent-S-v1.0.0.apk
```

---

## 📤 Step 7: Share the APK

### Method 1: Direct Download Link
After build completes, you get a shareable download link:
```
https://expo.dev/artifacts/eas/[artifact-id].apk
```

Share this link with users - they can download and install directly.

### Method 2: Upload to Cloud Storage
Upload the APK to:
- Google Drive
- Dropbox
- GitHub Releases
- Your own server

### Method 3: QR Code
EAS Build provides a QR code that users can scan to download.

---

## 📲 Step 8: Install APK on Android Device

### For Users:

1. **Download the APK** to your Android phone
2. **Enable "Install Unknown Apps"**:
   - Settings → Apps → Special Access → Install Unknown Apps
   - Enable for your browser/file manager
3. **Install the APK**:
   - Open the downloaded APK file
   - Tap "Install"
   - Tap "Open" to launch Agent S

### Security Warning:
Users will see "Install blocked" or "Unsafe app blocked" because the app is not from Google Play Store.

**Tell users to**:
- Tap "More details" or "Settings"
- Tap "Install anyway"
- This is normal for APKs not from Play Store

---

## 🔄 Step 9: Update the App (Future Versions)

When you need to release updates:

1. **Update version in app.json**:
```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

2. **Build new APK**:
```bash
eas build --platform android --profile production
```

3. **Share new APK** with updated version number

**Important**: 
- Increment `versionCode` by 1 for each build
- Users must uninstall old version and install new one (or use OTA updates with expo-updates)

---

## 🐛 Troubleshooting

### Build Fails:

**Error: "Invalid package name"**
- Package names must be lowercase
- Use only letters, numbers, dots, underscores
- Must have at least 2 segments (e.g., com.company.app)

**Error: "Application ID already in use"**
- Change package name in app.json
- Or use a different Expo project

**Error: "Asset validation failed"**
- Check icon sizes match requirements
- Ensure PNGs are valid and not corrupted

### APK Won't Install:

**"App not installed"**
- Make sure user has enough storage
- Uninstall any previous version
- Check Android version compatibility

**"This app is not compatible"**
- APK may be for wrong architecture
- Try building with different Android SDK version

### App Crashes on Launch:

**Check Logs**:
```bash
adb logcat | grep -i agents
```

**Common Issues**:
- Missing .env file (build includes env vars)
- Network permissions missing
- Backend URL not accessible

---

## 📊 Build Optimization Tips

### Reduce APK Size:

1. **Remove unused dependencies**:
```bash
npm prune --production
```

2. **Enable ProGuard** (in eas.json):
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}
```

3. **Use Android App Bundle** (AAB) instead of APK:
```json
"buildType": "app-bundle"
```
Note: AAB requires Google Play Store for distribution.

---

## 🔐 Signing & Security

### Keystore Management:

EAS automatically generates and manages your keystore. To download it:

```bash
eas credentials
```

Select:
1. Android
2. production
3. Keystore: Manage everything...
4. Download credentials

**IMPORTANT**: 
- **Backup your keystore** - you need it for all future updates
- Keep it secure - never commit to git
- If lost, you cannot update the app (must create new package)

---

## 📋 Pre-Release Checklist

Before building production APK:

- [ ] App name updated to "Agent S" in app.json
- [ ] All icons created and placed in assets/
- [ ] Package name set: com.agents.agentscalling
- [ ] Version number correct (1.0.0)
- [ ] Backend URL points to production
- [ ] .env file has production API URL
- [ ] Test app on Android emulator
- [ ] Test login/signup flow
- [ ] Test all main features
- [ ] Remove any console.logs (optional)
- [ ] Update splash screen background color

---

## 🚀 Quick Start Commands

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Install dependencies (if needed)
npm install

# 3. Login to Expo
eas login

# 4. Build production APK
eas build --platform android --profile production

# 5. Monitor build progress
# (Follow link from terminal or check expo.dev)

# 6. Download APK when ready
# (Click download link or get from expo.dev)
```

---

## 📱 Alternative: Build Locally (Advanced)

If you want to build APK locally without EAS:

```bash
# Generate Android files
npx expo prebuild --platform android

# Build APK with Gradle
cd android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

Note: Requires Android Studio and JDK installed.

---

## 🎯 Next Steps After APK is Ready

1. **Test APK on multiple devices**:
   - Different Android versions
   - Different screen sizes
   - Different network conditions

2. **Gather feedback**:
   - Share with beta testers
   - Fix any reported issues
   - Increment version and rebuild

3. **Consider Google Play Store**:
   - Create developer account ($25 one-time)
   - Upload AAB (not APK)
   - Fill store listing
   - Submit for review

4. **Set up OTA Updates** (Optional):
   - Install expo-updates
   - Push updates without rebuilding APK
   - Users get updates automatically

---

## 📞 Support

If you encounter issues:

1. Check Expo docs: https://docs.expo.dev/build/setup/
2. EAS Build docs: https://docs.expo.dev/build/introduction/
3. Expo forums: https://forums.expo.dev/
4. Check build logs in Expo dashboard

---

## ✅ Summary

To create and share Agent S APK:

1. Prepare icon.png (1024x1024) from your logo
2. Run: `eas build --platform android --profile production`
3. Wait 10-15 minutes for build
4. Download APK from provided link
5. Share APK file or download link with users
6. Users install APK on their Android devices

**APK will be signed, ready to install, and can be shared freely!** 🎉
