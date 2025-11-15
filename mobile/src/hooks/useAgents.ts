import { useQuery } from '@tanstack/react-query';
import { agentService } from '../services/agentService';

/**
 * Hook to fetch agents
 */
export const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: agentService.getAgents,
    staleTime: 60000, // Fresh for 1 minute
  });
};

/**
 * Hook to fetch single agent
 */
export const useAgent = (agentId: string) => {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentService.getAgent(agentId),
    enabled: !!agentId,
  });
};

/**
 * Hook to fetch available voices
 */
export const useAvailableVoices = () => {
  return useQuery({
    queryKey: ['available-voices'],
    queryFn: agentService.getAvailableVoices,
    staleTime: Infinity, // Voices don't change often
  });
};
