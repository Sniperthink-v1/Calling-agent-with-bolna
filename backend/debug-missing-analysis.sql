-- Check why OpenAI analysis didn't run for the completed call
-- Call ID: 8dd3cd93-ec21-4294-8784-3a80a721165e

-- 1. Check if transcript exists
SELECT 
  id,
  call_id,
  LENGTH(content) as transcript_length,
  created_at
FROM transcripts
WHERE call_id = '8dd3cd93-ec21-4294-8784-3a80a721165e';

-- 2. Check call details
SELECT 
  id,
  status,
  phone_number,
  duration_minutes,
  credits_used,
  recording_url,
  metadata,
  created_at,
  updated_at
FROM calls
WHERE id = '8dd3cd93-ec21-4294-8784-3a80a721165e';

-- 3. Check if there's any lead_analytics for this call (even incomplete)
SELECT 
  id,
  call_id,
  analysis_type,
  intent_score,
  total_score,
  lead_status_tag,
  demo_book_datetime,
  created_at
FROM lead_analytics
WHERE call_id = '8dd3cd93-ec21-4294-8784-3a80a721165e';
