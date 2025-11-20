-- Run this SQL directly in Neon console or via psql

-- First, set database timezone to UTC (replace 'neondb' with your actual database name if different)
ALTER DATABASE neondb SET timezone TO 'UTC';

-- Set session timezone to UTC
SET TIME ZONE 'UTC';

-- Drop and recreate the function with timezone-aware logic
DROP FUNCTION IF EXISTS get_next_queued_call(UUID);

CREATE OR REPLACE FUNCTION get_next_queued_call(p_user_id UUID)
RETURNS call_queue AS $$
DECLARE
  result call_queue;
  current_time_in_tz TIME;
  effective_timezone TEXT;
BEGIN
  -- First try to get a direct call (highest priority)
  SELECT * INTO result
  FROM call_queue q
  WHERE q.user_id = p_user_id
    AND q.call_type = 'direct'
    AND q.status = 'queued'
    AND q.scheduled_for <= NOW()
  ORDER BY q.priority DESC, q."position" ASC, q.created_at ASC
  LIMIT 1;
  
  -- If no direct call, get campaign call with timezone-aware time window check
  IF result.id IS NULL THEN
    -- Use a subquery to find eligible campaigns
    SELECT q.* INTO result
    FROM call_queue q
    INNER JOIN call_campaigns c ON q.campaign_id = c.id
    INNER JOIN users u ON q.user_id = u.id
    INNER JOIN LATERAL (
      -- Calculate effective timezone and current time in that timezone
      SELECT 
        CASE 
          WHEN c.use_custom_timezone = true AND c.campaign_timezone IS NOT NULL 
            THEN c.campaign_timezone
          WHEN u.timezone IS NOT NULL 
            THEN u.timezone
          ELSE 'UTC'
        END as tz,
        CASE 
          WHEN c.use_custom_timezone = true AND c.campaign_timezone IS NOT NULL 
            THEN (CURRENT_TIMESTAMP AT TIME ZONE c.campaign_timezone)::TIME
          WHEN u.timezone IS NOT NULL 
            THEN (CURRENT_TIMESTAMP AT TIME ZONE u.timezone)::TIME
          ELSE CURRENT_TIME
        END as current_time_tz
    ) tz_calc ON true
    WHERE q.user_id = p_user_id
      AND q.call_type = 'campaign'
      AND q.status = 'queued'
      AND c.status = 'active'
      AND q.scheduled_for <= NOW()
      -- Compare current time in campaign/user timezone with time window
      AND tz_calc.current_time_tz BETWEEN c.first_call_time AND c.last_call_time
    ORDER BY 
      COALESCE(q.last_system_allocation_at, '1970-01-01'::timestamptz) ASC,
      q.priority DESC,
      q."position" ASC,
      q.created_at ASC
    LIMIT 1;
  END IF;
  
  -- Update last_system_allocation_at for round-robin
  IF result.id IS NOT NULL THEN
    UPDATE call_queue 
    SET last_system_allocation_at = NOW()
    WHERE id = result.id;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_queued_call(UUID) IS 
'Gets the next queued call for a user with timezone-aware time window checking.
Database stores all timestamps in UTC. Time window checks convert current UTC time 
to the effective timezone (campaign timezone > user timezone > UTC) before comparison.
Prioritizes:
1. Direct calls (no time window restrictions)
2. Campaign calls (respects campaign timezone or user timezone for time windows)
Uses round-robin allocation via last_system_allocation_at timestamp.';

-- Verify the changes
SELECT 
  'Database timezone:' as info, 
  current_setting('TIMEZONE') as value
UNION ALL
SELECT 
  'Current UTC time:',
  CURRENT_TIMESTAMP::text
UNION ALL
SELECT 
  'Moscow time (UTC+3):',
  (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::TIME::text
UNION ALL
SELECT
  'Kolkata time (UTC+5:30):',
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::TIME::text;
