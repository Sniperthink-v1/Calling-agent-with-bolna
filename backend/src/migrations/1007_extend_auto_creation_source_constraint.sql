-- Migration: 1007_extend_auto_creation_source_constraint
-- Purpose: Remove CHECK constraint on auto_creation_source to allow flexible source names
--          (e.g., "TradeIndia", "IndiaMART", etc.) from external lead capture webhooks
-- 
-- Context: The n8n lead capture webhook needs to store variable Source values from different
--          lead generation platforms. The previous constraint only allowed: 'webhook', 'manual', 'bulk_upload'

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE contacts
DROP CONSTRAINT IF EXISTS contacts_auto_creation_source_check;

-- Step 2: Keep the column as VARCHAR(50) but allow any string value
-- No new constraint needed - NULL is already allowed, and any non-null string value is now valid

-- Step 3: Update column comment to reflect new usage
COMMENT ON COLUMN contacts.auto_creation_source IS 'Source of contact creation: Legacy values (webhook, manual, bulk_upload) or dynamic values from external lead sources (e.g., TradeIndia, IndiaMART, n8n_webhook, etc.)';

-- Note: Existing data with 'webhook', 'manual', 'bulk_upload' values remains valid
-- The column can now store any source identifier string up to 50 characters
