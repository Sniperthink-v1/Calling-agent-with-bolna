-- Migration: Drop manual_notes and CTA boolean columns from lead_analytics
-- Reason: 
--   - manual_notes: Moved to contacts.notes for simpler architecture
--   - CTA booleans: Replaced by dynamic custom_cta field in extraction JSON
-- Date: 2024-12-18

-- Step 1: Drop indexes on CTA boolean columns
DROP INDEX IF EXISTS idx_lead_analytics_cta_demo;
DROP INDEX IF EXISTS idx_lead_analytics_cta_escalated;
DROP INDEX IF EXISTS idx_lead_analytics_cta_followup;
DROP INDEX IF EXISTS idx_lead_analytics_cta_pricing;
DROP INDEX IF EXISTS idx_lead_analytics_cta_sample;
DROP INDEX IF EXISTS idx_lead_analytics_user_cta_analytics;

-- Step 2: Drop the columns
ALTER TABLE lead_analytics 
    DROP COLUMN IF EXISTS manual_notes,
    DROP COLUMN IF EXISTS cta_pricing_clicked,
    DROP COLUMN IF EXISTS cta_demo_clicked,
    DROP COLUMN IF EXISTS cta_followup_clicked,
    DROP COLUMN IF EXISTS cta_sample_clicked,
    DROP COLUMN IF EXISTS cta_escalated_to_human;

-- Step 3: Add comment for documentation
COMMENT ON TABLE lead_analytics IS 'Lead analysis results from AI/human. CTA tracking moved to custom_cta in extraction JSON. Notes stored in contacts.notes.';
