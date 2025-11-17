import { useQuery } from '@tanstack/react-query';
import { adminApiService } from '../services/adminApiService';

export interface SystemHealthData {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    api: 'healthy' | 'warning' | 'critical';
    uptime: 'healthy' | 'warning' | 'critical';
    errors: 'healthy' | 'warning' | 'critical';
    connections: 'healthy' | 'warning' | 'critical';
  };
  metrics: {
    responseTime: {
      average: number;
      p95: number;
      status: 'healthy' | 'warning' | 'critical';
      unit: string;
    };
    uptime: {
      percentage: number;
      seconds: number;
      hours: number;
      status: 'healthy' | 'warning' | 'critical';
    };
    errorRate: {
      percentage: number;
      totalErrors: number;
      status: 'healthy' | 'warning' | 'critical';
    };
    connections: {
      active: number;
      status: 'healthy' | 'warning' | 'critical';
    };
    requests: {
      total: number;
      perMinute: number;
      successRate: number;
    };
    insights?: {
      statusBreakdown: {
        '2xx': number;
        '4xx': number;
        '5xx': number;
      };
      slowestEndpoints?: Array<{
        path: string;
        avgDuration: number;
        count: number;
      }>;
    };
  };
  system?: {
    cpu: {
      usage: number;
      cores: number;
      loadAverage: number[];
    };
    memory: {
      total: number;
      used: number;
      free: number;
      usagePercentage: number;
    };
    disk?: {
      total: number;
      used: number;
      free: number;
      usagePercentage: number;
    };
  };
}

export interface UseSystemHealthReturn {
  healthData: SystemHealthData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useSystemHealth = (
  options: {
    refetchInterval?: number;
    enabled?: boolean;
  } = {}
): UseSystemHealthReturn => {
  const { refetchInterval = 30000, enabled = true } = options;

  const {
    data: response,
    isLoading,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: ['admin', 'health', 'system'],
    queryFn: async () => {
      const response = await adminApiService.getSystemHealth();
      return response;
    },
    refetchInterval,
    staleTime: 15000,
    enabled,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const healthData = response?.data || null;

  const refetch = async () => {
    await refetchQuery();
  };

  return {
    healthData,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

export default useSystemHealth;
