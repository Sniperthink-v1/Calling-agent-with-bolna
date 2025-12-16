-- Migration: Update lead stages to use 3 fixed stages (New Lead, Attempted to Contact, Contacted)
-- Description: 
--   1. Update all users to have the 3 new fixed stages
--   2. Map old stages to new ones (Contacted stays, others reset to New Lead)
--   3. Update the trigger for new users
--   4. Fixed stages cannot be deleted/renamed by users

-- Step 1: Update contacts' lead_stage to map old stages to new ones
-- Keep "New Lead" and "Contacted" as-is
-- Reset all other stages to "New Lead" (since they don't map to the fixed stages)
UPDATE contacts
SET lead_stage = 
  CASE 
    WHEN LOWER(lead_stage) = 'new lead' THEN 'New Lead'
    WHEN LOWER(lead_stage) = 'contacted' THEN 'Contacted'
    WHEN LOWER(lead_stage) = 'attempted to contact' THEN 'Attempted to Contact'
    ELSE 'New Lead'  -- Default to New Lead for any unmapped stages (Qualified, Proposal Sent, etc.)
  END,
  lead_stage_updated_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
WHERE lead_stage IS NOT NULL;

-- Step 2: Set all contacts with null lead_stage to "New Lead"
UPDATE contacts
SET lead_stage = 'New Lead',
    lead_stage_updated_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE lead_stage IS NULL;

-- Step 3: Update ALL existing users to have the new 3 fixed stages
-- Overwrites any custom stages - users can add new custom stages after the fixed ones
UPDATE users
SET custom_lead_stages = '[
  {"name": "New Lead", "color": "#3B82F6", "order": 0, "isFixed": true},
  {"name": "Attempted to Contact", "color": "#F59E0B", "order": 1, "isFixed": true},
  {"name": "Contacted", "color": "#10B981", "order": 2, "isFixed": true}
]'::jsonb,
updated_at = CURRENT_TIMESTAMP;

-- Step 4: Update the trigger function for new users to use the 3 fixed stages
CREATE OR REPLACE FUNCTION initialize_user_lead_stages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.custom_lead_stages IS NULL OR NEW.custom_lead_stages = '[]'::jsonb THEN
    NEW.custom_lead_stages := '[
      {"name": "New Lead", "color": "#3B82F6", "order": 0, "isFixed": true},
      {"name": "Attempted to Contact", "color": "#F59E0B", "order": 1, "isFixed": true},
      {"name": "Contacted", "color": "#10B981", "order": 2, "isFixed": true}
    ]'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update the comment to document fixed stages
COMMENT ON COLUMN users.custom_lead_stages IS 'User lead stages as JSON array. First 3 stages are FIXED (New Lead, Attempted to Contact, Contacted) and cannot be deleted/renamed. Users can add custom stages after these. Format: [{ "name": "Stage Name", "color": "#HexColor", "order": 0, "isFixed": true/false }, ...]';

-- Step 6: Log the migration results
DO $$
DECLARE
  contacts_updated INTEGER;
  users_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO contacts_updated FROM contacts WHERE lead_stage IS NOT NULL;
  SELECT COUNT(*) INTO users_updated FROM users WHERE custom_lead_stages IS NOT NULL;
  
  RAISE NOTICE 'Migration complete: % contacts now have fixed lead stages, % users updated with 3 fixed stages', contacts_updated, users_updated;
END $$;
