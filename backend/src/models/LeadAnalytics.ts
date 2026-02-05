import BaseModel, { BaseModelInterface } from './BaseModel';

// Lead Analytics model - defines lead scoring data structure
export interface LeadReasoning {
  intent: string;
  urgency: string;
  budget: string;
  fit: string;
  engagement: string;
  cta_behavior: string;
}

export interface LeadAnalyticsInterface extends BaseModelInterface {
  id: string;
  call_id: string;
  user_id: string; // NEW: Multi-tenant support
  phone_number: string; // NEW: Direct phone number reference
  analysis_type: 'individual' | 'complete' | 'human_edit'; // Distinguishes analysis type
  previous_calls_analyzed?: number; // NEW: For complete analysis
  latest_call_id?: string; // NEW: For complete analysis
  analysis_timestamp?: Date; // NEW: When analysis was performed
  intent_level: string;
  intent_score: number;
  urgency_level: string;
  urgency_score: number;
  budget_constraint: string;
  budget_score: number;
  fit_alignment: string;
  fit_score: number;
  engagement_health: string;
  engagement_score: number;
  total_score: number;
  lead_status_tag: string;
  reasoning: LeadReasoning;
  // Enhanced extraction columns
  company_name?: string;
  extracted_name?: string;
  extracted_email?: string;
  requirements?: string;
  custom_cta?: string;
  in_detail_summary?: string;
  transcript_summary?: string; // Bolna's AI-generated summary
  // New enhanced analytics fields
  smart_notification?: string;
  demo_book_datetime?: string;
  custom_fields?: Record<string, any>; // Business-specific custom fields
  created_at: Date;
}

export interface CreateLeadAnalyticsData {
  call_id: string;
  user_id: string; // Required for multi-tenant support
  phone_number: string; // Required
  analysis_type: 'individual' | 'complete' | 'human_edit'; // Required
  previous_calls_analyzed?: number; // Optional, for complete analysis
  latest_call_id?: string; // Optional, for complete analysis
  analysis_timestamp?: Date; // Optional, defaults to NOW()
  intent_level: string;
  intent_score: number;
  urgency_level: string;
  urgency_score: number;
  budget_constraint: string;
  budget_score: number;
  fit_alignment: string;
  fit_score: number;
  engagement_health: string;
  engagement_score: number;
  total_score: number;
  lead_status_tag: string;
  reasoning: LeadReasoning;
  // Enhanced extraction columns
  company_name?: string;
  extracted_name?: string;
  extracted_email?: string;
  requirements?: string;
  custom_cta?: string;
  in_detail_summary?: string;
  transcript_summary?: string; // Bolna's AI-generated summary
  // New enhanced analytics fields
  smart_notification?: string;
  demo_book_datetime?: string;
  custom_fields?: Record<string, any>; // Business-specific custom fields
}

export class LeadAnalyticsModel extends BaseModel<LeadAnalyticsInterface> {
  constructor() {
    super('lead_analytics');
  }

  /**
   * Find analytics by call ID
   */
  async findByCallId(callId: string): Promise<LeadAnalyticsInterface | null> {
    return await this.findOne({ call_id: callId });
  }

  /**
   * Create new lead analytics
   */
  async createAnalytics(analyticsData: CreateLeadAnalyticsData): Promise<LeadAnalyticsInterface> {
    return await this.create(analyticsData);
  }

  /**
   * Get analytics by score range
   */
  async findByScoreRange(minScore: number, maxScore: number): Promise<LeadAnalyticsInterface[]> {
    const query = `
      SELECT * FROM lead_analytics 
      WHERE total_score >= $1 AND total_score <= $2 
      ORDER BY total_score DESC
    `;
    const result = await this.query(query, [minScore, maxScore]);
    return result.rows;
  }

  /**
   * Get analytics by lead status
   */
  async findByLeadStatus(status: string): Promise<LeadAnalyticsInterface[]> {
    return await this.findBy({ lead_status_tag: status });
  }

