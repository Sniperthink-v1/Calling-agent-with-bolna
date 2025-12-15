import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import { PREDEFINED_LEAD_STAGES } from '../types/api';
import type { LeadStage, LeadStageStats, ApiError } from '../types';

export interface UseLeadStagesReturn {
  // Data
  stages: LeadStage[];
  predefinedStages: LeadStage[];
  stats: LeadStageStats[];
  
  // Loading states
  loading: boolean;
  loadingStats: boolean;
  
  // Error states
  error: string | null;
  statsError: string | null;
  
  // Mutation states
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  bulkUpdating: boolean;
  reordering: boolean;
  replacingAll: boolean;
  
  // Actions
  addStage: (name: string, color?: string) => Promise<LeadStage[] | null>;
  updateStage: (oldName: string, newName?: string, color?: string) => Promise<LeadStage[] | null>;
  deleteStage: (name: string) => Promise<LeadStage[] | null>;
  reorderStages: (orderedStageNames: string[]) => Promise<LeadStage[] | null>;
  replaceAllStages: (stages: LeadStage[]) => Promise<LeadStage[] | null>;
  resetToDefaults: () => Promise<LeadStage[] | null>;
  bulkUpdateLeadStage: (contactIds: string[], stage: string | null) => Promise<number | null>;
  refreshStages: () => Promise<void>;
  refreshStats: () => Promise<void>;
  
  // Utilities
  getStageColor: (stageName: string) => string;
  getStageByName: (stageName: string) => LeadStage | undefined;
  clearError: () => void;
}

