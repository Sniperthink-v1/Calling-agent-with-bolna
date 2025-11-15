import apiClient from '../api/client';
import type { Campaign, ApiResponse, CampaignsListParams } from '../types';
import { normalizeCampaign } from '../utils/helpers';

export const campaignService = {
  /**
   * Get list of campaigns
   */
  async getCampaigns(params?: CampaignsListParams): Promise<{ data: Campaign[]; total: number }> {
    console.log('📢 Fetching campaigns with params:', params);
    const response = await apiClient.get<ApiResponse<Campaign[]>>('/campaigns', { params });
    console.log('📢 Campaigns response:', response.data);
    
    // Backend may return data in campaigns array or data.campaigns.campaigns
    const campaignsData = response.data.data || response.data.campaigns || [];
    const campaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData.campaigns || []);
    const total = (response.data as any).total || campaigns.length;
    
    const normalized = campaigns.map(normalizeCampaign);
    console.log('📢 Normalized campaigns:', normalized.length, 'campaigns');
    
    return { data: normalized, total };
  },

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await apiClient.get<ApiResponse<Campaign>>(`/campaigns/${campaignId}`);
    return normalizeCampaign(response.data.data!);
  },

  /**
   * Create a new campaign
   */
  async createCampaign(data: {
    name: string;
    description?: string;
    agent_id: string;
    next_action: string;
    first_call_time: string;
    last_call_time: string;
    start_date: string;
    end_date?: string;
    contact_ids: string[]; // Required field - array of contact IDs
  }): Promise<Campaign> {
    const response = await apiClient.post<ApiResponse<Campaign>>('/campaigns', data);
    return response.data.data!;
  },

  /**
   * Update campaign
   */
  async updateCampaign(campaignId: string, data: Partial<Campaign>): Promise<Campaign> {
    const response = await apiClient.put<ApiResponse<Campaign>>(`/campaigns/${campaignId}`, data);
    return response.data.data!;
  },

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    await apiClient.delete(`/campaigns/${campaignId}`);
  },

  /**
   * Start campaign
   */
  async startCampaign(campaignId: string): Promise<Campaign> {
    const response = await apiClient.post<ApiResponse<Campaign>>(
      `/campaigns/${campaignId}/start`
    );
    return response.data.data!;
  },

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<Campaign> {
    const response = await apiClient.post<ApiResponse<Campaign>>(
      `/campaigns/${campaignId}/pause`
    );
    return response.data.data!;
  },

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<Campaign> {
    const response = await apiClient.post<ApiResponse<Campaign>>(
      `/campaigns/${campaignId}/resume`
    );
    return response.data.data!;
  },

  /**
   * Cancel campaign
   */
  async cancelCampaign(campaignId: string): Promise<Campaign> {
    const response = await apiClient.post<ApiResponse<Campaign>>(
      `/campaigns/${campaignId}/cancel`
    );
    return response.data.data!;
  },

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/campaigns/${campaignId}/stats`);
    return response.data.data;
  },

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(`/campaigns/${campaignId}/analytics`);
    return response.data.data;
  },

  /**
   * Get campaigns summary
   */
  async getCampaignsSummary(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/campaigns/summary');
    return response.data.data;
  },

  /**
   * Upload campaign with contacts via CSV
   */
  async uploadCampaignCSV(formData: FormData): Promise<Campaign> {
    const response = await apiClient.post<ApiResponse<Campaign>>(
      '/campaigns/upload-csv',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  },
};
