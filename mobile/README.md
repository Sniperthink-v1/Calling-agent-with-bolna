# 📱 Calling Agent Mobile App - React Native with Expo

## Overview

This is a comprehensive React Native mobile application built with Expo that connects to the Calling Agent backend API. The app provides a native mobile experience for managing calls, contacts, campaigns, and viewing analytics.

## ✅ Completed Setup

### 1. Project Initialization
- ✅ Expo project created with TypeScript
- ✅ All dependencies installed
- ✅ Folder structure created

### 2. Core Configuration
- ✅ Environment configuration (`src/config/environment.ts`)
- ✅ Theme constants (`src/constants/theme.ts`)
- ✅ TypeScript types (`src/types/index.ts`)

### 3. API & Services
- ✅ Axios API client with interceptors (`src/api/client.ts`)
- ✅ Auth service (`src/services/authService.ts`)
- ✅ Call service (`src/services/callService.ts`)
- ✅ Contact service (`src/services/contactService.ts`)
- ✅ Campaign service (`src/services/campaignService.ts`)
- ✅ Agent service (`src/services/agentService.ts`)
- ✅ Dashboard service (`src/services/dashboardService.ts`)
- ✅ User service (`src/services/userService.ts`)

### 4. State Management
- ✅ Zustand auth store (`src/stores/authStore.ts`)
- ✅ React Query hooks for data fetching

### 5. Custom Hooks
- ✅ usePolling - For real-time updates
- ✅ useCalls - Call management
- ✅ useContacts - Contact management
- ✅ useCampaigns - Campaign management
- ✅ useAgents - Agent management
- ✅ useDashboard - Dashboard data

### 6. Utilities
- ✅ Helper functions (`src/utils/helpers.ts`)

### 7. Screens (Partial)
- ✅ LoginScreen created

## 🚀 Next Steps - Implementation Guide

### Step 1: Create RegisterScreen

Create `src/screens/auth/RegisterScreen.tsx`:

```typescript
// Similar to LoginScreen but with name field and register logic
// Use authService.register() method
```

### Step 2: Create Navigation Structure

**A. Create Root Navigator** - `src/navigation/RootNavigator.tsx`:

```typescript
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**B. Create Auth Navigator** - `src/navigation/AuthNavigator.tsx`:

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

**C. Create Main Tab Navigator** - `src/navigation/MainTabNavigator.tsx`:

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Import screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import CallsScreen from '../screens/calls/CallsScreen';
import ContactsScreen from '../screens/contacts/ContactsScreen';
import CampaignsScreen from '../screens/campaigns/CampaignsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Calls':
              iconName = focused ? 'call' : 'call-outline';
              break;
            case 'Contacts':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Campaigns':
              iconName = focused ? 'megaphone' : 'megaphone-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: true,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Campaigns" component={CampaignsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

### Step 3: Create Main Screens

**A. Dashboard Screen** - `src/screens/dashboard/DashboardScreen.tsx`:

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDashboardOverview } from '../../hooks/useDashboard';
import { COLORS, SIZES } from '../../constants/theme';
import { formatNumber } from '../../utils/helpers';

export default function DashboardScreen() {
  const { data, isLoading, refetch } = useDashboardOverview();

  if (isLoading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      {/* KPI Cards */}
      {data?.kpis.map((kpi, index) => (
        <View key={index} style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{kpi.label}</Text>
          <Text style={styles.kpiValue}>{formatNumber(kpi.value)}</Text>
          {kpi.delta !== undefined && (
            <Text
              style={[
                styles.kpiDelta,
                { color: kpi.delta >= 0 ? COLORS.success : COLORS.error },
              ]}
            >
              {kpi.delta >= 0 ? '+' : ''}
              {kpi.delta}% {kpi.compare || ''}
            </Text>
          )}
        </View>
      ))}

      {/* Credit Balance */}
      <View style={styles.creditCard}>
        <Text style={styles.creditLabel}>Credit Balance</Text>
        <Text style={styles.creditValue}>{formatNumber(data?.creditBalance || 0)}</Text>
      </View>

      {/* Agents */}
      <View style={styles.agentCard}>
        <Text style={styles.agentLabel}>Agents</Text>
        <Text style={styles.agentValue}>
          {data?.agents.active || 0} Active / {data?.agents.total || 0} Total
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiCard: {
    backgroundColor: COLORS.card,
    padding: SIZES.paddingLG,
    borderRadius: SIZES.radiusLG,
    marginBottom: SIZES.paddingMD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingXS,
  },
  kpiValue: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.paddingXS,
  },
  kpiDelta: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  creditCard: {
    backgroundColor: COLORS.primary,
    padding: SIZES.paddingLG,
    borderRadius: SIZES.radiusLG,
    marginBottom: SIZES.paddingMD,
  },
  creditLabel: {
    fontSize: SIZES.md,
    color: '#fff',
    opacity: 0.9,
  },
  creditValue: {
    fontSize: SIZES.xxxl,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: SIZES.paddingSM,
  },
  agentCard: {
    backgroundColor: COLORS.card,
    padding: SIZES.paddingLG,
    borderRadius: SIZES.radiusLG,
    marginBottom: SIZES.paddingMD,
  },
  agentLabel: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  agentValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SIZES.paddingSM,
  },
});
```

