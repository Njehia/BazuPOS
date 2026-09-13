import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { BazuLogo } from './BazuLogo';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'badge';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running as an installed standalone app, suppress prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'card' ? (
        <div
          className={`p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-white ${className}`}
        >
          <div className="flex items-center gap-3">
            <BazuLogo className="w-10 h-10 shrink-0" />
            <div>
              <p className="text-xs font-bold">Install Bazu POS App</p>
              <p className="text-[10px] text-slate-400">
                Install to home screen for fast one-tap liquor sales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer ${className}`}
          title="Download and Install BazuPOS App"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {/* App Installation Guide Modal (Android & iOS) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <BazuLogo className="w-8 h-8 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">Install Bazu POS</h3>
                  <p className="text-[11px] text-slate-400">Android & Mobile Installation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3">
                <BazuLogo className="w-12 h-12 shrink-0 rounded-2xl shadow-md" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-white block font-semibold">Home Screen App Icon</strong>
                  This official emblem will be your launcher icon upon installing on your device.
                </div>
              </div>

              {isIOS ? (
                <div className="space-y-2">
                  <p className="font-semibold text-amber-400">For iPhone / iPad (Safari):</p>
                  <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-300">
                    <li>Tap the <strong>Share</strong> button in Safari's bottom toolbar.</li>
                    <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top right corner.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-amber-400">For Android Devices (Chrome):</p>
                  <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-300">
                    <li>Tap the <strong>⋮ (three dots)</strong> menu in Chrome.</li>
                    <li>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                    <li>Confirm installation to add BazuPOS directly to your app drawer.</li>
                  </ol>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (isInstallable) {
                    install();
                  }
                  setShowGuide(false);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
              >
                {isInstallable ? 'Install Now' : 'Got It'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
