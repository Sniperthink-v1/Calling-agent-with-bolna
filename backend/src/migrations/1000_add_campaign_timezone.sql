-- Migration: Add timezone support to campaigns table
-- Created: 2025-11-19
-- Description: Adds campaign-level timezone override capability

-- Add timezone columns to call_campaigns table
ALTER TABLE call_campaigns 
ADD COLUMN IF NOT EXISTS campaign_timezone VARCHAR(50),
ADD COLUMN IF NOT EXISTS use_custom_timezone BOOLEAN DEFAULT false;

-- Create index for timezone queries
CREATE INDEX IF NOT EXISTS idx_campaigns_timezone ON call_campaigns(campaign_timezone);

-- Set existing campaigns to use user timezone (NULL = use user timezone)
UPDATE call_campaigns 
SET campaign_timezone = NULL,
    use_custom_timezone = false
WHERE campaign_timezone IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN call_campaigns.campaign_timezone IS 'Optional: Override timezone for this campaign. If NULL, uses user timezone';
COMMENT ON COLUMN call_campaigns.use_custom_timezone IS 'True if campaign uses custom timezone instead of user timezone';