**B. Calls Screen** - `src/screens/calls/CallsScreen.tsx`:

Use FlatList with pull-to-refresh and infinite scrolling. Show call cards with:
- Contact name and phone
- Call status badge
- Duration
- Date/time
- Tap to view details (navigate to CallDetailScreen)

**C. Contacts Screen** - `src/screens/contacts/ContactsScreen.tsx`:

Similar to CallsScreen but for contacts. Include:
- Search bar
- Add contact button
- Contact cards with initials avatar
- Tap to edit/view details

**D. Campaigns Screen** - `src/screens/campaigns/CampaignsScreen.tsx`:

List of campaigns with status badges and progress indicators.

**E. Profile Screen** - `src/screens/profile/ProfileScreen.tsx`:

User profile with:
- User info
- Credit balance
- Settings
- Logout button

### Step 4: Update App.tsx

Replace the content of `App.tsx`:

```typescript
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <RootNavigator />
    </QueryClientProvider>
  );
}
```

### Step 5: Create Shared Components

**A. Call Card Component** - `src/components/CallCard.tsx`:

Reusable card component for displaying call information.

**B. Contact Card Component** - `src/components/ContactCard.tsx`:

Reusable card component for displaying contact information.

**C. Audio Player Component** - `src/components/AudioPlayer.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { formatDuration } from '../utils/helpers';

interface AudioPlayerProps {
  audioUrl: string;
  onError?: (error: string) => void;
}

export default function AudioPlayer({ audioUrl, onError }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAudio = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      return newSound;
    } catch (error) {
      console.error('Error loading audio:', error);
      onError?.('Failed to load audio');
      return null;
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis / 1000);
      setPosition(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
    }
  };

  const togglePlayback = async () => {
    if (!sound) {
      const newSound = await loadAudio();
      if (newSound) {
        await newSound.playAsync();
      }
    } else {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(position / duration) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.timeText}>
          {formatDuration(position)} / {formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.paddingMD,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusMD,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  timeText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingXS,
  },
});
```

## 🔧 Backend Connection Setup

### Option 1: Using ngrok (Recommended for Physical Device Testing)

1. **Install ngrok**:
   ```bash
   npm install -g ngrok
   ```

2. **Start your backend** (in the backend directory):
   ```bash
   npm run dev
   ```

3. **Expose backend with ngrok** (in a new terminal):
   ```bash
   ngrok http 3000
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok-free.app`)

5. **Update mobile app environment**:
   - Open `mobile/src/config/environment.ts`
   - Update the `apiUrl` in the `dev` object:
     ```typescript
     dev: {
       apiUrl: 'https://abc123.ngrok-free.app/api',
     },
     ```

### Option 2: Using Local IP (WiFi Connection)

1. **Find your computer's local IP**:
   ```bash
   # Windows
   ipconfig
   # Look for "IPv4 Address" under your WiFi adapter
   ```

2. **Update mobile app environment**:
   ```typescript
   dev: {
     apiUrl: 'http://192.168.1.100:3000/api', // Replace with your IP
   },
   ```

3. **Ensure both devices are on the same WiFi network**

## 📱 Running the App

### Start the Development Server

```bash
cd mobile
npm start
```

### Run on iOS (Mac only)

```bash
npm run ios
```

### Run on Android

```bash
npm run android
```

### Run with Expo Go

1. Install Expo Go app on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code from the terminal with:
   - iOS: Camera app
   - Android: Expo Go app

