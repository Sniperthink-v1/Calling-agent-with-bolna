import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { apiService } from '@/services/apiService';
import type { Contact } from '@/types';
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock3,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCcw,
  User,
} from 'lucide-react';

type InteractionType = 'call' | 'chat' | 'email' | 'human_edit' | 'other';

interface TimelineEvent {
  id: string;
  interactionDate: string;
  interactionAgent: string;
  interactionType: InteractionType;
  status?: string;
  platform?: string;
  callDirection?: string;
  duration?: string;
  smartNotification?: string;
  summary?: string;
  companyName?: string;
  campaignName?: string;
  campaignId?: string;
}

interface ContactInteractionTimelinePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}

function normalizePhoneForLookup(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '').trim();
}

function normalizeEmailForLookup(email?: string): string {
  return (email || '').trim().toLowerCase();
}

function extractLeadGroups(response: any): Array<Record<string, any>> {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.leadGroups)) return response.data.leadGroups;
  if (Array.isArray(response?.leadGroups)) return response.leadGroups;
  return [];
}

function extractTimelineRows(response: any): Array<Record<string, any>> {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function toReadableDateTime(value?: string): string {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function inferInteractionType(entry: Record<string, any>): InteractionType {
  const explicitType = String(entry.interactionType || entry.interaction_type || '').toLowerCase();
  if (explicitType === 'call' || explicitType === 'chat' || explicitType === 'email' || explicitType === 'human_edit') {
    return explicitType;
  }

  const platform = String(entry.platform || '').toLowerCase();
  if (platform.includes('whatsapp') || platform.includes('chat')) return 'chat';
  if (platform.includes('email')) return 'email';
  return 'call';
}

function mapCallTimelineEntry(entry: Record<string, any>, index: number): TimelineEvent {
  const interactionDate =
    entry.interactionDate ||
    entry.interaction_date ||
    entry.createdAt ||
    entry.created_at ||
    '';

  return {
    id: String(entry.id || entry.callId || entry.call_id || `call-${index}`),
    interactionDate,
    interactionAgent: String(entry.interactionAgent || entry.interaction_agent || entry.agentName || entry.agent_name || 'Unknown Agent'),
    interactionType: inferInteractionType(entry),
    status: entry.status || undefined,
    platform: entry.platform || undefined,
    callDirection: entry.callDirection || entry.call_direction || undefined,
    duration: entry.duration || undefined,
    smartNotification: entry.smartNotification || entry.smart_notification || undefined,
    summary:
      entry.inDetailSummary ||
      entry.in_detail_summary ||
      entry.followUpRemark ||
      entry.follow_up_remark ||
      undefined,
    companyName: entry.companyName || entry.company_name || undefined,
    campaignName: entry.campaignName || entry.campaign_name || undefined,
    campaignId: entry.campaignId || entry.campaign_id || undefined,
  };
}

function mapChatExtractionEntry(entry: Record<string, any>, index: number): TimelineEvent {
  return {
    id: String(entry.extraction_id || entry.id || `chat-${index}`),
    interactionDate: entry.extracted_at || entry.created_at || '',
    interactionAgent: String(entry.agent_name || 'Chat Agent'),
    interactionType: 'chat',
    status: entry.lead_status_tag || 'chat',
    platform: entry.platform || 'WhatsApp',
    smartNotification: entry.smart_notification || undefined,
    summary: entry.in_detail_summary || undefined,
    companyName: entry.company || undefined,
  };
}

function getTypeIcon(type: InteractionType) {
  switch (type) {
    case 'chat':
      return <MessageSquare className="h-3.5 w-3.5" />;
    case 'email':
      return <Mail className="h-3.5 w-3.5" />;
    case 'human_edit':
      return <User className="h-3.5 w-3.5" />;
    case 'call':
      return <Phone className="h-3.5 w-3.5" />;
    default:
      return <Phone className="h-3.5 w-3.5" />;
  }
}

function getTypeLabel(type: InteractionType): string {
  switch (type) {
    case 'chat':
      return 'Chat';
    case 'email':
      return 'Email';
    case 'human_edit':
      return 'Manual Update';
    case 'call':
      return 'Call';
    default:
      return 'Interaction';
  }
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ContactInteractionTimelinePanel: React.FC<ContactInteractionTimelinePanelProps> = ({
  open,
  onOpenChange,
  contact,
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const hasLookupKey = Boolean(contact?.phoneNumber || contact?.email);

  const contactSubtitle = useMemo(() => {
    if (!contact) return '';
    const pieces = [contact.phoneNumber, contact.email].filter(Boolean);
    return pieces.join(' • ');
  }, [contact]);

  useEffect(() => {
    if (!open || !contact) return;

    const loadTimeline = async () => {
      if (!hasLookupKey) {
        setEvents([]);
        setError('This contact does not have a phone number or email to load timeline data.');
        return;
      }

      setLoading(true);
      setError(null);
      setWarning(null);

      try {
        const rawPhone = (contact.phoneNumber || '').trim();
        const normalizedPhone = normalizePhoneForLookup(rawPhone);
        const normalizedEmail = normalizeEmailForLookup(contact.email);

        let timelineGroupId = rawPhone
          ? `phone_${rawPhone}`
          : `email_${normalizedEmail}`;

        try {
          const leadIntelligenceResponse = await apiService.getLeadIntelligence();
          const leadGroups = extractLeadGroups(leadIntelligenceResponse);

          if (leadGroups.length > 0) {
            const matchedGroup = leadGroups.find((group) => {
              const groupContactId = String(group.contactId || group.contact_id || '');
              if (groupContactId && groupContactId === contact.id) return true;

              const groupPhone = normalizePhoneForLookup(String(group.phone || ''));
              if (normalizedPhone && groupPhone && normalizedPhone === groupPhone) return true;

              const groupEmail = normalizeEmailForLookup(group.email);
              if (normalizedEmail && groupEmail && normalizedEmail === groupEmail) return true;

              return false;
            });

            if (matchedGroup?.id) {
              timelineGroupId = String(matchedGroup.id);
            }
          }
        } catch (leadIntelligenceError) {
          console.warn('Failed to resolve contact group id from lead intelligence, using fallback group id:', leadIntelligenceError);
        }

        const [timelineResult, extractionResult] = await Promise.allSettled([
          apiService.getLeadIntelligenceTimeline(timelineGroupId),
          rawPhone ? apiService.getFullExtractions(rawPhone) : Promise.resolve(null),
        ]);

        if (timelineResult.status === 'rejected') {
          throw timelineResult.reason;
        }

        const timelineResponse = timelineResult.value;
        const timelineRows = extractTimelineRows(timelineResponse);
        const callTimeline = timelineRows.map((entry: Record<string, any>, index: number) => mapCallTimelineEntry(entry, index));

        let chatTimeline: TimelineEvent[] = [];

        if (rawPhone) {
          if (extractionResult.status === 'fulfilled') {
            const extractionResponse = extractionResult.value;
            if (extractionResponse?.success && Array.isArray(extractionResponse.data)) {
              chatTimeline = extractionResponse.data.map((entry: Record<string, any>, index: number) =>
                mapChatExtractionEntry(entry, index)
              );
            } else if (extractionResponse && extractionResponse.success === false) {
              setWarning('Chat extraction service is unavailable. Showing call timeline only.');
            }
          } else {
            console.warn('Chat extraction fetch failed, continuing with call timeline only:', extractionResult.reason);
            setWarning('Chat extraction service is unavailable. Showing call timeline only.');
          }
        }

        const merged = [...callTimeline, ...chatTimeline].sort((a, b) => {
          const aTime = new Date(a.interactionDate || '').getTime();
          const bTime = new Date(b.interactionDate || '').getTime();
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });

        setEvents(merged);
      } catch (timelineError) {
        console.error('Failed to load contact interaction timeline:', timelineError);
        setEvents([]);
        setError('Failed to load interaction timeline. Please retry.');
      } finally {
        setLoading(false);
      }
    };

    loadTimeline();
  }, [contact, hasLookupKey, open, reloadKey]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex h-full flex-col">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle>Interaction Timeline</SheetTitle>
          <SheetDescription>
            {contact ? `${contact.name}${contactSubtitle ? ` • ${contactSubtitle}` : ''}` : 'Select a contact'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {contact ? (
            <div className="mb-4 grid grid-cols-1 gap-3">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Contact Info</h3>
                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{contact.name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{contact.phoneNumber || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{contact.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{contact.company || '-'}</span>
                  </div>
                </div>
                {(contact.city || contact.country) ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Location: {[contact.city, contact.country].filter(Boolean).join(', ')}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Details</h3>
                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div className="flex items-center gap-2 text-muted-foreground md:col-span-2">
                    <span className="font-medium text-foreground">Contact ID:</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{contact.id}</code>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created: {formatDate(contact.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Updated: {formatDate(contact.updatedAt)}</span>
                  </div>
                </div>
                {contact.tags && contact.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {contact.businessContext ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-foreground mb-1">Business Context</p>
                    <p className="text-sm text-muted-foreground">{contact.businessContext}</p>
                  </div>
                ) : null}
                <div className="mt-3">
                  <p className="text-xs font-medium text-foreground mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {contact.notes && contact.notes.trim().length > 0 ? contact.notes : 'No notes added.'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {warning ? (
            <div className="mb-4 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
              {warning}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading interaction timeline...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border p-6 text-center text-muted-foreground">
              No interactions found for this contact yet.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => {
                const isLast = index === events.length - 1;
                return (
                  <div key={`${event.id}-${index}`} className="relative pl-6">
                    <span className="absolute left-0 top-3 h-2.5 w-2.5 rounded-full bg-primary" />
                    {!isLast && <span className="absolute left-[4px] top-6 bottom-[-16px] w-px bg-border" />}

                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            {getTypeIcon(event.interactionType)}
                            {getTypeLabel(event.interactionType)}
                          </Badge>
                          {event.status ? <Badge variant="outline">{event.status}</Badge> : null}
                        </div>
                        <span className="text-xs text-muted-foreground">{toReadableDateTime(event.interactionDate)}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{event.interactionAgent}</span>
                        </div>
                        {event.platform ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{event.platform}</span>
                          </div>
                        ) : null}
                        {event.callDirection ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span className="capitalize">{event.callDirection}</span>
                          </div>
                        ) : null}
                        {event.duration ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>{event.duration}</span>
                          </div>
                        ) : null}
                        {event.companyName ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{event.companyName}</span>
                          </div>
                        ) : null}
                        {(event.campaignName || event.campaignId) ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Badge variant="outline" className="font-normal">
                              Campaign: {event.campaignName || event.campaignId}
                            </Badge>
                          </div>
                        ) : null}
                      </div>

                      {event.smartNotification ? (
                        <p className="text-sm text-foreground bg-muted/40 rounded-md p-2">
                          {event.smartNotification}
                        </p>
                      ) : null}

                      {event.summary ? (
                        <p className="text-sm text-muted-foreground">{event.summary}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ContactInteractionTimelinePanel;
