import { useState, useEffect, useCallback } from 'react';
import { StoreConfig } from '../types';

export type ThemeMode = 'light' | 'dark';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primary: string; // e.g. #d97706
  hover: string;   // e.g. #b45309
  light: string;   // e.g. #fef3c7
  dark: string;    // e.g. #78350f
  rgb: [number, number, number];
  badgeBg: string;
  badgeText: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  amber: {
    id: 'amber',
    name: 'Golden Amber (Whiskey & Spirits)',
    description: 'Warm golden amber glow, refined whiskey and cognac aesthetics.',
    primary: '#d97706',
    hover: '#b45309',
    light: '#fef3c7',
    dark: '#78350f',
    rgb: [217, 119, 6],
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Green (Safaricom & Retail)',
    description: 'Trusted commerce, vibrant Safaricom M-Pesa emerald green.',
    primary: '#059669',
    hover: '#047857',
    light: '#d1fae5',
    dark: '#064e3b',
    rgb: [5, 150, 105],
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
  },
  indigo: {
    id: 'indigo',
    name: 'Royal Indigo (Midnight Sapphire)',
    description: 'Deep executive corporate blue with high contrast and polish.',
    primary: '#4f46e5',
    hover: '#4338ca',
    light: '#e0e7ff',
    dark: '#312e81',
    rgb: [79, 70, 229],
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-400',
  },
  rose: {
    id: 'rose',
    name: 'Ruby Bordeaux (Wine Lounge)',
    description: 'Velvet crimson bordeaux, elegant fine wine and luxury lounges.',
    primary: '#e11d48',
    hover: '#be123c',
    light: '#ffe4e6',
    dark: '#881337',
    rgb: [225, 29, 72],
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
  },
  blue: {
    id: 'blue',
    name: 'Ocean Cobalt (Classic Blue)',
    description: 'Modern, trustworthy electric cobalt for modern retail and bars.',
    primary: '#0284c7',
    hover: '#0369a1',
    light: '#e0f2fe',
    dark: '#0c4a6e',
    rgb: [2, 132, 199],
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-400',
  },
  teal: {
    id: 'teal',
    name: 'Coastal Teal (Botanical Spirits)',
    description: 'Crisp botanical gin & modern bistro aesthetic.',
    primary: '#0d9488',
    hover: '#0f766e',
    light: '#ccfbf1',
    dark: '#134e4a',
    rgb: [13, 148, 136],
    badgeBg: 'bg-teal-500/20',
    badgeText: 'text-teal-400',
  },
  purple: {
    id: 'purple',
    name: 'Artisan Purple (Craft Distillers)',
    description: 'Regal violet & magenta for boutique distilleries and craft clubs.',
    primary: '#7c3aed',
    hover: '#6d28d9',
    light: '#ede9fe',
    dark: '#4c1d95',
    rgb: [124, 58, 237],
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-400',
  },
  slate: {
    id: 'slate',
    name: 'Charcoal Minimalist (Onyx & Slate)',
    description: 'Monochrome understated luxury, sleek dark charcoal.',
    primary: '#334155',
    hover: '#1e293b',
    light: '#f1f5f9',
    dark: '#0f172a',
    rgb: [51, 65, 85],
    badgeBg: 'bg-slate-500/20',
    badgeText: 'text-slate-300',
  },
};

export const THEME_PRESETS_LIST: ThemePreset[] = Object.values(THEME_PRESETS);

/**
 * Parse any valid 3 or 6 digit hex color into RGB numbers
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) {
    return [217, 119, 6]; // fallback amber
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Adjust brightness of a hex color (positive percent to lighten, negative to darken)
 */
export function adjustBrightness(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  const adjust = (c: number) => {
    const val = percent > 0 ? c + (255 - c) * (percent / 100) : c * (1 + percent / 100);
    return Math.min(255, Math.max(0, Math.round(val)));
  };
  const newR = adjust(r).toString(16).padStart(2, '0');
  const newG = adjust(g).toString(16).padStart(2, '0');
  const newB = adjust(b).toString(16).padStart(2, '0');
  return `#${newR}${newG}${newB}`;
}

/**
 * Resolve theme details from store configuration
 */
export function getThemeDetails(colorKeyOrHex?: string, customHex?: string): ThemePreset {
  // Check if it matches a preset key
  const key = (colorKeyOrHex || 'amber').toLowerCase().trim();
  if (THEME_PRESETS[key]) {
    return THEME_PRESETS[key];
  }

  // If customHex or key is a valid hex code
  const targetHex = (customHex || (key.startsWith('#') ? key : '#d97706')).trim();
  const rgb = hexToRgb(targetHex);
  const hover = adjustBrightness(targetHex, -15);
  const light = adjustBrightness(targetHex, 85);
  const dark = adjustBrightness(targetHex, -40);

  return {
    id: 'custom',
    name: 'Custom Brand Color',
    description: `Store brand color (${targetHex})`,
    primary: targetHex,
    hover,
    light,
    dark,
    rgb,
    badgeBg: 'bg-slate-800',
    badgeText: 'text-white',
  };
}

/**
 * Apply dynamic store colors into document CSS custom properties
 */
export function applyStoreTheme(storeConfig?: Partial<StoreConfig> | null) {
  if (typeof document === 'undefined') return;

  const colorKey = storeConfig?.primary_color || 'amber';
  const customHex = storeConfig?.primary_color_hex;
  const theme = getThemeDetails(colorKey, customHex);

  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-hover', theme.hover);
  root.style.setProperty('--theme-primary-light', theme.light);
  root.style.setProperty('--theme-primary-dark', theme.dark);
  root.style.setProperty('--theme-primary-rgb', `${theme.rgb[0]}, ${theme.rgb[1]}, ${theme.rgb[2]}`);
  root.style.setProperty('--theme-receipt-border', theme.primary);
}

/**
 * Read the current stored theme mode ('dark' or 'light')
 */
export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('bazu_pos_theme_mode');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return 'dark'; // default to dark theme
}

/**
 * Apply the theme mode class to documentElement and persist to localStorage
 */
export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
  try {
    localStorage.setItem('bazu_pos_theme_mode', mode);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent('bazu_theme_mode_changed', { detail: { mode } }));
}

/**
 * Toggle between 'dark' and 'light' theme
 */
export function toggleThemeMode(): ThemeMode {
  const current = getStoredThemeMode();
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
  applyThemeMode(next);
  return next;
}

/**
 * React hook to observe and toggle the active theme mode
 */
export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredThemeMode());

  useEffect(() => {
    applyThemeMode(mode);

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: ThemeMode }>;
      if (customEvent.detail?.mode && customEvent.detail.mode !== mode) {
        setModeState(customEvent.detail.mode);
      }
    };

    window.addEventListener('bazu_theme_mode_changed', handler);
    return () => {
      window.removeEventListener('bazu_theme_mode_changed', handler);
    };
  }, [mode]);

  const toggle = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setModeState(next);
    applyThemeMode(next);
    return next;
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    applyThemeMode(newMode);
  }, []);

  return {
    mode,
    isDark: mode === 'dark',
    toggle,
    setMode,
  };
}
