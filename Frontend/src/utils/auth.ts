import { API_BASE_URL } from '@/config/api';

// Helper function to get auth headers for API calls
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper function to resolve URL with API base
const resolveApiUrl = (url: string): string => {
  // If URL is absolute (starts with http:// or https://), use as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL is relative and starts with /api, prepend API_BASE_URL
  if (url.startsWith('/api')) {
    return `${API_BASE_URL}${url}`;
  }
  
  // For other relative URLs, use as-is (rare case)
  return url;
};

// Helper function for authenticated fetch
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const authHeaders = getAuthHeaders();
  
  // Resolve the full API URL
  const fullUrl = resolveApiUrl(url);
  
  // Remove Authorization from getAuthHeaders if body is FormData
  const headers = options.body instanceof FormData 
    ? { 'Authorization': authHeaders['Authorization'] } 
    : authHeaders;

  return fetch(fullUrl, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
};
