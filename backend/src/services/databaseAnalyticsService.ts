/**
 * Database Analytics Service
 * Provides real analytics data from PostgreSQL database
 * Replaces mock data with actual queries
 */

import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface UserGrowthData {
  date: string;
  newUsers: number;
  totalUsers: number;
}

export interface CallVolumeData {
  date: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
}

export interface HourlyUsageData {
  hour: string;
  calls: number;
  users: number;
}

export interface UserTierDistribution {
  name: string;
  value: number;
  color: string;
}

export interface AgentTypeDistribution {
  name: string;
  value: number;
  color: string;
}

export interface CreditUsageTrend {
  date: string;
  used: number;
  added: number;
  remaining: number;
}

export interface TopPerformingAgent {
  agentId: string;
  agentName: string;
  userId: string;
  userEmail: string;
  callCount: number;
  successRate: number;
  averageDuration: number;
}

export interface LeadAnalytics {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  conversionRate: number;
  averageScore: number;
}

class DatabaseAnalyticsService {
  /**
   * Get user growth data over time
   */
  async getUserGrowthData(days: number = 30): Promise<UserGrowthData[]> {
    try {
      const query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${days} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        daily_registrations AS (
          SELECT 
            DATE(created_at) AS date,
            COUNT(*) AS new_users
          FROM users
          WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
        ),
        cumulative_users AS (
          SELECT
            ds.date,
            COALESCE(dr.new_users, 0) AS new_users,
            (
              SELECT COUNT(*)
              FROM users
              WHERE DATE(created_at) <= ds.date
            ) AS total_users
          FROM date_series ds
          LEFT JOIN daily_registrations dr ON ds.date = dr.date
          ORDER BY ds.date
        )
        SELECT 
          TO_CHAR(date, 'YYYY-MM-DD') AS date,
          new_users AS "newUsers",
          total_users AS "totalUsers"
        FROM cumulative_users
        ORDER BY date;
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user growth data:', error);
      return [];
    }
  }

  /**
   * Get call volume data over time
   */
  async getCallVolumeData(days: number = 30): Promise<CallVolumeData[]> {
    try {
      const query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${days} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        daily_calls AS (
          SELECT 
            DATE(created_at) AS date,
            COUNT(*) AS total_calls,
            COUNT(*) FILTER (WHERE status = 'completed') AS successful_calls,
            COUNT(*) FILTER (WHERE status IN ('failed', 'no-answer', 'busy')) AS failed_calls
          FROM calls
          WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
        )
        SELECT 
          TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
          COALESCE(dc.total_calls, 0) AS "totalCalls",
          COALESCE(dc.successful_calls, 0) AS "successfulCalls",
          COALESCE(dc.failed_calls, 0) AS "failedCalls",
          CASE 
            WHEN COALESCE(dc.total_calls, 0) > 0 
            THEN ROUND((COALESCE(dc.successful_calls, 0)::numeric / dc.total_calls * 100), 2)
            ELSE 0 
          END AS "successRate"
        FROM date_series ds
        LEFT JOIN daily_calls dc ON ds.date = dc.date
        ORDER BY ds.date;
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get call volume data:', error);
      return [];
    }
  }