## 📂 Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   └── client.ts                 # Axios instance with interceptors
│   ├── config/
│   │   └── environment.ts            # Environment configuration
│   ├── constants/
│   │   └── theme.ts                  # Colors, sizes, fonts
│   ├── hooks/
│   │   ├── usePolling.ts             # Polling hook
│   │   ├── useCalls.ts               # Call management hooks
│   │   ├── useContacts.ts            # Contact management hooks
│   │   ├── useCampaigns.ts           # Campaign management hooks
│   │   ├── useAgents.ts              # Agent management hooks
│   │   └── useDashboard.ts           # Dashboard hooks
│   ├── navigation/
│   │   ├── RootNavigator.tsx         # Main navigation
│   │   ├── AuthNavigator.tsx         # Auth stack
│   │   └── MainTabNavigator.tsx      # Main tabs
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx       # ✅ Created
│   │   │   └── RegisterScreen.tsx    # TODO
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx   # TODO
│   │   ├── calls/
│   │   │   ├── CallsScreen.tsx       # TODO
│   │   │   └── CallDetailScreen.tsx  # TODO
│   │   ├── contacts/
│   │   │   ├── ContactsScreen.tsx    # TODO
│   │   │   └── ContactDetailScreen.tsx # TODO
│   │   ├── campaigns/
│   │   │   ├── CampaignsScreen.tsx   # TODO
│   │   │   └── CampaignDetailScreen.tsx # TODO
│   │   └── profile/
│   │       └── ProfileScreen.tsx     # TODO
│   ├── services/
│   │   ├── authService.ts            # ✅ Created
│   │   ├── callService.ts            # ✅ Created
│   │   ├── contactService.ts         # ✅ Created
│   │   ├── campaignService.ts        # ✅ Created
│   │   ├── agentService.ts           # ✅ Created
│   │   ├── dashboardService.ts       # ✅ Created
│   │   └── userService.ts            # ✅ Created
│   ├── stores/
│   │   └── authStore.ts              # ✅ Created
│   ├── types/
│   │   └── index.ts                  # ✅ Created
│   └── utils/
│       └── helpers.ts                # ✅ Created
├── .env                              # ✅ Created
├── .env.example                      # ✅ Created
├── App.tsx                           # TODO: Update
└── package.json                      # ✅ Created

```

## 🎯 Features

### Implemented
- ✅ Authentication (Login/Register)
- ✅ Token management with auto-refresh
- ✅ API client with error handling
- ✅ State management (Zustand)
- ✅ Data fetching (React Query)
- ✅ Type-safe API calls
- ✅ Environment configuration

### TODO
- [ ] Complete all screens
- [ ] Navigation setup
- [ ] Audio player component
- [ ] Call initiation flow
- [ ] Contact CRUD operations
- [ ] Campaign management
- [ ] Pull-to-refresh
- [ ] Infinite scrolling
- [ ] Error boundaries
- [ ] Loading states
- [ ] Empty states
- [ ] Offline support

## 🔑 Key Technologies

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Navigation** - Navigation
- **Zustand** - State management
- **React Query** - Data fetching & caching
- **Axios** - HTTP client
- **Expo AV** - Audio playback
- **AsyncStorage** - Local storage

## 📚 API Integration

All API services are pre-configured and ready to use:

```typescript
// Example: Fetching calls
import { useCalls } from '@/hooks/useCalls';

const { data, isLoading, refetch } = useCalls({ limit: 20 });

// Example: Initiating a call
import { useInitiateCall } from '@/hooks/useCalls';

const { mutate: initiateCall } = useInitiateCall();

initiateCall({
  agent_id: 'agent-123',
  phone_number: '+1234567890',
});
```

## 🐛 Troubleshooting

### "Cannot connect to API"
- Check if backend is running
- Verify ngrok URL is correct
- Ensure devices are on same network (if using local IP)

### "Module not found"
```bash
npm install
```

### "Metro bundler error"
```bash
npm start -- --clear
```

## 📝 Next Implementation Priority

1. **Update App.tsx** with QueryClientProvider
2. **Create RegisterScreen**
3. **Create Navigation files** (RootNavigator, AuthNavigator, MainTabNavigator)
4. **Create DashboardScreen**
5. **Create CallsScreen** with FlatList
6. **Create AudioPlayer component**
7. **Create ContactsScreen**
8. **Create ProfileScreen**

## 🚀 Production Deployment

When ready for production:

1. Update environment configuration
2. Build standalone app:
   ```bash
   eas build --platform all
   ```
3. Submit to app stores:
   ```bash
   eas submit --platform all
   ```

---

**Created by**: GitHub Copilot
**Date**: November 15, 2025
**Version**: 1.0.0