  /**
   * Upsert complete analysis (insert or update based on user_id + phone_number)
   * Used for aggregated historical analysis across all calls
   */
  async upsertCompleteAnalysis(analyticsData: CreateLeadAnalyticsData): Promise<LeadAnalyticsInterface> {
    // Use ON CONFLICT to handle upsert atomically
    const query = `
      INSERT INTO lead_analytics (
        call_id, user_id, phone_number, analysis_type,
        previous_calls_analyzed, latest_call_id, analysis_timestamp,
        intent_level, intent_score,
        urgency_level, urgency_score,
        budget_constraint, budget_score,
        fit_alignment, fit_score,
        engagement_health, engagement_score,
        total_score, lead_status_tag,
        reasoning,
        company_name, extracted_name, extracted_email, requirements, custom_cta, in_detail_summary, transcript_summary,
        smart_notification, demo_book_datetime, custom_fields
      )
      VALUES (
        $1, $2, $3, 'complete',
        $4, $5, COALESCE($6, CURRENT_TIMESTAMP),
        $7, $8,
        $9, $10,
        $11, $12,
        $13, $14,
        $15, $16,
        $17, $18,
        $19,
        $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29
      )
      ON CONFLICT (user_id, phone_number, analysis_type) WHERE (analysis_type = 'complete')
      DO UPDATE SET
        call_id = EXCLUDED.call_id,
        previous_calls_analyzed = EXCLUDED.previous_calls_analyzed,
        latest_call_id = EXCLUDED.latest_call_id,
        intent_level = EXCLUDED.intent_level,
        intent_score = EXCLUDED.intent_score,
        urgency_level = EXCLUDED.urgency_level,
        urgency_score = EXCLUDED.urgency_score,
        budget_constraint = EXCLUDED.budget_constraint,
        budget_score = EXCLUDED.budget_score,
        fit_alignment = EXCLUDED.fit_alignment,
        fit_score = EXCLUDED.fit_score,
        engagement_health = EXCLUDED.engagement_health,
        engagement_score = EXCLUDED.engagement_score,
        total_score = EXCLUDED.total_score,
        lead_status_tag = EXCLUDED.lead_status_tag,
        reasoning = EXCLUDED.reasoning,
        company_name = EXCLUDED.company_name,
        extracted_name = EXCLUDED.extracted_name,
        extracted_email = EXCLUDED.extracted_email,
        requirements = EXCLUDED.requirements,
        custom_cta = EXCLUDED.custom_cta,
        in_detail_summary = EXCLUDED.in_detail_summary,
        transcript_summary = EXCLUDED.transcript_summary,
        smart_notification = EXCLUDED.smart_notification,
        demo_book_datetime = EXCLUDED.demo_book_datetime,
        custom_fields = EXCLUDED.custom_fields,
        analysis_timestamp = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const params = [
      analyticsData.call_id,
      analyticsData.user_id,
      analyticsData.phone_number,
      analyticsData.previous_calls_analyzed ?? null,
      analyticsData.latest_call_id ?? null,
      analyticsData.analysis_timestamp ?? null,
      analyticsData.intent_level,
      analyticsData.intent_score,
      analyticsData.urgency_level,
      analyticsData.urgency_score,
      analyticsData.budget_constraint,
      analyticsData.budget_score,
      analyticsData.fit_alignment,
      analyticsData.fit_score,
      analyticsData.engagement_health,
      analyticsData.engagement_score,
      analyticsData.total_score,
      analyticsData.lead_status_tag,
      JSON.stringify(analyticsData.reasoning),
      analyticsData.company_name ?? null,
      analyticsData.extracted_name ?? null,
      analyticsData.extracted_email ?? null,
      analyticsData.requirements ?? null,
      analyticsData.custom_cta ?? null,
      analyticsData.in_detail_summary ?? null,
      analyticsData.transcript_summary ?? null,
      analyticsData.smart_notification ?? null,
      analyticsData.demo_book_datetime ?? null,
      analyticsData.custom_fields ? JSON.stringify(analyticsData.custom_fields) : '{}',
    ];

    const result = await this.query(query, params);
    return result.rows[0];
  }

  /**
   * Get individual analyses for a specific contact (user_id + phone_number)
   */
  async getIndividualAnalysesByContact(
    userId: string,
    phoneNumber: string
  ): Promise<LeadAnalyticsInterface[]> {
    const query = `
      SELECT la.*, c.created_at as call_created_at
      FROM lead_analytics la
      INNER JOIN calls c ON la.call_id = c.id
      WHERE la.user_id = $1 
        AND la.phone_number = $2 
        AND la.analysis_type = 'individual'
      ORDER BY c.created_at ASC
    `;

    const result = await this.query(query, [userId, phoneNumber]);
    return result.rows;
  }

  /**
   * Get complete analysis for a specific contact (user_id + phone_number)
   */
  async getCompleteAnalysisByContact(
    userId: string,
    phoneNumber: string
  ): Promise<LeadAnalyticsInterface | null> {
    const query = `
      SELECT * FROM lead_analytics
      WHERE user_id = $1 
        AND phone_number = $2 
        AND analysis_type = 'complete'
      ORDER BY analysis_timestamp DESC
      LIMIT 1
    `;

    const result = await this.query(query, [userId, phoneNumber]);
    return result.rows[0] || null;
  }

  /**
   * Get all complete analyses for a user (across all phone numbers)
   */
  async getCompleteAnalysesByUser(userId: string): Promise<LeadAnalyticsInterface[]> {
    const query = `
      SELECT * FROM lead_analytics
      WHERE user_id = $1 
        AND analysis_type = 'complete'
      ORDER BY analysis_timestamp DESC
    `;

    const result = await this.query(query, [userId]);
    return result.rows;
  }
}

export default new LeadAnalyticsModel();