import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

/**
 * Hook to fetch dashboard overview
 */
export const useDashboardOverview = () => {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardService.getOverview,
    staleTime: 30000, // Fresh for 30 seconds
  });
};

/**
 * Hook to fetch dashboard analytics
 */
export const useDashboardAnalytics = (dateRange?: { from: string; to: string }) => {
  return useQuery({
    queryKey: ['dashboard-analytics', dateRange],
    queryFn: () => dashboardService.getAnalytics(dateRange),
    staleTime: 60000,
  });
};

/**
 * Hook to fetch call volume
 */
export const useCallVolume = (period: 'week' | 'month' | 'year' = 'month') => {
  return useQuery({
    queryKey: ['call-volume', period],
    queryFn: () => dashboardService.getCallVolume(period),
    staleTime: 60000,
  });
};
