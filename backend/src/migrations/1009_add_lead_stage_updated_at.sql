-- Migration: Add lead_stage_updated_at column to contacts for pipeline tracking
-- Description: Tracks when a contact's lead stage was last changed, enabling "days in stage" calculation

-- Add lead_stage_updated_at column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS lead_stage_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index for efficient queries on lead_stage_updated_at
CREATE INDEX IF NOT EXISTS idx_contacts_lead_stage_updated_at 
ON contacts(lead_stage_updated_at DESC NULLS LAST);

-- Create composite index for user + lead_stage + updated_at for pipeline queries
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_view 
ON contacts(user_id, lead_stage, lead_stage_updated_at DESC NULLS LAST);

-- Backfill existing contacts: set lead_stage_updated_at to created_at for contacts with lead_stage
UPDATE contacts 
SET lead_stage_updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE lead_stage_updated_at IS NULL;

-- Create trigger function to auto-update lead_stage_updated_at when lead_stage changes
CREATE OR REPLACE FUNCTION update_lead_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.lead_stage IS DISTINCT FROM NEW.lead_stage THEN
        NEW.lead_stage_updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp on lead_stage change
DROP TRIGGER IF EXISTS trg_update_lead_stage_timestamp ON contacts;
CREATE TRIGGER trg_update_lead_stage_timestamp
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_stage_timestamp();

-- Comment documenting the column purpose
COMMENT ON COLUMN contacts.lead_stage_updated_at IS 'Timestamp when lead_stage was last changed. Used for calculating days in stage for pipeline view.';
