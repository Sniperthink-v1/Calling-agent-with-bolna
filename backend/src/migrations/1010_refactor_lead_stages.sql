-- Migration: Refactor lead stages to be fully user-customizable
-- Description: Removes default/custom concept, adds order field, populates existing users with predefined stages

-- Step 1: Update existing users' custom_lead_stages to include predefined stages with order
-- Only add if custom_lead_stages is empty or null
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
WHERE custom_lead_stages IS NULL OR custom_lead_stages = '[]'::jsonb;

-- Step 2: For users who have custom stages, add order field to their existing stages
-- and merge with predefined stages (keeping their custom ones)
UPDATE users
SET custom_lead_stages = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'order' IS NULL 
      THEN elem || jsonb_build_object('order', row_number - 1)
      ELSE elem
    END
    ORDER BY (elem->>'order')::int NULLS LAST, row_number
  )
  FROM (
    SELECT elem, ROW_NUMBER() OVER () as row_number
    FROM jsonb_array_elements(custom_lead_stages) elem
  ) sub
)
WHERE custom_lead_stages IS NOT NULL 
  AND custom_lead_stages != '[]'::jsonb
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(custom_lead_stages) elem
    WHERE elem->>'order' IS NULL
  );

-- Step 3: Update contacts with deleted stages to have null lead_stage
-- This will be handled in the application code when a stage is deleted

-- Step 4: Add comment to document new structure
COMMENT ON COLUMN users.custom_lead_stages IS 'User lead stages as JSON array: [{ "name": "Stage Name", "color": "#HexColor", "order": 0 }, ...]. Order determines display sequence in pipeline view.';

-- Step 5: Create function to initialize new users with predefined stages
CREATE OR REPLACE FUNCTION initialize_user_lead_stages()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.custom_lead_stages IS NULL OR NEW.custom_lead_stages = '[]'::jsonb THEN
    NEW.custom_lead_stages := '[
      {"name": "New Lead", "color": "#3B82F6", "order": 0},
      {"name": "Contacted", "color": "#8B5CF6", "order": 1},
      {"name": "Qualified", "color": "#F59E0B", "order": 2},
      {"name": "Proposal Sent", "color": "#06B6D4", "order": 3},
      {"name": "Negotiation", "color": "#EC4899", "order": 4},
      {"name": "Won", "color": "#10B981", "order": 5},
      {"name": "Lost", "color": "#EF4444", "order": 6}
    ]'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to initialize stages for new users
DROP TRIGGER IF EXISTS trg_initialize_user_lead_stages ON users;
CREATE TRIGGER trg_initialize_user_lead_stages
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_lead_stages();
