import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { leadIntelligenceService, LeadGroup } from '../../services/leadIntelligenceService';
import { COLORS, SIZES } from '../../constants/theme';
import { formatDateTime, getInitials, generateAvatarColor } from '../../utils/helpers';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LeadsStackParamList } from '../../navigation/LeadsStackNavigator';

type LeadsScreenNavigationProp = NativeStackNavigationProp<LeadsStackParamList, 'LeadsList'>;

interface LeadsScreenProps {
  navigation: LeadsScreenNavigationProp;
}

export default function LeadsScreen({ navigation }: LeadsScreenProps) {
  const [page, setPage] = useState(0);
  const [allLeads, setAllLeads] = useState<LeadGroup[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['leads', page],
    queryFn: () => leadIntelligenceService.getLeadIntelligence({
      limit,
      offset: page * limit,
    }),
  });

  // Update allLeads when new data arrives
  React.useEffect(() => {
    if (data) {
      if (page === 0) {
        setAllLeads(data);
      } else {
        setAllLeads((prev: LeadGroup[]) => [...prev, ...data]);
      }
      setHasMore(data.length === limit);
    }
  }, [data]);

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev: number) => prev + 1);
    }
  };

  const handleRefresh = () => {
    setPage(0);
    setAllLeads([]);
    refetch();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    return COLORS.error;
  };

  const getStatusBadge = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      Hot: { label: 'Hot', color: COLORS.error, icon: 'flame' },
      Warm: { label: 'Warm', color: COLORS.warning, icon: 'partly-sunny' },
      Cold: { label: 'Cold', color: COLORS.info, icon: 'snow' },
      busy: { label: 'Busy', color: COLORS.textSecondary, icon: 'time' },
    };
    return statusMap[status || 'Cold'] || { label: status || 'N/A', color: COLORS.textSecondary, icon: 'help-circle' };
  };

  const getScoreInfo = (item: LeadGroup) => {
    // Calculate score based on engagement, intent, fit levels
    const levelToScore: Record<string, number> = {
      'High': 90,
      'Medium': 70,
      'Low': 40,
    };
    
    const intentScore = levelToScore[item.recentIntentLevel || 'Low'] || 40;
    const engagementScore = levelToScore[item.recentEngagementLevel || 'Low'] || 40;
    const fitScore = levelToScore[item.recentFitAlignment || 'Low'] || 40;
    
    const avgScore = (intentScore + engagementScore + fitScore) / 3;
    
    return {
      avg: avgScore,
      highest: Math.max(intentScore, engagementScore, fitScore),
    };
  };

  const renderLeadCard = ({ item }: { item: LeadGroup }) => {
    const avatarColor = generateAvatarColor(item.name);
    const badge = getStatusBadge(item.recentLeadTag);
    const scores = getScoreInfo(item);
    const scoreColor = getScoreColor(scores.avg);

    return (
      <TouchableOpacity 
        style={styles.leadCard} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('LeadDetail', { lead: item })}
      >
        <View style={styles.cardHeader}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>

          {/* Lead Info */}
          <View style={styles.leadInfo}>
            <Text style={styles.leadName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.phoneNumber}>{item.phone}</Text>
            {item.email && (
              <View style={styles.metaRow}>
                <Ionicons name="mail-outline" size={12} />
                <Text style={styles.email} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            )}
            {item.company && (
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={12} />
                <Text style={styles.company} numberOfLines={1}>
                  {item.company}
                </Text>
              </View>
            )}
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: `${badge.color}20` }]}>
            <Ionicons name={badge.icon as any} size={14} color={badge.color} />
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Analytics Row */}
        <View style={styles.analyticsRow}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Intent</Text>
            <Text style={[styles.analyticsValue, { color: COLORS.primary }]}>
              {item.recentIntentLevel || 'N/A'}
            </Text>
          </View>
          <View style={styles.analyticsDivider} />
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Engagement</Text>
            <Text style={[styles.analyticsValue, { color: COLORS.success }]}>
              {item.recentEngagementLevel || 'N/A'}
            </Text>
          </View>
          <View style={styles.analyticsDivider} />
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Fit</Text>
            <Text style={[styles.analyticsValue, { color: COLORS.info }]}>
              {item.recentFitAlignment || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Budget & Urgency Row */}
        {(item.recentBudgetConstraint || item.recentTimelineUrgency) && (
          <View style={styles.additionalMetrics}>
            {item.recentBudgetConstraint && (
              <View style={styles.metricChip}>
                <Ionicons name="cash-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metricText}>Budget: {item.recentBudgetConstraint}</Text>
              </View>
            )}
            {item.recentTimelineUrgency && (
              <View style={styles.metricChip}>
                <Ionicons name="timer-outline" size={14} color={COLORS.warning} />
                <Text style={styles.metricText}>Urgency: {item.recentTimelineUrgency}</Text>
              </View>
            )}
          </View>
        )}

        {/* Interactions & Agents */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.interactions} calls</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.interactedAgents.length} agents</Text>
          </View>
        </View>

        {/* Demo Scheduled */}
        {item.demoScheduled && (
          <View style={styles.demoSection}>
            <Ionicons name="calendar" size={16} color={COLORS.success} />
            <Text style={styles.demoText}>
              Demo: {formatDateTime(item.demoScheduled)}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.footerText}>Last: {formatDateTime(item.lastContact)}</Text>
          </View>
          {item.leadType && (
            <View style={[styles.typeBadge, { 
              backgroundColor: item.leadType === 'inbound' ? `${COLORS.info}15` : `${COLORS.success}15` 
            }]}>
              <Ionicons 
                name={item.leadType === 'inbound' ? 'arrow-down' : 'arrow-up'} 
                size={10} 
                color={item.leadType === 'inbound' ? COLORS.info : COLORS.success} 
              />
              <Text style={[styles.typeText, { 
                color: item.leadType === 'inbound' ? COLORS.info : COLORS.success 
              }]}>
                {item.leadType}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bulb-outline" size={64} color={COLORS.textLight} />
      <Text style={styles.emptyText}>No leads yet</Text>
      <Text style={styles.emptySubtext}>Lead intelligence will appear here after calls</Text>
    </View>
  );

  if (isLoading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={allLeads}
        renderItem={renderLeadCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetching && page > 0 ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 16 }} />
          ) : null
        }
        refreshControl={
          <RefreshControl 
            refreshing={isFetching && page === 0} 
            onRefresh={handleRefresh} 
            tintColor={COLORS.primary} 
          />
        }
      />
    </View>
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
  listContent: {
    padding: SIZES.paddingMD,
  },
  leadCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  avatarText: {
    color: '#fff',
    fontSize: SIZES.lg,
    fontWeight: 'bold',
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  email: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  company: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
    gap: 4,
  },
  statusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  analyticsRow: {
    flexDirection: 'row',
    paddingVertical: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  analyticsValue: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  analyticsDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  metaRow: {
    flexDirection: 'row',
    paddingTop: SIZES.paddingSM,
    gap: 16,
  },
  additionalMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SIZES.paddingSM,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
    gap: 4,
  },
  metricText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  demoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: `${COLORS.success}10`,
    borderRadius: SIZES.radiusSM,
    marginTop: SIZES.paddingSM,
  },
  demoText: {
    fontSize: SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SIZES.paddingSM,
    marginBottom: SIZES.paddingSM,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.paddingSM,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  typeText: {
    fontSize: SIZES.xs - 1,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.paddingMD,
  },
  emptySubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingSM,
  },
});
