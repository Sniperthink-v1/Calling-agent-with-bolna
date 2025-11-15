import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import type { NotificationPreferences } from '../../services/notificationService';
import { COLORS, SIZES } from '../../constants/theme';

export default function NotificationSettingsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch preferences
  const { data: preferences, isLoading, refetch } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationService.getPreferences(),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) =>
      notificationService.updatePreferences(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update notification preferences');
      console.error('Update preferences error:', error);
    },
  });

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const SettingRow = ({
    icon,
    title,
    description,
    value,
    onValueChange,
    loading,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    loading?: boolean;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
          <Ionicons name={icon} size={22} color={COLORS.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor="#fff"
        />
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Failed to load preferences</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.content}>
        {/* General Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.card}>
            <SettingRow
              icon="mail-outline"
              title="Credits Added Emails"
              description="Email notifications when credits are added"
              value={preferences.credits_added_emails}
              onValueChange={(value) => handleToggle('credits_added_emails', value)}
              loading={updateMutation.isPending}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="alert-circle-outline"
              title="Low Credit Alerts"
              description="Get notified when credits are running low"
              value={preferences.low_credit_alerts}
              onValueChange={(value) => handleToggle('low_credit_alerts', value)}
              loading={updateMutation.isPending}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="mail-outline"
              title="Email Verification Reminders"
              description="Reminders to verify your email address"
              value={preferences.email_verification_reminders}
              onValueChange={(value) => handleToggle('email_verification_reminders', value)}
              loading={updateMutation.isPending}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="megaphone-outline"
              title="Marketing Emails"
              description="Receive updates about new features and offers"
              value={preferences.marketing_emails}
              onValueChange={(value) => handleToggle('marketing_emails', value)}
              loading={updateMutation.isPending}
            />
          </View>
        </View>

        {/* Activity Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.card}>
            <SettingRow
              icon="mail-outline"
              title="Campaign Summary Emails"
              description="Receive campaign progress and results"
              value={preferences.campaign_summary_emails}
              onValueChange={(value) => handleToggle('campaign_summary_emails', value)}
              loading={updateMutation.isPending}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="calendar-outline"
              title="Meeting Booked Notifications"
              description="Notifications when meetings are scheduled"
              value={preferences.meeting_booked_notifications}
              onValueChange={(value) => handleToggle('meeting_booked_notifications', value)}
              loading={updateMutation.isPending}
            />
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            You can customize when and how you receive notifications. Changes are saved automatically.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  emptyText: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  content: {
    padding: SIZES.paddingLG,
  },
  section: {
    marginBottom: SIZES.paddingXL,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.paddingMD,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingMD,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 64,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.info}15`,
    padding: SIZES.paddingMD,
    borderRadius: 12,
    gap: 12,
    marginTop: SIZES.paddingMD,
  },
  infoText: {
    flex: 1,
    fontSize: SIZES.xs,
    color: COLORS.info,
    lineHeight: 18,
  },
});
