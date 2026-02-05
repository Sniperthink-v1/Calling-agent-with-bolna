-- Migration: Add custom fields support for business-specific lead intelligence data
-- Description: 
--   1. Add custom_fields JSONB column to lead_analytics for storing business-specific extracted fields
--   2. Add field_configuration JSONB column to users for admin-managed custom field definitions
--   3. Create indexes for efficient JSONB queries
-- Date: 2026-02-05

-- =============================================
-- 1. Add custom_fields to lead_analytics
-- =============================================

-- Add custom_fields column to store business-specific extracted data
ALTER TABLE lead_analytics
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB queries on custom_fields
CREATE INDEX IF NOT EXISTS idx_lead_analytics_custom_fields 
ON lead_analytics USING gin (custom_fields);

-- Add comment for documentation
COMMENT ON COLUMN lead_analytics.custom_fields IS 
'Business-specific fields extracted from call transcript. Structure defined by admin in users.field_configuration. Example: {"student_age": 15, "course_program": "Python Bootcamp", "industry": "Education"}';

-- =============================================
-- 2. Add field_configuration to users
-- =============================================

-- Add field_configuration column to store admin-managed custom field definitions per user
ALTER TABLE users
ADD COLUMN IF NOT EXISTS field_configuration JSONB DEFAULT '{
  "enabled_fields": [],
  "field_definitions": []
}'::jsonb;

-- Create GIN index for efficient JSONB queries on field_configuration
CREATE INDEX IF NOT EXISTS idx_users_field_configuration 
ON users USING gin (field_configuration);

-- Add comment for documentation
COMMENT ON COLUMN users.field_configuration IS 
'Admin-managed custom field configuration for this user. Structure: 
{
  "enabled_fields": ["student_age", "course_program"],
  "field_definitions": [
    {
      "key": "student_age",
      "label": "Student Age",
      "type": "number",
      "category": "WHO",
      "extraction_hint": "Extract the age or grade of the student from conversation"
    }
  ]
}
Used by admin to generate OpenAI extraction prompt JSON.';

-- =============================================
-- 3. Performance indexes for common queries
-- =============================================

-- Index for filtering by specific custom field values (example: student_age)
-- Note: Create specific indexes as needed based on actual query patterns
-- Example: CREATE INDEX idx_lead_custom_field_student_age ON lead_analytics ((custom_fields->>'student_age'));

-- =============================================
-- 4. Verification queries (for testing)
-- =============================================

-- Test custom_fields column exists and is queryable
-- SELECT id, custom_fields, custom_fields->>'student_age' as student_age 
-- FROM lead_analytics 
-- WHERE custom_fields->>'student_age' IS NOT NULL 
-- LIMIT 5;

-- Test field_configuration column exists
-- SELECT id, email, field_configuration 
-- FROM users 
-- WHERE field_configuration->'enabled_fields' != '[]'::jsonb 
-- LIMIT 5;
