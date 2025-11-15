import React, { createContext, useContext, ReactNode } from 'react';
import { StatusBar } from 'react-native';
import { useThemeStore } from '../stores/themeStore';
import { getThemeColors, SIZES, FONTS, SHADOWS } from '../constants/theme';

interface ThemeContextType {
  isDark: boolean;
  colors: ReturnType<typeof getThemeColors>;
  sizes: typeof SIZES;
  fonts: typeof FONTS;
  shadows: typeof SHADOWS;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  themeMode: 'light' | 'dark' | 'auto';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { isDark, mode, toggleTheme, setMode } = useThemeStore();
  const colors = getThemeColors(isDark);

  const value: ThemeContextType = {
    isDark,
    colors,
    sizes: SIZES,
    fonts: FONTS,
    shadows: SHADOWS,
    toggleTheme,
    setThemeMode: setMode,
    themeMode: mode,
  };

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
