import apiClient from '../api/client';
import type { DashboardOverview, ApiResponse } from '../types';

export const dashboardService = {
  /**
   * Get dashboard overview with KPIs
   */
  async getOverview(): Promise<DashboardOverview> {
    const response = await apiClient.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
    return response.data.data!;
  },

  /**
   * Get dashboard analytics
   */
  async getAnalytics(dateRange?: { from: string; to: string }): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/dashboard/analytics', {
      params: dateRange,
    });
    return response.data.data;
  },

  /**
   * Get call volume data
   */
  async getCallVolume(period: 'week' | 'month' | 'year' = 'month'): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/dashboard/call-volume', {
      params: { period },
    });
    return response.data.data;
  },
};
