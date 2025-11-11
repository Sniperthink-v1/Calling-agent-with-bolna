-- QUICK FIX: Add meeting_booked to notifications CHECK constraint
-- Run this immediately to fix the error

-- Drop the existing CHECK constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

-- Add new CHECK constraint with meeting_booked included
ALTER TABLE notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type IN (
    'email_verification',
    'email_verification_reminder',
    'credit_low_15',
    'credit_low_5',
    'credit_exhausted_0',
    'credits_added',
    'campaign_summary',
    'meeting_booked',
    'marketing'
));

-- Verify the fix
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'notifications_notification_type_check';
