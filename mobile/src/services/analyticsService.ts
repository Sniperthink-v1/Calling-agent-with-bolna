import apiClient from '../api/client';
import type { ApiResponse } from '../types';

export interface AnalyticsSummary {
  total_calls_with_analytics: number;
  avg_total_score: number;
  avg_intent_score: number;
  avg_engagement_score: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  cta_demo_clicks: number;
}

export interface ScoreDistribution {
  score_range: string;
  count: number;
}

export interface DashboardMetrics {
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
  avg_duration_minutes: number;
  total_credits_used: number;
  avg_lead_score: number;
  hot_leads_count: number;
  warm_leads_count: number;
  cold_leads_count: number;
}

export interface CallVolumeData {
  date: string;
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
}

export interface LeadTrendData {
  date: string;
  avg_score: number;
  hot_count: number;
  warm_count: number;
  cold_count: number;
}

export interface CallAnalyticsKPI {
  title: string;
  value: string;
  change: string;
  changeValue: string;
  positive: boolean;
}

export interface CallAnalyticsKPIResponse {
  kpiData: CallAnalyticsKPI[];
  additionalMetrics: CallAnalyticsKPI[];
}

export interface LeadQualityDistribution {
  quality_category: string;
  count: number;
  percentage: number;
}

export interface FunnelData {
  stage: string;
  count: number;
  conversion_rate: number;
}

export interface IntentBudgetData {
  intent_level: string;
  budget_level: string;
  count: number;
}

export interface SourceBreakdown {
  source: string;
  count: number;
  percentage: number;
}

export interface CallAnalyticsSummary {
  minutes: number;
  totalMinutes: number;
}

export const analyticsService = {
  /**
   * Get analytics summary statistics
   */
  async getSummary(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AnalyticsSummary> {
    console.log('📊 Fetching analytics summary');
    const response = await apiClient.get<ApiResponse<AnalyticsSummary>>(
      '/analytics/summary',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get score distribution data
   */
  async getScoreDistribution(): Promise<ScoreDistribution[]> {
    console.log('📊 Fetching score distribution');
    const response = await apiClient.get<ApiResponse<ScoreDistribution[]>>(
      '/analytics/score-distribution'
    );
    return response.data.data || [];
  },

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<DashboardMetrics> {
    console.log('📊 Fetching dashboard metrics');
    const response = await apiClient.get<ApiResponse<DashboardMetrics>>(
      '/analytics/dashboard/metrics',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get call volume data for charts
   */
  async getCallVolumeData(params: {
    dateFrom: string;
    dateTo: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<CallVolumeData[]> {
    console.log('📊 Fetching call volume data');
    const response = await apiClient.get<ApiResponse<CallVolumeData[]>>(
      '/analytics/dashboard/call-volume',
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get lead score trends over time
   */
  async getLeadTrends(params: {
    dateFrom: string;
    dateTo: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<LeadTrendData[]> {
    console.log('📊 Fetching lead trends');
    const response = await apiClient.get<ApiResponse<LeadTrendData[]>>(
      '/analytics/dashboard/lead-trends',
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get call analytics KPIs
   */
  async getCallAnalyticsKPIs(params?: {
    dateFrom?: string;
    dateTo?: string;
    agentId?: string;
  }): Promise<CallAnalyticsKPIResponse> {
    console.log('📊 Fetching call analytics KPIs');
    const response = await apiClient.get<ApiResponse<CallAnalyticsKPIResponse>>(
      '/call-analytics/kpis',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get lead quality distribution
   */
  async getLeadQualityDistribution(params?: {
    dateFrom?: string;
    dateTo?: string;
    agentId?: string;
  }): Promise<LeadQualityDistribution[]> {
    console.log('📊 Fetching lead quality distribution');
    const response = await apiClient.get<ApiResponse<LeadQualityDistribution[]>>(
      '/call-analytics/lead-quality',
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get funnel conversion data
   */
  async getFunnelData(params?: {
    dateFrom?: string;
    dateTo?: string;
    agentId?: string;
  }): Promise<FunnelData[]> {
    console.log('📊 Fetching funnel data');
    const response = await apiClient.get<ApiResponse<FunnelData[]>>(
      '/call-analytics/funnel',
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get intent vs budget scatter data
   */
  async getIntentBudgetData(params?: {
    dateFrom?: string;
    dateTo?: string;
    agentId?: string;
  }): Promise<IntentBudgetData[]> {
    console.log('📊 Fetching intent budget data');
    const response = await apiClient.get<ApiResponse<IntentBudgetData[]>>(
      '/call-analytics/intent-budget',
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get source breakdown (Phone vs Internet)
   */
  async getSourceBreakdown(params?: {
    dateFrom?: string;
    dateTo?: string;
    agentId?: string;
  }): Promise<SourceBreakdown[]> {
    console.log('📊 Fetching source breakdown');
    const response = await apiClient.get<ApiResponse<SourceBreakdown[]>>(
      '/call-analytics/source-breakdown',
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get call analytics summary
   */
  async getCallAnalyticsSummary(): Promise<CallAnalyticsSummary> {
    console.log('📊 Fetching call analytics summary');
    const response = await apiClient.get<ApiResponse<CallAnalyticsSummary>>(
      '/call-analytics/summary'
    );
    return response.data.data!;
  },
};
