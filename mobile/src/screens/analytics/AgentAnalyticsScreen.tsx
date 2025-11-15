import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analyticsService';
import { agentService } from '../../services/agentService';
import { callService } from '../../services/callService';
import { COLORS, SIZES } from '../../constants/theme';
import { formatNumber, formatDuration } from '../../utils/helpers';
import type { Agent, Call } from '../../types';

export default function AgentAnalyticsScreen() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date range: last 30 days
  const dateRange = useMemo(() => ({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: new Date().toISOString(),
  }), []);

  // Fetch agents
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentService.getAgents(),
  });

  // Fetch calls for all agents
  const { data: callsData, isLoading: loadingCalls, refetch: refetchCalls } = useQuery({
    queryKey: ['calls-for-analytics'],
    queryFn: () => callService.getCalls({ 
      limit: 1000,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    }),
  });

  // Fetch KPIs for overview
  const { data: overviewKPIs, isLoading: loadingKPIs, refetch: refetchKPIs } = useQuery({
    queryKey: ['call-analytics-kpis', dateRange],
    queryFn: () => analyticsService.getCallAnalyticsKPIs(dateRange),
  });

  // Fetch KPIs for selected agent
  const { data: agentKPIs } = useQuery({
    queryKey: ['call-analytics-kpis', selectedAgent, dateRange],
    queryFn: () => selectedAgent 
      ? analyticsService.getCallAnalyticsKPIs({ ...dateRange, agentId: selectedAgent })
      : Promise.resolve(null),
    enabled: !!selectedAgent,
  });

  // Fetch lead quality distribution for selected agent
  const { data: leadQuality } = useQuery({
    queryKey: ['lead-quality', selectedAgent, dateRange],
    queryFn: () => selectedAgent
      ? analyticsService.getLeadQualityDistribution({ ...dateRange, agentId: selectedAgent })
      : Promise.resolve([]),
    enabled: !!selectedAgent,
  });

  // Calculate agent statistics from calls
  const agentStats = useMemo(() => {
    if (!agents || !callsData?.data) return [];

    return agents.map(agent => {
      const agentCalls = callsData.data.filter(call => call.agent_id === agent.id);
      const completedCalls = agentCalls.filter(call => call.status === 'completed');
      
      const totalCalls = agentCalls.length;
      const successRate = totalCalls > 0 
        ? Math.round((completedCalls.length / totalCalls) * 100) 
        : 0;
      
      const avgDuration = completedCalls.length > 0
        ? Math.round(completedCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / completedCalls.length)
        : 0;

      return {
        id: agent.id,
        name: agent.name,
        totalCalls,
        successRate,
        avgDuration,
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls); // Sort by total calls descending
  }, [agents, callsData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCalls(), refetchKPIs()]);
    setRefreshing(false);
  };

  const AgentCard = ({
    agent,
  }: {
    agent: {
      id: string;
      name: string;
      totalCalls: number;
      successRate: number;
      avgDuration: number;
    };
  }) => (
    <TouchableOpacity
      style={[
        styles.agentCard,
        selectedAgent === agent.id && styles.selectedAgentCard,
      ]}
      activeOpacity={0.7}
      onPress={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
    >
      <View style={styles.agentHeader}>
        <View style={styles.agentAvatar}>
          <Ionicons name="person" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentStats}>
            {formatNumber(agent.totalCalls)} total calls
          </Text>
        </View>
        <Ionicons
          name={selectedAgent === agent.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </View>

      {selectedAgent === agent.id && (
        <View style={styles.agentDetails}>
          {/* Show real lead quality data if available */}
          {leadQuality && leadQuality.length > 0 ? (
            <View style={styles.metricRow}>
              {leadQuality.map((quality) => (
                <View key={quality.quality_category} style={styles.metric}>
                  <Text style={styles.metricLabel}>{quality.quality_category} Leads</Text>
                  <Text style={[styles.metricValue, { 
                    color: quality.quality_category === 'Hot' ? COLORS.error 
                      : quality.quality_category === 'Warm' ? COLORS.warning 
                      : COLORS.info 
                  }]}>
                    {String(quality.count || 0)}
                  </Text>
                  <Text style={styles.metricPercentage}>
                    {(quality.percentage || 0).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.metricRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Success Rate</Text>
                  <Text style={[styles.metricValue, { color: COLORS.success }]}>
                    {agent.successRate}%
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Avg Duration</Text>
                  <Text style={styles.metricValue}>
                    {formatDuration(agent.avgDuration)}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Show agent-specific KPIs if available */}
          {agentKPIs && (
            <View style={styles.kpiSection}>
              <Text style={styles.kpiSectionTitle}>Key Performance Indicators</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {agentKPIs.kpiData.slice(0, 4).map((kpi) => (
                  <View key={kpi.title} style={styles.kpiCard}>
                    <Text style={styles.kpiTitle}>{kpi.title}</Text>
                    <Text style={styles.kpiValue}>{kpi.value}</Text>
                    <View style={styles.kpiChange}>
                      <Ionicons 
                        name={kpi.positive ? 'trending-up' : 'trending-down'} 
                        size={14} 
                        color={kpi.positive ? COLORS.success : COLORS.error} 
                      />
                      <Text style={[styles.kpiChangeText, { 
                        color: kpi.positive ? COLORS.success : COLORS.error 
                      }]}>
                        {kpi.changeValue}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.viewDetailsButton}>
            <Text style={styles.viewDetailsText}>View Detailed Analytics</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const OverviewMetric = ({
    icon,
    label,
    value,
    color,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    color: string;
  }) => (
    <View style={styles.overviewCard}>
      <View style={[styles.overviewIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={[styles.overviewValue, { color }]}>{value}</Text>
    </View>
  );

  const isLoading = loadingAgents || loadingCalls || loadingKPIs;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
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
        {/* Overview Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.overviewGrid}>
            <OverviewMetric
              icon="people"
              label="Total Agents"
              value={agentStats?.length.toString() || '0'}
              color={COLORS.primary}
            />
            <OverviewMetric
              icon="call"
              label="Total Calls"
              value={formatNumber(
                agentStats?.reduce((sum, a) => sum + a.totalCalls, 0) || 0
              )}
              color={COLORS.success}
            />
            <OverviewMetric
              icon="trending-up"
              label="Avg Success"
              value={`${Math.round(
                (agentStats?.reduce((sum, a) => sum + a.successRate, 0) || 0) /
                  (agentStats?.length || 1)
              )}%`}
              color={COLORS.warning}
            />
            <OverviewMetric
              icon="time"
              label="Avg Duration"
              value={formatDuration(
                Math.round(
                  (agentStats?.reduce((sum, a) => sum + a.avgDuration, 0) || 0) /
                    (agentStats?.length || 1)
                )
              )}
              color={COLORS.info}
            />
          </View>
        </View>

        {/* Agent List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agent Performance</Text>
          {agentStats.length > 0 ? (
            agentStats.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No agent data available</Text>
            </View>
          )}
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
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.paddingMD,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.paddingMD,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overviewIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  overviewLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
  },
  agentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedAgentCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  agentStats: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  agentDetails: {
    marginTop: SIZES.paddingMD,
    paddingTop: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metricRow: {
    flexDirection: 'row',
    gap: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  metric: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SIZES.paddingSM,
  },
  viewDetailsText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingText: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  emptyState: {
    padding: SIZES.paddingXL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  metricPercentage: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  kpiSection: {
    marginTop: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM,
  },
  kpiSectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.paddingSM,
  },
  kpiCard: {
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
    borderRadius: 8,
    marginRight: SIZES.paddingSM,
    minWidth: 120,
  },
  kpiTitle: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  kpiChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiChangeText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
});
