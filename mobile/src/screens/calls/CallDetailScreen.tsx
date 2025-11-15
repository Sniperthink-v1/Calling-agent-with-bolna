import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SIZES } from '../../constants/theme';
import { Call } from '../../types';
import { callService } from '../../services/callService';
import { Audio } from 'expo-av';

interface CallDetailScreenProps {
  route: {
    params: {
      call: Call;
    };
  };
  navigation: any;
}

export default function CallDetailScreen({ route, navigation }: CallDetailScreenProps) {
  const { call } = route.params;
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const { data: transcript, isLoading: isLoadingTranscript } = useQuery({
    queryKey: ['transcript', call.transcript_id],
    queryFn: () => callService.getTranscript(call.id),
    enabled: showTranscript && !!call.has_transcript && !!call.transcript_id,
  });

  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playRecording = async () => {
    console.log('🎵 Playing recording', call.recording_url);
    if (!call.recording_url) {
      Alert.alert('Error', 'No recording available for this call');
      return;
    }

    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: call.recording_url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing recording:', error);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const normalizeScore = (score: number | undefined | null) => {
    if (!score) return 0;
    // If score is already 0-100, return as is. If it's 0-10 or 0-14, normalize to 100 scale
    if (score <= 14) return Math.round((score / 14) * 100);
    if (score <= 100) return Math.round(score);
    return Math.round(score);
  };

  const getScoreColor = (score: number | undefined | null) => {
    const normalized = normalizeScore(score);
    if (normalized >= 80) return COLORS.success;
    if (normalized >= 60) return COLORS.warning;
    return COLORS.error;
  };

  const getLevelColor = (level: string | undefined | null) => {
    if (!level) return COLORS.textSecondary;
    const levelLower = level.toLowerCase();
    if (levelLower === 'high') return COLORS.success;
    if (levelLower === 'medium') return COLORS.warning;
    return COLORS.info;
  };

  const formatDateTime = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderAnalyticsCard = (
    title: string,
    value: string | number | undefined | null,
    color: string,
    icon: string
  ) => (
    <View style={styles.analyticsCard}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.analyticsContent}>
        <Text style={styles.analyticsLabel}>{title}</Text>
        <Text style={[styles.analyticsValue, { color }]}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  const renderScoreCard = (
    title: string,
    score: number | undefined | null,
    icon: string
  ) => {
    const color = getScoreColor(score);
    const normalized = normalizeScore(score);
    return renderAnalyticsCard(title, score ? `${normalized}/100` : 'N/A', color, icon);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.contactName}>{call.contact_name || 'Unknown'}</Text>
              <Text style={styles.phoneNumber}>{call.phone_number}</Text>
              {call.contact_email && (
                <View style={styles.metaRow}>
                  <Ionicons name="mail-outline" size={12} />
                  <Text style={styles.email}>
                    {call.contact_email}
                  </Text>
                </View>
              )}
              {call.contact_company && (
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={12} />
                  <Text style={styles.company}>
                    {call.contact_company}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Call Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { 
            backgroundColor: call.status === 'completed' ? `${COLORS.success}15` : `${COLORS.error}15` 
          }]}>
            <Text style={[styles.statusText, { 
              color: call.status === 'completed' ? COLORS.success : COLORS.error 
            }]}>
              {call.status}
            </Text>
          </View>
          {call.lead_status_tag && (
            <View style={[styles.leadBadge, { 
              backgroundColor: call.lead_status_tag === 'Hot' ? `${COLORS.error}15` : 
                             call.lead_status_tag === 'Warm' ? `${COLORS.warning}15` : `${COLORS.info}15`
            }]}>
              <Ionicons 
                name={call.lead_status_tag === 'Hot' ? 'flame' : 
                      call.lead_status_tag === 'Warm' ? 'partly-sunny' : 'snow'} 
                size={14} 
                color={call.lead_status_tag === 'Hot' ? COLORS.error : 
                       call.lead_status_tag === 'Warm' ? COLORS.warning : COLORS.info} 
              />
              <Text style={[styles.leadText, { 
                color: call.lead_status_tag === 'Hot' ? COLORS.error : 
                       call.lead_status_tag === 'Warm' ? COLORS.warning : COLORS.info 
              }]}>
                {call.lead_status_tag}
              </Text>
            </View>
          )}
        </View>

        {/* Agent Info */}
        <View style={styles.agentRow}>
          <Ionicons name="headset-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.agentText}>Agent: {call.agent_name || 'Unknown'}</Text>
        </View>
      </View>

      {/* Lead Score */}
      {call.total_score !== undefined && call.total_score !== null && (
        <View style={styles.totalScoreCard}>
          <Text style={styles.totalScoreLabel}>Total Lead Score</Text>
          <Text style={[styles.totalScoreValue, { color: getScoreColor(call.total_score) }]}>
            {`${normalizeScore(call.total_score)}/100`}
          </Text>
        </View>
      )}

      {/* Analytics Scores */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analytics Scores</Text>
        <View style={styles.analyticsGrid}>
          {renderScoreCard('Intent Score', call.intent_score, 'bulb')}
          {renderScoreCard('Engagement Score', call.engagement_score, 'heart')}
        </View>
      </View>

      {/* Lead Levels */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lead Analysis</Text>
        <View style={styles.analyticsGrid}>
          {renderAnalyticsCard('Intent Level', call.intent_level, getLevelColor(call.intent_level), 'trending-up')}
          {renderAnalyticsCard('Engagement Health', call.engagement_health, getLevelColor(call.engagement_health), 'fitness')}
          {renderAnalyticsCard('Fit Alignment', call.fit_alignment, getLevelColor(call.fit_alignment), 'checkmark-circle')}
          {renderAnalyticsCard('Urgency Level', call.urgency_level, getLevelColor(call.urgency_level), 'time')}
          {renderAnalyticsCard('Budget Constraint', call.budget_constraint, getLevelColor(call.budget_constraint), 'cash')}
        </View>
      </View>

      {/* CTA Interactions */}
      {call.cta_interactions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CTA Interactions</Text>
          <View style={styles.ctaCard}>
            {(() => {
              let ctaData = call.cta_interactions;
              
              // Parse if it's a JSON string
              if (typeof ctaData === 'string') {
                try {
                  ctaData = JSON.parse(ctaData);
                } catch (e) {
                  return <Text style={styles.ctaText}>{ctaData}</Text>;
                }
              }
              
              // Display as key-value pairs if it's an object
              if (typeof ctaData === 'object' && ctaData !== null) {
                return Object.entries(ctaData).map(([key, value]: [string, any], idx) => (
                  <View key={idx} style={styles.ctaItem}>
                    <Text style={styles.ctaKey}>{key}:</Text>
                    <Text style={styles.ctaValue}>{String(value)}</Text>
                  </View>
                ));
              }
              
              return <Text style={styles.ctaText}>{String(ctaData)}</Text>;
            })()}
          </View>
        </View>
      )}

      {/* Call Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Timeline</Text>
        <View style={styles.timelineCard}>
          <View style={styles.timelineItem}>
            <Ionicons name="call-outline" size={16} color={COLORS.primary} />
            <Text style={styles.timelineLabel}>Ringing Started:</Text>
            <Text style={styles.timelineValue}>{formatDateTime(call.ringing_started_at)}</Text>
          </View>
          <View style={styles.timelineItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.timelineLabel}>Call Answered:</Text>
            <Text style={styles.timelineValue}>{formatDateTime(call.call_answered_at)}</Text>
          </View>
          <View style={styles.timelineItem}>
            <Ionicons name="close-circle" size={16} color={COLORS.error} />
            <Text style={styles.timelineLabel}>Call Ended:</Text>
            <Text style={styles.timelineValue}>{formatDateTime(call.call_disconnected_at)}</Text>
          </View>
          {call.duration_minutes !== undefined && call.duration_minutes !== null && (
            <View style={styles.timelineItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.info} />
              <Text style={styles.timelineLabel}>Duration:</Text>
              <Text style={styles.timelineValue}>{String(call.duration_minutes)} min</Text>
            </View>
          )}
        </View>
      </View>

      {/* Hangup Details */}
      {call.hangup_by && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hangup Details</Text>
          <View style={styles.hangupCard}>
            <View style={styles.hangupItem}>
              <Text style={styles.hangupLabel}>Hung up by:</Text>
              <Text style={styles.hangupValue}>{call.hangup_by}</Text>
            </View>
            {call.hangup_reason && (
              <View style={styles.hangupItem}>
                <Text style={styles.hangupLabel}>Reason:</Text>
                <Text style={styles.hangupValue}>{call.hangup_reason}</Text>
              </View>
            )}
            {call.hangup_provider_code && (
              <View style={styles.hangupItem}>
                <Text style={styles.hangupLabel}>Provider Code:</Text>
                <Text style={styles.hangupValue}>{call.hangup_provider_code}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {call.has_transcript && call.transcript_id && (
          <TouchableOpacity
            style={[styles.actionButton, styles.transcriptButton]}
            onPress={() => setShowTranscript(!showTranscript)}
          >
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>
              {showTranscript ? 'Hide' : 'View'} Transcript
            </Text>
          </TouchableOpacity>
        )}
        {call.recording_url && (
          <TouchableOpacity
            style={[styles.actionButton, styles.recordingButton]}
            onPress={playRecording}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
            <Text style={styles.recordingButtonText}>
              {isPlaying ? 'Pause' : 'Play'} Recording
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Transcript */}
      {showTranscript && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          {isLoadingTranscript ? (
            <View style={styles.loadingTranscript}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading transcript...</Text>
            </View>
          ) : transcript ? (
            <View style={styles.transcriptCard}>
              {(() => {
                // Parse transcript content - it comes as a single string with speaker labels
                const content = transcript.content || '';
                const lines = content.split('\n').filter((line: string) => line.trim());
                
                return lines.map((line: string, idx: number) => {
                  const match = line.match(/^(assistant|user):\s*(.+)$/);
                  if (match) {
                    const [, role, text] = match;
                    return (
                      <View key={idx} style={styles.transcriptMessage}>
                        <Text style={styles.transcriptRole}>{role}:</Text>
                        <Text style={styles.transcriptContent}>{text.trim()}</Text>
                      </View>
                    );
                  }
                  return null;
                }).filter(Boolean);
              })()}
            </View>
          ) : (
            <Text style={styles.noTranscript}>Transcript not available</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    backgroundColor: COLORS.card,
    padding: SIZES.paddingLG,
    margin: SIZES.paddingMD,
    borderRadius: SIZES.radiusLG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  contactName: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  phoneNumber: {
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
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SIZES.paddingSM,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radiusMD,
  },
  statusText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  leadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radiusMD,
    gap: 4,
  },
  leadText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agentText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  totalScoreCard: {
    backgroundColor: COLORS.card,
    padding: SIZES.paddingLG,
    marginHorizontal: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
    borderRadius: SIZES.radiusLG,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalScoreLabel: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  totalScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.paddingMD,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.paddingSM,
  },
  analyticsCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingSM,
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  analyticsValue: {
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  ctaCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
  },
  ctaText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  ctaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ctaKey: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  ctaValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  timelineCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  timelineLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  timelineValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  hangupCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
  },
  hangupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  hangupLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  hangupValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SIZES.paddingMD,
    marginHorizontal: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    gap: 8,
  },
  transcriptButton: {
    backgroundColor: `${COLORS.primary}15`,
  },
  actionButtonText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  recordingButton: {
    backgroundColor: COLORS.primary,
  },
  recordingButtonText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
  loadingTranscript: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.paddingLG,
    gap: 8,
  },
  loadingText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  transcriptCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
  },
  transcriptMessage: {
    marginBottom: SIZES.paddingMD,
    paddingBottom: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transcriptRole: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  transcriptContent: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  noTranscript: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SIZES.paddingLG,
  },
});
