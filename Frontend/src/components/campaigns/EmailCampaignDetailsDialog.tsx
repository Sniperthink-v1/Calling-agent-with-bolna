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
import { authenticatedFetch } from '@/utils/auth';

interface EmailAttachmentMetadata {
  id: string;
  email_id: string;
  filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

interface EmailCampaignEmail {
  id: string;
  contact_id: string | null;
  to_email: string;
  to_name: string | null;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  contact: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  attachments: EmailAttachmentMetadata[];
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_contacts: number;
  completed_emails: number;
  successful_emails: number;
  failed_emails: number;
  opened_emails: number;
  scheduled_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailCampaignDetailsResponse {
  success: boolean;
  data?: {
    campaign: EmailCampaign;
    emails: EmailCampaignEmail[];
  };
  error?: string;
}

interface EmailCampaignDetailsDialogProps {
  campaignId: string;
  onClose: () => void;
}

const EmailCampaignDetailsDialog: React.FC<EmailCampaignDetailsDialogProps> = ({
  campaignId,
  onClose,
}) => {
  const { theme } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['email-campaign-details', campaignId],
    queryFn: async (): Promise<EmailCampaignDetailsResponse> => {
      const response = await authenticatedFetch(`/api/email-campaigns/${encodeURIComponent(campaignId)}`);
      if (!response.ok) throw new Error('Failed to fetch email campaign details');
      return response.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const campaign = data?.data?.campaign;
  const emails = data?.data?.emails || [];

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-5xl max-h-[90vh] flex flex-col ${
          theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{campaign?.name || 'Email Campaign'}</DialogTitle>
            {campaign?.status && (
              <Badge variant={campaign.status === 'in_progress' ? 'default' : 'secondary'}>
                {campaign.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Campaign details, recipients, and attachments
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
              <div className={`p-4 rounded-lg space-y-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <h3 className="font-semibold">Campaign Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Subject</p>
                    <p className="font-medium break-words">{campaign.subject}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">{campaign.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium">{formatDateTime(campaign.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Scheduled At</p>
                    <p className="font-medium">{formatDateTime(campaign.scheduled_at || null)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Recipients</p>
                    <p className="font-medium">{campaign.total_contacts ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Successful / Failed</p>
                    <p className="font-medium">{campaign.successful_emails ?? 0} / {campaign.failed_emails ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg space-y-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <h3 className="font-semibold">Recipients</h3>
                {emails.length === 0 ? (
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    No sent emails recorded for this campaign.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Recipient</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Sent</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Opened</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Attachments</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {emails.map((e) => (
                          <tr key={e.id} className={`${theme === 'dark' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'}`}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium">
                                {e.contact?.name || e.to_name || e.to_email}
                              </div>
                              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {e.to_email}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{e.status}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDateTime(e.sent_at)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDateTime(e.opened_at)}</td>
                            <td className="px-3 py-2 text-sm">
                              {e.attachments && e.attachments.length > 0 ? (
                                <div className="space-y-1">
                                  {e.attachments.slice(0, 2).map((a) => (
                                    <div key={a.id} className="text-xs break-all">
                                      {a.filename}
                                    </div>
                                  ))}
                                  {e.attachments.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{e.attachments.length - 2} more
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailCampaignDetailsDialog;
