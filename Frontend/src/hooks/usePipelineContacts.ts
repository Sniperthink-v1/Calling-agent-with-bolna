/**
 * usePipelineContacts Hook
 * 
 * Fetches contacts with quality badges for the pipeline/kanban view.
 * Quality badges (Hot/Warm/Cold) are derived from lead_analytics.
 * Uses user's custom lead stages from useLeadStages hook.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { useLeadStages } from './useLeadStages';
import type { Contact, LeadStage } from '../types';

// Extended contact with quality badge info
export interface PipelineContact extends Contact {
  qualityBadge: 'Hot' | 'Warm' | 'Cold' | null;
  totalScore: number | null;
}

// Grouped contacts by stage
export interface PipelineData {
  [stageName: string]: PipelineContact[];
}

interface PipelineApiResponse {
  success: boolean;
  data: {
    contacts: PipelineContact[];
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UsePipelineContactsReturn {
  // Data
  contacts: PipelineContact[];
  pipelineData: PipelineData;
  stages: LeadStage[];
  
  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  
  // Error
  error: Error | null;
  
  // Actions
  refetch: () => Promise<void>;
  moveContact: (contactId: string, newStage: string) => Promise<boolean>;
  
  // Utilities
  getContactsByStage: (stageName: string) => PipelineContact[];
  getStageCount: (stageName: string) => number;
}

export const usePipelineContacts = (searchTerm?: string): UsePipelineContactsReturn => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Get user's custom lead stages (already sorted by order)
  const { stages: leadStages, loading: stagesLoading } = useLeadStages();

  // Fetch pipeline contacts
  const {
    data: apiResponse,
    isLoading,
    isFetching,
    error,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: ['pipeline-contacts', user?.id, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await apiService.get<PipelineApiResponse>(
        `/contacts/pipeline${params.toString() ? `?${params.toString()}` : ''}`
      );
      
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - pipeline view needs fresher data
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Extract contacts from the response and normalize field names
  // queryFn returns response.data, which is: { contacts: [...] } (the inner data)
  // Also handles snake_case (lead_stage) to camelCase (leadStage) conversion
  const rawContacts = Array.isArray((apiResponse as any)?.contacts) 
    ? (apiResponse as any).contacts 
    : Array.isArray(apiResponse?.data?.contacts) 
      ? apiResponse.data.contacts 
      : Array.isArray(apiResponse?.data) 
        ? apiResponse.data 
        : Array.isArray(apiResponse) 
          ? apiResponse 
          : [];

  // Normalize contacts to ensure leadStage is populated from lead_stage if needed
  const contacts: PipelineContact[] = rawContacts.map((contact: any) => ({
    ...contact,
    // Handle both camelCase and snake_case versions of lead_stage
    leadStage: contact.leadStage ?? contact.lead_stage ?? null,
    leadStageUpdatedAt: contact.leadStageUpdatedAt ?? contact.lead_stage_updated_at ?? null,
  }));

  // Helper to get lead stage value (handles null/undefined)
  const getContactStage = (contact: PipelineContact): string | null => {
    return contact.leadStage ?? null;
  };

  // Find unassigned contacts first (no stage or stage no longer exists)
  const unassignedContacts = contacts.filter(contact => {
    const stage = getContactStage(contact);
    return !stage || !leadStages.some(s => s.name === stage);
  });

  // Build pipeline data with "Not Assigned" first, then user's custom stages sorted by order
  const pipelineData: PipelineData = {
    // Always show "Not Assigned" as the first column
    'Not Assigned': unassignedContacts,
    // Then add all user's custom stages
    ...leadStages.reduce((acc, stage) => {
      acc[stage.name] = contacts.filter(contact => getContactStage(contact) === stage.name);
      return acc;
    }, {} as PipelineData),
  };

  // Move contact mutation (using the existing bulk update endpoint)
  const moveContactMutation = useMutation({
    mutationFn: async ({ contactId, newStage }: { contactId: string; newStage: string }) => {
      // If moving to "Not Assigned", set stage to null
      const stageValue = newStage === 'Not Assigned' ? null : newStage;
      const response = await apiService.post<{ success: boolean; data: { updatedCount: number } }>(
        '/lead-stages/bulk-update',
        { contactIds: [contactId], stage: stageValue }
      );
      // API returns { success: true, data: { updatedCount: N } }
      return response.data?.data?.updatedCount ?? response.data?.updatedCount ?? 0;
    },
    onMutate: async ({ contactId, newStage }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['pipeline-contacts', user?.id] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['pipeline-contacts', user?.id, searchTerm]);
      
      // Optimistically update the cache (set to null if "Not Assigned")
      const actualStage = newStage === 'Not Assigned' ? null : newStage;
      queryClient.setQueryData(
        ['pipeline-contacts', user?.id, searchTerm],
        (old: PipelineApiResponse | PipelineContact[] | undefined) => {
          if (!old) return old;
          
          // Handle different response structures:
          // 1. Array of contacts directly
          // 2. { contacts: [...], total: ... } - API response format
          // 3. { data: { contacts: [...] } } - wrapped format
          let oldContacts: PipelineContact[] | undefined;
          if (Array.isArray(old)) {
            oldContacts = old;
          } else if (Array.isArray((old as any).contacts)) {
            oldContacts = (old as any).contacts;
          } else if (Array.isArray((old as any).data?.contacts)) {
            oldContacts = (old as any).data.contacts;
          }
          
          if (!oldContacts) {
            console.warn('[onMutate] Could not find contacts array in cache:', old);
            return old;
          }
          
          const updatedContacts = oldContacts.map(contact =>
            contact.id === contactId
              ? { ...contact, leadStage: actualStage, leadStageUpdatedAt: new Date().toISOString() }
              : contact
          );
          
          // Return in the same structure as the input
          if (Array.isArray(old)) {
            return updatedContacts;
          } else if (Array.isArray((old as any).contacts)) {
            return { ...old, contacts: updatedContacts };
          } else {
            return { ...old, data: { ...(old as any).data, contacts: updatedContacts } };
          }
        }
      );
      
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ['pipeline-contacts', user?.id, searchTerm],
          context.previousData
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: ['pipeline-contacts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-stages-stats'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] });
    },
  });

  // Actions
  const refetch = async (): Promise<void> => {
    await refetchQuery();
  };

  const moveContact = async (contactId: string, newStage: string): Promise<boolean> => {
    try {
      console.log('[moveContact] Starting mutation for contactId:', contactId, 'newStage:', newStage);
      const result = await moveContactMutation.mutateAsync({ contactId, newStage });
      console.log('[moveContact] Mutation result:', result);
      return result > 0;
    } catch (error) {
      console.error('[moveContact] Failed to move contact:', error);
      return false;
    }
  };

  // Utilities
  const getContactsByStage = (stageName: string): PipelineContact[] => {
    return pipelineData[stageName] || [];
  };

  const getStageCount = (stageName: string): number => {
    return (pipelineData[stageName] || []).length;
  };

  // Include "Not Assigned" as a virtual stage at the beginning
  const NOT_ASSIGNED_STAGE: LeadStage = { name: 'Not Assigned', color: '#6B7280', order: -1 };
  const allStages = [NOT_ASSIGNED_STAGE, ...leadStages];

  return {
    contacts,
    pipelineData,
    stages: allStages,
    isLoading: isLoading || stagesLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    moveContact,
    getContactsByStage,
    getStageCount,
  };
};

export default usePipelineContacts;
