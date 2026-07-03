// ═══════════════════════════════════════════════════════════════
// Theme — Token-based theme engine with presets
// ═══════════════════════════════════════════════════════════════

import type { GridThemeTokens } from './types';

export const defaultTheme: GridThemeTokens = {
  spacing: 'standard',
  radius: 'md',
  colors: {
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    accent: '#f1f5f9',
    accentForeground: '#0f172a',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  font: { size: '0.875rem', family: 'Inter, sans-serif', weight: '400' },
  border: '1px solid #e2e8f0',
};

export const darkTheme: GridThemeTokens = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    background: '#0f172a',
    foreground: '#e2e8f0',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    border: '#334155',
    accent: '#1e293b',
    accentForeground: '#e2e8f0',
  },
  border: '1px solid #334155',
};

export const highContrastTheme: GridThemeTokens = {
  ...defaultTheme,
  spacing: 'standard',
  radius: 'none',
  colors: {
    primary: '#000000',
    primaryForeground: '#ffffff',
    background: '#ffffff',
    foreground: '#000000',
    muted: '#f0f0f0',
    mutedForeground: '#000000',
    border: '#000000',
    accent: '#e0e0e0',
    accentForeground: '#000000',
    danger: '#000000',
    success: '#000000',
    warning: '#000000',
  },
  border: '2px solid #000000',
  font: { size: '1rem', family: 'Arial, sans-serif', weight: '700' },
};

export function themeToTailwind(theme: GridThemeTokens): Record<string, string> {
  return {
    '--dg-primary': theme.colors.primary,
    '--dg-primary-fg': theme.colors.primaryForeground,
    '--dg-bg': theme.colors.background,
    '--dg-fg': theme.colors.foreground,
    '--dg-muted': theme.colors.muted,
    '--dg-muted-fg': theme.colors.mutedForeground,
    '--dg-border': theme.colors.border,
    '--dg-accent': theme.colors.accent,
    '--dg-accent-fg': theme.colors.accentForeground,
    '--dg-danger': theme.colors.danger,
    '--dg-success': theme.colors.success,
    '--dg-warning': theme.colors.warning,
    '--dg-font-size': theme.font.size,
    '--dg-font-family': theme.font.family,
    '--dg-radius': theme.radius === 'none' ? '0' : theme.radius === 'sm' ? '0.25rem' : theme.radius === 'md' ? '0.5rem' : '0.75rem',
  };
}
