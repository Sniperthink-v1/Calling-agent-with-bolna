import apiClient from '../api/client';
import type { Call, ApiResponse, CallsListParams, Pagination } from '../types';
import { normalizeCall } from '../utils/helpers';

export const callService = {
  /**
   * Get list of calls with pagination and filters
   */
  async getCalls(params?: CallsListParams): Promise<{ data: Call[]; pagination: Pagination }> {
    console.log('📞 Fetching calls with params:', params);
    const response = await apiClient.get<ApiResponse<Call[]>>('/calls', { params });
    console.log('📞 Calls response:', response.data);
    
    // Normalize call data to handle backend field naming
    const normalizedCalls = (response.data.data || []).map(normalizeCall);
    console.log('📞 Normalized calls:', normalizedCalls.length, 'calls');
    
    return {
      data: normalizedCalls,
      pagination: response.data.pagination || {
        total: 0,
        limit: params?.limit || 30,
        offset: params?.offset || 0,
        hasMore: false,
      },
    };
  },

  /**
   * Get call details by ID
   */
  async getCall(callId: string): Promise<Call> {
    const response = await apiClient.get<ApiResponse<Call>>(`/calls/${callId}`);
    return normalizeCall(response.data.data!);
  },

  /**
   * Initiate a new call
   */
  async initiateCall(data: {
    agent_id: string;
    phone_number: string;
    contact_id?: string;
    user_data?: any;
  }): Promise<Call> {
    const response = await apiClient.post<ApiResponse<Call>>('/calls/initiate', data);
    return response.data.data!;
  },

  /**
   * Get call statistics
   */
  async getCallStats(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/calls/stats');
    return response.data.data;
  },

  /**
   * Get call transcript
   */
  async getTranscript(callId: string): Promise<any> {
    console.log('📝 Fetching transcript for call:', callId);
    const response = await apiClient.get<ApiResponse<any>>(`/calls/${callId}/transcript`);
    console.log('📝 Transcript response:', response.data);
    return response.data.data;
  },

  /**
   * Get recent calls
   */
  async getRecentCalls(limit: number = 10): Promise<Call[]> {
    const response = await apiClient.get<ApiResponse<Call[]>>('/calls/recent', {
      params: { limit },
    });
    return response.data.data || [];
  },

  /**
   * Search calls
   */
  async searchCalls(query: string): Promise<Call[]> {
    const response = await apiClient.get<ApiResponse<Call[]>>(`/calls/search/${query}`);
    return response.data.data || [];
  },

  /**
   * Get call transcript
   */
  async getCallTranscript(callId: string): Promise<string> {
    const response = await apiClient.get<ApiResponse<{ transcript: string }>>(
      `/calls/${callId}/transcript`
    );
    return response.data.data?.transcript || '';
  },

  /**
   * Get call recording URL
   */
  async getCallRecordingUrl(callId: string): Promise<string> {
    const response = await apiClient.get<ApiResponse<{ recording_url: string }>>(
      `/calls/${callId}/recording`
    );
    return response.data.data?.recording_url || '';
  },

  /**
   * Get call audio blob URL
   */
  async getCallAudioBlob(callId: string): Promise<string> {
    const response = await apiClient.get<ApiResponse<{ audio_url: string }>>(
      `/calls/${callId}/audio`
    );
    return response.data.data?.audio_url || '';
  },

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/calls/queue/status');
    return response.data.data;
  },
};
