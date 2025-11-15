import apiClient from '../api/client';
import type { ApiResponse } from '../types';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  low_credit_alerts: boolean;
  credits_added_emails: boolean;
  campaign_summary_emails: boolean;
  email_verification_reminders: boolean;
  marketing_emails: boolean;
  meeting_booked_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<ApiResponse<{ preferences: NotificationPreferences }>>(
      '/user-notifications/preferences'
    );
    
    // Handle array response format
    const rawData = response.data.data || response.data;
    if (Array.isArray(rawData)) {
      return rawData[0]?.preferences || rawData[0];
    }
    
    return (rawData as any).preferences || rawData;
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await apiClient.put<ApiResponse<{ preferences: NotificationPreferences }>>(
      '/user-notifications/preferences',
      preferences
    );
    
    // Handle array response format
    const rawData = response.data.data || response.data;
    if (Array.isArray(rawData)) {
      return rawData[0]?.preferences || rawData[0];
    }
    
    return (rawData as any).preferences || rawData;
  },
};
