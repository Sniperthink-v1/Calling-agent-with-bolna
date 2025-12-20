import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-groups';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Play, Pause, StopCircle, RotateCcw, Trash2, BarChart3 } from 'lucide-react';
import CreateCampaignModal from '@/components/campaigns/CreateCampaignModal.tsx';
import CampaignDetailsDialog from '@/components/campaigns/CampaignDetailsDialog.tsx';
import WhatsAppCampaignDetailsDialog from '@/components/campaigns/WhatsAppCampaignDetailsDialog';
import EmailCampaignDetailsDialog from '@/components/campaigns/EmailCampaignDetailsDialog';
import { authenticatedFetch } from '@/utils/auth';
import { formatDateInUserTimezone } from '@/utils/timezone';
import type { Campaign, CampaignAnalytics } from '@/types/api';

const Campaigns: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedWhatsAppCampaignId, setSelectedWhatsAppCampaignId] = useState<string | null>(null);
  const [selectedEmailCampaignId, setSelectedEmailCampaignId] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<'calling' | 'whatsapp' | 'email'>('calling');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusOptions = useMemo(() => {
    if (sourceFilter === 'whatsapp') {
      return ['all', 'DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'];
    }
    if (sourceFilter === 'email') {
      return ['all', 'draft', 'scheduled', 'in_progress', 'completed', 'cancelled'];
    }
    return ['all', 'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];
  }, [sourceFilter]);

  const formatStatusLabel = (status: string) => {
    if (status === 'all') return 'All';
    return status
      .toLowerCase()
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  };

  // Fetch calling campaigns (internal)
  const { data: callCampaignsData, isLoading: isLoadingCalling } = useQuery({
    queryKey: ['campaigns', 'calling', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await authenticatedFetch(`/api/campaigns?${params.toString()}`);

      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    },
    enabled: sourceFilter === 'calling',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const callCampaigns = useMemo(() => callCampaignsData?.campaigns || [], [callCampaignsData?.campaigns]);

  // Fetch WhatsApp campaigns (proxied)
  const { data: whatsappCampaignsData, isLoading: isLoadingWhatsApp } = useQuery({
    queryKey: ['campaigns', 'whatsapp', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await authenticatedFetch(`/api/whatsapp/campaigns?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch WhatsApp campaigns');
      return response.json();
    },
    enabled: sourceFilter === 'whatsapp',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const whatsappCampaigns = useMemo(() => whatsappCampaignsData?.data || [], [whatsappCampaignsData?.data]);

  // Fetch Email campaigns (internal)
  const { data: emailCampaignsData, isLoading: isLoadingEmail } = useQuery({
    queryKey: ['campaigns', 'email'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/email-campaigns');
      if (!response.ok) throw new Error('Failed to fetch email campaigns');
      return response.json();
    },
    enabled: sourceFilter === 'email',
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const emailCampaigns = useMemo(() => {
    const all = emailCampaignsData?.data || [];
    if (statusFilter === 'all') return all;
    return all.filter((c: any) => c.status === statusFilter);
  }, [emailCampaignsData?.data, statusFilter]);

  // Fetch analytics for all campaigns
  const { data: analyticsData } = useQuery({
    queryKey: ['campaigns-analytics', callCampaigns.map((c: Campaign) => c.id).sort().join(',')],
    queryFn: async () => {
      if (callCampaigns.length === 0) return {};
      
      const analyticsPromises = callCampaigns.map(async (campaign: Campaign) => {
        try {
          const response = await authenticatedFetch(`/api/campaigns/${campaign.id}/analytics`);
          if (!response.ok) return null;
          const data = await response.json();
          return { campaignId: campaign.id, analytics: data.analytics };
        } catch (error) {
          console.error(`Failed to fetch analytics for campaign ${campaign.id}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(analyticsPromises);
      return results.reduce((acc, result) => {
        if (result && result.analytics) {
          acc[result.campaignId] = result.analytics;
        }
        return acc;
      }, {} as Record<string, CampaignAnalytics>);
    },
    enabled: sourceFilter === 'calling' && callCampaigns.length > 0,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Auto-refresh every 60 seconds for live updates
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Start campaign mutation
  const startMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await authenticatedFetch(`/api/campaigns/${campaignId}/start`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-analytics'] });
      toast({
        title: 'Campaign Started',
        description: 'Campaign has been started successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Pause campaign mutation
  const pauseMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await authenticatedFetch(`/api/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed to pause campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-analytics'] });
      toast({
        title: 'Campaign Paused',
        description: 'Campaign has been paused',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Resume campaign mutation
  const resumeMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await authenticatedFetch(`/api/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed to resume campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-analytics'] });
      toast({
        title: 'Campaign Resumed',
        description: 'Campaign has been resumed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel campaign mutation
  const cancelMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await authenticatedFetch(`/api/campaigns/${campaignId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed to cancel campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-analytics'] });
      toast({
        title: 'Campaign Cancelled',
        description: 'Campaign has been cancelled',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await authenticatedFetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete campaign');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-analytics'] });
      toast({
        title: 'Campaign Deleted',
        description: 'Campaign has been deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
      draft: { variant: 'secondary', color: 'text-gray-600' },
      scheduled: { variant: 'outline', color: 'text-blue-600' },
      active: { variant: 'default', color: 'text-green-600' },
      paused: { variant: 'outline', color: 'text-yellow-600' },
      completed: { variant: 'secondary', color: 'text-blue-600' },
      cancelled: { variant: 'destructive', color: 'text-red-600' },
    };
    
    const config = variants[status] || variants.draft;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getWhatsAppStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
      DRAFT: { variant: 'secondary', color: 'text-gray-600' },
      SCHEDULED: { variant: 'outline', color: 'text-blue-600' },
      RUNNING: { variant: 'default', color: 'text-green-600' },
      PAUSED: { variant: 'outline', color: 'text-yellow-600' },
      COMPLETED: { variant: 'secondary', color: 'text-blue-600' },
      FAILED: { variant: 'destructive', color: 'text-red-600' },
      CANCELLED: { variant: 'destructive', color: 'text-red-600' },
    };

    const config = variants[normalized] || variants.DRAFT;

    return (
      <Badge variant={config.variant} className={config.color}>
        {formatStatusLabel(normalized)}
      </Badge>
    );
  };

  const getActionButtons = (campaign: Campaign) => {
    const buttons = [];
    
    if (campaign.status === 'draft' || campaign.status === 'scheduled') {
      buttons.push(
        <Button
          key="start"
          size="sm"
          variant="default"
          onClick={() => startMutation.mutate(campaign.id)}
          disabled={startMutation.isPending}
          style={{ backgroundColor: '#1A6262' }}
        >
          <Play className="w-4 h-4 mr-1" />
          Start
        </Button>
      );
    }
    
    if (campaign.status === 'active') {
      buttons.push(
        <Button
          key="pause"
          size="sm"
          variant="outline"
          onClick={() => pauseMutation.mutate(campaign.id)}
          disabled={pauseMutation.isPending}
        >
          <Pause className="w-4 h-4 mr-1" />
          Pause
        </Button>
      );
    }
    
    if (campaign.status === 'paused') {
      buttons.push(
        <Button
          key="resume"
          size="sm"
          variant="default"
          onClick={() => resumeMutation.mutate(campaign.id)}
          disabled={resumeMutation.isPending}
          style={{ backgroundColor: '#1A6262' }}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Resume
        </Button>
      );
    }
    
    if (['draft', 'scheduled', 'active', 'paused'].includes(campaign.status)) {
      buttons.push(
        <Button
          key="cancel"
          size="sm"
          variant="destructive"
          onClick={() => cancelMutation.mutate(campaign.id)}
          disabled={cancelMutation.isPending}
        >
          <StopCircle className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      );
    }
    
    if (['completed', 'cancelled'].includes(campaign.status)) {
      buttons.push(
        <Button
          key="delete"
          size="sm"
          variant="destructive"
          onClick={() => deleteMutation.mutate(campaign.id)}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      );
    }
    
    buttons.push(
      <Button
        key="details"
        size="sm"
        variant="outline"
        onClick={() => setSelectedCampaign(campaign)}
      >
        <BarChart3 className="w-4 h-4 mr-1" />
        Details
      </Button>
    );
    
    return buttons;
  };

  return (
    <div className={`h-full p-6 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage and monitor your campaigns
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          style={{ backgroundColor: '#1A6262' }}
          className="text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Source</span>
          <div className={`rounded-md border p-1 ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <ToggleGroup
              type="single"
              value={sourceFilter}
              onValueChange={(value) => {
                if (!value) return;
                setSourceFilter(value as any);
                setStatusFilter('all');
                setSelectedCampaign(null);
                setSelectedWhatsAppCampaignId(null);
                setSelectedEmailCampaignId(null);
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="calling" aria-label="Calling campaigns">Calling</ToggleGroupItem>
              <ToggleGroupItem value="whatsapp" aria-label="WhatsApp campaigns">WhatsApp</ToggleGroupItem>
              <ToggleGroupItem value="email" aria-label="Email campaigns">Email</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Status</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[220px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {formatStatusLabel(filter)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Campaign List */}
      <div className={`rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        {(sourceFilter === 'calling' ? isLoadingCalling : sourceFilter === 'whatsapp' ? isLoadingWhatsApp : isLoadingEmail) ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4">Loading campaigns...</p>
          </div>
        ) : (sourceFilter === 'calling' ? callCampaigns.length === 0 : sourceFilter === 'whatsapp' ? whatsappCampaigns.length === 0 : emailCampaigns.length === 0) ? (
          <div className="p-8 text-center">
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              No campaigns found. Create your first campaign to get started!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {sourceFilter === 'calling' ? (
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Connection Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Attempts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {callCampaigns.map((campaign: Campaign) => {
                    const analytics = analyticsData?.[campaign.id];

                    const handledCalls = analytics?.handled_calls || 0;
                    const totalContacts = analytics?.total_contacts || campaign.total_contacts;
                    const progressPercentage = Number((analytics?.progress_percentage || 0).toFixed(2));
                    const connectionRate = Number((analytics?.call_connection_rate || 0).toFixed(2));
                    const attemptDist = analytics?.attempt_distribution || {
                      busy: 0,
                      no_answer: 0,
                      contacted: 0,
                      failed: 0,
                      not_attempted: 0,
                    };

                    const failedCalls = analytics?.failed_calls || 0;

                    return (
                      <tr key={campaign.id} className={`${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium">{campaign.name}</div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {totalContacts} contacts
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(campaign.status)}</td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 mr-2">
                              <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div
                                  className="h-2 rounded-full"
                                  style={{
                                    backgroundColor: '#1A6262',
                                    width: `${progressPercentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-medium">{progressPercentage}%</span>
                          </div>
                          <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {handledCalls} / {totalContacts}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">{connectionRate}%</div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {attemptDist.contacted} contacted
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs space-y-0.5">
                            <div className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>
                              Contacted: {attemptDist.contacted}
                            </div>
                            <div className={theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}>
                              No Answer: {attemptDist.no_answer}
                            </div>
                            <div className={theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}>
                              Busy: {attemptDist.busy}
                            </div>
                            <div className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
                              Failed: {failedCalls}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDateInUserTimezone(campaign.created_at, campaign.campaign_timezone, { hour: undefined, minute: undefined })}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                          {getActionButtons(campaign)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : sourceFilter === 'whatsapp' ? (
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Template</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Recipients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {whatsappCampaigns.map((campaign: any) => (
                    <tr
                      key={campaign.campaign_id}
                      className={`${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{campaign.name}</div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {campaign.phone_number_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getWhatsAppStatusBadge(campaign.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{campaign.template_name || '—'}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {campaign.template_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{campaign.total_recipients ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 mr-2">
                            <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  backgroundColor: '#1A6262',
                                  width: `${campaign.progress_percent ?? 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium">{campaign.progress_percent ?? 0}%</span>
                        </div>
                        <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Sent: {campaign.sent_count ?? 0} • Delivered: {campaign.delivered_count ?? 0} • Read: {campaign.read_count ?? 0} • Failed: {campaign.failed_count ?? 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {campaign.created_at ? new Date(campaign.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedWhatsAppCampaignId(campaign.campaign_id)}
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Recipients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Success/Fail</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {emailCampaigns.map((campaign: any) => (
                    <tr key={campaign.id} className={`${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium">{campaign.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(campaign.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium max-w-[320px] truncate">{campaign.subject}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{campaign.total_contacts ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {campaign.successful_emails ?? 0} / {campaign.failed_emails ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {campaign.created_at ? new Date(campaign.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button size="sm" variant="outline" onClick={() => setSelectedEmailCampaignId(campaign.id)}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Campaign Details Dialog */}
      {selectedCampaign && (
        <CampaignDetailsDialog
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}

      {selectedWhatsAppCampaignId && (
        <WhatsAppCampaignDetailsDialog
          campaignId={selectedWhatsAppCampaignId}
          onClose={() => setSelectedWhatsAppCampaignId(null)}
        />
      )}

      {selectedEmailCampaignId && (
        <EmailCampaignDetailsDialog
          campaignId={selectedEmailCampaignId}
          onClose={() => setSelectedEmailCampaignId(null)}
        />
      )}
    </div>
  );
};

export default Campaigns;
