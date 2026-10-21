import { createContext, useContext, ReactNode } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  isDark: boolean;
  bg: string;
  bgShell: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  border2: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentGreen: string;
  navBg: string;
  navBorder: string;
}

// ─── Palettes ─────────────────────────────────────────────────────────────────

export const DARK_COLORS: ThemeColors = {
  isDark: true,
  bg: '#0D0B1E',
  bgShell: '#06040F',
  surface: 'rgba(255,255,255,0.04)',
  surface2: 'rgba(255,255,255,0.07)',
  surface3: 'rgba(255,255,255,0.11)',
  border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.14)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: 'rgba(148,163,184,0.5)',
  accent: '#4F46E5',
  accentGreen: '#22C55E',
  navBg: 'rgba(10,8,24,0.95)',
  navBorder: 'rgba(255,255,255,0.07)',
};

export const LIGHT_COLORS: ThemeColors = {
  isDark: false,
  bg: '#FFFFFF',
  bgShell: '#F1F5F9',
  surface: 'rgba(0,0,0,0.04)',
  surface2: 'rgba(0,0,0,0.06)',
  surface3: 'rgba(0,0,0,0.09)',
  border: 'rgba(0,0,0,0.08)',
  border2: 'rgba(0,0,0,0.14)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: 'rgba(100,116,139,0.5)',
  accent: '#4F46E5',
  accentGreen: '#16A34A',
  navBg: 'rgba(248,250,252,0.95)',
  navBorder: 'rgba(0,0,0,0.07)',
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeCtx = createContext<ThemeColors>(DARK_COLORS);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettingsStore();
  const colors = settings.darkMode === false ? LIGHT_COLORS : DARK_COLORS;
  return <ThemeCtx.Provider value={colors}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeColors {
  return useContext(ThemeCtx);
}