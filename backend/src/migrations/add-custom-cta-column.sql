-- Migration: Add custom_cta column to lead_analytics table
-- This column stores custom CTA strings extracted from call transcripts
-- Example values: "proposal required, demo booked", "pricing requested"

-- Add the custom_cta column
ALTER TABLE lead_analytics 
ADD COLUMN IF NOT EXISTS custom_cta TEXT;

-- Add index for searching by custom_cta
CREATE INDEX IF NOT EXISTS idx_lead_analytics_custom_cta 
ON lead_analytics (custom_cta) 
WHERE custom_cta IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN lead_analytics.custom_cta IS 'Custom CTA string extracted from call transcript (e.g., "proposal required, demo booked")';
