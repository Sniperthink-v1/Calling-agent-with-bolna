-- Migration: Create failure_logs table
-- Description: Table to store detailed API failure logs with metadata
-- Created: 2025-11-23

CREATE TABLE IF NOT EXISTS failure_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request Information
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  
  -- Error Details
  error_message TEXT,
  error_stack TEXT,
  
  -- Request/Response Data (JSONB for efficient querying)
  request_body JSONB,
  request_headers JSONB,
  response_body JSONB,
  
  -- Performance Metrics
  duration_ms INTEGER NOT NULL,
  
  -- User Context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Tracking
  request_id VARCHAR(100),
  environment VARCHAR(50) DEFAULT 'production',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_failure_logs_timestamp ON failure_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_failure_logs_endpoint ON failure_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_failure_logs_status_code ON failure_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_failure_logs_user_id ON failure_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_failure_logs_environment ON failure_logs(environment);
CREATE INDEX IF NOT EXISTS idx_failure_logs_method ON failure_logs(method);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_failure_logs_status_timestamp ON failure_logs(status_code, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_failure_logs_endpoint_timestamp ON failure_logs(endpoint, timestamp DESC);

-- GIN index for JSONB columns (for advanced JSON queries)
CREATE INDEX IF NOT EXISTS idx_failure_logs_request_body ON failure_logs USING GIN (request_body);
CREATE INDEX IF NOT EXISTS idx_failure_logs_request_headers ON failure_logs USING GIN (request_headers);

-- Add table comment
COMMENT ON TABLE failure_logs IS 'Stores detailed logs of API failures (4xx and 5xx errors) with full request/response metadata for debugging and monitoring';

-- Column comments
COMMENT ON COLUMN failure_logs.endpoint IS 'The API endpoint that failed (e.g., /api/v1/users)';
COMMENT ON COLUMN failure_logs.method IS 'HTTP method (GET, POST, PUT, DELETE, etc.)';
COMMENT ON COLUMN failure_logs.status_code IS 'HTTP status code (400-599)';
COMMENT ON COLUMN failure_logs.duration_ms IS 'Request duration in milliseconds';
COMMENT ON COLUMN failure_logs.request_id IS 'Unique request ID for correlation with other logs';
COMMENT ON COLUMN failure_logs.environment IS 'Environment where the error occurred (development, staging, production)';
