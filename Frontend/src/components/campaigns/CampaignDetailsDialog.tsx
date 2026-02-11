import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { authenticatedFetch } from '@/utils/auth';
import { formatDateInUserTimezone } from '@/utils/timezone';
import type { Campaign, CampaignAnalytics } from '@/types/api';

interface CampaignDetailsDialogProps {
  campaign: Campaign;
  onClose: () => void;
}

interface ExtendedCampaignAnalytics extends CampaignAnalytics {
  total_call_attempts?: number;
  total_credits_used?: number;
  queued?: number;
  in_progress?: number;
  success_rate?: number;
  average_call_duration?: number;
  pending_calls?: number;
}

interface CampaignAnalyticsResponse {
  success?: boolean;
  analytics?: ExtendedCampaignAnalytics;
}

interface RawCampaignCall {
  id?: string;
  contactId?: string;
  contact_id?: string;
  contactName?: string;
  contact_name?: string;
  callerName?: string;
  caller_name?: string;
  phoneNumber?: string;
  phone_number?: string;
  agentName?: string;
  agent_name?: string;
  callLifecycleStatus?: string;
  call_lifecycle_status?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  durationSeconds?: number | string;
  duration_seconds?: number | string;
  callDurationSecs?: number | string;
}

interface CampaignCallsResponse {
  success?: boolean;
  data?: RawCampaignCall[];
  calls?: RawCampaignCall[];
  pagination?: {
    total?: number;
    limit?: number;
    offset?: number;
    hasMore?: boolean;
  };
}

interface CampaignCallLog {
  id: string;
  contactId?: string;
  leadName: string;
  phoneNumber: string;
  agentName: string;
  status: string;
  createdAt: string;
  durationSeconds: number;
}

interface GroupedCampaignCallLog {
  key: string;
  leadName: string;
  phoneNumber: string;
  latestAttempt: CampaignCallLog;
  attempts: CampaignCallLog[];
  retryCount: number;
}

type CallOutcomeFilter = 'all' | 'successful' | 'failed';

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatStatusLabel = (status: string): string => {
  const normalizedStatus = status.trim().toLowerCase();
  switch (normalizedStatus) {
    case 'in-progress':
      return 'In Progress';
    case 'call-disconnected':
      return 'Disconnected';
    case 'no-answer':
      return 'No Answer';
    default:
      return normalizedStatus
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
};

const getStatusBadgeClass = (status: string): string => {
  const normalizedStatus = status.toLowerCase();
  if (['completed', 'in-progress', 'ringing'].includes(normalizedStatus)) {
    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
  }
  if (['busy', 'no-answer', 'failed', 'call-disconnected', 'cancelled'].includes(normalizedStatus)) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
  }
  return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
};

const isSuccessfulCallStatus = (status: string): boolean => {
  const normalizedStatus = status.trim().toLowerCase();
  return ['completed', 'contacted', 'successful', 'answered', 'connected'].includes(normalizedStatus);
};

const isFailedCallStatus = (status: string): boolean => {
  const normalizedStatus = status.trim().toLowerCase();
  return [
    'busy',
    'no-answer',
    'failed',
    'call-disconnected',
    'cancelled',
    'voicemail',
    'unreachable',
    'invalid-number',
  ].includes(normalizedStatus);
};

const normalizeCampaignCall = (call: RawCampaignCall): CampaignCallLog => {
  const leadName = (
    call.contactName ||
    call.contact_name ||
    call.callerName ||
    call.caller_name ||
    'Unknown Contact'
  ).trim();
  const phoneNumber = String(call.phoneNumber || call.phone_number || 'Unknown Number');
  const status = String(call.callLifecycleStatus || call.call_lifecycle_status || call.status || 'unknown');
  const createdAt = String(call.createdAt || call.created_at || '');
  const durationSeconds = Math.max(
    0,
    Math.round(
      toNumber(call.durationSeconds ?? call.duration_seconds ?? call.callDurationSecs ?? 0)
    )
  );
  const id = String(call.id || `${phoneNumber}-${createdAt}-${status}`);

  return {
    id,
    contactId: call.contactId || call.contact_id || undefined,
    leadName: leadName || 'Unknown Contact',
    phoneNumber,
    agentName: String(call.agentName || call.agent_name || 'Unknown Agent'),
    status,
    createdAt,
    durationSeconds,
  };
};

