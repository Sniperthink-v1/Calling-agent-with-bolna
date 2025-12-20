-- Migration: Add Team Members and Lead Intelligence Events
-- Description: Adds team member support (human agents) with role-based access,
--              and lead intelligence edit tracking for timeline

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================
-- Human representatives who work under a tenant (owner user)
-- They can log in, view/edit leads based on their role

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'agent',
    is_active BOOLEAN NOT NULL DEFAULT true,
    invite_token VARCHAR(255),
    invite_token_expires TIMESTAMP WITH TIME ZONE,
    password_set_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT team_members_role_check CHECK (role IN ('manager', 'agent', 'viewer')),
    CONSTRAINT team_members_email_tenant_unique UNIQUE (tenant_user_id, email)
);

-- Indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_tenant_user_id ON team_members(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(tenant_user_id, role);
CREATE INDEX IF NOT EXISTS idx_team_members_invite_token ON team_members(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(tenant_user_id, is_active);

-- Global unique email across all team members (one person can't be team member for multiple tenants with same email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_email_global ON team_members(email);

-- ============================================================================
-- TEAM MEMBER SESSIONS TABLE
-- ============================================================================
-- Tracks login sessions for team members (similar to user_sessions)

CREATE TABLE IF NOT EXISTS team_member_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    tenant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for team_member_sessions
CREATE INDEX IF NOT EXISTS idx_team_member_sessions_member ON team_member_sessions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_sessions_token ON team_member_sessions(token_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_team_member_sessions_refresh ON team_member_sessions(refresh_token_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_team_member_sessions_expires ON team_member_sessions(expires_at) WHERE is_active = true;

-- ============================================================================
-- LEAD INTELLIGENCE EVENTS TABLE
-- ============================================================================
-- Tracks all changes/events on lead intelligence for timeline display
-- This includes manual edits by humans, assignments, notes, etc.

CREATE TABLE IF NOT EXISTS lead_intelligence_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to lead (can be by phone or by lead_analytics_id for individual leads)
    tenant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(50),
    lead_analytics_id UUID REFERENCES lead_analytics(id) ON DELETE SET NULL,
    
    -- Who performed the action
    actor_type VARCHAR(20) NOT NULL DEFAULT 'owner',
    actor_id UUID, -- user.id for owner, team_member.id for team members
    actor_name VARCHAR(255) NOT NULL,
    
    -- What happened
    event_type VARCHAR(50) NOT NULL,
    field_changes JSONB DEFAULT '{}',
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT lead_events_actor_type_check CHECK (actor_type IN ('owner', 'team_member', 'ai', 'system')),
    CONSTRAINT lead_events_event_type_check CHECK (event_type IN ('edit', 'assign', 'note', 'status_change', 'call', 'email', 'meeting'))
);

-- Indexes for lead_intelligence_events
CREATE INDEX IF NOT EXISTS idx_lead_events_tenant ON lead_intelligence_events(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_phone ON lead_intelligence_events(tenant_user_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_analytics ON lead_intelligence_events(lead_analytics_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_actor ON lead_intelligence_events(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_created ON lead_intelligence_events(tenant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_intelligence_events(event_type);

-- ============================================================================
-- MODIFY LEAD_ANALYTICS TABLE
-- ============================================================================
-- Add columns for assignment and edit tracking

-- Assigned team member
ALTER TABLE lead_analytics 
ADD COLUMN IF NOT EXISTS assigned_to_team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL;

-- Last editor tracking
ALTER TABLE lead_analytics 
ADD COLUMN IF NOT EXISTS last_edited_by_type VARCHAR(20) DEFAULT 'ai';

ALTER TABLE lead_analytics 
ADD COLUMN IF NOT EXISTS last_edited_by_id UUID;

ALTER TABLE lead_analytics 
ADD COLUMN IF NOT EXISTS last_edited_by_name VARCHAR(255);

ALTER TABLE lead_analytics 
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Notes field for manual notes
ALTER TABLE lead_analytics 
ADD COLUMN IF NOT EXISTS manual_notes TEXT;

-- Add constraint for last_edited_by_type
ALTER TABLE lead_analytics 
DROP CONSTRAINT IF EXISTS lead_analytics_last_edited_by_type_check;

ALTER TABLE lead_analytics 
ADD CONSTRAINT lead_analytics_last_edited_by_type_check 
CHECK (last_edited_by_type IS NULL OR last_edited_by_type IN ('owner', 'team_member', 'ai', 'system'));

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_lead_analytics_assigned_to ON lead_analytics(assigned_to_team_member_id) WHERE assigned_to_team_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_analytics_last_edited ON lead_analytics(last_edited_at DESC) WHERE last_edited_at IS NOT NULL;

-- ============================================================================
-- TRIGGER: Update updated_at on team_members
-- ============================================================================
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_members_updated_at ON team_members;
CREATE TRIGGER trg_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_members_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE team_members IS 'Human representatives (team members) who work under a tenant user with role-based access';
COMMENT ON COLUMN team_members.tenant_user_id IS 'The owner/tenant user this team member belongs to';
COMMENT ON COLUMN team_members.role IS 'Role: manager (full access), agent (assigned leads only), viewer (read-only)';
COMMENT ON COLUMN team_members.invite_token IS 'One-time token for setting password after invite';

COMMENT ON TABLE lead_intelligence_events IS 'Timeline events for lead intelligence - tracks edits, assignments, notes by humans';
COMMENT ON COLUMN lead_intelligence_events.actor_type IS 'Who performed action: owner, team_member, ai, or system';
COMMENT ON COLUMN lead_intelligence_events.field_changes IS 'JSON object with {field: {old: value, new: value}} for edits';

COMMENT ON COLUMN lead_analytics.assigned_to_team_member_id IS 'Team member this lead is assigned to (for agent role filtering)';
COMMENT ON COLUMN lead_analytics.last_edited_by_type IS 'Type of actor who last edited: owner, team_member, ai, system';
COMMENT ON COLUMN lead_analytics.last_edited_by_name IS 'Display name of last editor for quick access';
COMMENT ON COLUMN lead_analytics.manual_notes IS 'Free-form notes added by humans';
