-- Migration: Fix recompute_agent_daily_from_leads - remove all CTA column references
-- CTA columns have been removed from both lead_analytics and agent_analytics tables

CREATE OR REPLACE FUNCTION public.recompute_agent_daily_from_leads(_call_id uuid, _user_tz text DEFAULT 'UTC'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _agent UUID;
    _user UUID;
    _date DATE;
BEGIN
    -- Get call details with user timezone
    SELECT 
        c.agent_id, 
        c.user_id, 
        DATE(c.created_at AT TIME ZONE 'UTC' AT TIME ZONE _user_tz)
    INTO _agent, _user, _date
    FROM calls c
    WHERE c.id = _call_id;

    IF _agent IS NULL OR _user IS NULL OR _date IS NULL THEN
        RETURN;
    END IF;

    -- Aggregate lead analytics data (CTA columns removed)
    WITH agg AS (
        SELECT 
            _agent AS agent_id,
            _user AS user_id,
            _date AS date,
            COUNT(*) AS leads_generated,
            COUNT(*) FILTER (WHERE l.total_score >= 70) AS qualified_leads,
            AVG(l.intent_score) AS avg_intent_score,
            AVG(l.urgency_score) AS avg_urgency_score,
            AVG(l.budget_score) AS avg_budget_score,
            AVG(l.fit_score) AS avg_fit_score,
            AVG(l.engagement_score) AS avg_engagement_score,
            AVG(l.total_score) AS avg_total_score
        FROM lead_analytics l
        JOIN calls c2 ON c2.id = l.call_id
        WHERE c2.agent_id = _agent 
          AND l.user_id = _user 
          AND DATE(c2.created_at AT TIME ZONE 'UTC' AT TIME ZONE _user_tz) = _date
    )
    INSERT INTO agent_analytics AS aa (
        agent_id, user_id, date, hour,
        leads_generated, qualified_leads,
        avg_intent_score, avg_urgency_score, avg_budget_score, avg_fit_score, avg_engagement_score, avg_total_score
    )
    SELECT
        agent_id, user_id, date, NULL,
        leads_generated, qualified_leads,
        avg_intent_score, avg_urgency_score, avg_budget_score, avg_fit_score, avg_engagement_score, avg_total_score
    FROM agg
    ON CONFLICT (agent_id, date, hour)
    DO UPDATE SET
        leads_generated = EXCLUDED.leads_generated,
        qualified_leads = EXCLUDED.qualified_leads,
        avg_intent_score = EXCLUDED.avg_intent_score,
        avg_urgency_score = EXCLUDED.avg_urgency_score,
        avg_budget_score = EXCLUDED.avg_budget_score,
        avg_fit_score = EXCLUDED.avg_fit_score,
        avg_engagement_score = EXCLUDED.avg_engagement_score,
        avg_total_score = EXCLUDED.avg_total_score,
        updated_at = CURRENT_TIMESTAMP;
END;
$function$;

-- Also update the single-parameter version for backward compatibility
CREATE OR REPLACE FUNCTION public.recompute_agent_daily_from_leads(_call_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Delegate to the version with timezone, using UTC as default
    PERFORM public.recompute_agent_daily_from_leads(_call_id, 'UTC');
END;
$function$;

-- Update the trigger function that calls recompute_agent_daily_from_leads
CREATE OR REPLACE FUNCTION public.trg_leads_daily_analytics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    _user_id UUID;
    _user_tz TEXT;
BEGIN
    -- Get user_id from the new lead record
    _user_id := NEW.user_id;
    
    -- Get user timezone
    _user_tz := get_user_timezone(_user_id);
    
    -- Recompute with user timezone (now uses updated function without CTA columns)
    PERFORM recompute_agent_daily_from_leads(NEW.call_id, _user_tz);
    
    RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_leads_daily_analytics ON lead_analytics;
CREATE TRIGGER trg_leads_daily_analytics
    AFTER INSERT ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION trg_leads_daily_analytics();
