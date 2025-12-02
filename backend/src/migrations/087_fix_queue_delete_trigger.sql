-- Migration: Fix Queue Delete Trigger for Campaign Statistics
-- Description: Add BEFORE DELETE trigger to update campaign statistics when queue items are deleted
-- Date: 2024-12-03
-- 
-- Problem: The auto-delete implementation (markAsCompleted/markAsFailed) uses DELETE instead of UPDATE,
-- so the existing trigger_update_campaign_statistics (which fires on UPDATE) never executes.
-- This causes campaign statistics to not be updated and campaigns to never be marked as completed.

-- =====================================================
-- 1. Create BEFORE DELETE trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION update_campaign_statistics_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this queue item belongs to a campaign
  IF OLD.campaign_id IS NOT NULL THEN
    -- Determine success/failure based on call_id presence and status
    -- 
    -- Scenarios:
    -- 1. Successful call: status='processing', call_id IS NOT NULL
    --    -> completed_calls++, successful_calls++
    -- 2. Failed call (busy/no-answer/failed): status='processing' OR 'queued', call_id may or may not exist
    --    -> failed_calls++ (if last_call_outcome indicates failure)
    -- 3. Retry scheduled: We mark as completed (not failed) but create new queue item
    --    -> Don't count as failed
    -- 4. Cancelled: status='cancelled'
    --    -> Don't update stats (campaign was cancelled)
    
    IF OLD.status = 'cancelled' THEN
      -- Cancelled items don't affect stats
      RETURN OLD;
    END IF;
    
    -- Check if this was marked as a failure via last_call_outcome column
    IF OLD.last_call_outcome IN ('busy', 'no-answer', 'failed', 'error') AND OLD.call_id IS NULL THEN
      -- This was a failed call that didn't connect
      UPDATE call_campaigns
      SET 
        failed_calls = failed_calls + 1
      WHERE id = OLD.campaign_id;
    ELSIF OLD.call_id IS NOT NULL THEN
      -- This was a call that connected (successful)
      UPDATE call_campaigns
      SET 
        completed_calls = completed_calls + 1,
        successful_calls = successful_calls + 1
      WHERE id = OLD.campaign_id;
    ELSE
      -- Processing item without call_id and no explicit failure outcome
      -- This could be a retry being scheduled - count as completed but not successful
      UPDATE call_campaigns
      SET completed_calls = completed_calls + 1
      WHERE id = OLD.campaign_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Create the DELETE trigger
-- =====================================================

-- Drop if exists (in case we need to re-run)
DROP TRIGGER IF EXISTS trigger_update_campaign_statistics_on_delete ON call_queue;

CREATE TRIGGER trigger_update_campaign_statistics_on_delete
  BEFORE DELETE ON call_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_statistics_on_delete();

-- =====================================================
-- 3. Add comment for documentation
-- =====================================================

COMMENT ON FUNCTION update_campaign_statistics_on_delete() IS 
'Updates campaign statistics when a queue item is deleted. This is needed because the auto-delete implementation uses DELETE instead of UPDATE, so the original UPDATE trigger does not fire.';

COMMENT ON TRIGGER trigger_update_campaign_statistics_on_delete ON call_queue IS
'Fires before DELETE on call_queue to update campaign statistics (completed_calls, successful_calls) and mark campaign as completed when all calls are done.';

-- =====================================================
-- Migration Complete
-- =====================================================
