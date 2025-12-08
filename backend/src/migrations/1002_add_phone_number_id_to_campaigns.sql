-- Migration: Add phone_number_id to call_campaigns table
-- Description: Allows users to select a specific phone number for campaign calls
-- Date: 2025-12-08

-- Add phone_number_id column to call_campaigns
ALTER TABLE call_campaigns 
ADD COLUMN IF NOT EXISTS phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_campaigns_phone_number_id ON call_campaigns(phone_number_id);

-- Add comment explaining the purpose
COMMENT ON COLUMN call_campaigns.phone_number_id IS 'Optional: User-selected phone number for campaign calls. If not set, falls back to agent assigned phone or any user phone.';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 1002: Added phone_number_id column to call_campaigns table';
END $$;
