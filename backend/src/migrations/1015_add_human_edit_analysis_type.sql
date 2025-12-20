-- Migration: Add 'human_edit' analysis type to lead_analytics
-- Purpose: Allow tracking human edits separately from AI complete analysis

-- Step 1: Drop the existing check constraint
ALTER TABLE lead_analytics DROP CONSTRAINT IF EXISTS lead_analytics_type_check;

-- Step 2: Add new check constraint including 'human_edit'
ALTER TABLE lead_analytics ADD CONSTRAINT lead_analytics_type_check 
  CHECK (analysis_type::text = ANY (ARRAY['individual', 'complete', 'human_edit']::text[]));

-- Step 3: Make call_id nullable for human_edit records (they don't come from calls)
-- Note: call_id is already NOT NULL with a UNIQUE constraint for individual analysis
-- For human_edit, we'll use the latest_call_id to reference the context

-- Step 4: Drop the unique constraint that prevents multiple analysis types per user+phone
-- We need to allow both 'complete' and 'human_edit' for the same phone number
DROP INDEX IF EXISTS idx_lead_analytics_complete_unique;
DROP INDEX IF EXISTS idx_lead_analytics_unique_complete_user_phone;

-- Step 5: Create new unique index for 'complete' only
CREATE UNIQUE INDEX idx_lead_analytics_complete_unique 
  ON lead_analytics(user_id, phone_number, analysis_type) 
  WHERE analysis_type = 'complete';

-- Step 6: Create unique index for 'human_edit' - only one active human_edit per user+phone
CREATE UNIQUE INDEX idx_lead_analytics_human_edit_unique 
  ON lead_analytics(user_id, phone_number, analysis_type) 
  WHERE analysis_type = 'human_edit';

-- Step 7: Add index for querying latest analysis by timestamp
CREATE INDEX IF NOT EXISTS idx_lead_analytics_latest_analysis 
  ON lead_analytics(user_id, phone_number, analysis_timestamp DESC) 
  WHERE analysis_type IN ('complete', 'human_edit');

-- Step 8: Add index for timeline queries with human_edit
CREATE INDEX IF NOT EXISTS idx_lead_analytics_timeline_human_edit 
  ON lead_analytics(user_id, phone_number, created_at DESC) 
  WHERE analysis_type = 'human_edit';

COMMENT ON COLUMN lead_analytics.analysis_type IS 'Type of analysis: "individual" = single call analysis, "complete" = AI aggregated analysis, "human_edit" = manual human override';
