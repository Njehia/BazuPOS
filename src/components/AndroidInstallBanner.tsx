import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, CheckCircle2, QrCode } from 'lucide-react';
import { OFFICIAL_ANDROID_APK_URL } from './WebsitePortal';

interface AndroidInstallBannerProps {
  onOpenMobilePos?: () => void;
}

export const AndroidInstallBanner: React.FC<AndroidInstallBannerProps> = ({ onOpenMobilePos }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('bazu_android_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isAndroidDevice, setIsAndroidDevice] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone display mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(isRunningStandalone);

    // Detect Android or mobile user agent
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes('android') || (ua.includes('mobile') && !ua.includes('iphone'));
    setIsAndroidDevice(isAndroid);

    // Listen for PWA beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback: trigger APK download
      window.location.href = '/Bazu.POS.1.2.0.apk';
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('bazu_android_banner_dismissed', 'true');
    } catch {}
  };

  if (isDismissed || isStandalone || !isAndroidDevice) {
    return null;
  }

  return (
    <aside aria-label="Install Bazu POS on Android" className="fixed top-2 left-2 right-2 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-slate-900/95 dark:bg-slate-950/95 border border-amber-500/40 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl text-white animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-amber-500/20">
            <Smartphone className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-extrabold text-sm tracking-tight text-white">Bazu POS for Android</h4>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                v1.2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
              Optimized for handheld retail terminals &amp; phones.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Camera Barcode Scan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Offline IndexedDB POS</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Install WebAPK</span>
        </button>

        <a
          href="/Bazu.POS.1.2.0.apk"
          download="Bazu.POS.1.2.0.apk"
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 no-underline cursor-pointer active:scale-95"
          title="Download Standalone Android APK"
        >
          <Download className="w-3.5 h-3.5" />
          <span>APK</span>
        </a>
      </div>
    </aside>
  );
};
