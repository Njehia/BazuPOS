import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Monitor,
  Laptop,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  WifiOff,
  Printer,
  Building,
  Store,
  Zap,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Star,
  Play,
  Flame,
  HardDrive,
  QrCode,
  CreditCard,
  Banknote,
  Lock,
  Layers,
  ArrowDownToLine,
  RefreshCw,
  Github,
  Settings,
  FileCode,
  X,
  Cpu,
} from 'lucide-react';
import { BazuLogo } from './BazuLogo';

// =========================================================================
// OFFICIAL VERIFIED GITHUB RELEASE ASSETS (tag: POS)
// Repository: https://github.com/Njehia/BazuPOS
// =========================================================================
export const OFFICIAL_RELEASE_TAG_URL = 'https://github.com/Njehia/BazuPOS/releases/tag/POS';
export const OFFICIAL_WINDOWS_EXE_URL = 'https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.Setup.1.2.0.exe';
export const OFFICIAL_ANDROID_APK_URL = 'https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.1.2.0.apk';
export const OFFICIAL_MAC_ARM_DMG_URL = 'https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.1.2.0.-.macOS.arm64.dmg';
export const OFFICIAL_MAC_INTEL_DMG_URL = 'https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.1.2.0.-.macOS.x64.dmg';

interface LandingDownloadPageProps {
  onLaunchApp: () => void;
  onOpenOwnerDashboard?: () => void;
}

