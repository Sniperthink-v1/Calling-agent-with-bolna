import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { COLORS, SIZES } from '../constants/theme';
import { formatNumber } from '../utils/helpers';

export default function CustomDrawerContent(props: any) {
  const { user } = useAuthStore();

  return (
    <DrawerContentScrollView {...props} style={styles.drawer}>
      {/* Profile Header */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        
        {/* Credit Balance */}
        <View style={styles.creditBadge}>
          <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
          <Text style={styles.creditText}>
            {formatNumber(user?.credits || 0)} Credits
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Drawer Items */}
      <DrawerItemList {...props} />

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileSection: {
    padding: SIZES.paddingLG,
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingSM,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderRadius: 20,
    marginTop: SIZES.paddingSM,
    gap: 6,
  },
  creditText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.paddingSM,
  },
  footer: {
    padding: SIZES.paddingLG,
    alignItems: 'center',
    marginTop: 'auto',
  },
  versionText: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
});
