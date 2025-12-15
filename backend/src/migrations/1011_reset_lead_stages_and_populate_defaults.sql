-- Migration: Reset lead stages and populate defaults for all users
-- Description: 
--   1. Reset all contacts' lead_stage to null
--   2. Ensure all existing users have the default lead stages

-- Step 1: Reset all contacts' lead_stage to null
UPDATE contacts
SET lead_stage = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE lead_stage IS NOT NULL;

-- Step 2: Populate default lead stages for ALL existing users (overwrite any existing)
UPDATE users
SET custom_lead_stages = '[
  {"name": "New Lead", "color": "#3B82F6", "order": 0},
  {"name": "Contacted", "color": "#8B5CF6", "order": 1},
  {"name": "Qualified", "color": "#F59E0B", "order": 2},
  {"name": "Proposal Sent", "color": "#06B6D4", "order": 3},
  {"name": "Negotiation", "color": "#EC4899", "order": 4},
  {"name": "Won", "color": "#10B981", "order": 5},
  {"name": "Lost", "color": "#EF4444", "order": 6}
]'::jsonb
WHERE custom_lead_stages IS NULL 
   OR custom_lead_stages = '[]'::jsonb
   OR custom_lead_stages = 'null'::jsonb;

-- Log the migration results
DO $$
DECLARE
  contacts_updated INTEGER;
  users_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO contacts_updated FROM contacts WHERE lead_stage IS NULL;
  SELECT COUNT(*) INTO users_updated FROM users WHERE custom_lead_stages IS NOT NULL AND custom_lead_stages != '[]'::jsonb;
  
  RAISE NOTICE 'Migration complete: % contacts reset to null lead_stage, % users have lead stages configured', contacts_updated, users_updated;
END $$;
