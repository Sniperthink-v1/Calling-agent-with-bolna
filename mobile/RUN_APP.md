# 🚀 Quick Start - Running Your Mobile App

## ✅ Current Status

All core screens are implemented and ready to test:
- ✅ Login & Register screens with validation
- ✅ Dashboard with KPIs and credit balance
- ✅ Calls screen with call history
- ✅ Contacts screen with search
- ✅ Campaigns screen with progress tracking
- ✅ Profile screen with logout functionality

## 📱 Running on Expo Go (Physical Device)

### Step 1: Setup Backend Tunnel
Since your backend runs on localhost:3000, you need ngrok to make it accessible to your phone:

```powershell
# Install ngrok (if not already installed)
# Download from: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 3000
```

Copy the **https** forwarding URL (e.g., `https://abc123.ngrok-free.app`)

### Step 2: Update Mobile App Configuration

Open `mobile/src/config/environment.ts` and update:

```typescript
development: {
  apiUrl: 'https://YOUR-NGROK-URL.ngrok-free.app/api', // Replace with your ngrok URL
},
```

**Important**: Use the ngrok URL, not localhost!

### Step 3: Start Expo Dev Server

```powershell
cd mobile
npm start
```

### Step 4: Open on Phone

1. Install **Expo Go** app from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in terminal with:
   - **iOS**: Camera app
   - **Android**: Expo Go app scanner
3. App will load on your device

## 💻 Running on iOS Simulator (Mac only)

```powershell
cd mobile
npm run ios
```

## 🤖 Running on Android Emulator

Make sure Android Studio is installed with an emulator set up:

```powershell
cd mobile
npm run android
```

## 🌐 Testing with Local Network (Alternative to ngrok)

If your phone and computer are on the **same Wi-Fi network**:

1. Find your computer's local IP address:
   ```powershell
   ipconfig
   # Look for "IPv4 Address" (e.g., 192.168.1.5)
   ```

2. Update `mobile/src/config/environment.ts`:
   ```typescript
   development: {
     apiUrl: 'http://YOUR-LOCAL-IP:3000/api', // e.g., http://192.168.1.5:3000/api
   },
   ```

3. Make sure your backend allows connections from local network (not just localhost)

## 🧪 Test Credentials

Use these to login (from your existing backend):
- **Email**: Your registered user email
- **Password**: Your registered user password

If you need to create a test user, use the Register screen or create via backend.

## 🔍 Debugging

### Check Backend Connection

```powershell
# From mobile directory
npm start
# Press 'd' to open developer menu on device
# Press 'j' to open Chrome DevTools
```

### Common Issues

**❌ Network Error / Cannot connect to backend:**
- ✅ Verify backend is running: `http://localhost:3000/api/health`
- ✅ Check ngrok is active and URL is correct in environment.ts
- ✅ Try restarting Expo dev server

**❌ Module resolution errors:**
```powershell
cd mobile
rm -rf node_modules
npm install
npm start --reset-cache
```

**❌ White screen or crash:**
- Check terminal for error messages
- Check Chrome DevTools (press 'j' after starting dev server)
- Verify all dependencies are installed

## 📊 Testing Each Screen

### 1. Dashboard
- Shows KPI cards (Total Calls, Success Rate, etc.)
- Displays credit balance prominently
- Shows agent status (active/total)
- Pull to refresh to update data

### 2. Calls
- Lists all your call history
- Shows contact name, phone, status, duration
- Color-coded status badges
- Pull to refresh

### 3. Contacts
- Search bar to filter contacts
- Displays contact cards with name, phone, email
- FAB (+) button for adding contacts (placeholder)
- Pull to refresh

### 4. Campaigns
- Lists all campaigns with status badges
- Progress bars showing completion
- Stats: total/completed/failed calls
- FAB (+) button for creating campaigns (placeholder)
- Pull to refresh

### 5. Profile
- Shows user name, email, credits
- Menu items for settings (placeholders)
- Logout button with confirmation

## 🎯 Next Steps

### Implement Remaining Features:

1. **Add Contact Form** (ContactsScreen FAB action)
2. **Add Campaign Form** (CampaignsScreen FAB action)
3. **Call Detail View** (tap on call in CallsScreen)
4. **Audio Player Component** for call recordings
5. **Edit Profile** functionality
6. **Change Password** functionality

### Example: Implementing Add Contact

Create `mobile/src/screens/contacts/AddContactScreen.tsx`:

```typescript
import { useCreateContact } from '../../hooks/useContacts';
// Add form with name, phone, email fields
// Use mutation from useCreateContact hook
```

Update MainTabNavigator or create a stack navigator for contacts:
```typescript
// In ContactsScreen.tsx, update FAB:
<TouchableOpacity 
  style={styles.fab} 
  onPress={() => navigation.navigate('AddContact')}
>
```

## 📝 Environment Variables

Current configuration in `mobile/.env`:
```
API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**Remember**: Change to ngrok URL before testing on physical device!

## 🔄 Hot Reload

Expo supports hot reload by default. Any changes to `.tsx` files will automatically refresh the app.

To manually reload:
- Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
- Select "Reload"

## 📱 Production Build (Future)

When ready to deploy:

```powershell
# iOS App Store
eas build --platform ios

# Android Play Store
eas build --platform android
```

(Requires Expo EAS account)

## ✨ You're All Set!

Your mobile app is ready to run. Start with ngrok tunnel, update the environment.ts file, and launch with `npm start`.

**Happy Testing! 🎉**
