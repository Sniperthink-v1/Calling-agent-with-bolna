# 🚀 Quick Start Guide - React Native Mobile App

## Prerequisites

- Node.js installed (v18+)
- Expo Go app on your phone
- Backend running on your computer
- ngrok installed (for physical device testing)

## Setup Steps

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Setup Backend Connection

**Option A: Using ngrok (Recommended)**

1. Start your backend:
   ```bash
   cd backend
   npm run dev
   ```

2. In a new terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

3. Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)

4. Update `mobile/src/config/environment.ts`:
   ```typescript
   dev: {
     apiUrl: 'https://abc123.ngrok-free.app/api',
   },
   ```

**Option B: Using Local IP (WiFi only)**

1. Find your computer's IP:
   ```bash
   # Windows
   ipconfig
   # Mac/Linux
   ifconfig
   ```

2. Update `mobile/src/config/environment.ts`:
   ```typescript
   dev: {
     apiUrl: 'http://YOUR_IP:3000/api', // e.g., http://192.168.1.100:3000/api
   },
   ```

### 3. Start the App

```bash
npm start
```

### 4. Run on Your Phone

1. Install Expo Go on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code:
   - iOS: Use Camera app
   - Android: Use Expo Go app

## Test Credentials

Use the credentials from your backend database or register a new account in the app.

## Troubleshooting

### Cannot connect to backend
- Make sure backend is running
- Check ngrok URL is correct and active
- Ensure phone and computer are on same WiFi (if using local IP)
- Check firewall settings

### Metro bundler issues
```bash
npm start -- --clear
```

### Dependencies issues
```bash
rm -rf node_modules
npm install
```

## Features Available

✅ User Authentication (Login/Register)
✅ Dashboard with KPIs
✅ Call Logs List
✅ Contact Management
✅ Campaign Overview
✅ User Profile

## Development Tips

1. **Hot Reload**: Shake your phone to open dev menu
2. **Logs**: Use `console.log()` - visible in terminal
3. **Network**: Check API calls in terminal output
4. **Debugging**: Enable Remote JS Debugging from dev menu

## Next Steps

After basic setup works:

1. Test authentication flow
2. Check dashboard data loading
3. Verify call logs display
4. Test contact creation
5. Try audio playback

## Need Help?

Check the main README.md for detailed implementation guides and API documentation.
