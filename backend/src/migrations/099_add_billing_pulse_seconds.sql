-- Migration: Add billing_pulse_seconds to system_config
-- Description: Adds pulse-based billing configuration for credit calculation
-- Pulse billing charges in increments of X seconds instead of per-minute rounding
-- Default: 60 (per-minute billing), can be set to 30, 20, etc.

-- Insert billing_pulse_seconds if it doesn't exist
INSERT INTO system_config (config_key, config_value, description, created_at, updated_at)
VALUES (
    'billing_pulse_seconds',
    '60',
    'Billing pulse duration in seconds. Credits are calculated based on ceil(duration/pulse). Default 60 = per-minute billing. Set to 30 for half-minute billing, 20 for 20-second pulse, etc.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (config_key) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE system_config IS 'System-wide configuration values including billing_pulse_seconds for pulse-based billing';
