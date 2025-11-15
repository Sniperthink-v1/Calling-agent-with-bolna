import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { leadIntelligenceService, LeadGroup, LeadTimelineItem } from '../../services/leadIntelligenceService';
import { COLORS, SIZES } from '../../constants/theme';
import { formatDateTime, getInitials, generateAvatarColor } from '../../utils/helpers';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { LeadsStackParamList } from '../../navigation/LeadsStackNavigator';

type LeadDetailScreenNavigationProp = NativeStackNavigationProp<LeadsStackParamList, 'LeadDetail'>;
type LeadDetailScreenRouteProp = RouteProp<LeadsStackParamList, 'LeadDetail'>;

interface LeadDetailScreenProps {
  navigation: LeadDetailScreenNavigationProp;
  route: LeadDetailScreenRouteProp;
}

export default function LeadDetailScreen({ navigation, route }: LeadDetailScreenProps) {
  const { lead } = route.params;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { data: timeline, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['lead-timeline', lead.id],
    queryFn: () => leadIntelligenceService.getLeadTimeline(lead.id),
  });

  const avatarColor = generateAvatarColor(lead.name);

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    return COLORS.error;
  };

  const getLeadTagColor = (tag?: string) => {
    if (tag?.toLowerCase().includes('hot')) return COLORS.error;
    if (tag?.toLowerCase().includes('warm')) return COLORS.warning;
    return COLORS.info;
  };

  // Convert score (1-3) to percentage (0-100)
  const normalizeScore = (score: number | undefined): number => {
    if (score === undefined || score === 0) return 0;
    // Backend uses 1-3 scale, convert to percentage
    return (score / 3) * 100;
  };

  // Convert duration string "03:11" to seconds for display
  const parseDuration = (duration: string): string => {
    if (!duration) return '0s';
    const parts = duration.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (mins > 0) return `${mins}m ${secs}s`;
      return `${secs}s`;
    }
    return duration;
  };

  const handleOpenLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const toggleTimelineItem = (callId: string) => {
    setExpandedItem(expandedItem === callId ? null : callId);
  };

  const renderTimelineItem = (item: LeadTimelineItem, index: number) => {
    const isExpanded = expandedItem === item.id;
    
    // Calculate average score from intent, engagement, fit
    const avgScore = (item.intentScore + item.engagementScore + item.fitScore) / 3;
    const normalizedScore = normalizeScore(avgScore);
    const scoreColor = getScoreColor(normalizedScore);
    const tagColor = getLeadTagColor(item.status);

    return (
      <View key={item.id} style={styles.timelineItem}>
        {/* Timeline connector */}
        {index > 0 && <View style={styles.timelineConnector} />}
        
        {/* Timeline dot */}
        <View style={[styles.timelineDot, { backgroundColor: scoreColor }]}>
          <Ionicons name="call" size={12} color="#fff" />
        </View>

        <TouchableOpacity
          style={styles.timelineCard}
          activeOpacity={0.7}
          onPress={() => toggleTimelineItem(item.id)}
        >
          {/* Header */}
          <View style={styles.timelineHeader}>
            <View style={styles.timelineHeaderLeft}>
              <Text style={styles.timelineDate}>{formatDateTime(item.interactionDate)}</Text>
              <Text style={styles.timelineAgent}>with {item.interactionAgent}</Text>
            </View>
            <View style={styles.timelineHeaderRight}>
              <View style={[styles.scoreChip, { backgroundColor: `${scoreColor}15` }]}>
                <Text style={[styles.scoreChipText, { color: scoreColor }]}>
                  {Math.round(normalizedScore)}%
                </Text>
              </View>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={COLORS.textSecondary} 
              />
            </View>
          </View>

          {/* Summary when collapsed */}
          {!isExpanded && (
            <View style={styles.timelineSummary}>
              {item.status && (
                <View style={[styles.tagBadge, { backgroundColor: `${tagColor}20` }]}>
                  <Text style={[styles.tagText, { color: tagColor }]}>
                    {item.status}
                  </Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.durationText}>
                  {parseDuration(item.duration)}
                </Text>
              </View>
              {item.smartNotification && (
                <View style={styles.notificationChip}>
                  <Ionicons name="notifications" size={12} color={COLORS.success} />
                  <Text style={styles.notificationText}>{item.smartNotification}</Text>
                </View>
              )}
            </View>
          )}

          {/* Expanded details */}
          {isExpanded && (
            <View style={styles.timelineDetails}>
              {/* Scores */}
              <View style={styles.scoresRow}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Intent</Text>
                  <Text style={[styles.scoreValue, { color: COLORS.primary }]}>
                    {item.intentLevel}
                  </Text>
                  <Text style={styles.scoreSubtext}>{Math.round(normalizeScore(item.intentScore))}%</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Engagement</Text>
                  <Text style={[styles.scoreValue, { color: COLORS.success }]}>
                    {item.engagementLevel}
                  </Text>
                  <Text style={styles.scoreSubtext}>{Math.round(normalizeScore(item.engagementScore))}%</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Fit</Text>
                  <Text style={[styles.scoreValue, { color: COLORS.info }]}>
                    {item.fitAlignment}
                  </Text>
                  <Text style={styles.scoreSubtext}>{Math.round(normalizeScore(item.fitScore))}%</Text>
                </View>
              </View>

              {/* Additional Metrics */}
              <View style={styles.additionalMetricsRow}>
                {item.timelineUrgency && (
                  <View style={styles.metricChipSmall}>
                    <Ionicons name="timer-outline" size={14} color={COLORS.warning} />
                    <Text style={styles.metricChipText}>Urgency: {item.timelineUrgency}</Text>
                  </View>
                )}
                {item.budgetConstraint && (
                  <View style={styles.metricChipSmall}>
                    <Ionicons name="cash-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.metricChipText}>Budget: {item.budgetConstraint}</Text>
                  </View>
                )}
              </View>

              {/* Lead Tag */}
              {item.status && (
                <View style={styles.detailRow}>
                  <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.tagBadge, { backgroundColor: `${tagColor}20` }]}>
                    <Text style={[styles.tagText, { color: tagColor }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              )}

              {/* Smart Notification */}
              {item.smartNotification && (
                <View style={styles.detailRow}>
                  <Ionicons name="notifications" size={16} color={COLORS.success} />
                  <Text style={styles.detailLabel}>Alert:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.success, fontWeight: '600' }]}>
                    {item.smartNotification}
                  </Text>
                </View>
              )}

              {/* Demo Booking */}
              {item.demoBookDatetime && (
                <View style={styles.demoBooking}>
                  <Ionicons name="calendar" size={16} color={COLORS.success} />
                  <Text style={styles.detailLabel}>Demo Booked:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.success }]}>
                    {formatDateTime(item.demoBookDatetime)}
                  </Text>
                </View>
              )}

              {/* Call Details */}
              <View style={styles.callDetailsSection}>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>{parseDuration(item.duration)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="swap-horizontal-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailLabel}>Direction:</Text>
                  <Text style={styles.detailValue}>{item.callDirection}</Text>
                </View>
                {item.hangupBy && (
                  <View style={styles.detailRow}>
                    <Ionicons name="phone-portrait-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailLabel}>Ended by:</Text>
                    <Text style={styles.detailValue}>{item.hangupBy}</Text>
                  </View>
                )}
                {item.hangupReason && (
                  <View style={styles.detailRow}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailLabel}>Reason:</Text>
                    <Text style={styles.detailValue}>{item.hangupReason}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        {/* Lead Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{getInitials(lead.name)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{lead.name}</Text>
            <Text style={styles.phone}>{lead.phone}</Text>
            {lead.email && (
              <View style={styles.metaRow}>
                <Ionicons name="mail-outline" size={14} />
                <Text style={styles.email}>
                  {lead.email}
                </Text>
              </View>
            )}
            {lead.company && (
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={14} />
                <Text style={styles.company}>
                  {lead.company}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.currentStatus}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Intent</Text>
              <Text style={[styles.statusValue, { color: COLORS.primary }]}>
                {lead.recentIntentLevel || 'N/A'}
              </Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Engagement</Text>
              <Text style={[styles.statusValue, { color: COLORS.success }]}>
                {lead.recentEngagementLevel || 'N/A'}
              </Text>
            </View>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Fit</Text>
              <Text style={[styles.statusValue, { color: COLORS.info }]}>
                {lead.recentFitAlignment || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Budget & Urgency */}
          {(lead.recentBudgetConstraint || lead.recentTimelineUrgency) && (
            <View style={styles.additionalInfo}>
              {lead.recentBudgetConstraint && (
                <View style={styles.infoChip}>
                  <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>Budget: {lead.recentBudgetConstraint}</Text>
                </View>
              )}
              {lead.recentTimelineUrgency && (
                <View style={styles.infoChip}>
                  <Ionicons name="timer-outline" size={16} color={COLORS.warning} />
                  <Text style={styles.infoText}>Urgency: {lead.recentTimelineUrgency}</Text>
                </View>
              )}
            </View>
          )}

          {/* Demo Scheduled */}
          {lead.demoScheduled && (
            <View style={styles.demoScheduled}>
              <Ionicons name="calendar" size={20} color={COLORS.success} />
              <View style={styles.demoInfo}>
                <Text style={styles.demoLabel}>Demo Scheduled</Text>
                <Text style={styles.demoDate}>{formatDateTime(lead.demoScheduled)}</Text>
                {lead.meetingLink && (
                  <TouchableOpacity onPress={() => handleOpenLink(lead.meetingLink!)} style={styles.metaRow}>
                    <Ionicons name="link-outline" size={12} color={COLORS.info} />
                    <Text style={styles.meetingLink} numberOfLines={1}>
                      {lead.meetingLink}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>
            Interaction Timeline ({timeline?.length || 0})
          </Text>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : timeline && timeline.length > 0 ? (
            <View style={styles.timeline}>
              {timeline.map((item, index) => renderTimelineItem(item, index))}
            </View>
          ) : (
            <View style={styles.emptyTimeline}>
              <Ionicons name="time-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No interaction history</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    padding: SIZES.paddingLG,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  phone: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  email: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  company: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  currentStatus: {
    padding: SIZES.paddingLG,
    backgroundColor: COLORS.card,
    marginTop: SIZES.paddingSM,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.paddingMD,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: SIZES.paddingSM,
  },
  statusCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  additionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SIZES.paddingMD,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SIZES.radiusMD,
    gap: 6,
  },
  infoText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  demoScheduled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}10`,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    marginTop: SIZES.paddingMD,
    gap: 12,
  },
  demoInfo: {
    flex: 1,
  },
  demoLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 2,
  },
  demoDate: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  meetingLink: {
    fontSize: SIZES.xs,
    color: COLORS.info,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  timelineSection: {
    padding: SIZES.paddingLG,
  },
  timeline: {
    marginTop: SIZES.paddingSM,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: SIZES.paddingLG,
  },
  timelineConnector: {
    position: 'absolute',
    left: 15,
    top: -SIZES.paddingLG,
    width: 2,
    height: SIZES.paddingLG,
    backgroundColor: COLORS.border,
  },
  timelineDot: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineCard: {
    marginLeft: 48,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  timelineHeaderLeft: {
    flex: 1,
  },
  timelineDate: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  timelineAgent: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  timelineHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
  },
  scoreChipText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  timelineSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  notificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}10`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
    gap: 4,
  },
  notificationText: {
    fontSize: SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
  },
  tagText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  durationText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  timelineDetails: {
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusSM,
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
    fontSize: SIZES.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  scoreSubtext: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  additionalMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SIZES.paddingMD,
  },
  metricChipSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSM,
    gap: 4,
  },
  metricChipText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  demoBooking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${COLORS.success}10`,
    padding: SIZES.paddingSM,
    borderRadius: SIZES.radiusSM,
    marginBottom: SIZES.paddingSM,
  },
  callDetailsSection: {
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SIZES.paddingSM,
  },
  detailLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  reasoningSection: {
    backgroundColor: `${COLORS.primary}05`,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    marginBottom: SIZES.paddingSM,
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reasoningTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reasoningText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  loader: {
    marginVertical: SIZES.paddingXL,
  },
  emptyTimeline: {
    alignItems: 'center',
    padding: SIZES.paddingXL,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginTop: SIZES.paddingSM,
  },
});
