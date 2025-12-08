BEGIN;

-- Make bolna_execution_id nullable to allow concurrent call creation
-- The unique constraint (WHERE bolna_execution_id IS NOT NULL) already exists
-- and will prevent duplicate execution IDs, while allowing multiple NULL values
-- during the pending state before Bolna responds with the actual execution ID

ALTER TABLE calls
ALTER COLUMN bolna_execution_id DROP NOT NULL;

-- Add comment explaining the constraint
COMMENT ON COLUMN calls.bolna_execution_id IS 
'Bolna execution ID - nullable during call creation, updated after Bolna API responds. Unique constraint enforced only on non-NULL values.';

COMMIT;
