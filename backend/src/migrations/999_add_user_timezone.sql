-- Migration: Add timezone support to users table
-- Created: 2025-11-19
-- Description: Adds timezone fields to support user-specific timezone settings

-- Add timezone columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
ADD COLUMN IF NOT EXISTS timezone_auto_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timezone_manually_set BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for timezone queries
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);

-- Set existing users to Asia/Kolkata (preserve current behavior)
UPDATE users 
SET timezone = 'Asia/Kolkata', 
    timezone_manually_set = false,
    timezone_auto_detected = false,
    timezone_updated_at = NOW()
WHERE timezone = 'UTC';

-- Add comments for documentation
COMMENT ON COLUMN users.timezone IS 'IANA timezone identifier (e.g., America/New_York, Asia/Kolkata, Europe/London)';
COMMENT ON COLUMN users.timezone_auto_detected IS 'True if timezone was auto-detected from IP address or browser';
COMMENT ON COLUMN users.timezone_manually_set IS 'True if user manually selected timezone in settings';
COMMENT ON COLUMN users.timezone_updated_at IS 'Timestamp when timezone was last updated';