  /**
   * Get hourly usage patterns (last 24 hours)
   */
  async getHourlyUsageData(): Promise<HourlyUsageData[]> {
    try {
      const query = `
        WITH hour_series AS (
          SELECT generate_series(0, 23) AS hour
        ),
        hourly_calls AS (
          SELECT 
            EXTRACT(HOUR FROM created_at) AS hour,
            COUNT(*) AS calls
          FROM calls
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY EXTRACT(HOUR FROM created_at)
        ),
        hourly_users AS (
          SELECT 
            EXTRACT(HOUR FROM last_login) AS hour,
            COUNT(DISTINCT id) AS users
          FROM users
          WHERE last_login >= NOW() - INTERVAL '24 hours'
          GROUP BY EXTRACT(HOUR FROM last_login)
        )
        SELECT 
          LPAD(hs.hour::text, 2, '0') || ':00' AS hour,
          COALESCE(hc.calls, 0) AS calls,
          COALESCE(hu.users, 0) AS users
        FROM hour_series hs
        LEFT JOIN hourly_calls hc ON hs.hour = hc.hour
        LEFT JOIN hourly_users hu ON hs.hour = hu.hour
        ORDER BY hs.hour;
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get hourly usage data:', error);
      return [];
    }
  }

  /**
   * Get user tier distribution
   * Note: Adjust based on how you store user tiers in your schema
   */
  async getUserTierDistribution(): Promise<UserTierDistribution[]> {
    try {
      // If you have a tier column, use it. Otherwise, infer from credits
      const query = `
        WITH user_tiers AS (
          SELECT 
            CASE 
              WHEN credits >= 10000 THEN 'Enterprise'
              WHEN credits >= 1000 THEN 'Pro'
              ELSE 'Free'
            END AS tier
          FROM users
        )
        SELECT 
          tier AS name,
          COUNT(*) AS value,
          CASE tier
            WHEN 'Enterprise' THEN '#FFBB28'
            WHEN 'Pro' THEN '#00C49F'
            WHEN 'Free' THEN '#0088FE'
          END AS color
        FROM user_tiers
        GROUP BY tier
        ORDER BY 
          CASE tier
            WHEN 'Enterprise' THEN 1
            WHEN 'Pro' THEN 2
            WHEN 'Free' THEN 3
          END;
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user tier distribution:', error);
      return [
        { name: 'Free', value: 0, color: '#0088FE' },
        { name: 'Pro', value: 0, color: '#00C49F' },
        { name: 'Enterprise', value: 0, color: '#FFBB28' }
      ];
    }
  }

  /**
   * Get agent type distribution
   */
  async getAgentTypeDistribution(): Promise<AgentTypeDistribution[]> {
    try {
      const query = `
        SELECT 
          COALESCE(agent_type, 'call') AS name,
          COUNT(*) AS value,
          CASE COALESCE(agent_type, 'call')
            WHEN 'call' THEN '#0088FE'
            WHEN 'chat' THEN '#00C49F'
            ELSE '#FFBB28'
          END AS color
        FROM agents
        GROUP BY agent_type
        ORDER BY COUNT(*) DESC;
      `;

      const result = await pool.query(query);
      return result.rows.length > 0 ? result.rows : [
        { name: 'Sales', value: 0, color: '#0088FE' }
      ];
    } catch (error) {
      logger.error('Failed to get agent type distribution:', error);
      return [{ name: 'Sales', value: 0, color: '#0088FE' }];
    }
  }

