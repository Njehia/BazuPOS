import React, { useEffect, useState } from 'react';
import { BazuLogo } from './BazuLogo';

interface SplashScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
}

/**
 * Opening Splash Screen for Web & Android App
 *
 * Requirements strictly met:
 * - Shows on app opening on Android devices and Web App
 * - Takes only a small percentage of the screen right at the centre (NOT full screen)
 * - Clean, high-contrast dark luxury backdrop
 * - Smooth transition into the main application
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1500,
}) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Hold splash screen for designated duration, then trigger smooth fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
      const exitTimer = setTimeout(() => {
        onFinish();
      }, 400); // 400ms fade transition
      return () => clearTimeout(exitTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [onFinish, minDurationMs]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070C1B] transition-opacity duration-400 ease-out select-none ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle at center, #111A30 0%, #070C1B 100%)',
      }}
      aria-label="Bazu POS Opening Screen"
    >
      {/* Centered Small Logo Container */}
      <div className="flex flex-col items-center justify-center animate-fade-in">
        {/* The BazuPOS Logo Tile - Centered and occupying a small percentage of the screen */}
        <div className="relative group transition-transform duration-700 ease-out transform scale-100 hover:scale-105">
          {/* Subtle Ambient Glow Behind Logo */}
          <div className="absolute -inset-4 bg-amber-500/15 rounded-3xl blur-xl transition-all duration-700 pointer-events-none" />
          
          {/* Logo element */}
          <BazuLogo className="w-28 h-28 sm:w-36 sm:h-36 relative z-10" />
        </div>

        {/* Minimal Progress Line & Subtle Caption */}
        <div className="mt-8 flex flex-col items-center gap-2">
          {/* Subtle indeterminate progress bar */}
          <div className="w-24 h-1 bg-slate-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full animate-pulse w-full" />
          </div>
          <span className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold font-mono">
            Bazu POS
          </span>
        </div>
      </div>
    </div>
  );
};
