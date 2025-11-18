-- Migration: Add campaign_id to calls table to track campaign association
-- This is critical since we now delete queue items after completion

-- Add campaign_id column to calls table
ALTER TABLE calls
ADD COLUMN campaign_id UUID REFERENCES call_campaigns(id) ON DELETE SET NULL;

-- Create index for campaign queries (important for analytics and email reports)
CREATE INDEX idx_calls_campaign_id ON calls(campaign_id) WHERE campaign_id IS NOT NULL;

-- Backfill existing calls with campaign_id from call_queue (if any still exist)
UPDATE calls c
SET campaign_id = cq.campaign_id
FROM call_queue cq
WHERE cq.call_id = c.id
  AND cq.campaign_id IS NOT NULL
  AND c.campaign_id IS NULL;