  /**
   * Get credit usage trends over time
   */
  async getCreditUsageTrends(days: number = 30): Promise<CreditUsageTrend[]> {
    try {
      const query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${days} days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS date
        ),
        daily_transactions AS (
          SELECT 
            DATE(created_at) AS date,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS added,
            ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) AS used
          FROM credit_transactions
          WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
        )
        SELECT 
          TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
          COALESCE(dt.used, 0) AS used,
          COALESCE(dt.added, 0) AS added,
          (
            SELECT COALESCE(SUM(credits), 0)
            FROM users
          ) AS remaining
        FROM date_series ds
        LEFT JOIN daily_transactions dt ON ds.date = dt.date
        ORDER BY ds.date;
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get credit usage trends:', error);
      return [];
    }
  }

  /**
   * Get top performing agents
   */
  async getTopPerformingAgents(limit: number = 10): Promise<TopPerformingAgent[]> {
    try {
      const query = `
        SELECT 
          a.id AS "agentId",
          a.name AS "agentName",
          a.user_id AS "userId",
          u.email AS "userEmail",
          COUNT(c.id) AS "callCount",
          ROUND(
            (COUNT(*) FILTER (WHERE c.status = 'completed')::numeric / 
            NULLIF(COUNT(*), 0) * 100), 2
          ) AS "successRate",
          ROUND(AVG(c.duration_seconds), 2) AS "averageDuration"
        FROM agents a
        INNER JOIN users u ON a.user_id = u.id
        LEFT JOIN calls c ON a.id = c.agent_id
        WHERE c.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY a.id, a.name, a.user_id, u.email
        HAVING COUNT(c.id) > 0
        ORDER BY "callCount" DESC, "successRate" DESC
        LIMIT $1;
      `;

      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get top performing agents:', error);
      return [];
    }
  }

  /**
   * Get lead analytics from lead_analytics table
   */
  async getLeadAnalytics(): Promise<LeadAnalytics> {
    try {
      const query = `
        SELECT 
          COUNT(*) AS "totalLeads",
          COUNT(*) FILTER (WHERE lead_status_tag = 'Hot') AS "hotLeads",
          COUNT(*) FILTER (WHERE lead_status_tag = 'Warm') AS "warmLeads",
          COUNT(*) FILTER (WHERE lead_status_tag = 'Cold') AS "coldLeads",
          ROUND(
            (COUNT(*) FILTER (WHERE lead_status_tag = 'Hot')::numeric / 
            NULLIF(COUNT(*), 0) * 100), 2
          ) AS "conversionRate",
          ROUND(AVG(total_score), 2) AS "averageScore"
        FROM lead_analytics
        WHERE created_at >= NOW() - INTERVAL '30 days';
      `;

      const result = await pool.query(query);
      return result.rows[0] || {
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        conversionRate: 0,
        averageScore: 0
      };
    } catch (error) {
      logger.error('Failed to get lead analytics:', error);
      return {
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        conversionRate: 0,
        averageScore: 0
      };
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) AS "totalCampaigns",
          COUNT(*) FILTER (WHERE status = 'active') AS "activeCampaigns",
          COUNT(*) FILTER (WHERE status = 'completed') AS "completedCampaigns",
          COUNT(*) FILTER (WHERE status = 'paused') AS "pausedCampaigns",
          ROUND(AVG(
            CASE 
              WHEN total_contacts > 0 
              THEN (completed_calls::numeric / total_contacts * 100)
              ELSE 0 
            END
          ), 2) AS "averageCompletionRate"
        FROM call_campaigns
        WHERE created_at >= NOW() - INTERVAL '30 days';
      `;

      const result = await pool.query(query);
      return result.rows[0] || {
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        pausedCampaigns: 0,
        averageCompletionRate: 0
      };
    } catch (error) {
      logger.error('Failed to get campaign stats:', error);
      return {
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        pausedCampaigns: 0,
        averageCompletionRate: 0
      };
    }
  }

  /**
   * Get active users count (logged in within last 7 days)
   */
  async getActiveUsersCount(): Promise<number> {
    try {
      const query = `
        SELECT COUNT(DISTINCT id) AS count
        FROM users
        WHERE last_login >= NOW() - INTERVAL '7 days';
      `;

      const result = await pool.query(query);
      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Failed to get active users count:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary(days: number = 30) {
    try {
      const [
        userGrowth,
        callVolume,
        hourlyUsage,
        userTiers,
        agentTypes,
        creditTrends,
        topAgents,
        leadAnalytics,
        campaignStats,
        activeUsers
      ] = await Promise.all([
        this.getUserGrowthData(days),
        this.getCallVolumeData(days),
        this.getHourlyUsageData(),
        this.getUserTierDistribution(),
        this.getAgentTypeDistribution(),
        this.getCreditUsageTrends(days),
        this.getTopPerformingAgents(10),
        this.getLeadAnalytics(),
        this.getCampaignStats(),
        this.getActiveUsersCount()
      ]);

      return {
        userGrowth,
        callVolume,
        hourlyUsage,
        userTiers,
        agentTypes,
        creditTrends,
        topAgents,
        leadAnalytics,
        campaignStats,
        activeUsers
      };
    } catch (error) {
      logger.error('Failed to get analytics summary:', error);
      throw error;
    }
  }
}

export const databaseAnalyticsService = new DatabaseAnalyticsService();
