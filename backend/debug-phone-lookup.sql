-- Debug script: Check why phone lookup failed for meeting scheduling
-- Phone: +91 9599803585

-- 1. Check if ANY calls exist for this phone number
SELECT 
  id,
  user_id,
  phone_number,
  status,
  created_at,
  updated_at
FROM calls
WHERE phone_number = '+91 9599803585'
ORDER BY created_at DESC;

-- 2. Check if lead_analytics exists for these calls
SELECT 
  la.id,
  la.call_id,
  la.analysis_type,
  la.demo_book_datetime,
  c.phone_number,
  c.status as call_status,
  c.created_at
FROM lead_analytics la
JOIN calls c ON la.call_id = c.id
WHERE c.phone_number = '+91 9599803585'
ORDER BY c.created_at DESC;

-- 3. Check what the phone lookup query actually returns
-- (This is the exact query used in meetingSchedulerService.ts)
SELECT 
  la.id, 
  la.call_id, 
  la.analysis_type, 
  la.demo_book_datetime, 
  c.contact_id,
  c.phone_number,
  c.user_id,
  c.status as call_status,
  c.created_at
FROM lead_analytics la
JOIN calls c ON la.call_id = c.id
WHERE c.phone_number = '+91 9599803585' 
  AND la.analysis_type = 'complete'
  AND c.user_id = '789895c8-4bd6-43e9-bfea-a4171ec47197'
ORDER BY c.created_at DESC
LIMIT 1;

-- 4. Check if there are incomplete analyses
SELECT 
  la.id,
  la.call_id,
  la.analysis_type,
  c.phone_number,
  c.status as call_status
FROM lead_analytics la
JOIN calls c ON la.call_id = c.id
WHERE c.phone_number = '+91 9599803585'
  AND la.analysis_type != 'complete';
