// MoonScribe Design System
// Inspired by Recall.ai & Capacities.io

export const theme = {
  colors: {
    // Primary palette
    primary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    
    // Background colors (dark theme)
    bg: {
      primary: '#0a0a1a',
      secondary: '#0f0f23',
      tertiary: '#1a1a2e',
      elevated: '#16213e',
      hover: 'rgba(139, 92, 246, 0.08)',
      active: 'rgba(139, 92, 246, 0.15)',
    },
    
    // Text colors
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
      tertiary: '#64748b',
      muted: '#475569',
      inverse: '#0f172a',
    },
    
    // Border colors
    border: {
      light: 'rgba(139, 92, 246, 0.1)',
      default: 'rgba(139, 92, 246, 0.2)',
      strong: 'rgba(139, 92, 246, 0.3)',
      focus: 'rgba(139, 92, 246, 0.5)',
    },
    
    // Status colors
    status: {
      success: '#10b981',
      successBg: 'rgba(16, 185, 129, 0.15)',
      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.15)',
      error: '#ef4444',
      errorBg: 'rgba(239, 68, 68, 0.15)',
      info: '#3b82f6',
      infoBg: 'rgba(59, 130, 246, 0.15)',
    },
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
    '4xl': '4rem',
  },
  
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)',
    glowStrong: '0 0 30px rgba(139, 92, 246, 0.5)',
  },
  
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: {
      xs: '0.6875rem',
      sm: '0.8125rem',
      base: '0.9375rem',
      lg: '1.0625rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  zIndex: {
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    tooltip: 500,
  },
};

export type Theme = typeof theme;
