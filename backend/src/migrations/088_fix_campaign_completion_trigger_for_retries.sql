-- Migration 088: Fix Campaign Completion Trigger for Retries
-- 
-- Problem: The trigger_update_campaign_statistics marks a campaign as 'completed'
-- when completed_calls + failed_calls >= total_contacts. However, this fires
-- BEFORE a retry queue item is created, causing campaigns to be prematurely
-- marked as completed when the only contact's call ends with busy/no-answer.
--
-- Solution: Remove campaign completion logic from the database trigger.
-- Let the application code (checkAndCompleteCampaign) handle campaign completion
-- AFTER any retry items are created. This ensures proper retry handling.
--
-- Date: 2024-12-03

-- =====================================================
-- 1. Update the trigger function to NOT auto-complete campaigns
-- =====================================================

CREATE OR REPLACE FUNCTION update_campaign_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed_calls counter
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE call_campaigns
    SET 
      completed_calls = completed_calls + 1,
      successful_calls = CASE 
        WHEN NEW.call_id IS NOT NULL THEN successful_calls + 1 
        ELSE successful_calls 
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.campaign_id;
  END IF;
  
  -- Update failed_calls counter
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    UPDATE call_campaigns
    SET 
      failed_calls = failed_calls + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.campaign_id;
  END IF;
  
  -- NOTE: Campaign completion is now handled by application code (checkAndCompleteCampaign)
  -- This ensures retries are properly accounted for before marking campaign as complete.
  -- The previous logic that auto-completed campaigns has been removed:
  --
  -- REMOVED:
  -- UPDATE call_campaigns
  -- SET status = 'completed', completed_at = CURRENT_TIMESTAMP
  -- WHERE id = NEW.campaign_id 
  --   AND status = 'active'
  --   AND completed_calls + failed_calls >= total_contacts;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Add comment for documentation
-- =====================================================

COMMENT ON FUNCTION update_campaign_statistics() IS 
'Updates campaign statistics (completed_calls, successful_calls, failed_calls) when queue item status changes. 
Campaign completion is handled by application code to properly account for retries.';

-- =====================================================
-- Migration Complete
-- =====================================================
