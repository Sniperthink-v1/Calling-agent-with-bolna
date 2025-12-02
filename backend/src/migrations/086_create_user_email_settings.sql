-- Migration: Create user email settings table for follow-up emails
-- Date: 2025-12-02
-- Purpose: User-configurable follow-up email settings with template customization

-- Create user_email_settings table
CREATE TABLE IF NOT EXISTS user_email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Enable/Disable auto-send follow-up emails
    auto_send_enabled BOOLEAN NOT NULL DEFAULT false,
    
    -- OpenAI prompt ID for dynamic email customization based on transcript
    openai_followup_email_prompt_id VARCHAR(255),
    
    -- Email template configuration
    -- Subject line template with variables like {{lead_name}}, {{company}}, {{agent_name}}
    subject_template VARCHAR(500) DEFAULT 'Follow-up: Great speaking with you, {{lead_name}}!',
    
    -- HTML body template with variables
    body_template TEXT DEFAULT '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .highlight { background: #e0e7ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Thank You for Speaking With Us!</h1>
        </div>
        <div class="content">
            <p>Hi {{lead_name}},</p>
            <p>Thank you for taking the time to speak with us today. It was great learning about your needs{{#if company}} at {{company}}{{/if}}.</p>
            <div class="highlight">
                <p><strong>Summary of Our Conversation:</strong></p>
                <p>{{summary}}</p>
            </div>
            {{#if next_steps}}
            <p><strong>Next Steps:</strong></p>
            <p>{{next_steps}}</p>
            {{/if}}
            <p>If you have any questions, feel free to reach out. We look forward to hearing from you!</p>
            <p>Best regards,<br>{{sender_name}}</p>
        </div>
        <div class="footer">
            <p>This is an automated follow-up email based on your recent conversation.</p>
        </div>
    </div>
</body>
</html>',
    
    -- Conditions for when to send emails (stored as JSON array)
    -- Options: 'completed', 'busy', 'no_answer', 'after_retries', 'voicemail'
    send_conditions JSONB DEFAULT '["completed"]'::jsonb,
    
    -- Lead status filters - only send if lead status matches (stored as JSON array)
    -- Options: 'hot', 'warm', 'cold', 'not_qualified', 'any'
    lead_status_filters JSONB DEFAULT '["any"]'::jsonb,
    
    -- Skip if no contact email available
    skip_if_no_email BOOLEAN NOT NULL DEFAULT true,
    
    -- Delay before sending (in minutes) - 0 means send immediately
    send_delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (send_delay_minutes >= 0),
    
    -- Maximum retries before sending (for after_retries condition)
    max_retries_before_send INTEGER DEFAULT 3 CHECK (max_retries_before_send >= 1 AND max_retries_before_send <= 10),
    
    -- Created and updated timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint for one settings row per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_settings_user_id ON user_email_settings(user_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_email_settings_auto_send ON user_email_settings(auto_send_enabled) WHERE auto_send_enabled = true;

-- Add OpenAI follow-up email prompt ID to users table (for admin to set per-user)
ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_followup_email_prompt_id VARCHAR(255);

-- Add comments for documentation
COMMENT ON TABLE user_email_settings IS 
    'User-configurable settings for automated follow-up emails after calls';

COMMENT ON COLUMN user_email_settings.auto_send_enabled IS 
    'Toggle to enable/disable automatic follow-up emails after calls';

COMMENT ON COLUMN user_email_settings.openai_followup_email_prompt_id IS 
    'OpenAI Response API prompt ID for generating personalized email content based on call transcript';

COMMENT ON COLUMN user_email_settings.subject_template IS 
    'Email subject line template with variables like {{lead_name}}, {{company}}';

COMMENT ON COLUMN user_email_settings.body_template IS 
    'HTML email body template with variables for personalization';

COMMENT ON COLUMN user_email_settings.send_conditions IS 
    'JSON array of conditions when to send: completed, busy, no_answer, after_retries, voicemail';

COMMENT ON COLUMN user_email_settings.lead_status_filters IS 
    'JSON array of lead statuses to filter: hot, warm, cold, not_qualified, any';

COMMENT ON COLUMN user_email_settings.skip_if_no_email IS 
    'Skip sending if contact has no email address';

COMMENT ON COLUMN user_email_settings.send_delay_minutes IS 
    'Delay in minutes before sending the follow-up email (0 = immediate)';

COMMENT ON COLUMN user_email_settings.max_retries_before_send IS 
    'Number of retry attempts before sending email (for after_retries condition)';

COMMENT ON COLUMN users.openai_followup_email_prompt_id IS 
    'OpenAI Response API prompt ID for follow-up email personalization. Admin can set per-user.';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_email_settings_updated_at ON user_email_settings;
CREATE TRIGGER trigger_user_email_settings_updated_at
    BEFORE UPDATE ON user_email_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_email_settings_updated_at();
