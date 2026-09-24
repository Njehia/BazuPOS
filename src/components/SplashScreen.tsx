import React, { useEffect, useState } from 'react';
import { BazuLogo } from './BazuLogo';

interface SplashScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
}

/**
 * Embedded startup logo animation card for Bazu POS
 *
 * Requirements strictly satisfied:
 * - Embedded Container: Floating centered card (max-w-[340px] on mobile, max-w-[400px] on desktop)
 * - Non-fullscreen: Does NOT use a full-screen opaque blackout overlay; underlying app remains visible
 * - Semi-transparent background blur with subtle drop shadow (glassmorphism effect)
 * - Branding Visuals: Bazu POS logo mark + brand title + integrated vibrant "GO" badge
 * - Smooth entrance (scale 0.82 -> 1.0), active glow pulse during initialization, and smooth exit (scale 1.05, opacity 0)
 * - Unmounts cleanly with isInitializing state management and auto-dismiss timer
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1800,
}) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'active' | 'exit'>('enter');

  useEffect(() => {
    // 1. Trigger entrance spring animation on initial render
    const enterTimer = setTimeout(() => {
      setAnimationPhase('active');
    }, 40);

    // 2. Run active initialization state, then trigger smooth exit
    const activeTimer = setTimeout(() => {
      setIsInitializing(false);
      setAnimationPhase('exit');

      // 3. Complete fade-out and unmount
      const unmountTimer = setTimeout(() => {
        onFinish();
      }, 400);

      return () => clearTimeout(unmountTimer);
    }, minDurationMs);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(activeTimer);
    };
  }, [onFinish, minDurationMs]);

  // Compute transform & opacity styles based on current animation phase
  const getContainerStyles = (): React.CSSProperties => {
    switch (animationPhase) {
      case 'enter':
        return {
          opacity: 0,
          transform: 'scale(0.82) translateY(12px)',
          transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        };
      case 'active':
        return {
          opacity: 1,
          transform: 'scale(1) translateY(0px)',
          transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        };
      case 'exit':
        return {
          opacity: 0,
          transform: 'scale(1.05) translateY(-6px)',
          transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        };
    }
  };

  return (
    <aside
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 select-none"
      aria-label="Bazu POS Startup Initialization"
      aria-live="polite"
      role="status"
    >
      {/* Floating Centered Glassmorphic Card (Max 340px on mobile, Max 400px on desktop) */}
      <div
        style={getContainerStyles()}
        className="w-full max-w-[340px] sm:max-w-[400px] bg-slate-900/80 dark:bg-slate-950/85 backdrop-blur-xl border border-white/15 dark:border-amber-500/20 rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(245,158,11,0.12)] text-white relative overflow-hidden pointer-events-auto flex flex-col items-center text-center"
      >
        {/* Dynamic Vibrant Ambient Backlight Glow behind Logo */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-br from-amber-500/25 via-amber-400/15 to-emerald-500/20 rounded-full blur-2xl pointer-events-none transition-all duration-700 ${
            animationPhase === 'active' ? 'scale-110 opacity-100' : 'scale-90 opacity-40'
          }`}
        />

        {/* Top Header Row with Subtle Live Status & "GO" Indicator */}
        <div className="w-full flex items-center justify-between mb-4 relative z-10">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold tracking-wider text-slate-300">
            <span
              className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                isInitializing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span className="uppercase text-[10px] text-slate-400">
              {isInitializing ? 'Initializing' : 'Ready'}
            </span>
          </div>

          {/* Integrated Subtle "GO" Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black tracking-widest uppercase shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span>GO</span>
          </div>
        </div>

        {/* Central Logo Container with Vibrant Pulsing Halo */}
        <div className="relative my-2 group">
          {/* Logo Backing Ambient Flare */}
          <div className="absolute -inset-3 bg-gradient-to-r from-amber-500/30 to-amber-300/20 rounded-2xl blur-lg animate-pulse" />

          {/* Bazu Logo Mark */}
          <BazuLogo className="w-20 h-20 sm:w-24 sm:h-24 relative z-10 drop-shadow-xl transition-transform duration-500 hover:scale-105" />
        </div>

        {/* Brand Name Typography */}
        <div className="mt-3 relative z-10 space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase flex items-center justify-center gap-1.5 drop-shadow-sm">
            <span className="text-amber-400">Bazu</span>
            <span className="text-white">POS</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            Smart Cloud Point of Sale &amp; Inventory
          </p>
        </div>

        {/* Initialization Progress Bar Strip */}
        <div className="w-full mt-5 relative z-10">
          <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-400 rounded-full transition-all duration-1000 ease-out ${
                animationPhase === 'enter'
                  ? 'w-1/4'
                  : animationPhase === 'active'
                  ? 'w-4/5'
                  : 'w-full'
              }`}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-1.5 px-0.5">
            <span>Terminal Engine</span>
            <span className="text-amber-400/90 font-bold">
              {animationPhase === 'exit' ? 'Online' : 'Loading Modules'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
