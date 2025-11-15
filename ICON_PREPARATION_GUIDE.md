# Quick Icon Preparation for Agent S

## 📐 Required Icon Sizes

You have the PNG logo. Now create these 4 files:

### 1. icon.png (1024x1024px)
- Main app icon
- Black background
- Logo centered

### 2. adaptive-icon.png (1024x1024px)  
- Android adaptive icon foreground
- Transparent or black background
- Logo centered (safe area: 512x512 center)

### 3. splash-icon.png (1284x1284px)
- Splash screen logo
- Black background
- Logo centered (can be smaller than full size)

### 4. favicon.png (48x48px)
- Web app icon
- Black background
- Logo centered

---

## 🎨 Quick Method Using Online Tool

**Easiest Option - Use Photopea (Free Online Photoshop)**

1. Go to https://www.photopea.com/
2. Create new project:
   - Width: 1024px
   - Height: 1024px
   - Background: Black (#000000)
3. File → Open → Upload your Agent S PNG logo
4. Resize logo to fit nicely (leave some padding)
5. Center the logo
6. File → Export As → PNG
7. Save as `icon.png`
8. Repeat for other sizes

---

## 🖼️ Manual Steps (Using Any Image Editor)

### For icon.png & adaptive-icon.png (1024x1024):

1. Create 1024x1024 canvas, black background
2. Import your Agent S logo
3. Resize to approximately 800x800 (leave padding)
4. Center it
5. Export as PNG

### For splash-icon.png (1284x1284):

1. Create 1284x1284 canvas, black background
2. Import your Agent S logo
3. Resize to approximately 600x600 
4. Center it
5. Export as PNG

### For favicon.png (48x48):

1. Create 48x48 canvas, black background
2. Import your Agent S logo
3. Resize to approximately 40x40
4. Center it
5. Export as PNG

---

## 📁 Where to Place Icons

Place all 4 PNG files here:
```
mobile/assets/
  ├── icon.png
  ├── adaptive-icon.png
  ├── splash-icon.png
  └── favicon.png
```

---

## ✅ After Icons Are Ready

1. Verify files exist in `mobile/assets/`
2. Run the build command:
   ```bash
   cd mobile
   eas build --platform android --profile production
   ```

That's it! The icons will be automatically included in your APK.

---

## 🎯 Icon Design Tips

- **Keep it simple**: The logo should be recognizable at small sizes
- **Use padding**: Don't let logo touch edges (about 15-20% padding)
- **Black background**: Matches your brand and looks professional
- **Centered**: Logo should be perfectly centered
- **High contrast**: White logo on black background ensures visibility

---

## 🔍 Preview Your Icons

After placing icons, start Expo to preview:

```bash
npx expo start
```

- Press `a` for Android
- Check app icon in app drawer
- Check splash screen when app launches
