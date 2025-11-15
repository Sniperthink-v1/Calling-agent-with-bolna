// Type definitions for the mobile app

export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  company?: string;
  website?: string;
  location?: string;
  bio?: string;
  phone?: string;
  role: 'user' | 'admin' | 'super_admin';
  email_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
  timestamp: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface Call {
  id: string;
  agent_id: string;
  user_id: string;
  contact_id?: string;
  bolna_conversation_id: string;
  bolna_execution_id: string;
  phone_number: string;
  call_source?: 'phone' | 'internet' | 'unknown';
  caller_name?: string;
  caller_email?: string;
  duration_seconds: number;
  duration_minutes: number;
  credits_used: number;
  status: 'completed' | 'failed' | 'in_progress' | 'cancelled';
  recording_url?: string;
  transcript_id?: string;
  metadata?: any;
  lead_type?: 'inbound' | 'outbound';
  call_lifecycle_status?: string;
  hangup_by?: string;
  hangup_reason?: string;
  hangup_provider_code?: number;
  created_at: string;
  completed_at?: string;
  updated_at?: string;
  
  // Analytics fields from backend
  total_score?: number;
  lead_status_tag?: string;
  intent_level?: string;
  intent_score?: number;
  engagement_score?: number;
  engagement_health?: string;
  fit_alignment?: string;
  urgency_level?: string;
  budget_constraint?: string;
  cta_interactions?: any;
  has_transcript?: boolean;
  
  // Backend joined fields (snake_case)
  agent_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_company?: string;
  
  // Lifecycle timestamps
  call_answered_at?: string;
  call_disconnected_at?: string;
  ringing_started_at?: string;
  
  // Display fields (camelCase - added by normalization)
  contactName?: string;
  agentName?: string;
  displayDuration?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  email?: string;
  company?: string;
  notes?: string;
  is_auto_created: boolean;
  auto_creation_source?: 'webhook' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  bolna_agent_id?: string;
  name: string;
  agent_type: 'call' | 'chat';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  agent_id: string;
  agent_name?: string;
  next_action: string;
  first_call_time: string;
  last_call_time: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  total_contacts: number;
  completed_calls: number;
  successful_calls: number;
  failed_calls: number;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  stats?: {
    total: number;
    completed: number;
    failed: number;
    pending?: number;
  };
}

export interface DashboardKPI {
  label: string;
  value: number;
  delta?: number;
  percentage?: number;
  compare?: string;
  description?: string;
}

export interface DashboardOverview {
  kpis: DashboardKPI[];
  creditBalance: number;
  agents: {
    total: number;
    active: number;
  };
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: Pagination;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    timestamp: string;
    details?: any;
  };
}

export interface CallsListParams {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  agentNames?: string[];
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ContactsListParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface CampaignsListParams {
  status?: string;
  limit?: number;
  offset?: number;
}
