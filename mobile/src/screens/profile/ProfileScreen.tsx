import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { SIZES, getThemeColors } from '../../constants/theme';
import { formatNumber } from '../../utils/helpers';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout, setUser } = useAuthStore();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch latest user profile
  const { data: latestUser, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userService.getProfile(),
    initialData: user || undefined,
  });

  // Fetch latest credits
  const { data: latestCredits, refetch: refetchCredits } = useQuery({
    queryKey: ['user-credits'],
    queryFn: () => userService.getCredits(),
    initialData: user?.credits || 0,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchCredits()]);
    
    // Update auth store with latest data
    if (latestUser) {
      setUser({ ...latestUser, credits: latestCredits || 0 });
    }
    
    setRefreshing(false);
  };

  const handleThemeChange = () => {
    Alert.alert(
      'Select Theme',
      'Choose your preferred theme',
      [
        {
          text: 'Light',
          onPress: () => setThemeMode('light'),
        },
        {
          text: 'Dark',
          onPress: () => setThemeMode('dark'),
        },
        {
          text: 'Auto (System)',
          onPress: () => setThemeMode('auto'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const getThemeModeLabel = () => {
    if (themeMode === 'auto') return 'Auto (System)';
    return themeMode === 'dark' ? 'Dark' : 'Light';
  };

  const displayUser = latestUser || user;
  const displayCredits = latestCredits || user?.credits || 0;

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await authService.logout();
              logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    textColor,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showChevron?: boolean;
    textColor?: string;
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color={textColor || colors.text} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuItemText, { color: textColor || colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  if (!displayUser) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const styles = createStyles(colors);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={[styles.avatarLarge, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarTextLarge}>
            {displayUser.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>{displayUser.name}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{displayUser.email}</Text>
        {displayUser.company && (
          <Text style={[styles.userCompany, { color: colors.textSecondary }]}>{displayUser.company}</Text>
        )}
        {displayUser.phone && (
          <View style={styles.phoneContainer}>
            <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.userPhone, { color: colors.textSecondary }]}>{displayUser.phone}</Text>
          </View>
        )}
      </View>

      {/* Credit Balance Card */}
      <View style={[styles.creditCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.creditHeader}>
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
          <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>Available Credits</Text>
        </View>
        <Text style={[styles.creditValue, { color: colors.primary }]}>{formatNumber(displayCredits)}</Text>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="lock-closed-outline"
            title="Change Password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="card-outline"
            title="Billing & Credits"
            onPress={() => navigation.navigate('Billing')}
          />
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="language-outline"
            title="Language"
            onPress={() => Alert.alert('Coming Soon', 'Language selection will be available soon')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon={isDark ? 'moon' : 'moon-outline'}
            title="Theme"
            subtitle={getThemeModeLabel()}
            onPress={handleThemeChange}
          />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            onPress={() => Alert.alert('Coming Soon', 'Help center will be available soon')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="document-text-outline"
            title="Terms & Privacy"
            onPress={() => Alert.alert('Coming Soon', 'Terms and privacy will be available soon')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="information-circle-outline"
            title="About"
            showChevron={false}
            onPress={() => Alert.alert('Calling Agent', 'Version 1.0.0\n\n© 2024 Calling Agent')}
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.error }]}
        onPress={handleLogout}
        disabled={isLoggingOut}
        activeOpacity={0.8}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textLight }]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof getThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingXL,
    borderBottomLeftRadius: SIZES.radiusXL,
    borderBottomRightRadius: SIZES.radiusXL,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: SIZES.xxxl,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: SIZES.md,
  },
  userCompany: {
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  userPhone: {
    fontSize: SIZES.sm,
  },
  creditCard: {
    margin: SIZES.paddingLG,
    padding: SIZES.paddingLG,
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  creditLabel: {
    fontSize: SIZES.md,
    marginLeft: SIZES.paddingSM,
    fontWeight: '500',
  },
  creditValue: {
    fontSize: SIZES.xxxl,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: SIZES.paddingLG,
    paddingHorizontal: SIZES.paddingLG,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: SIZES.paddingSM,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingMD,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuItemText: {
    fontSize: SIZES.md,
    fontWeight: '500',
  },
  menuSubtext: {
    fontSize: SIZES.xs,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: SIZES.paddingMD + 22 + SIZES.paddingMD,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.paddingLG,
    marginBottom: SIZES.paddingLG,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusLG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: SIZES.md,
    fontWeight: '600',
    marginLeft: SIZES.paddingSM,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingXL,
  },
  footerText: {
    fontSize: SIZES.sm,
  },
});
