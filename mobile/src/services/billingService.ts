import apiClient from '../api/client';
import type { ApiResponse } from '../types';

export interface BillingTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'usage' | 'bonus' | 'refund';
  amount: number;
  balance_after: number;
  description: string;
  stripe_payment_id: string | null;
  call_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BillingStats {
  currentBalance: number;
  totalPurchased: number;
  totalUsed: number;
  totalBonus: number;
  averageCallCost: number;
  recentTransactions: BillingTransaction[];
}

export const billingService = {
  /**
   * Get billing statistics and recent transactions
   */
  async getStats(): Promise<BillingStats> {
    const response = await apiClient.get<ApiResponse<BillingStats>>('/billing/stats');
    
    // Handle array response format
    const rawData = response.data.data || response.data;
    if (Array.isArray(rawData)) {
      return rawData[0]?.data || rawData[0];
    }
    
    return (rawData as any).data || rawData;
  },

  /**
   * Get detailed transaction history
   */
  async getTransactions(params?: {
    limit?: number;
    offset?: number;
    type?: string;
  }): Promise<{ data: BillingTransaction[]; total: number }> {
    const response = await apiClient.get<ApiResponse<{ transactions: BillingTransaction[]; total: number }>>(
      '/billing/transactions',
      { params }
    );
    
    return response.data.data || { data: [], total: 0 };
  },
};
