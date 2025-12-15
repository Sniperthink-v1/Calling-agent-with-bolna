-- Migration: Add requirements column to lead_analytics table
-- Purpose: Store product/business requirements extracted from call transcripts
-- This field is populated by OpenAI extraction during call analysis

-- Add requirements column to lead_analytics table
ALTER TABLE lead_analytics
ADD COLUMN IF NOT EXISTS requirements TEXT;

-- Add index for requirements column (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_lead_analytics_requirements 
ON lead_analytics (requirements) 
WHERE (requirements IS NOT NULL);

-- Add comment to document the column
COMMENT ON COLUMN lead_analytics.requirements IS 'Product/business requirements extracted from call transcript by OpenAI analysis. NULL if no requirements mentioned.';
