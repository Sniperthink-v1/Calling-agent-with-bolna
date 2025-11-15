import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '../services/campaignService';
import type { CampaignsListParams } from '../types';

/**
 * Hook to fetch campaigns
 */
export const useCampaigns = (params?: CampaignsListParams) => {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => campaignService.getCampaigns(params),
    staleTime: 60000,
  });
};

/**
 * Hook to fetch single campaign
 */
export const useCampaign = (campaignId: string) => {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaignService.getCampaign(campaignId),
    enabled: !!campaignId,
  });
};

/**
 * Hook to create campaign
 */
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignService.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

/**
 * Hook to update campaign
 */
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: any }) =>
      campaignService.updateCampaign(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

/**
 * Hook to start campaign
 */
export const useStartCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignService.startCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

/**
 * Hook to pause campaign
 */
export const usePauseCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: campaignService.pauseCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

/**
 * Hook to fetch campaign stats
 */
export const useCampaignStats = (campaignId: string) => {
  return useQuery({
    queryKey: ['campaign-stats', campaignId],
    queryFn: () => campaignService.getCampaignStats(campaignId),
    enabled: !!campaignId,
    staleTime: 30000,
  });
};
