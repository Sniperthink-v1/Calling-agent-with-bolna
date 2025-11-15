/**
 * Format duration in seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

/**
 * Format date to a readable format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
};

/**
 * Format time only
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as +XX XXXXXXXXXX or keep original if doesn't match pattern
  if (cleaned.length >= 10) {
    const countryCode = cleaned.substring(0, cleaned.length - 10);
    const number = cleaned.substring(cleaned.length - 10);
    return countryCode ? `+${countryCode} ${number}` : number;
  }
  
  return phone;
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return 'U';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Validate email
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Check if it has at least 10 digits
  return cleaned.length >= 10;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Generate random color for avatars
 */
export const generateAvatarColor = (name: string): string => {
  const colors = [
    '#1A6262', '#2A7A7A', '#3B82F6', '#8B5CF6', 
    '#EC4899', '#F59E0B', '#10B981', '#6366F1'
  ];
  
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

/**
 * Normalize boolean values from API
 * Handles string "true"/"false", numbers 1/0, and actual booleans
 */
export const toBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === '1';
  }
  if (typeof value === 'number') return value === 1;
  return Boolean(value);
};

/**
 * Normalize User object from API response
 */
export const normalizeUser = (user: any): any => {
  if (!user) return user;
  return {
    ...user,
    email_verified: toBoolean(user.email_verified),
    credits: Number(user.credits) || 0,
  };
};

/**
 * Normalize Agent object from API response
 */
export const normalizeAgent = (agent: any): any => {
  if (!agent) return agent;
  return {
    ...agent,
    is_active: toBoolean(agent.is_active),
  };
};

/**
 * Normalize Contact object from API response
 */
export const normalizeContact = (contact: any): any => {
  if (!contact) return contact;
  return {
    ...contact,
    is_auto_created: toBoolean(contact.is_auto_created),
  };
};

/**
 * Normalize Call data from backend
 * Backend returns: agent_name, contact_name, duration_seconds
 * Frontend expects: agentName, contactName, displayDuration
 */
export const normalizeCall = (call: any): any => {
  if (!call) return call;
  
  return {
    ...call,
    // Map snake_case to camelCase for display
    contactName: call.contact_name || call.contactName || 'Unknown',
    agentName: call.agent_name || call.agentName || 'Unknown',
    // Add formatted duration
    displayDuration: formatDuration(call.duration_seconds || 0),
  };
};

/**
 * Normalize Campaign data from backend
 * Backend returns campaign with nested stats
 */
export const normalizeCampaign = (campaign: any): any => {
  if (!campaign) return campaign;
  
  // Backend returns different structures - handle both
  const stats = campaign.stats || {
    total: campaign.total_contacts || 0,
    completed: campaign.completed_calls || 0,
    failed: campaign.failed_calls || 0,
    pending: (campaign.total_contacts || 0) - (campaign.completed_calls || 0) - (campaign.failed_calls || 0),
  };
  
  return {
    ...campaign,
    stats,
    // Ensure agent_name is available
    agent_name: campaign.agent_name || campaign.agentName || 'Unknown Agent',
  };
};

