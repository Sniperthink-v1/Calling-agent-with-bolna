import apiClient from '../api/client';
import type { ApiResponse } from '../types';

export interface LeadGroup {
  id: string;
  groupType: 'phone' | 'email';
  phone: string;
  email?: string;
  name: string;
  company?: string;
  interactions: number;
  lastContact: string;
  leadType?: 'inbound' | 'outbound';
  interactedAgents: string[];
  
  // Recent analytics
  recentLeadTag?: string;
  recentIntentLevel?: string;
  recentEngagementLevel?: string;
  recentFitAlignment?: string;
  recentTimelineUrgency?: string;
  recentBudgetConstraint?: string;
  
  // Meeting/Demo info
  demoScheduled?: string;
  meetingId?: string;
  meetingTitle?: string;
  meetingLink?: string;
  meetingDescription?: string;
  meetingAttendeeEmail?: string;
  
  // Follow-up info
  followUpScheduled?: string;
  followUpStatus?: string;
  escalatedToHuman: boolean;
}

export interface LeadTimelineItem {
  // Backend field names (camelCase from API)
  id: string;
  interactionDate: string;
  interactionAgent: string;
  duration: string; // Format: "03:11"
  status: string; // "Hot", "Warm", "Cold"
  intentLevel: string;
  intentScore: number;
  engagementLevel: string;
  engagementScore: number;
  fitAlignment: string;
  fitScore: number;
  timelineUrgency: string;
  urgencyScore: number;
  budgetConstraint: string;
  budgetScore: number;
  smartNotification?: string;
  leadName: string;
  companyName?: string;
  platform: string;
  callDirection: string;
  hangupBy?: string;
  hangupReason?: string;
  extractedEmail?: string;
  
  // Demo/CTA fields
  demoBookDatetime?: string;
  ctaDemoClicked?: boolean;
  ctaFollowupClicked?: boolean;
  ctaPricingClicked?: boolean;
  ctaSampleClicked?: boolean;
  ctaEscalatedToHuman?: boolean;
  
  // Follow-up fields
  followUpDate?: string;
  followUpStatus?: string;
  followUpRemark?: string;
  followUpCompleted?: boolean;
  followUpCallId?: string;
}

export const leadIntelligenceService = {
  /**
   * Get grouped leads for intelligence view
   */
  async getLeadIntelligence(params?: {
    minScore?: number;
    limit?: number;
    offset?: number;
  }): Promise<LeadGroup[]> {
    console.log('🧠 Fetching lead intelligence with params:', params);
    const response = await apiClient.get<ApiResponse<LeadGroup[]>>('/lead-intelligence', { params });
    console.log('🧠 Lead intelligence response:', response.data);
    console.log('🧠 Lead data array length:', response.data.data?.length || 0);
    
    // Check if data is directly in response.data (array) or nested in response.data.data
    const leadData = Array.isArray(response.data) ? response.data : (response.data.data || []);
    console.log('🧠 Parsed lead data length:', leadData.length);
    return leadData;
  },

  /**
   * Get detailed timeline for a specific lead group
   */
  async getLeadTimeline(groupId: string): Promise<LeadTimelineItem[]> {
    console.log('🧠 Fetching timeline for group:', groupId);
    const response = await apiClient.get<ApiResponse<LeadTimelineItem[]>>(
      `/lead-intelligence/${groupId}/timeline`
    );
    console.log('🧠 Timeline response:', response.data);
    
    // Backend returns array directly
    const timelineData = Array.isArray(response.data) ? response.data : (response.data.data || []);
    return timelineData;
  },
};
