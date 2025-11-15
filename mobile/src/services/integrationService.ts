import apiClient from '../api/client';
import type { ApiResponse } from '../types';

interface GoogleCalendarStatus {
  connected: boolean;
  email?: string;
  calendar_id?: string;
  last_synced?: string;
}

export const integrationService = {
  /**
   * Get Google Calendar connection status
   */
  async getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
    const response = await apiClient.get('/integrations/google/status');
    
    // Handle both array and object responses
    const rawData = response.data.data || response.data;
    
    // If response is an array, take the first element
    if (Array.isArray(rawData)) {
      return rawData[0] || { connected: false };
    }
    
    // If it's wrapped in success object, extract it
    if (rawData && typeof rawData === 'object' && 'connected' in rawData) {
      return rawData as GoogleCalendarStatus;
    }
    
    return { connected: false };
  },

  /**
   * Initiate Google OAuth flow
   * Returns the authorization URL to open in browser
   */
  async connectGoogleCalendar(): Promise<string> {
    const response = await apiClient.get<{ authUrl: string }>('/integrations/google/auth');
    return response.data.authUrl;
  },

  /**
   * Disconnect Google Calendar integration
   */
  async disconnectGoogleCalendar(): Promise<void> {
    await apiClient.post('/integrations/google/disconnect');
  },
};
