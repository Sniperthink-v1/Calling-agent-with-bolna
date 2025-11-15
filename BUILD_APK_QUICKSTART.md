# 🚀 Build Agent S APK - Quick Start

## Prerequisites

✅ **Already Configured**:
- App name: "Agent S"
- Package: com.agents.agentscalling
- Backend: Production URL configured
- Build profile: Ready

## 📋 What You Need To Do

### Step 1: Prepare Icons (5 minutes)

1. Use your PNG logo to create these files:
   - `icon.png` (1024x1024)
   - `adaptive-icon.png` (1024x1024)
   - `splash-icon.png` (1284x1284)
   - `favicon.png` (48x48)

2. Place them in: `mobile/assets/`

**See `ICON_PREPARATION_GUIDE.md` for detailed instructions**

### Step 2: Build APK (10-15 minutes)

#### Option A: Use Build Script (Recommended)

**Windows**:
```bash
cd mobile
build-apk.bat
```

**Mac/Linux**:
```bash
cd mobile
chmod +x build-apk.sh
./build-apk.sh
```

#### Option B: Manual Command

```bash
cd mobile
eas login
eas build --platform android --profile production
```

### Step 3: Download & Share

1. Wait for build to complete (10-15 min)
2. Download APK from the link provided
3. Share APK file with users
4. Users can install on Android devices

---

## 🎯 Complete Build Process

```bash
# 1. Prepare icons (see ICON_PREPARATION_GUIDE.md)
# Place icon.png, adaptive-icon.png, splash-icon.png in mobile/assets/

# 2. Navigate to mobile directory
cd mobile

# 3. Run build script
build-apk.bat    # Windows
# or
./build-apk.sh   # Mac/Linux

# 4. Follow prompts to login to Expo (first time only)

# 5. Wait for build (monitor via link provided)

# 6. Download APK when ready

# 7. Share APK file or download link with users
```

---

## 📱 Installing on Android Devices

### For End Users:

1. **Download APK** to Android phone
2. **Enable Unknown Sources**:
   - Settings → Security → Install unknown apps
   - Enable for your browser/file manager
3. **Install**:
   - Tap the downloaded APK
   - Tap "Install"
   - Tap "Open"

### Security Warning (Normal):
Users will see "Install blocked" - this is normal for apps not from Play Store.
- Tap "More details" or "Settings"
- Tap "Install anyway"

---

## 📖 Detailed Guides

- **Full Build Guide**: `PRODUCTION_APK_BUILD_GUIDE.md`
- **Icon Preparation**: `ICON_PREPARATION_GUIDE.md`
- **Backend Setup**: `MOBILE_BACKEND_SETUP.md`

---

## 🔄 Updating the App

When releasing updates:

1. Update version in `app.json`:
   ```json
   "version": "1.0.1",
   "android": {
     "versionCode": 2
   }
   ```

2. Run build again:
   ```bash
   build-apk.bat
   ```

3. Share new APK

---

## ❓ Troubleshooting

### Build fails?
- Check icons are in correct location
- Ensure you're logged into Expo
- See `PRODUCTION_APK_BUILD_GUIDE.md` troubleshooting section

### APK won't install?
- Check Android version (requires Android 5.0+)
- Enable "Install Unknown Apps"
- Make sure previous version is uninstalled

### App crashes?
- Check backend URL is accessible
- Verify .env has production URL
- Check device logs

---

## 📞 Need Help?

Check the detailed guides:
1. `PRODUCTION_APK_BUILD_GUIDE.md` - Complete build documentation
2. `ICON_PREPARATION_GUIDE.md` - Icon creation help
3. Expo Docs: https://docs.expo.dev/build/

---

## ✅ Quick Checklist

Before building:
- [ ] Icons created and placed in `mobile/assets/`
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged into Expo account
- [ ] Backend URL configured (already done ✓)
- [ ] App name is "Agent S" (already done ✓)

Ready to build:
- [ ] Run `build-apk.bat` or `./build-apk.sh`
- [ ] Wait for build completion
- [ ] Download APK
- [ ] Test on Android device
- [ ] Share with users 🎉
