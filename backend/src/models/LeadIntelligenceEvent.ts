import BaseModel, { BaseModelInterface } from './BaseModel';

export type EventActorType = 'owner' | 'team_member' | 'ai' | 'system';
export type LeadEventType = 'edit' | 'assign' | 'note' | 'status_change' | 'call' | 'email' | 'meeting';

export interface FieldChange {
  old: string | number | boolean | null;
  new: string | number | boolean | null;
}

export interface LeadIntelligenceEventInterface extends BaseModelInterface {
  id: string;
  tenant_user_id: string;
  phone_number?: string | null;
  lead_analytics_id?: string | null;
  actor_type: EventActorType;
  actor_id?: string | null;
  actor_name: string;
  event_type: LeadEventType;
  field_changes: Record<string, FieldChange>;
  notes?: string | null;
  created_at: Date;
}

export class LeadIntelligenceEventModel extends BaseModel<LeadIntelligenceEventInterface> {
  constructor() {
    super('lead_intelligence_events');
  }

  /**
   * Create an edit event
   */
  async createEditEvent(data: {
    tenant_user_id: string;
    phone_number?: string;
    lead_analytics_id?: string;
    actor_type: EventActorType;
    actor_id?: string;
    actor_name: string;
    field_changes: Record<string, FieldChange>;
    notes?: string;
  }): Promise<LeadIntelligenceEventInterface> {
    return await this.create({
      ...data,
      event_type: 'edit',
      field_changes: data.field_changes || {}
    });
  }

  /**
   * Create an assignment event
   */
  async createAssignEvent(data: {
    tenant_user_id: string;
    phone_number?: string;
    lead_analytics_id?: string;
    actor_type: EventActorType;
    actor_id?: string;
    actor_name: string;
    assigned_to_name: string;
    notes?: string;
  }): Promise<LeadIntelligenceEventInterface> {
    return await this.create({
      tenant_user_id: data.tenant_user_id,
      phone_number: data.phone_number,
      lead_analytics_id: data.lead_analytics_id,
      actor_type: data.actor_type,
      actor_id: data.actor_id,
      actor_name: data.actor_name,
      event_type: 'assign',
      field_changes: {
        assigned_to: {
          old: null,
          new: data.assigned_to_name
        }
      },
      notes: data.notes
    });
  }

  /**
   * Create a note event
   */
  async createNoteEvent(data: {
    tenant_user_id: string;
    phone_number?: string;
    lead_analytics_id?: string;
    actor_type: EventActorType;
    actor_id?: string;
    actor_name: string;
    notes: string;
  }): Promise<LeadIntelligenceEventInterface> {
    return await this.create({
      ...data,
      event_type: 'note',
      field_changes: {}
    });
  }

  /**
   * Get events for a lead by phone number
   */
  async getEventsByPhone(tenantUserId: string, phoneNumber: string, limit: number = 50): Promise<LeadIntelligenceEventInterface[]> {
    const result = await this.query(
      `SELECT * FROM lead_intelligence_events 
       WHERE tenant_user_id = $1 AND phone_number = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [tenantUserId, phoneNumber, limit]
    );
    return result.rows;
  }

  /**
   * Get events for a lead by lead_analytics_id
   */
  async getEventsByLeadAnalyticsId(leadAnalyticsId: string, limit: number = 50): Promise<LeadIntelligenceEventInterface[]> {
    const result = await this.query(
      `SELECT * FROM lead_intelligence_events 
       WHERE lead_analytics_id = $1
       ORDER BY created_at DESC
       LIMIT $3`,
      [leadAnalyticsId, limit]
    );
    return result.rows;
  }

  /**
   * Get combined timeline for a lead (events + calls)
   * This merges manual events with call-based timeline entries
   */
  async getCombinedTimeline(
    tenantUserId: string, 
    phoneNumber: string,
    limit: number = 100
  ): Promise<Array<{
    id: string;
    type: 'event' | 'call';
    actor_name: string;
    event_type: string;
    description: string;
    field_changes?: Record<string, FieldChange>;
    notes?: string;
    created_at: Date;
  }>> {
    const result = await this.query(
      `WITH events AS (
        SELECT 
          id,
          'event'::text as type,
          actor_name,
          event_type,
          CASE 
            WHEN event_type = 'edit' THEN 'Edited lead information'
            WHEN event_type = 'assign' THEN 'Assigned lead'
            WHEN event_type = 'note' THEN 'Added note'
            WHEN event_type = 'status_change' THEN 'Changed status'
            ELSE event_type
          END as description,
          field_changes,
          notes,
          created_at
        FROM lead_intelligence_events
        WHERE tenant_user_id = $1 AND phone_number = $2
      )
      SELECT * FROM events
      ORDER BY created_at DESC
      LIMIT $3`,
      [tenantUserId, phoneNumber, limit]
    );
    return result.rows;
  }

  /**
   * Get recent activity by an actor
   */
  async getRecentActivityByActor(
    actorType: EventActorType,
    actorId: string,
    limit: number = 20
  ): Promise<LeadIntelligenceEventInterface[]> {
    const result = await this.query(
      `SELECT * FROM lead_intelligence_events 
       WHERE actor_type = $1 AND actor_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [actorType, actorId, limit]
    );
    return result.rows;
  }

  /**
   * Get event counts by type for analytics
   */
  async getEventCountsByType(
    tenantUserId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<LeadEventType, number>> {
    let query = `
      SELECT event_type, COUNT(*) as count
      FROM lead_intelligence_events
      WHERE tenant_user_id = $1
    `;
    const params: any[] = [tenantUserId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ' GROUP BY event_type';

    const result = await this.query(query, params);
    
    const counts: Record<string, number> = {
      edit: 0,
      assign: 0,
      note: 0,
      status_change: 0,
      call: 0,
      email: 0,
      meeting: 0
    };

    result.rows.forEach((row: { event_type: string; count: string }) => {
      counts[row.event_type] = parseInt(row.count, 10);
    });

    return counts as Record<LeadEventType, number>;
  }
}

export default new LeadIntelligenceEventModel();
