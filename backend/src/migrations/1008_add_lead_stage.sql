-- Migration: Add lead_stage column to contacts and custom_lead_stages to users
-- Description: Enables lead pipeline tracking with default stages and user-defined custom stages

-- Add lead_stage column to contacts table
-- Default stages: New Lead, Contacted, Qualified, Proposal Sent, Negotiation, Won, Lost
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS lead_stage VARCHAR(100) DEFAULT 'New Lead';

-- Add index for filtering by lead_stage
CREATE INDEX IF NOT EXISTS idx_contacts_lead_stage ON contacts(lead_stage);

-- Add composite index for user + lead_stage filtering
CREATE INDEX IF NOT EXISTS idx_contacts_user_lead_stage ON contacts(user_id, lead_stage);

-- Add custom_lead_stages JSONB column to users table
-- Stores array of custom stages: [{ "name": "...", "color": "#..." }, ...]
ALTER TABLE users
ADD COLUMN IF NOT EXISTS custom_lead_stages JSONB DEFAULT '[]'::jsonb;

-- Add constraint to ensure custom_lead_stages is always an array
ALTER TABLE users
ADD CONSTRAINT check_custom_lead_stages_is_array
CHECK (jsonb_typeof(custom_lead_stages) = 'array');

-- Comment documenting the default lead stages and their colors
-- These are hardcoded in the application, not in the database:
-- | Stage          | Color (Hex) |
-- |----------------|-------------|
-- | New Lead       | #3B82F6     | (Blue)
-- | Contacted      | #8B5CF6     | (Purple)
-- | Qualified      | #F59E0B     | (Amber)
-- | Proposal Sent  | #06B6D4     | (Cyan)
-- | Negotiation    | #EC4899     | (Pink)
-- | Won            | #10B981     | (Green)
-- | Lost           | #EF4444     | (Red)

COMMENT ON COLUMN contacts.lead_stage IS 'Lead pipeline stage. Defaults: New Lead, Contacted, Qualified, Proposal Sent, Negotiation, Won, Lost. Users can add custom stages.';
COMMENT ON COLUMN users.custom_lead_stages IS 'User-defined custom lead stages as JSON array: [{ "name": "Stage Name", "color": "#HexColor" }, ...]';
