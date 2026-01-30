import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

export interface ContactFilterOptions {
  tags: string[];
  lastStatus: string[];
  callType: string[];
  source: string[];
  city: string[];
  country: string[];
  leadStage: string[];
}

export interface UseContactFilterOptionsReturn {
  filterOptions: ContactFilterOptions;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch all distinct filter options for contacts.
 * This queries the backend for ALL unique values across a user's contacts,
 * not just the currently loaded/paginated contacts.
 */
export const useContactFilterOptions = (): UseContactFilterOptionsReturn => {
  const { user } = useAuth();

  const {
    data: filterOptions,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contact-filter-options', user?.id],
    queryFn: async () => {
      const response = await apiService.getContactFilterOptions();
      return response.data || {
        tags: [],
        lastStatus: [],
        callType: [],
        source: [],
        city: [],
        country: [],
        leadStage: [],
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - filter options don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  const defaultOptions: ContactFilterOptions = {
    tags: [],
    lastStatus: [],
    callType: [],
    source: [],
    city: [],
    country: [],
    leadStage: [],
  };

  return {
    filterOptions: filterOptions || defaultOptions,
    loading,
    error: error instanceof Error ? error.message : null,
    refetch: () => refetch(),
  };
};