export const useLeadStages = (): UseLeadStagesReturn => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Helper function to handle API errors
  const handleError = (error: unknown, operation: string): string => {
    console.error(`Error in ${operation}:`, error);
    
    let errorMessage = `Failed to ${operation}`;
    
    if (error instanceof Error) {
      const apiError = error as ApiError;
      if (apiError.code === 'UNAUTHORIZED') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (apiError.code === 'CONFLICT') {
        errorMessage = apiError.message || 'Stage already exists';
      } else if (apiError.code === 'FORBIDDEN') {
        errorMessage = apiError.message || 'Cannot perform this action';
      } else {
        errorMessage = apiError.message || errorMessage;
      }
    }
    
    return errorMessage;
  };

  // Query for all stages
  const {
    data: stagesData,
    isLoading: loading,
    error: stagesError,
    refetch: refetchStages,
  } = useQuery({
    queryKey: ['lead-stages', user?.id],
    queryFn: async () => {
      const response = await apiService.get<{
        stages: LeadStage[];
        predefinedStages: LeadStage[];
      }>('/lead-stages');
      
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Query for stage stats
  const {
    data: statsData,
    isLoading: loadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['lead-stages-stats', user?.id],
    queryFn: async () => {
      const response = await apiService.get<LeadStageStats[]>('/lead-stages/stats');
      
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Add stage mutation
  const addStageMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const response = await apiService.post<LeadStage[]>('/lead-stages', { name, color });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-stages'] });
    },
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ 
      oldName, 
      newName, 
      color 
    }: { 
      oldName: string; 
      newName?: string; 
      color?: string;
    }) => {
      const response = await apiService.put<LeadStage[]>(
        `/lead-stages/${encodeURIComponent(oldName)}`,
        { newName, color }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-stages'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['lead-stages-stats'] });
    },
  });

  // Delete stage mutation
  const deleteStageMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiService.delete<LeadStage[]>(`/lead-stages/${encodeURIComponent(name)}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-stages'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['lead-stages-stats'] });
    },
  });

  // Reorder stages mutation (for drag-and-drop)
  const reorderStagesMutation = useMutation({
    mutationFn: async (orderedStageNames: string[]) => {
      const response = await apiService.put<LeadStage[]>('/lead-stages/reorder', { orderedStageNames });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-stages'] });
    },
  });

  // Replace all stages mutation (for popup save)
  const replaceAllStagesMutation = useMutation({
    mutationFn: async (stages: LeadStage[]) => {
      const response = await apiService.put<LeadStage[]>('/lead-stages/replace-all', { stages });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-stages'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['lead-stages-stats'] });
    },
  });

  // Reset to defaults mutation
  const resetToDefaultsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiService.post<LeadStage[]>('/lead-stages/reset-to-defaults', {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-stages'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['lead-stages-stats'] });
    },
  });

  // Bulk update lead stage mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ 
      contactIds, 
      stage 
    }: { 
      contactIds: string[]; 
      stage: string | null;
    }) => {
      const response = await apiService.post<{ updatedCount: number }>(
        '/lead-stages/bulk-update',
        { contactIds, stage }
      );
      return response.data?.updatedCount ?? 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['lead-stages-stats'] });
    },
  });

  // Action handlers
  const addStage = async (name: string, color?: string): Promise<LeadStage[] | null> => {
    try {
      return await addStageMutation.mutateAsync({ name, color });
    } catch (error) {
      handleError(error, 'add stage');
      return null;
    }
  };

  const updateStage = async (
    oldName: string, 
    newName?: string, 
    color?: string
  ): Promise<LeadStage[] | null> => {
    try {
      return await updateStageMutation.mutateAsync({ oldName, newName, color });
    } catch (error) {
      handleError(error, 'update stage');
      return null;
    }
  };

  const deleteStage = async (name: string): Promise<LeadStage[] | null> => {
    try {
      return await deleteStageMutation.mutateAsync(name);
    } catch (error) {
      handleError(error, 'delete stage');
      return null;
    }
  };

  const reorderStages = async (orderedStageNames: string[]): Promise<LeadStage[] | null> => {
    try {
      return await reorderStagesMutation.mutateAsync(orderedStageNames);
    } catch (error) {
      handleError(error, 'reorder stages');
      return null;
    }
  };

  const replaceAllStages = async (stages: LeadStage[]): Promise<LeadStage[] | null> => {
    try {
      return await replaceAllStagesMutation.mutateAsync(stages);
    } catch (error) {
      handleError(error, 'update all stages');
      return null;
    }
  };

  const resetToDefaults = async (): Promise<LeadStage[] | null> => {
    try {
      return await resetToDefaultsMutation.mutateAsync();
    } catch (error) {
      handleError(error, 'reset stages to defaults');
      return null;
    }
  };

  const bulkUpdateLeadStage = async (
    contactIds: string[], 
    stage: string | null
  ): Promise<number | null> => {
    try {
      return await bulkUpdateMutation.mutateAsync({ contactIds, stage });
    } catch (error) {
      handleError(error, 'bulk update lead stage');
      return null;
    }
  };

  const refreshStages = async (): Promise<void> => {
    await refetchStages();
  };

  const refreshStats = async (): Promise<void> => {
    await refetchStats();
  };

  // Utility functions
  const getStageColor = (stageName: string): string => {
    if (!stageName) return '#6B7280'; // Gray for unassigned
    
    // Check in user's stages (sorted by order)
    const stage = stagesData?.stages?.find(
      s => s.name.toLowerCase() === stageName.toLowerCase()
    );
    if (stage) return stage.color;
    
    // Check predefined stages as fallback
    const predefinedStage = PREDEFINED_LEAD_STAGES.find(
      s => s.name.toLowerCase() === stageName.toLowerCase()
    );
    if (predefinedStage) return predefinedStage.color;
    
    return '#6B7280'; // Gray as fallback
  };

  const getStageByName = (stageName: string): LeadStage | undefined => {
    return stagesData?.stages?.find(
      s => s.name.toLowerCase() === stageName.toLowerCase()
    );
  };

  const clearError = (): void => {
    // Errors are automatically cleared on next query
  };

  return {
    // Data - stages already sorted by order from backend
    stages: stagesData?.stages || [],
    predefinedStages: stagesData?.predefinedStages || PREDEFINED_LEAD_STAGES,
    stats: statsData || [],
    
    // Loading states
    loading,
    loadingStats,
    
    // Error states
    error: stagesError ? handleError(stagesError, 'load stages') : null,
    statsError: statsError ? handleError(statsError, 'load stats') : null,
    
    // Mutation states
    creating: addStageMutation.isPending,
    updating: updateStageMutation.isPending,
    deleting: deleteStageMutation.isPending,
    bulkUpdating: bulkUpdateMutation.isPending,
    reordering: reorderStagesMutation.isPending,
    replacingAll: replaceAllStagesMutation.isPending || resetToDefaultsMutation.isPending,
    
    // Actions
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    replaceAllStages,
    resetToDefaults,
    bulkUpdateLeadStage,
    refreshStages,
    refreshStats,
    
    // Utilities
    getStageColor,
    getStageByName,
    clearError,
  };
};

export default useLeadStages;
