-- Migration: Remove CTA-related triggers since CTA columns have been dropped
-- This migration drops the old triggers that used CTA columns

-- Drop all CTA-related triggers
DROP TRIGGER IF EXISTS trigger_update_agent_analytics_from_lead_cta ON lead_analytics;
DROP TRIGGER IF EXISTS trigger_update_agent_analytics_from_lead_cta_update ON lead_analytics;
DROP TRIGGER IF EXISTS trigger_update_agent_analytics_from_lead_custom_cta ON lead_analytics;
DROP TRIGGER IF EXISTS trigger_update_agent_analytics_from_lead_custom_cta_update ON lead_analytics;

-- Drop the old CTA functions
DROP FUNCTION IF EXISTS update_agent_analytics_from_lead_cta();
DROP FUNCTION IF EXISTS update_agent_analytics_from_lead_custom_cta();

-- Create simplified trigger function that only updates leads_generated count
CREATE OR REPLACE FUNCTION update_agent_analytics_from_lead()
RETURNS TRIGGER AS $$
DECLARE
    call_record RECORD;
    analytics_date DATE;
    analytics_hour INTEGER;
BEGIN
    -- Get call information to determine agent_id and user_id
    SELECT c.agent_id, c.user_id, c.created_at
    INTO call_record
    FROM calls c
    WHERE c.id = NEW.call_id;
    
    -- Skip if call not found
    IF call_record IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Determine date and hour for analytics aggregation
    analytics_date := DATE(call_record.created_at);
    analytics_hour := EXTRACT(hour FROM call_record.created_at);
    
    -- Update hourly agent analytics (leads count only - no CTA columns)
    INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls, leads_generated
    )
    VALUES (
        call_record.agent_id, call_record.user_id, analytics_date, analytics_hour,
        0, 0, 1
    )
    ON CONFLICT (agent_id, date, hour)
    DO UPDATE SET
        leads_generated = agent_analytics.leads_generated + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Update daily agent analytics (hour = NULL for daily aggregates)
    INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls, leads_generated
    )
    VALUES (
        call_record.agent_id, call_record.user_id, analytics_date, NULL,
        0, 0, 1
    )
    ON CONFLICT (agent_id, date, hour)
    DO UPDATE SET
        leads_generated = agent_analytics.leads_generated + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
CREATE TRIGGER trigger_update_agent_analytics_from_lead
    AFTER INSERT ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_analytics_from_lead();

-- Add comments
COMMENT ON FUNCTION update_agent_analytics_from_lead() IS 
'Trigger function that updates agent_analytics leads_generated count from lead_analytics';

COMMENT ON TRIGGER trigger_update_agent_analytics_from_lead ON lead_analytics IS
'Updates agent_analytics leads count when new lead_analytics records are inserted';
