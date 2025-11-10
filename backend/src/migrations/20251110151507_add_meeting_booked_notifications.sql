-- Migration: Add meeting_booked_notifications column to notification_preferences
-- Purpose: Allow users to control whether they receive meeting booked notifications
-- Date: 2025-11-10

-- Add new column for meeting booked notifications (defaults to true)
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS meeting_booked_notifications BOOLEAN DEFAULT true NOT NULL;

-- Add comment to column
COMMENT ON COLUMN notification_preferences.meeting_booked_notifications IS 
'Whether user wants to receive email notifications when AI agents book meetings';