const CampaignDetailsDialog: React.FC<CampaignDetailsDialogProps> = ({
  campaign,
  onClose,
}) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [analyticsView, setAnalyticsView] = React.useState<'summary' | 'detailed'>('summary');
  const [expandedLeadRows, setExpandedLeadRows] = React.useState<Record<string, boolean>>({});
  const [callOutcomeFilter, setCallOutcomeFilter] = React.useState<CallOutcomeFilter>('all');
  const logsSectionRef = React.useRef<HTMLDivElement | null>(null);

  // Fetch detailed analytics
  const { data: analyticsResponse, isLoading: isAnalyticsLoading } = useQuery<CampaignAnalyticsResponse>({
    queryKey: ['campaign-analytics', campaign.id],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/campaigns/${campaign.id}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return (await response.json()) as CampaignAnalyticsResponse;
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: Boolean(campaign.id),
  });

  // Fetch call logs for lead-centric grouped view
  const {
    data: campaignCalls = [],
    isLoading: isCallsLoading,
    error: callsError,
  } = useQuery<CampaignCallLog[]>({
    queryKey: ['campaign-call-logs', campaign.id],
    queryFn: async () => {
      const allCalls: CampaignCallLog[] = [];
      const limit = 100;
      let offset = 0;
      let hasMore = true;
      let pageCounter = 0;

      while (hasMore && pageCounter < 25) {
        const response = await authenticatedFetch(
          `/api/calls?campaignId=${encodeURIComponent(campaign.id)}&limit=${limit}&offset=${offset}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch campaign call logs');
        }

        const payload = (await response.json()) as CampaignCallsResponse;
        const batch = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.calls)
            ? payload.calls
            : [];

        allCalls.push(...batch.map(normalizeCampaignCall));

        const pageHasMore = Boolean(payload?.pagination?.hasMore);
        hasMore = pageHasMore && batch.length > 0;
        offset += limit;
        pageCounter += 1;
      }

      const uniqueCalls = new Map<string, CampaignCallLog>();
      allCalls.forEach((call) => {
        uniqueCalls.set(call.id, call);
      });

      return Array.from(uniqueCalls.values());
    },
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    enabled: Boolean(campaign.id),
  });

  // Extract the nested analytics object from the API response
  const analytics = analyticsResponse?.analytics;

  React.useEffect(() => {
    setExpandedLeadRows({});
    setAnalyticsView('summary');
    setCallOutcomeFilter('all');
  }, [campaign.id]);

  // Navigate to call logs with campaign filter
  const handleViewCallLogs = () => {
    // Store campaign ID in sessionStorage so UnifiedCallLogs can read it
    sessionStorage.setItem('filterCampaignId', campaign.id);
    // Open call logs in grouped-by-lead mode for campaign review
    sessionStorage.setItem('callLogsGroupByLead', 'true');
    onClose();
    // Navigate to dashboard with unified logs tab on call channel
    navigate('/dashboard?tab=logs&subtab=call');
  };

  const calculateProgress = () => {
    // Use analytics data for accurate progress (unique contacts handled)
    if (analytics?.progress_percentage !== undefined) {
      return Math.round(analytics.progress_percentage);
    }
    // Fallback to campaign data
    if (campaign.total_contacts === 0) return 0;
    return Math.min(Math.round((campaign.completed_calls / campaign.total_contacts) * 100), 100);
  };

  const calculateSuccessRate = () => {
    if (analytics?.call_connection_rate !== undefined) {
      return Math.round(toNumber(analytics.call_connection_rate));
    }
    if (analytics?.success_rate !== undefined) {
      return Math.round(toNumber(analytics.success_rate));
    }
    if (campaign.completed_calls === 0) return 0;
    return Math.round((campaign.successful_calls / campaign.completed_calls) * 100);
  };

  const formatDuration = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diff = end.getTime() - start.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDurationSeconds = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const progress = calculateProgress();
  const successRate = calculateSuccessRate();
  const queuedCalls = toNumber(analytics?.queued ?? analytics?.pending_calls ?? 0);
  const inProgressCalls = toNumber(analytics?.in_progress ?? 0);
  const attemptedCalls = toNumber(analytics?.attempted_calls ?? 0);
  const contactedCalls = toNumber(analytics?.contacted_calls ?? 0);
  const totalCallAttempts = toNumber(analytics?.total_call_attempts ?? attemptedCalls);
  const totalCreditsUsed = toNumber(analytics?.total_credits_used ?? 0);
  const attemptDistribution = {
    contacted: toNumber(analytics?.attempt_distribution?.contacted ?? 0),
    busy: toNumber(analytics?.attempt_distribution?.busy ?? 0),
    noAnswer: toNumber(analytics?.attempt_distribution?.no_answer ?? 0),
    failed: toNumber(analytics?.attempt_distribution?.failed ?? 0),
    notAttempted: toNumber(analytics?.attempt_distribution?.not_attempted ?? queuedCalls),
  };

  const groupedCallLogs = React.useMemo<GroupedCampaignCallLog[]>(() => {
    const groupedLogs = new Map<string, GroupedCampaignCallLog>();

    campaignCalls.forEach((call) => {
      const normalizedPhone = call.phoneNumber.replace(/\D/g, '');
      const normalizedName = call.leadName.trim().toLowerCase();
      const groupKey = call.contactId || (normalizedPhone ? `phone:${normalizedPhone}` : `name:${normalizedName || 'unknown'}`);
      const existing = groupedLogs.get(groupKey);

      if (existing) {
        existing.attempts.push(call);
        if (existing.leadName === 'Unknown Contact' && call.leadName !== 'Unknown Contact') {
          existing.leadName = call.leadName;
        }
        if (existing.phoneNumber === 'Unknown Number' && call.phoneNumber !== 'Unknown Number') {
          existing.phoneNumber = call.phoneNumber;
        }
      } else {
        groupedLogs.set(groupKey, {
          key: groupKey,
          leadName: call.leadName,
          phoneNumber: call.phoneNumber,
          latestAttempt: call,
          attempts: [call],
          retryCount: 0,
        });
      }
    });

    const parseTimestamp = (value: string): number => {
      if (!value) return 0;
      const timestamp = new Date(value).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    return Array.from(groupedLogs.values())
      .map((group) => {
        const orderedAttempts = [...group.attempts].sort(
          (first, second) => parseTimestamp(first.createdAt) - parseTimestamp(second.createdAt)
        );
        const latestAttempt = orderedAttempts[orderedAttempts.length - 1] || group.latestAttempt;
        return {
          ...group,
          latestAttempt,
          attempts: orderedAttempts,
          retryCount: Math.max(0, orderedAttempts.length - 1),
        };
      })
      .sort(
        (first, second) =>
          parseTimestamp(second.latestAttempt.createdAt) - parseTimestamp(first.latestAttempt.createdAt)
      );
  }, [campaignCalls]);

  const filteredGroupedCallLogs = React.useMemo<GroupedCampaignCallLog[]>(() => {
    if (callOutcomeFilter === 'all') return groupedCallLogs;

    return groupedCallLogs.filter((group) => {
      const status = group.latestAttempt.status;
      if (callOutcomeFilter === 'successful') {
        return isSuccessfulCallStatus(status);
      }
      return isFailedCallStatus(status);
    });
  }, [groupedCallLogs, callOutcomeFilter]);

  const successfulContactCount = React.useMemo(
    () => groupedCallLogs.filter((group) => isSuccessfulCallStatus(group.latestAttempt.status)).length,
    [groupedCallLogs]
  );

  const failedContactCount = React.useMemo(
    () => groupedCallLogs.filter((group) => isFailedCallStatus(group.latestAttempt.status)).length,
    [groupedCallLogs]
  );

  const handleOutcomeCardClick = (filter: Exclude<CallOutcomeFilter, 'all'>) => {
    setExpandedLeadRows({});
    setCallOutcomeFilter((previousFilter) =>
      previousFilter === filter ? 'all' : filter
    );

    window.requestAnimationFrame(() => {
      logsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleLeadRow = (leadKey: string) => {
    setExpandedLeadRows((prevState) => ({
      ...prevState,
      [leadKey]: !prevState[leadKey],
    }));
  };

  const formatCallTimestamp = (value: string): string => {
    if (!value) return 'Unknown time';
    const parsedDate = new Date(value);
    if (!Number.isFinite(parsedDate.getTime())) return 'Unknown time';
    return formatDateInUserTimezone(parsedDate, campaign.campaign_timezone);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{campaign.name}</DialogTitle>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
          </div>
          <DialogDescription>
            Campaign details and analytics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2 invisible-scrollbar">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{analytics?.handled_calls ?? campaign.completed_calls} of {campaign.total_contacts} contacts called</span>
              <span>{Math.max(0, campaign.total_contacts - (analytics?.handled_calls ?? campaign.completed_calls))} remaining</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Phone className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-500">Contacts Handled</span>
              </div>
              <p className="text-2xl font-bold">{analytics?.handled_calls ?? analytics?.completed_calls ?? campaign.completed_calls}</p>
            </div>

            <button
              type="button"
              onClick={() => handleOutcomeCardClick('successful')}
              className={`p-4 rounded-lg text-left transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-green-50 hover:bg-green-100'
              } ${callOutcomeFilter === 'successful' ? 'ring-2 ring-green-500' : ''}`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-500">Successful</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{analytics?.successful_calls ?? campaign.successful_calls}</p>
              <p className="text-xs text-gray-500 mt-1">Click to view successful contacts</p>
            </button>

            <button
              type="button"
              onClick={() => handleOutcomeCardClick('failed')}
              className={`p-4 rounded-lg text-left transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-50 hover:bg-red-100'
              } ${callOutcomeFilter === 'failed' ? 'ring-2 ring-red-500' : ''}`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-500">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{analytics?.failed_calls ?? campaign.failed_calls}</p>
              <p className="text-xs text-gray-500 mt-1">Click to view failed contacts</p>
            </button>

            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-500">Connection Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{successRate}%</p>
            </div>
          </div>

          {/* Campaign Info */}
          <div className={`p-4 rounded-lg space-y-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h3 className="font-semibold">Campaign Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">{formatDateInUserTimezone(campaign.created_at, campaign.campaign_timezone)}</p>
                </div>
              </div>

              {campaign.started_at && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-500">Started</p>
                    <p className="font-medium">{formatDateInUserTimezone(campaign.started_at, campaign.campaign_timezone)}</p>
                  </div>
                </div>
              )}

              {campaign.completed_at && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-500">Completed</p>
                    <p className="font-medium">{formatDateInUserTimezone(campaign.completed_at, campaign.campaign_timezone)}</p>
                  </div>
                </div>
              )}

              {campaign.started_at && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-500">Duration</p>
                    <p className="font-medium">{formatDuration(campaign.started_at, campaign.completed_at)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Information */}
            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              {campaign.start_date && (
                <div>
                  <p className="text-gray-500">Scheduled Start Date</p>
                  <p className="font-medium">{formatDateInUserTimezone(campaign.start_date, campaign.campaign_timezone, { hour: undefined, minute: undefined })}</p>
                </div>
              )}
              {campaign.end_date && (
                <div>
                  <p className="text-gray-500">Scheduled End Date</p>
                  <p className="font-medium">{formatDateInUserTimezone(campaign.end_date, campaign.campaign_timezone, { hour: undefined, minute: undefined })}</p>
                </div>
              )}
              {campaign.first_call_time && (
                <div>
                  <p className="text-gray-500">First Call Time</p>
                  <p className="font-medium">{campaign.first_call_time}</p>
                </div>
              )}
              {campaign.last_call_time && (
                <div>
                  <p className="text-gray-500">Last Call Time</p>
                  <p className="font-medium">{campaign.last_call_time}</p>
                </div>
              )}
              {campaign.campaign_timezone && (
                <div>
                  <p className="text-gray-500">Timezone</p>
                  <p className="font-medium">{campaign.campaign_timezone}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-gray-500">Priority</p>
                <p className="font-medium">Level {campaign.priority}</p>
              </div>
              <div>
                <p className="text-gray-500">Max Concurrent Calls</p>
                <p className="font-medium">{campaign.max_concurrent_calls}</p>
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          {isAnalyticsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading analytics...</p>
            </div>
          ) : analytics ? (
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Detailed Analytics
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={analyticsView === 'summary' ? 'default' : 'outline'}
                    onClick={() => setAnalyticsView('summary')}
                    className="h-8"
                  >
                    Summary
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={analyticsView === 'detailed' ? 'default' : 'outline'}
                    onClick={() => setAnalyticsView('detailed')}
                    className="h-8"
                  >
                    Detailed
                  </Button>
                </div>
              </div>

              {analyticsView === 'summary' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span>Average Call Duration:</span>
                    <span className="font-medium">{formatDurationSeconds(toNumber(analytics?.average_duration_seconds || analytics?.average_call_duration || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queued Calls:</span>
                    <span className="font-medium">{queuedCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In Progress:</span>
                    <span className="font-medium">{inProgressCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Attempted Calls:</span>
                    <span className="font-medium">{attemptedCalls}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex justify-between">
                      <span>Total Call Attempts:</span>
                      <span className="font-medium">{totalCallAttempts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connected Calls:</span>
                      <span className="font-medium">{contactedCalls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connection Success Rate:</span>
                      <span className="font-medium">{successRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Credits Used:</span>
                      <span className="font-medium">{totalCreditsUsed}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="font-medium mb-2">Attempt Distribution</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p className="text-xs text-gray-500">Contacted</p>
                        <p className="font-semibold">{attemptDistribution.contacted}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p className="text-xs text-gray-500">Busy</p>
                        <p className="font-semibold">{attemptDistribution.busy}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p className="text-xs text-gray-500">No Answer</p>
                        <p className="font-semibold">{attemptDistribution.noAnswer}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p className="text-xs text-gray-500">Failed</p>
                        <p className="font-semibold">{attemptDistribution.failed}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p className="text-xs text-gray-500">Not Attempted</p>
                        <p className="font-semibold">{attemptDistribution.notAttempted}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Lead-Centric Logs */}
          <div
            ref={logsSectionRef}
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold">Detailed Call Logs (Grouped by Lead)</h3>
              <div className="flex items-center gap-2">
                {callOutcomeFilter !== 'all' && (
                  <Badge variant="outline" className="capitalize">
                    Filter: {callOutcomeFilter}
                  </Badge>
                )}
                <Badge variant="secondary">
                  {callOutcomeFilter === 'successful'
                    ? `${successfulContactCount} successful contacts`
                    : callOutcomeFilter === 'failed'
                      ? `${failedContactCount} failed contacts`
                      : `${groupedCallLogs.length} total contacts`}
                </Badge>
                {callOutcomeFilter !== 'all' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setCallOutcomeFilter('all')}
                  >
                    Clear filter
                  </Button>
                )}
              </div>
            </div>
            {isCallsLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading campaign call logs...</p>
              </div>
            ) : callsError ? (
              <p className="text-sm text-red-600">
                {callsError instanceof Error ? callsError.message : 'Failed to fetch campaign call logs'}
              </p>
            ) : filteredGroupedCallLogs.length === 0 ? (
              <p className="text-sm text-gray-500">
                {callOutcomeFilter === 'all'
                  ? 'No call logs found for this campaign.'
                  : `No ${callOutcomeFilter} contacts found for this campaign.`}
              </p>
            ) : (
              <div className="space-y-3">
                <div className="hidden md:grid md:grid-cols-12 text-xs font-medium text-gray-500 px-2">
                  <div className="md:col-span-4">Lead</div>
                  <div className="md:col-span-2">Last Status</div>
                  <div className="md:col-span-2">Retry Count</div>
                  <div className="md:col-span-4">Last Attempt</div>
                </div>

                {filteredGroupedCallLogs.map((group) => {
                  const isExpanded = Boolean(expandedLeadRows[group.key]);
                  return (
                    <div
                      key={group.key}
                      className={`rounded-md border ${theme === 'dark' ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-3 py-3 items-center">
                        <button
                          type="button"
                          onClick={() => toggleLeadRow(group.key)}
                          className="md:col-span-4 flex items-start gap-2 text-left hover:opacity-85 transition-opacity"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 mt-0.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mt-0.5 text-gray-500" />
                          )}
                          <div>
                            <p className="font-medium">{group.leadName}</p>
                            <p className="text-xs text-gray-500">{group.phoneNumber}</p>
                          </div>
                        </button>

                        <div className="md:col-span-2">
                          <Badge className={getStatusBadgeClass(group.latestAttempt.status)}>
                            {formatStatusLabel(group.latestAttempt.status)}
                          </Badge>
                        </div>

                        <div className="md:col-span-2">
                          <Badge variant="outline">
                            {group.retryCount} {group.retryCount === 1 ? 'Retry' : 'Retries'}
                          </Badge>
                        </div>

                        <div className="md:col-span-4 text-sm text-gray-500">
                          {formatCallTimestamp(group.latestAttempt.createdAt)}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-2">
                            Attempt History
                          </p>
                          <div className="space-y-2">
                            {group.attempts.map((attempt, attemptIndex) => (
                              <div
                                key={`${attempt.id}-${attemptIndex}`}
                                className={`grid grid-cols-1 md:grid-cols-12 gap-2 text-sm rounded-md p-2 ${
                                  theme === 'dark' ? 'bg-gray-800/70' : 'bg-gray-50'
                                }`}
                              >
                                <div className="md:col-span-3 font-medium">
                                  Attempt {attemptIndex + 1}
                                </div>
                                <div className="md:col-span-3 text-gray-600 dark:text-gray-300">
                                  {formatCallTimestamp(attempt.createdAt)}
                                </div>
                                <div className="md:col-span-2 text-gray-600 dark:text-gray-300">
                                  {formatDurationSeconds(attempt.durationSeconds)}
                                </div>
                                <div className="md:col-span-2 text-gray-600 dark:text-gray-300">
                                  {attempt.agentName}
                                </div>
                                <div className="md:col-span-2">
                                  <Badge className={getStatusBadgeClass(attempt.status)}>
                                    {formatStatusLabel(attempt.status)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* View Call Logs Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleViewCallLogs}
              style={{ backgroundColor: '#1A6262' }}
              className="text-white hover:opacity-90"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Call Logs
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignDetailsDialog;
