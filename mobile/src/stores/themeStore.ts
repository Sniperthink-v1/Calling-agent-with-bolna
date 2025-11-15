import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// Get system theme
const getSystemTheme = (): boolean => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      isDark: getSystemTheme(),
      
      setMode: (mode: ThemeMode) => {
        const isDark = mode === 'auto' ? getSystemTheme() : mode === 'dark';
        set({ mode, isDark });
      },
      
      toggleTheme: () => {
        const currentMode = get().mode;
        const newMode: ThemeMode = currentMode === 'light' ? 'dark' : 'light';
        set({ mode: newMode, isDark: newMode === 'dark' });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Listen to system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const state = useThemeStore.getState();
  if (state.mode === 'auto') {
    useThemeStore.setState({ isDark: colorScheme === 'dark' });
  }
});
