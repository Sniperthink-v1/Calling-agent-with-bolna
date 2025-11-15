import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analyticsService';
import { COLORS, SIZES } from '../../constants/theme';
import { formatNumber } from '../../utils/helpers';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const [dateRange] = useState({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  const { data: metrics, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['analytics-metrics', dateRange],
    queryFn: () => analyticsService.getDashboardMetrics(dateRange),
  });

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary', dateRange],
    queryFn: () => analyticsService.getSummary(dateRange),
  });

  const { data: distribution } = useQuery({
    queryKey: ['score-distribution'],
    queryFn: () => analyticsService.getScoreDistribution(),
  });

  const renderMetricCard = (
    label: string,
    value: string | number,
    icon: keyof typeof Ionicons.glyphMap,
    color: string
  ) => (
    <View style={[styles.metricCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    </View>
  );

  const renderLeadDistribution = () => {
    if (!summary) return null;

    const total = summary.hot_leads + summary.warm_leads + summary.cold_leads;
    if (total === 0) return null;

    const hotPercent = (summary.hot_leads / total) * 100;
    const warmPercent = (summary.warm_leads / total) * 100;
    const coldPercent = (summary.cold_leads / total) * 100;

    return (
      <View style={styles.distributionCard}>
        <Text style={styles.sectionTitle}>Lead Distribution</Text>
        
        {/* Bar Chart */}
        <View style={styles.barChart}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${hotPercent}%`, backgroundColor: COLORS.error }]} />
          </View>
        </View>
        <View style={styles.barChart}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${warmPercent}%`, backgroundColor: COLORS.warning }]} />
          </View>
        </View>
        <View style={styles.barChart}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${coldPercent}%`, backgroundColor: COLORS.info }]} />
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
            <Text style={styles.legendText}>Hot: {summary.hot_leads} ({hotPercent.toFixed(1)}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.legendText}>Warm: {summary.warm_leads} ({warmPercent.toFixed(1)}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.info }]} />
            <Text style={styles.legendText}>Cold: {summary.cold_leads} ({coldPercent.toFixed(1)}%)</Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && !metrics) {
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
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLORS.primary} />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.headerTitle}>Analytics Overview</Text>
        <Text style={styles.headerSubtitle}>Last 30 days</Text>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Calls',
            formatNumber(metrics?.total_calls || 0),
            'call',
            COLORS.primary
          )}
          {renderMetricCard(
            'Completed',
            formatNumber(metrics?.completed_calls || 0),
            'checkmark-circle',
            COLORS.success
          )}
          {renderMetricCard(
            'Avg Duration',
            `${(metrics?.avg_duration_minutes || 0).toFixed(1)}m`,
            'time',
            COLORS.info
          )}
          {renderMetricCard(
            'Credits Used',
            formatNumber(metrics?.total_credits_used || 0),
            'wallet',
            COLORS.warning
          )}
        </View>

        {/* Lead Score Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Insights</Text>
          <View style={styles.metricsRow}>
            {renderMetricCard(
              'Avg Score',
              (summary?.avg_total_score || 0).toFixed(1),
              'trending-up',
              COLORS.primary
            )}
            {renderMetricCard(
              'Avg Intent',
              (summary?.avg_intent_score || 0).toFixed(1),
              'bulb',
              COLORS.success
            )}
            {renderMetricCard(
              'Avg Engagement',
              (summary?.avg_engagement_score || 0).toFixed(1),
              'heart',
              COLORS.error
            )}
          </View>
        </View>

        {/* Lead Distribution */}
        {renderLeadDistribution()}

        {/* Score Distribution */}
        {distribution && distribution.length > 0 && (
          <View style={styles.distributionCard}>
            <Text style={styles.sectionTitle}>Score Distribution</Text>
            {distribution.map((item, index) => (
              <View key={index} style={styles.distributionItem}>
                <Text style={styles.distributionLabel}>{item.score_range}</Text>
                <View style={styles.distributionBar}>
                  <View
                    style={[
                      styles.distributionFill,
                      {
                        width: `${(item.count / Math.max(...distribution.map(d => d.count))) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.distributionValue}>{item.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA Performance */}
        {summary && (
          <View style={styles.ctaCard}>
            <Text style={styles.sectionTitle}>CTA Performance</Text>
            <View style={styles.ctaContent}>
              <Ionicons name="hand-left" size={48} color={COLORS.primary} />
              <Text style={styles.ctaValue}>{summary.cta_demo_clicks}</Text>
              <Text style={styles.ctaLabel}>Demo Clicks</Text>
            </View>
          </View>
        )}
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
  },
  content: {
    padding: SIZES.paddingMD,
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingLG,
  },
  metricsGrid: {
    gap: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  metricsRow: {
    gap: SIZES.paddingMD,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  section: {
    marginBottom: SIZES.paddingLG,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.paddingMD,
  },
  distributionCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barChart: {
    marginBottom: SIZES.paddingMD,
  },
  bar: {
    height: 32,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: SIZES.radiusSM,
  },
  legend: {
    marginTop: SIZES.paddingSM,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SIZES.paddingSM,
  },
  legendText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  distributionLabel: {
    width: 80,
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  distributionBar: {
    flex: 1,
    height: 24,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    overflow: 'hidden',
    marginHorizontal: SIZES.paddingSM,
  },
  distributionFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusSM,
  },
  distributionValue: {
    width: 40,
    textAlign: 'right',
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  ctaCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingLG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaContent: {
    alignItems: 'center',
  },
  ctaValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginVertical: SIZES.paddingSM,
  },
  ctaLabel: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
});
