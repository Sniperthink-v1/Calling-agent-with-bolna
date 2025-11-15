import apiClient from '../api/client';
import type { LoginCredentials, RegisterCredentials, AuthResponse, User } from '../types';
import { useAuthStore } from '../stores/authStore';
import { normalizeUser } from '../utils/helpers';

export const authService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    console.log('🔐 Attempting login for:', credentials.email);
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      console.log('✅ Login response received');
      const { user, token, refreshToken } = response.data;

      // Normalize user data
      const normalizedUser = normalizeUser(user);
      console.log('✅ User data normalized:', { id: normalizedUser.id, email: normalizedUser.email });

      // Save to store
      await useAuthStore.getState().login(normalizedUser, token, refreshToken);
      console.log('✅ Login successful');

      return { user: normalizedUser, token };
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  },

  /**
   * Register new user
   */
  async register(credentials: RegisterCredentials): Promise<{ user: User; token: string }> {
    const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
    const { user, token, refreshToken } = response.data;

    // Normalize user data
    const normalizedUser = normalizeUser(user);

    // Save to store
    await useAuthStore.getState().login(normalizedUser, token, refreshToken);

    return { user: normalizedUser, token };
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      await useAuthStore.getState().logout();
    }
  },

  /**
   * Validate current token
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await apiClient.get('/auth/validate');
      return response.data.valid === true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/auth/profile');
    const user = normalizeUser(response.data.user);

    // Update store
    useAuthStore.getState().setUser(user);

    return user;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    const response = await apiClient.post<{ token: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken }
    );
    
    const { token, refreshToken: newRefreshToken } = response.data;
    
    // Update store
    useAuthStore.getState().setToken(token);

    return token;
  },
};
