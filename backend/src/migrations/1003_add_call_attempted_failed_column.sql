-- Migration: Add call_attempted_failed column to contacts table
-- Purpose: Track calls that failed due to invalid/unavailable numbers
-- Related to: Bolna webhook 'failed' status handling

-- Add call_attempted_failed column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS call_attempted_failed INTEGER DEFAULT 0 NOT NULL CHECK (call_attempted_failed >= 0);

-- Add index for the new column (include in existing call attempts index pattern)
CREATE INDEX IF NOT EXISTS idx_contacts_call_attempted_failed 
ON contacts(call_attempted_failed);

-- Comment on the column
COMMENT ON COLUMN contacts.call_attempted_failed IS 'Counter for calls that failed due to invalid/unavailable destination numbers';
