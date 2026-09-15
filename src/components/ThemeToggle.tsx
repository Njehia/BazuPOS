import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '../lib/theme';

interface ThemeToggleProps {
  variant?: 'pill' | 'icon' | 'segmented';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'pill',
  className = '',
  showLabel = false,
}) => {
  const { mode, isDark, toggle, setMode } = useThemeMode();

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700/80 ${className}`}
        role="radiogroup"
        aria-label="Theme mode selector"
      >
        <button
          type="button"
          onClick={() => setMode('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            !isDark
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-checked={!isDark}
          role="radio"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-900 text-white shadow-xs ring-1 ring-white/10'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-checked={isDark}
          role="radio"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isDark
            ? 'bg-white/10 hover:bg-white/20 border-white/15 text-amber-300 hover:text-amber-200'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
        } ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  // Default 'pill' variant
  return (
    <button
      type="button"
      onClick={toggle}
      className={`px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
        isDark
          ? 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200 hover:text-white'
          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800 hover:text-slate-950'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          {showLabel && <span>Light Mode</span>}
          {!showLabel && <span className="hidden sm:inline">Light</span>}
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          {showLabel && <span>Dark Mode</span>}
          {!showLabel && <span className="hidden sm:inline">Dark</span>}
        </>
      )}
    </button>
  );
};
