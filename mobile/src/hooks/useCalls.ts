import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callService } from '../services/callService';
import type { CallsListParams } from '../types';

/**
 * Hook to fetch calls with pagination
 */
export const useCalls = (params?: CallsListParams) => {
  return useQuery({
    queryKey: ['calls', params],
    queryFn: () => callService.getCalls(params),
    staleTime: 30000, // Data is fresh for 30 seconds
  });
};

/**
 * Hook to fetch single call
 */
export const useCall = (callId: string) => {
  return useQuery({
    queryKey: ['call', callId],
    queryFn: () => callService.getCall(callId),
    enabled: !!callId,
  });
};

/**
 * Hook to initiate a call
 */
export const useInitiateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callService.initiateCall,
    onSuccess: () => {
      // Invalidate calls query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
  });
};

/**
 * Hook to fetch call stats
 */
export const useCallStats = () => {
  return useQuery({
    queryKey: ['call-stats'],
    queryFn: callService.getCallStats,
    staleTime: 60000, // Fresh for 1 minute
  });
};

/**
 * Hook to fetch recent calls
 */
export const useRecentCalls = (limit: number = 10) => {
  return useQuery({
    queryKey: ['recent-calls', limit],
    queryFn: () => callService.getRecentCalls(limit),
    staleTime: 30000,
  });
};

/**
 * Hook to fetch call transcript
 */
export const useCallTranscript = (callId: string) => {
  return useQuery({
    queryKey: ['call-transcript', callId],
    queryFn: () => callService.getCallTranscript(callId),
    enabled: !!callId,
    staleTime: Infinity, // Transcripts don't change
  });
};
