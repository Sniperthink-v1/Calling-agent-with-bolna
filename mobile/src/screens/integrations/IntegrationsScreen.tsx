import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { integrationService } from '../../services/integrationService';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  connected: boolean;
  category: 'crm' | 'communication' | 'analytics' | 'storage';
}

export default function IntegrationsScreen() {
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | undefined>();

  // Load initial status
  useEffect(() => {
    loadGoogleCalendarStatus();
  }, []);

  const loadGoogleCalendarStatus = async () => {
    try {
      setLoading(true);
      const status = await integrationService.getGoogleCalendarStatus();
      setIsConnected(status.connected);
      setConnectedEmail(status.email);
    } catch (error) {
      console.error('Failed to load Google Calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const authUrl = await integrationService.connectGoogleCalendar();
      
      Alert.alert(
        'Connect Google Calendar',
        'You will be redirected to Google to authorize access to your calendar.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
          {
            text: 'Continue',
            onPress: async () => {
              try {
                const supported = await Linking.canOpenURL(authUrl);
                if (supported) {
                  await Linking.openURL(authUrl);
                  // Reload status after user returns (they need to manually refresh)
                  Alert.alert(
                    'Authorization Started',
                    'After authorizing with Google, pull down to refresh this screen to see your connection status.',
                    [{ text: 'OK', onPress: () => setLoading(false) }]
                  );
                } else {
                  Alert.alert('Error', 'Cannot open authorization URL');
                  setLoading(false);
                }
              } catch (err) {
                console.error('Error opening URL:', err);
                Alert.alert('Error', 'Failed to open authorization page');
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      Alert.alert('Error', 'Failed to initiate Google Calendar connection');
      setLoading(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    Alert.alert(
      'Disconnect Google Calendar',
      'Are you sure you want to disconnect Google Calendar? Scheduled meetings will no longer sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await integrationService.disconnectGoogleCalendar();
              setIsConnected(false);
              setConnectedEmail(undefined);
              Alert.alert('Success', 'Google Calendar disconnected successfully');
            } catch (error) {
              console.error('Failed to disconnect Google Calendar:', error);
              Alert.alert('Error', 'Failed to disconnect Google Calendar');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleIntegration = () => {
    if (!isConnected) {
      handleConnectGoogleCalendar();
    } else {
      handleDisconnectGoogleCalendar();
    }
  };

  const integrations = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: isConnected && connectedEmail 
        ? `Connected as ${connectedEmail}`
        : 'Schedule and manage meetings with leads automatically',
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      color: '#4285F4',
      connected: isConnected,
      category: 'communication' as const,
    },
  ];

  const IntegrationCard = ({ integration }: { integration: Integration }) => (
    <View style={styles.integrationCard}>
      <View style={styles.integrationHeader}>
        <View
          style={[
            styles.integrationIcon,
            { backgroundColor: `${integration.color}20` },
          ]}
        >
          <Ionicons name={integration.icon} size={28} color={integration.color} />
        </View>
        <View style={styles.integrationInfo}>
          <Text style={styles.integrationName}>{integration.name}</Text>
          <Text style={styles.integrationDescription}>
            {integration.description}
          </Text>
        </View>
      </View>

      <View style={styles.integrationFooter}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: integration.connected
                  ? COLORS.success
                  : COLORS.textLight,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: integration.connected
                  ? COLORS.success
                  : COLORS.textSecondary,
              },
            ]}
          >
            {integration.connected ? 'Connected' : 'Not Connected'}
          </Text>
        </View>
        <Switch
          value={integration.connected}
          onValueChange={handleToggleIntegration}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor="#fff"
          disabled={loading}
        />
      </View>

      {integration.connected && (
        <TouchableOpacity style={styles.configureButton}>
          <Ionicons name="settings-outline" size={18} color={COLORS.primary} />
          <Text style={styles.configureText}>Configure Settings</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const categories = [
    { key: 'communication', label: 'Communication', icon: 'chatbubbles-outline' },
  ];

  if (loading && !isConnected) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading integrations...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadGoogleCalendarStatus}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.content}>
        {/* Header Info */}
        <View style={styles.headerCard}>
          <Ionicons name="git-network-outline" size={32} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Integrations</Text>
          <Text style={styles.headerDescription}>
            Connect your favorite tools and services to enhance your workflow
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {integrations.filter((i) => i.connected).length}
            </Text>
            <Text style={styles.statLabel}>Connected</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{integrations.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        {/* Categories */}
        {categories.map((category) => {
          const categoryIntegrations = integrations.filter(
            (i) => i.category === category.key
          );

          if (categoryIntegrations.length === 0) return null;

          return (
            <View key={category.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={category.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.sectionTitle}>{category.label}</Text>
              </View>
              {categoryIntegrations.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.paddingLG,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SIZES.paddingXL,
    alignItems: 'center',
    marginBottom: SIZES.paddingLG,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SIZES.paddingSM,
  },
  headerDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.paddingSM,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SIZES.paddingMD,
    marginBottom: SIZES.paddingXL,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.paddingMD,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: SIZES.paddingXL,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SIZES.paddingMD,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  integrationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  integrationHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SIZES.paddingMD,
  },
  integrationIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  integrationDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  integrationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 8,
  },
  configureText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
});