export const LandingDownloadPage: React.FC<LandingDownloadPageProps> = ({
  onLaunchApp,
  onOpenOwnerDashboard,
}) => {
  // PWA BeforeInstallPromptEvent state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'pos' | 'checkout' | 'owner' | 'receipt'>('pos');
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  // GitHub Releases Repository & Asset Configuration
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('bazu_pos_github_repo_url');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return 'https://github.com/Njehia/BazuPOS';
  });

  const [releaseTag, setReleaseTag] = useState<string>(() => {
    try {
      return localStorage.getItem('bazu_pos_github_release_tag') || 'POS';
    } catch {}
    return 'POS';
  });

  const [exeFileName, setExeFileName] = useState<string>(() => {
    try {
      return localStorage.getItem('bazu_pos_exe_filename') || 'Bazu.POS.Setup.1.2.0.exe';
    } catch {}
    return 'Bazu.POS.Setup.1.2.0.exe';
  });

  const [macArmDmgFileName, setMacArmDmgFileName] = useState<string>(() => {
    try {
      return localStorage.getItem('bazu_pos_mac_arm_dmg') || 'Bazu.POS.1.2.0.-.macOS.arm64.dmg';
    } catch {}
    return 'Bazu.POS.1.2.0.-.macOS.arm64.dmg';
  });

  const [macIntelDmgFileName, setMacIntelDmgFileName] = useState<string>(() => {
    try {
      return localStorage.getItem('bazu_pos_mac_intel_dmg') || 'Bazu.POS.1.2.0.-.macOS.x64.dmg';
    } catch {}
    return 'Bazu.POS.1.2.0.-.macOS.x64.dmg';
  });

  const [apkFileName, setApkFileName] = useState<string>(() => {
    try {
      return localStorage.getItem('bazu_pos_apk_filename') || 'Bazu.POS.1.2.0.apk';
    } catch {}
    return 'Bazu.POS.1.2.0.apk';
  });

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [tempRepoUrl, setTempRepoUrl] = useState<string>(githubRepoUrl);
  const [tempTag, setTempTag] = useState<string>(releaseTag);
  const [tempExeName, setTempExeName] = useState<string>(exeFileName);
  const [tempApkName, setTempApkName] = useState<string>(apkFileName);
  const [tempArmName, setTempArmName] = useState<string>(macArmDmgFileName);
  const [tempIntelName, setTempIntelName] = useState<string>(macIntelDmgFileName);
  const [configSavedToast, setConfigSavedToast] = useState<boolean>(false);

  // Derived URLs linked directly to the uploaded files
  const cleanRepo = useMemo(() => {
    return githubRepoUrl.trim().replace(/\/$/, '');
  }, [githubRepoUrl]);

  const releasePageUrl = useMemo(() => {
    return `${cleanRepo}/releases/tag/${releaseTag}`;
  }, [cleanRepo, releaseTag]);

  const windowsExeDownloadUrl = useMemo(() => {
    return `${cleanRepo}/releases/download/${releaseTag}/${exeFileName}`;
  }, [cleanRepo, releaseTag, exeFileName]);

  const androidApkDownloadUrl = useMemo(() => {
    return `${cleanRepo}/releases/download/${releaseTag}/${apkFileName}`;
  }, [cleanRepo, releaseTag, apkFileName]);

  const macArmDmgDownloadUrl = useMemo(() => {
    return `${cleanRepo}/releases/download/${releaseTag}/${macArmDmgFileName}`;
  }, [cleanRepo, releaseTag, macArmDmgFileName]);

  const macIntelDmgDownloadUrl = useMemo(() => {
    return `${cleanRepo}/releases/download/${releaseTag}/${macIntelDmgFileName}`;
  }, [cleanRepo, releaseTag, macIntelDmgFileName]);

  // OS Detection
  const detectedOS = useMemo(() => {
    if (typeof window === 'undefined') return 'Windows';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    return 'Windows';
  }, []);

  // Listen for browser install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 8000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Save custom GitHub settings
  const handleSaveRepoSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempRepoUrl.trim().replace(/\/$/, '');
    const cleanT = tempTag.trim() || 'POS';
    setGithubRepoUrl(clean);
    setReleaseTag(cleanT);
    setExeFileName(tempExeName.trim() || 'Bazu.POS.Setup.1.2.0.exe');
    setApkFileName(tempApkName.trim() || 'Bazu.POS.1.2.0.apk');
    setMacArmDmgFileName(tempArmName.trim() || 'Bazu.POS.1.2.0.-.macOS.arm64.dmg');
    setMacIntelDmgFileName(tempIntelName.trim() || 'Bazu.POS.1.2.0.-.macOS.x64.dmg');

    try {
      localStorage.setItem('bazu_pos_github_repo_url', clean);
      localStorage.setItem('bazu_pos_github_release_tag', cleanT);
      localStorage.setItem('bazu_pos_exe_filename', tempExeName.trim() || 'Bazu.POS.Setup.1.2.0.exe');
      localStorage.setItem('bazu_pos_apk_filename', tempApkName.trim() || 'Bazu.POS.1.2.0.apk');
      localStorage.setItem('bazu_pos_mac_arm_dmg', tempArmName.trim() || 'Bazu.POS.1.2.0.-.macOS.arm64.dmg');
      localStorage.setItem('bazu_pos_mac_intel_dmg', tempIntelName.trim() || 'Bazu.POS.1.2.0.-.macOS.x64.dmg');
    } catch {}

    setShowConfigModal(false);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 4000);
  };

  // Trigger PWA install prompt
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      const installGuideEl = document.getElementById('installation-guide');
      if (installGuideEl) {
        installGuideEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Download Windows Desktop Launcher Script (.bat)
  const handleDownloadWindowsLauncher = () => {
    const appUrl = window.location.origin;
    const batContent = `@echo off
:: ============================================================
:: Bazu POS - High-Performance Windows Desktop Launcher
:: Launches Bazu POS in dedicated standalone app-window mode
:: ============================================================
title Bazu POS Desktop Launcher
echo Launching Bazu POS in standalone desktop mode...
:: Attempt to launch in Microsoft Edge app mode
start msedge --app="${appUrl}" --window-size=1280,800
if %errorlevel% equ 0 goto done
:: Fallback to Google Chrome app mode
start chrome --app="${appUrl}" --window-size=1280,800
if %errorlevel% equ 0 goto done
:: Fallback to default browser
start "" "${appUrl}"
:done
echo Bazu POS launched successfully!
exit
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Launch-BazuPOS.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BazuLogo className="w-10 h-10 shadow-lg shadow-amber-500/10" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-wider text-white">BAZU POS</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Release tag: {releaseTag}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                High-Speed Offline Retail Point of Sale • bazupos.co.ke
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#downloads" className="hover:text-amber-400 transition-colors">
              Downloads (.exe &amp; .dmg)
            </a>
            <a href="#features" className="hover:text-amber-400 transition-colors">
              Features
            </a>
            <a href="#thermal-printers" className="hover:text-amber-400 transition-colors">
              Hardware &amp; Printers
            </a>
            <a href="#installation-guide" className="hover:text-amber-400 transition-colors">
              Installation Guide
            </a>
            <a href="#faq" className="hover:text-amber-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* GitHub Releases Direct Link Button */}
            <a
              href={releasePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs no-underline"
              title="View release assets on GitHub (tag: POS)"
            >
              <Github className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">GitHub: Njehia/BazuPOS</span>
            </a>

            <button
              onClick={onLaunchApp}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <span>Launch Web POS</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/10 via-amber-600/5 to-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Release Badge with GitHub Link */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 mb-6 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">Bazu POS v1.2.0 Active Release</span>
            <span className="text-slate-600">•</span>
            <a
              href={releasePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 no-underline"
            >
              <Github className="w-3 h-3" />
              <span>tag: {releaseTag} (.exe &amp; .dmg)</span>
            </a>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Download Bazu POS for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
              Windows &amp; macOS
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            High-speed offline retail terminal with <strong>Kenyan M-Pesa</strong> reference tracking,{' '}
            <strong>ESC/POS Bluetooth &amp; USB</strong> thermal printing, customer debt tabs, and{' '}
            <strong>zero data loss guarantee</strong> on your local PC.
          </p>

          {/* Primary Call to Action Box Linked Directly to GitHub Release Files */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
            {detectedOS === 'Android' ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <a
                  href={androidApkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer group no-underline"
                  title={`Download ${apkFileName} from GitHub Releases`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Download Android APK (Direct Install)</span>
                </a>
                <a
                  href="/Bazu.POS.1.2.0.apk"
                  download="Bazu.POS.1.2.0.apk"
                  className="px-4 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
                  title="Direct Download APK from Local Mirror"
                >
                  <Download className="w-4 h-4" />
                  <span>Local APK Mirror</span>
                </a>
              </div>
            ) : detectedOS === 'macOS' ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {/* Apple Silicon arm64 .dmg */}
                <a
                  href={macArmDmgDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer group no-underline"
                  title="Download Bazu.POS.1.2.0.-.macOS.arm64.dmg (196 MB)"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Download Apple Silicon (M-Chips)</span>
                </a>
                {/* Intel x64 .dmg */}
                <a
                  href={macIntelDmgDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
                  title="Download Bazu.POS.1.2.0.-.macOS.x64.dmg (200 MB)"
                >
                  <Laptop className="w-4 h-4 text-amber-400" />
                  <span>Download Intel Mac (.dmg)</span>
                </a>
              </div>
            ) : (
              /* Windows .exe direct link */
              <a
                href={windowsExeDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer group no-underline"
                title={`Download ${exeFileName} (154 MB) from GitHub`}
              >
                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                <span>Download for Windows (154 MB .exe)</span>
              </a>
            )}

            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Launch Live POS Demo</span>
            </button>
          </div>

          {/* Direct File Quick-Pills Linked Directly to the GitHub Assets */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            {/* Android APK */}
            <a
              href={androidApkDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 transition-colors no-underline font-semibold shadow-xs"
              title="Download Android APK (v1.2.0)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android APK (v1.2.0)</span>
            </a>

            {/* Windows .exe */}
            <a
              href={windowsExeDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors no-underline font-semibold"
              title="Download Windows Installer (.exe - 154 MB)"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Windows (.exe - 154MB)</span>
            </a>

            {/* Mac ARM .dmg */}
            <a
              href={macArmDmgDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors no-underline font-semibold"
              title="Download macOS Apple Silicon (arm64 .dmg - 196 MB)"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>macOS Apple Silicon (196MB)</span>
            </a>

            {/* Mac Intel .dmg */}
            <a
              href={macIntelDmgDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors no-underline font-semibold"
              title="Download macOS Intel (x64 .dmg - 200 MB)"
            >
              <Laptop className="w-3.5 h-3.5 text-slate-300" />
              <span>macOS Intel (200MB)</span>
            </a>

            {/* GitHub Release Page */}
            <a
              href={releasePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors no-underline font-semibold"
              title="Open GitHub Releases tag/POS"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Release (tag: POS)</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setTempRepoUrl(githubRepoUrl);
                setTempTag(releaseTag);
                setTempExeName(exeFileName);
                setTempArmName(macArmDmgFileName);
                setTempIntelName(macIntelDmgFileName);
                setShowConfigModal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Customize GitHub links or asset names"
            >
              <Settings className="w-3 h-3" />
              <span>Configure Links</span>
            </button>
          </div>

          {/* Config Saved Toast */}
          {configSavedToast && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>GitHub Release download links updated successfully!</span>
            </div>
          )}

          {/* Install Feedback Toast */}
          {installSuccess && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Bazu POS installed successfully! You can launch it from your desktop or start menu anytime.</span>
            </div>
          )}

          {/* Trust Highlights Strip */}
          <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-4xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">100% Offline-First</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Keeps billing without internet</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">PC Data Guard</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Zero data loss on app updates</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">ESC/POS Printing</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">USB &amp; Bluetooth thermal receipts</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Multi-Branch Cloud</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time Firebase multi-tenant sync</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive App Preview Section */}
      <section className="py-12 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-3xl font-black text-white">Experience the Interface</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Engineered for cashier speed with keyboard shortcuts, quick keys, and comprehensive audit logs.
            </p>

            {/* Preview View Selector */}
            <div className="flex items-center justify-center gap-2 mt-5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setActivePreviewTab('pos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activePreviewTab === 'pos'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Retail Cashier Terminal</span>
              </button>
              <button
                onClick={() => setActivePreviewTab('checkout')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activePreviewTab === 'checkout'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Quick-Keys Grid</span>
              </button>
              <button
                onClick={() => setActivePreviewTab('owner')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activePreviewTab === 'owner'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Owner Dashboard &amp; Shifts</span>
              </button>
              <button
                onClick={() => setActivePreviewTab('receipt')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activePreviewTab === 'receipt'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Thermal Receipts (ESC/POS)</span>
              </button>
            </div>
          </div>

          {/* Preview Window Mockup */}
          <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden p-1 sm:p-2">
            {/* Window Top Bar */}
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-mono text-slate-400 ml-2">
                  Bazu POS Desktop Client • v1.2.0
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Hardware Printer Engine Ready</span>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-4 sm:p-6 bg-slate-900/40 min-h-[360px] flex items-center justify-center">
              {activePreviewTab === 'pos' && (
                <div className="w-full max-w-4xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Search &amp; Catalog</span>
                      <p className="text-sm font-bold text-white mt-1">Instant A-Z Quick Jump</p>
                      <p className="text-xs text-slate-400 mt-1">Press any letter A-Z on your keyboard to jump straight to brands like Tusker, Jameson, or Gilbeys.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Checkout Tender</span>
                      <p className="text-sm font-bold text-white mt-1">Cash, M-Pesa &amp; Split Tender</p>
                      <p className="text-xs text-slate-400 mt-1">One-click keypad presets (KES 100, 500, 1000) with automatic change calculation and code validation.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Customer Tabs</span>
                      <p className="text-sm font-bold text-white mt-1">Open Tabs &amp; Interim Bills</p>
                      <p className="text-xs text-slate-400 mt-1">Print interim bills for patrons ("Leta Bill") before closing out orders with itemized combined slips.</p>
                    </div>
                  </div>
                  <div className="text-center pt-2">
                    <button
                      onClick={onLaunchApp}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Launch This Screen Live in Web POS</span>
                    </button>
                  </div>
                </div>
              )}

              {activePreviewTab === 'checkout' && (
                <div className="w-full max-w-3xl text-center space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Speed-Optimized Quick Keys Grid</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Star your best-selling fast movers (e.g. Tusker Lager, White Cap, Black Ice) to appear on the one-touch visual Quick-Keys strip. Add items to cart in a single tap without searching or scanning barcodes.
                    </p>
                  </div>
                  <button
                    onClick={onLaunchApp}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Try Quick Keys in POS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {activePreviewTab === 'owner' && (
                <div className="w-full max-w-3xl text-center space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-400" />
                      <span>Multi-Branch X/Z Shift Audit &amp; Reconciliation</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Monitor cash drawer floats, counted cash, opening floats, and variance reports in real time. Print official X-Reports (mid-shift audits) and Z-Reports (shift end signoffs) directly to thermal receipt printers.
                    </p>
                  </div>
                  <button
                    onClick={onOpenOwnerDashboard || onLaunchApp}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Open Owner Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {activePreviewTab === 'receipt' && (
                <div className="w-full max-w-md mx-auto bg-white text-slate-900 p-6 rounded-2xl shadow-xl font-mono text-xs border border-slate-200 text-left space-y-3">
                  <div className="text-center border-b border-dashed border-slate-300 pb-3">
                    <h4 className="font-black text-sm uppercase tracking-wider">BAZU RETAIL POS</h4>
                    <p className="text-[11px] text-slate-600">Main Terminal • Till: 123456</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Tel: 0700 000 000</p>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>2x Tusker Lager 500ml</span>
                      <span className="font-bold">KES 500</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1x Gilbeys Gin 750ml</span>
                      <span className="font-bold">KES 1,450</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between font-black text-sm">
                    <span>TOTAL</span>
                    <span className="text-emerald-700">KES 1,950</span>
                  </div>
                  <div className="text-[10px] text-slate-500 text-center border-t border-dashed border-slate-300 pt-2">
                    <p>PAID VIA M-PESA (QA89XX912)</p>
                    <p className="mt-1 font-sans">Powered by Bazu POS • ESC/POS Native</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Download Options Matrix Section */}
      <section id="downloads" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
            Official Release: {releaseTag}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">
            Download for Your Operating System
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Binaries hosted on GitHub under release tag <code className="text-amber-400 font-mono">POS</code>. Click below to download the executable installer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Windows PC (.exe) */}
          <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
            detectedOS === 'Windows'
              ? 'bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/5'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Monitor className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    .EXE (154 MB)
                  </span>
                  {detectedOS === 'Windows' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                      Your System
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Windows PC</h3>
              <p className="text-xs text-slate-400 mt-1">
                Windows 10 &amp; Windows 11 (64-bit). Standalone executable setup installer for desktop PCs and POS touchscreens.
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span className="truncate">{exeFileName}</span>
                <span className="text-[10px] text-amber-400 uppercase font-bold shrink-0 ml-2">154 MB</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Direct WebUSB &amp; Bluetooth thermal printer drivers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Instant PC Data Guard with Zero Data Loss</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>100% Offline local database with background sync</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
              {/* Primary Direct .exe Download Button */}
              <a
                href={windowsExeDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center"
                title={`Download ${exeFileName} (154 MB) from GitHub Releases`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {exeFileName}</span>
              </a>

              {/* View Releases on GitHub */}
              <a
                href={releasePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center"
              >
                <Github className="w-3 h-3 text-amber-400" />
                <span>View Release (tag: POS)</span>
              </a>

              {/* Secondary PWA Install & Batch Launcher */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleInstallClick}
                  className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-800 cursor-pointer"
                >
                  Install Web App
                </button>
                <button
                  onClick={handleDownloadWindowsLauncher}
                  className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-800 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Terminal className="w-2.5 h-2.5 text-amber-400" />
                  <span>.bat Launcher</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Apple macOS (.dmg) */}
          <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
            detectedOS === 'macOS'
              ? 'bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/5'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200">
                  <Laptop className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    .DMG (arm64 &amp; x64)
                  </span>
                  {detectedOS === 'macOS' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                      Your System
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mt-4">macOS</h3>
              <p className="text-xs text-slate-400 mt-1">
                Apple Silicon (M1/M2/M3/M4) and Intel Macs. Dedicated .dmg installers ready for Mac Dock.
              </p>
              <div className="mt-3 space-y-1.5">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                  <span className="truncate">Apple Silicon (arm64)</span>
                  <span className="text-[10px] text-emerald-400 font-bold ml-2">196 MB</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                  <span className="truncate">Intel (x64)</span>
                  <span className="text-[10px] text-slate-400 font-bold ml-2">200 MB</span>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Full Bluetooth receipt printer integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Hardware keyboard navigation &amp; shortcuts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Standalone app window with dock icon</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
              {/* Apple Silicon arm64 .dmg Download */}
              <a
                href={macArmDmgDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center"
                title={`Download ${macArmDmgFileName} (196 MB) from GitHub Releases`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Download Apple Silicon (M-Chips - 196MB)</span>
              </a>

              {/* Intel x64 .dmg Download */}
              <a
                href={macIntelDmgDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center"
                title={`Download ${macIntelDmgFileName} (200 MB) from GitHub Releases`}
              >
                <Laptop className="w-3.5 h-3.5 text-amber-400" />
                <span>Download Intel Mac (.dmg - 200MB)</span>
              </a>

              {/* View Releases on GitHub */}
              <a
                href={releasePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center"
              >
                <Github className="w-3 h-3 text-amber-400" />
                <span>View Release (tag: POS)</span>
              </a>
            </div>
          </div>

          {/* 3. Android Tablet & Mobile POS */}
          <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
            detectedOS === 'Android' || detectedOS === 'iOS'
              ? 'bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/5'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                {(detectedOS === 'Android' || detectedOS === 'iOS') && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                    Your System
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Android &amp; Tablets</h3>
              <p className="text-xs text-slate-400 mt-1">
                Handheld mobile POS terminals (Sunmi, Telpo) and Android / iPad retail tablets.
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span>Android PWA &amp; WebAPK</span>
                <span className="text-[10px] text-emerald-400 uppercase font-bold shrink-0 ml-2">Home Screen</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Built-in Camera Barcode Scanner</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Touch-optimized Quick Keys catalog</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Portable roaming billing on retail floor</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
              <a
                href={androidApkDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer no-underline shadow-lg shadow-emerald-600/25"
                title={`Download ${apkFileName} from GitHub Releases`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Android APK (Direct Install)</span>
              </a>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/Bazu.POS.1.2.0.apk"
                  download="Bazu.POS.1.2.0.apk"
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-[11px] border border-slate-700 transition-all flex items-center justify-center gap-1 no-underline cursor-pointer"
                  title="Direct Download APK from Local Mirror"
                >
                  <Download className="w-3 h-3" />
                  <span>Local Mirror</span>
                </a>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-[11px] border border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  <span>WebAPK (PWA)</span>
                </button>
              </div>
              <button
                onClick={onLaunchApp}
                className="w-full py-2 rounded-xl bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-white font-medium text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Open Mobile POS</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Step-by-Step Installation Guide */}
      <section id="installation-guide" className="py-16 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
              Quick Setup
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              How to Install Bazu POS on PC &amp; Mac
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Download the standalone executable installer (.exe or .dmg) directly from GitHub Releases.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Download the Installer (.exe or .dmg) from GitHub</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Click the <strong>Download {exeFileName}</strong> (Windows) or <strong>Download for Apple Silicon / Intel</strong> (macOS) button above. Your browser will download the release executable directly from GitHub tag <strong>POS</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Run the Installer &amp; Pin to Desktop or Taskbar</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Open the downloaded setup file. Follow the on-screen prompts to install. Pin Bazu POS to your Windows Taskbar or Mac Dock for instant 1-click startup every morning.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Log in with Default PIN and Start Billing</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Launch the app and log in with your Cashier / Admin PIN (Default: <strong>1234</strong>). Connect your USB or Bluetooth receipt printer under settings and you are ready to sell!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware & Thermal Printers Section */}
      <section id="thermal-printers" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
            Hardware Plug &amp; Play
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">
            Compatible Thermal Printers &amp; Scanners
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Zero proprietary driver installation needed. Directly communicates over WebUSB and Web Bluetooth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">ESC/POS Thermal Printers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supports standard 58mm and 80mm roll widths. Compatible with Epson, Xprinter, Rongta, Zywell, Black Copper, and generic ESC/POS receipt printers.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">1D &amp; 2D Barcode Scanners</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plug in any standard USB or wireless handheld barcode scanner. Scans items directly into the cart in milliseconds with auto-enter detection.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">RJ11 Cash Drawers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Triggers the cash drawer kick solenoid automatically through the thermal printer's RJ11 port whenever a cash transaction is finalized.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="py-16 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Where are the .exe and .dmg download files hosted?',
                a: `The installer binaries are hosted directly on GitHub Releases under repository Njehia/BazuPOS (tag: POS). You can download Bazu.POS.Setup.1.2.0.exe (Windows), Bazu.POS.1.2.0.-.macOS.arm64.dmg (Apple Silicon), or Bazu.POS.1.2.0.-.macOS.x64.dmg (Intel) directly using the buttons above.`,
              },
              {
                q: 'Does Bazu POS work without an internet connection?',
                a: 'Yes, 100%! Bazu POS is designed offline-first. All inventory catalog items, cashier sales receipts, customer tabs, and cash drawer audits are stored directly on your PC. When an internet connection is available, it synchronizes securely with your Firebase cloud database in the background.',
              },
              {
                q: 'Will my products or sales be deleted when updating Bazu POS?',
                a: 'Never. Bazu POS includes an automated PC Data Guard. Schema upgrades are completely non-destructive and preserve your exact stocks, prices, customer tab debts, and transaction history. An automatic timestamped safety snapshot is also created before any update.',
              },
              {
                q: 'Can I print receipts to Bluetooth or USB thermal printers?',
                a: 'Yes! Bazu POS includes native Web Bluetooth and WebUSB drivers built directly into the client. You can print itemized slips, customer tabs ("Leta Bill"), and shift X/Z audit reports to 58mm and 80mm printers without installing any external drivers.',
              },
              {
                q: 'Can I run multiple checkout terminals in the same shop or across branches?',
                a: 'Yes. Bazu POS supports multi-device and multi-tenant synchronization. Stock decrements, new sales, and shift openings sync in real time across multiple computers, tablets, and phones under the same store.',
              },
            ].map((faq, idx) => (
              <div
                key={`faq-${idx}`}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setSelectedFaq(selectedFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-amber-400 transition-transform ${
                      selectedFaq === idx ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {selectedFaq === idx && (
                  <div className="px-5 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BazuLogo className="w-8 h-8" />
            <div>
              <p className="font-bold text-slate-300">BAZU POS</p>
              <p className="text-[11px]">Production Retail &amp; Hospitality Point of Sale • bazupos.co.ke</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-semibold text-slate-400">
            <a
              href={releasePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Release (tag: POS)</span>
            </a>
            <button onClick={onLaunchApp} className="hover:text-amber-400 transition-colors cursor-pointer">
              Launch POS Terminal
            </button>
            {onOpenOwnerDashboard && (
              <button onClick={onOpenOwnerDashboard} className="hover:text-amber-400 transition-colors cursor-pointer">
                Owner Dashboard
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            &copy; {new Date().getFullYear()} Bazu POS. Offline-First &amp; Cloud Ready.
          </div>
        </div>
      </footer>

      {/* GitHub URL Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">GitHub Releases Link Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Verify your GitHub repository URL, release tag, and uploaded file asset names.
            </p>

            <form onSubmit={handleSaveRepoSettings} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    GitHub Repository
                  </label>
                  <input
                    type="url"
                    value={tempRepoUrl}
                    onChange={(e) => setTempRepoUrl(e.target.value)}
                    placeholder="https://github.com/Njehia/BazuPOS"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Release Tag
                  </label>
                  <input
                    type="text"
                    value={tempTag}
                    onChange={(e) => setTempTag(e.target.value)}
                    placeholder="POS"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Windows .exe Asset Filename
                  </label>
                  <input
                    type="text"
                    value={tempExeName}
                    onChange={(e) => setTempExeName(e.target.value)}
                    placeholder="Bazu.POS.Setup.1.2.0.exe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Android .apk Asset Filename
                  </label>
                  <input
                    type="text"
                    value={tempApkName}
                    onChange={(e) => setTempApkName(e.target.value)}
                    placeholder="Bazu.POS.1.2.0.apk"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    macOS Apple Silicon (arm64)
                  </label>
                  <input
                    type="text"
                    value={tempArmName}
                    onChange={(e) => setTempArmName(e.target.value)}
                    placeholder="Bazu.POS.1.2.0.-.macOS.arm64.dmg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    macOS Intel (x64)
                  </label>
                  <input
                    type="text"
                    value={tempIntelName}
                    onChange={(e) => setTempIntelName(e.target.value)}
                    placeholder="Bazu.POS.1.2.0.-.macOS.x64.dmg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-colors"
                >
                  Save &amp; Apply Links
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
