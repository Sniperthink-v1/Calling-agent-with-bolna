-- Migration 1025: Email Tracking Events
-- Date: January 30, 2026
-- Purpose: Add detailed email tracking events table and enhance emails table for tracking

-- ============================================
-- 1. Create email_tracking_events table
-- ============================================
-- Stores every tracking event (opens, clicks) for detailed analytics

CREATE TABLE IF NOT EXISTS email_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('open', 'click')),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Tracking metadata
  ip_address INET,
  user_agent TEXT,
  
  -- For click events
  clicked_url TEXT,
  link_id VARCHAR(100), -- Unique identifier for the link within the email
  
  -- Geo data (can be populated via IP lookup)
  geo_country VARCHAR(100),
  geo_city VARCHAR(100),
  geo_region VARCHAR(100),
  
  -- Device info (parsed from user agent)
  device_type VARCHAR(50), -- desktop, mobile, tablet
  email_client VARCHAR(100), -- Gmail, Outlook, Apple Mail, etc.
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for email_tracking_events
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_email_id ON email_tracking_events(email_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_user_id ON email_tracking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_event_type ON email_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_occurred_at ON email_tracking_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_email_type ON email_tracking_events(email_id, event_type);

-- Comments
COMMENT ON TABLE email_tracking_events IS 'Stores detailed tracking events for email opens and link clicks';
COMMENT ON COLUMN email_tracking_events.event_type IS 'Type of tracking event: open or click';
COMMENT ON COLUMN email_tracking_events.link_id IS 'Unique identifier for tracked links within an email';

-- ============================================
-- 2. Add tracking columns to emails table
-- ============================================

ALTER TABLE emails
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100); -- Unique tracking identifier

-- Index for tracking lookups
CREATE INDEX IF NOT EXISTS idx_emails_tracking_id ON emails(tracking_id) WHERE tracking_id IS NOT NULL;

-- ============================================
-- 3. Add clicked_emails to email_campaigns
-- ============================================

ALTER TABLE email_campaigns
ADD COLUMN IF NOT EXISTS clicked_emails INTEGER DEFAULT 0 NOT NULL;

-- ============================================
-- 4. Create function to update email stats on tracking event
-- ============================================

CREATE OR REPLACE FUNCTION update_email_on_tracking_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'open' THEN
    -- Update email record
    UPDATE emails
    SET 
      open_count = open_count + 1,
      first_opened_at = COALESCE(first_opened_at, NEW.occurred_at),
      last_opened_at = NEW.occurred_at,
      status = CASE WHEN status IN ('sent', 'delivered') THEN 'opened' ELSE status END,
      opened_at = COALESCE(opened_at, NEW.occurred_at),
      updated_at = NOW()
    WHERE id = NEW.email_id;
    
    -- Update campaign counter (only on first open)
    UPDATE email_campaigns
    SET opened_emails = opened_emails + 1
    WHERE id = (SELECT campaign_id FROM emails WHERE id = NEW.email_id)
      AND NOT EXISTS (
        SELECT 1 FROM email_tracking_events 
        WHERE email_id = NEW.email_id 
          AND event_type = 'open' 
          AND id != NEW.id
      );
      
  ELSIF NEW.event_type = 'click' THEN
    -- Update email record
    UPDATE emails
    SET 
      click_count = click_count + 1,
      first_clicked_at = COALESCE(first_clicked_at, NEW.occurred_at),
      last_clicked_at = NEW.occurred_at,
      updated_at = NOW()
    WHERE id = NEW.email_id;
    
    -- Update campaign counter (only on first click per email)
    UPDATE email_campaigns
    SET clicked_emails = clicked_emails + 1
    WHERE id = (SELECT campaign_id FROM emails WHERE id = NEW.email_id)
      AND NOT EXISTS (
        SELECT 1 FROM email_tracking_events 
        WHERE email_id = NEW.email_id 
          AND event_type = 'click' 
          AND id != NEW.id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking events
DROP TRIGGER IF EXISTS trigger_update_email_on_tracking ON email_tracking_events;
CREATE TRIGGER trigger_update_email_on_tracking
AFTER INSERT ON email_tracking_events
FOR EACH ROW
EXECUTE FUNCTION update_email_on_tracking_event();

-- ============================================
-- 5. Update contacts trigger for email opens
-- ============================================
-- Already exists from 1004, but let's ensure it handles the new flow

CREATE OR REPLACE FUNCTION update_contact_email_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: Update contact's last email sent timestamp and count
  IF TG_OP = 'INSERT' THEN
    UPDATE contacts
    SET 
      last_email_sent_at = NEW.sent_at,
      total_emails_sent = total_emails_sent + 1,
      updated_at = NOW()
    WHERE id = NEW.contact_id;
  END IF;
  
  -- On UPDATE: If email was opened, increment opened count
  IF TG_OP = 'UPDATE' AND NEW.status = 'opened' AND OLD.status != 'opened' THEN
    UPDATE contacts
    SET 
      total_emails_opened = total_emails_opened + 1,
      updated_at = NOW()
    WHERE id = NEW.contact_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments for new columns
COMMENT ON COLUMN emails.open_count IS 'Total number of times this email was opened';
COMMENT ON COLUMN emails.click_count IS 'Total number of link clicks in this email';
COMMENT ON COLUMN emails.tracking_id IS 'Unique tracking identifier used in tracking pixel URL';
COMMENT ON COLUMN email_campaigns.clicked_emails IS 'Number of emails with at least one link click';
