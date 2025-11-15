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
import { useCalls } from '../../hooks/useCalls';
import { COLORS, SIZES } from '../../constants/theme';
import { formatDateTime, formatDuration, getInitials, generateAvatarColor } from '../../utils/helpers';
import type { Call } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CallsStackParamList } from '../../navigation/CallsStackNavigator';

type CallsScreenNavigationProp = NativeStackNavigationProp<CallsStackParamList, 'CallsList'>;

interface CallsScreenProps {
  navigation: CallsScreenNavigationProp;
}

export default function CallsScreen({ navigation }: CallsScreenProps) {
  const [page, setPage] = useState(0);
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;
  
  const { data, isLoading, refetch, isFetching } = useCalls({
    limit,
    offset: page * limit,
    sortBy: 'created_at',
    sortOrder: 'DESC',
  });

  // Update allCalls when new data arrives
  React.useEffect(() => {
    if (data?.data) {
      if (page === 0) {
        setAllCalls(data.data);
      } else {
        setAllCalls(prev => [...prev, ...data.data]);
      }
      setHasMore(data.data.length === limit);
    }
  }, [data]);

  const handleLoadMore = () => {
    if (!isFetching && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const handleRefresh = () => {
    setPage(0);
    setAllCalls([]);
    refetch();
  };

  const renderCallCard = ({ item }: { item: Call }) => {
    const avatarColor = generateAvatarColor(item.contactName || 'Unknown');
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.callCard} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CallDetail', { call: item })}
      >
        <View style={styles.cardHeader}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>
              {getInitials(item.contactName || 'Unknown')}
            </Text>
          </View>

          {/* Call Info */}
          <View style={styles.callInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.contactName || 'Unknown Contact'}
            </Text>
            <Text style={styles.phoneNumber}>{item.phone_number}</Text>
          </View>

          {/* Call Type Icon */}
          <Ionicons
            name={item.lead_type === 'inbound' ? 'call-outline' : 'call-sharp'}
            size={20}
            color={item.lead_type === 'inbound' ? COLORS.info : COLORS.success}
          />
        </View>

        <View style={styles.cardFooter}>
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>

          {/* Duration */}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>
              {formatDuration(item.duration_seconds)}
            </Text>
          </View>

          {/* Date */}
          <Text style={styles.metaText}>
            {formatDateTime(item.created_at)}
          </Text>
        </View>

        {/* Hangup Info */}
        {item.hangup_by && (
          <View style={styles.hangupInfo}>
            <Ionicons 
              name="phone-portrait-outline" 
              size={14} 
              color={COLORS.textSecondary} 
            />
            <Text style={styles.hangupText}>
              Ended by: {item.hangup_by === 'agent' ? item.agentName || 'Agent' : 
                        item.hangup_by === 'contact' ? item.contactName || 'Contact' : 
                        item.hangup_by}
            </Text>
            {item.hangup_reason && (
              <>
                <Text style={styles.hangupSeparator}>•</Text>
                <Text style={styles.hangupReason}>{item.hangup_reason}</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return COLORS.success;
      case 'in_progress':
        return COLORS.info;
      case 'failed':
        return COLORS.error;
      case 'cancelled':
        return COLORS.textSecondary;
      default:
        return COLORS.textLight;
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="call-outline" size={64} color={COLORS.textLight} />
      <Text style={styles.emptyText}>No calls yet</Text>
      <Text style={styles.emptySubtext}>Your call history will appear here</Text>
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
        data={allCalls}
        renderItem={renderCallCard}
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
  callCard: {
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
  callInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SIZES.paddingSM,
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
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  hangupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  hangupText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  hangupSeparator: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  hangupReason: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    fontStyle: 'italic',
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
});
