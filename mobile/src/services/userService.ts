import apiClient from '../api/client';
import type { User, ApiResponse } from '../types';
import { normalizeUser } from '../utils/helpers';

export const userService = {
  /**
   * Get user profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/user/profile');
    
    // Handle array response format
    const rawData = response.data.data || response.data;
    if (Array.isArray(rawData)) {
      return normalizeUser(rawData[0]?.user || rawData[0]);
    }
    
    return normalizeUser((rawData as any).user || rawData);
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>('/user/profile', data);
    return normalizeUser(response.data.data!.user);
  },

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/user/stats');
    return response.data.data;
  },

  /**
   * Get credit balance
   */
  async getCredits(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ credits: number; userId: string }>>('/billing/credits');
    
    // Handle the response format: { success: true, data: { credits: number, userId: string } }
    const rawData = response.data.data || response.data;
    if (Array.isArray(rawData)) {
      return rawData[0]?.credits || rawData[0] || 0;
    }
    
    return (rawData as any).credits || 0;
  },

  /**
   * Get credit status (rate limited)
   */
  async getCreditStatus(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/user/credits/status');
    return response.data.data;
  },

  /**
   * Update password
   */
  async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.put('/user/password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  /**
   * Delete account
   */
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/user/account');
  },
};
