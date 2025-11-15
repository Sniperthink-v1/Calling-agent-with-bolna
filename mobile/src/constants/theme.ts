// Theme constants for the mobile app

// Light theme colors
export const LIGHT_COLORS = {
  primary: '#1A6262',
  primaryDark: '#124949',
  primaryLight: '#2A7A7A',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  
  border: '#E5E7EB',
  
  card: '#FFFFFF',
  
  // Status colors
  completed: '#10B981',
  inProgress: '#3B82F6',
  failed: '#EF4444',
  cancelled: '#6B7280',
};

// Dark theme colors
export const DARK_COLORS = {
  primary: '#2A7A7A',
  primaryDark: '#1A6262',
  primaryLight: '#3A8A8A',
  
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  background: '#111827',
  backgroundSecondary: '#1F2937',
  
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textLight: '#9CA3AF',
  
  border: '#374151',
  
  card: '#1F2937',
  
  // Status colors
  completed: '#10B981',
  inProgress: '#3B82F6',
  failed: '#EF4444',
  cancelled: '#6B7280',
};

// Default to light colors for backwards compatibility
export const COLORS = LIGHT_COLORS;

// Hook to get theme colors based on current theme
export const getThemeColors = (isDark: boolean) => isDark ? DARK_COLORS : LIGHT_COLORS;

export const SIZES = {
  // Font sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  
  // Spacing
  paddingXS: 4,
  paddingSM: 8,
  paddingMD: 16,
  paddingLG: 24,
  paddingXL: 32,
  
  // Border radius
  radiusSM: 4,
  radiusMD: 8,
  radiusLG: 12,
  radiusXL: 16,
  radiusFull: 9999,
  
  // Icon sizes
  iconXS: 16,
  iconSM: 20,
  iconMD: 24,
  iconLG: 32,
  iconXL: 40,
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  semibold: 'System',
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
