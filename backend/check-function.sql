-- Check the current definition of get_next_queued_call function
SELECT 
    pg_get_functiondef('get_next_queued_call(uuid)'::regprocedure) as function_definition;

-- Check database timezone
SELECT current_setting('TIMEZONE') as db_timezone;

-- Check current times
SELECT 
    NOW() as current_utc,
    (NOW() AT TIME ZONE 'Europe/Moscow')::TIME as moscow_time,
    (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME as india_time;

-- Check if there are queued campaign calls
SELECT 
    q.id,
    q.user_id,
    q.status,
    q.scheduled_for,
    c.campaign_timezone,
    c.use_custom_timezone,
    c.first_call_time,
    c.last_call_time,
    (NOW() AT TIME ZONE COALESCE(
        CASE WHEN c.use_custom_timezone THEN c.campaign_timezone END,
        'UTC'
    ))::TIME as current_time_in_campaign_tz
FROM call_queue q
JOIN call_campaigns c ON q.campaign_id = c.id
WHERE q.status = 'queued'
  AND c.status = 'active'
  AND q.call_type = 'campaign'
LIMIT 5;
