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
import { useCampaigns } from '../../hooks/useCampaigns';
import { COLORS, SIZES } from '../../constants/theme';
import { formatDateTime, formatNumber } from '../../utils/helpers';
import type { Campaign } from '../../types';

export default function CampaignsScreen() {
  const [page, setPage] = useState(0);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;
  
  const { data, isLoading, refetch, isFetching } = useCampaigns({
    limit,
    offset: page * limit,
  });

  // Update allCampaigns when new data arrives
  React.useEffect(() => {
    if (data?.data) {
      const campaigns = data.data;
      const total = data.total || 0;
      
      if (page === 0) {
        setAllCampaigns(campaigns);
      } else {
        setAllCampaigns((prev: Campaign[]) => [...prev, ...campaigns]);
      }
      
      // Check if there's more data: current offset + fetched items < total
      const currentTotal = (page * limit) + campaigns.length;
      setHasMore(currentTotal < total);
    }
  }, [data, page, limit]);

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev: number) => prev + 1);
    }
  };

  const handleRefresh = () => {
    setPage(0);
    setAllCampaigns([]);
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return COLORS.success;
      case 'paused':
        return COLORS.warning;
      case 'completed':
        return COLORS.info;
      case 'scheduled':
        return COLORS.primary;
      case 'cancelled':
        return COLORS.textSecondary;
      default:
        return COLORS.textLight;
    }
  };

  const renderCampaignCard = ({ item }: { item: Campaign }) => {
    const statusColor = getStatusColor(item.status);
    const totalCalls = item.stats?.total || 0;
    const completedCalls = item.stats?.completed || 0;
    const progress = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

    return (
      <TouchableOpacity style={styles.campaignCard} activeOpacity={0.7}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.campaignName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.campaignDate}>
              {formatDateTime(item.created_at)}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        {totalCalls > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {completedCalls}/{totalCalls} calls ({Math.round(progress)}%)
            </Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatNumber(item.stats?.total || 0)}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatNumber(item.stats?.completed || 0)}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatNumber(item.stats?.failed || 0)}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        {/* Agent Info */}
        {item.agent_name && (
          <View style={styles.agentInfo}>
            <Ionicons name="person-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.agentText}>{item.agent_name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="megaphone-outline" size={64} color={COLORS.textLight} />
      <Text style={styles.emptyText}>No campaigns yet</Text>
      <Text style={styles.emptySubtext}>Create your first campaign to get started</Text>
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
        data={allCampaigns}
        renderItem={renderCampaignCard}
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

      {/* Add Campaign FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    paddingBottom: 80,
  },
  campaignCard: {
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingMD,
  },
  headerLeft: {
    flex: 1,
    marginRight: SIZES.paddingSM,
  },
  campaignName: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  campaignDate: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: SIZES.paddingMD,
  },
  progressBar: {
    height: 6,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
  },
  agentText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.paddingXL * 2,
  },
  emptyText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.paddingLG,
  },
  emptySubtext: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingSM,
  },
  fab: {
    position: 'absolute',
    right: SIZES.paddingLG,
    bottom: SIZES.paddingLG,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
