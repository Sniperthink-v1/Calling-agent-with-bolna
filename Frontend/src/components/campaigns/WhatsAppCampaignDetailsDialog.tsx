import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { authenticatedFetch } from '@/utils/auth';

type RecipientStats = Record<string, number>;

interface WhatsAppRecipient {
  recipient_id: string;
  phone: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  contact_name?: string | null;
}

interface WhatsAppCampaignStatusResponse {
  success: boolean;
  data?: {
    campaign_id: string;
    name: string;
    status: string;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    failed_count: number;
    progress_percent: number;
    started_at: string | null;
    completed_at: string | null;
    recipient_stats?: RecipientStats;
    recipients?: WhatsAppRecipient[];
  };
  error?: string;
  message?: string;
}

interface WhatsAppCampaignDetailsDialogProps {
  campaignId: string;
  onClose: () => void;
}

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const normalized = status.toUpperCase();
  if (normalized === 'RUNNING') return 'default';
  if (normalized === 'FAILED') return 'destructive';
  if (normalized === 'CANCELLED') return 'destructive';
  if (normalized === 'SCHEDULED') return 'outline';
  if (normalized === 'PAUSED') return 'outline';
  return 'secondary';
};

const WhatsAppCampaignDetailsDialog: React.FC<WhatsAppCampaignDetailsDialogProps> = ({
  campaignId,
  onClose,
}) => {
  const { theme } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-campaign-status', campaignId],
    queryFn: async (): Promise<WhatsAppCampaignStatusResponse> => {
      const response = await authenticatedFetch(`/api/whatsapp/campaign/${encodeURIComponent(campaignId)}`);
      if (!response.ok) throw new Error('Failed to fetch WhatsApp campaign details');
      return response.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const campaign = data?.data;

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-3xl max-h-[90vh] flex flex-col ${
          theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{campaign?.name || 'WhatsApp Campaign'}</DialogTitle>
            {campaign?.status && (
              <Badge variant={statusBadgeVariant(campaign.status)}>
                {campaign.status}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Campaign status and recipient breakdown
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2 invisible-scrollbar">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading campaign details...</p>
            </div>
          ) : !campaign ? (
            <div className="p-6 text-center">
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Campaign details unavailable.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span className="font-medium">{campaign.progress_percent ?? 0}%</span>
                </div>
                <Progress value={Math.min(campaign.progress_percent ?? 0, 100)} className="h-2" />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>Total: {campaign.total_recipients ?? 0}</span>
                  <span>Sent: {campaign.sent_count ?? 0}</span>
                  <span>Delivered: {campaign.delivered_count ?? 0}</span>
                  <span>Read: {campaign.read_count ?? 0}</span>
                  <span>Failed: {campaign.failed_count ?? 0}</span>
                </div>
              </div>

              <div className={`p-4 rounded-lg space-y-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <h3 className="font-semibold">Campaign Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Campaign ID</p>
                    <p className="font-medium break-all">{campaign.campaign_id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">{campaign.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Started</p>
                    <p className="font-medium">{formatDateTime(campaign.started_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Completed</p>
                    <p className="font-medium">{formatDateTime(campaign.completed_at)}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg space-y-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <h3 className="font-semibold">Recipient Status Breakdown</h3>
                {campaign.recipient_stats && Object.keys(campaign.recipient_stats).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {Object.entries(campaign.recipient_stats).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    No recipient breakdown available.
                  </p>
                )}
              </div>

              {/* Recipients Table */}
              <div className={`p-4 rounded-lg space-y-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <h3 className="font-semibold">Recipients</h3>
                {campaign.recipients && campaign.recipients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Contact</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Sent</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Delivered</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Read</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {campaign.recipients.map((recipient) => (
                          <tr key={recipient.recipient_id} className={`${theme === 'dark' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'}`}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium">
                                {recipient.contact_name || recipient.phone}
                              </div>
                              {recipient.contact_name && (
                                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {recipient.phone}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <Badge variant={recipient.status === 'FAILED' ? 'destructive' : recipient.status === 'READ' ? 'default' : 'secondary'}>
                                {recipient.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDateTime(recipient.sent_at)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDateTime(recipient.delivered_at)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDateTime(recipient.read_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    No recipient details available.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppCampaignDetailsDialog;
