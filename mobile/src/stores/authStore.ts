import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  checkAuth: () => Promise<void>;
  updateCredits: (credits: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setToken: (token) => set({ token }),

  login: async (user, token, refreshToken) => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.multiSet([
        ['authToken', token],
        ['refreshToken', refreshToken],
        ['user', JSON.stringify(user)],
      ]);

      // Update state
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);

      // Clear state
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  },

  updateUser: (updates) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...updates };
      set({ user: updatedUser });
      
      // Persist to AsyncStorage
      AsyncStorage.setItem('user', JSON.stringify(updatedUser)).catch((error) => {
        console.error('Error updating user in storage:', error);
      });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });

      const [token, userJson] = await AsyncStorage.multiGet(['authToken', 'user']);

      if (token[1] && userJson[1]) {
        const user = JSON.parse(userJson[1]);
        set({
          user,
          token: token[1],
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateCredits: (credits) => {
    const { user } = get();
    if (user) {
      get().updateUser({ credits });
    }
  },
}));
