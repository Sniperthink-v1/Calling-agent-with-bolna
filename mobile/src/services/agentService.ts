import apiClient from '../api/client';
import type { Agent, ApiResponse } from '../types';
import { normalizeAgent } from '../utils/helpers';

export const agentService = {
  /**
   * Get list of agents
   */
  async getAgents(): Promise<Agent[]> {
    const response = await apiClient.get<ApiResponse<Agent[]>>('/agents');
    const agents = response.data.data || [];
    return agents.map(normalizeAgent);
  },

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent> {
    const response = await apiClient.get<ApiResponse<Agent>>(`/agents/${agentId}`);
    return normalizeAgent(response.data.data!);
  },

  /**
   * Create a new agent
   */
  async createAgent(data: {
    name: string;
    agent_type: 'call' | 'chat';
    description?: string;
    bolna_agent_id: string;
  }): Promise<Agent> {
    const response = await apiClient.post<ApiResponse<Agent>>('/agents', data);
    return normalizeAgent(response.data.data!);
  },

  /**
   * Update agent
   */
  async updateAgent(agentId: string, data: Partial<Agent>): Promise<Agent> {
    const response = await apiClient.put<ApiResponse<Agent>>(`/agents/${agentId}`, data);
    return normalizeAgent(response.data.data!);
  },

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    await apiClient.delete(`/agents/${agentId}`);
  },

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, isActive: boolean): Promise<Agent> {
    const response = await apiClient.patch<ApiResponse<Agent>>(`/agents/${agentId}/status`, {
      is_active: isActive,
    });
    return normalizeAgent(response.data.data!);
  },

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/agents/voices');
    return response.data.data || [];
  },

  /**
   * Test Bolna.ai connection
   */
  async testBolnaConnection(): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<{ connected: boolean }>>(
        '/agents/test-bolna'
      );
      return response.data.data?.connected || false;
    } catch (error) {
      return false;
    }
  },
};
