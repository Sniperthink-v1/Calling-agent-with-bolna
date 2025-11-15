import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
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
        <RefreshControl 
          refreshing={isLoading} 
          onRefresh={refetch}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Credit Balance - Prominent Display */}
      <View style={styles.creditCard}>
        <Text style={styles.creditLabel}>Available Credits</Text>
        <Text style={styles.creditValue}>{formatNumber(data?.creditBalance || 0)}</Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
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
                {kpi.delta >= 0 ? '↑ +' : '↓ '}
                {Math.abs(kpi.delta)}%
              </Text>
            )}
            {kpi.compare && (
              <Text style={styles.kpiCompare}>{kpi.compare}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Agents Status */}
      <View style={styles.agentCard}>
        <View style={styles.agentHeader}>
          <Text style={styles.agentTitle}>Agents Status</Text>
        </View>
        <View style={styles.agentStats}>
          <View style={styles.agentStat}>
            <Text style={styles.agentStatValue}>{data?.agents.active || 0}</Text>
            <Text style={styles.agentStatLabel}>Active</Text>
          </View>
          <View style={styles.agentDivider} />
          <View style={styles.agentStat}>
            <Text style={styles.agentStatValue}>{data?.agents.total || 0}</Text>
            <Text style={styles.agentStatLabel}>Total</Text>
          </View>
        </View>
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
    backgroundColor: COLORS.background,
  },
  creditCard: {
    backgroundColor: COLORS.primary,
    padding: SIZES.paddingLG,
    borderRadius: SIZES.radiusLG,
    marginBottom: SIZES.paddingLG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  creditLabel: {
    fontSize: SIZES.md,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '500',
  },
  creditValue: {
    fontSize: SIZES.xxxl + 8,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: SIZES.paddingSM,
  },
  kpiGrid: {
    marginBottom: SIZES.paddingMD,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: SIZES.xxl + 2,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SIZES.paddingXS,
  },
  kpiDelta: {
    fontSize: SIZES.md,
    fontWeight: '600',
    marginTop: SIZES.paddingXS,
  },
  kpiCompare: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  agentCard: {
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
  agentHeader: {
    marginBottom: SIZES.paddingMD,
  },
  agentTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  agentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  agentStat: {
    alignItems: 'center',
    flex: 1,
  },
  agentStatValue: {
    fontSize: SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.paddingXS,
  },
  agentStatLabel: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  agentDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
});
