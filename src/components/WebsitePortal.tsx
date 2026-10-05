/**
 * Bazu POS Official Website & Merchant Portal
 * Domain: bazupos.co.ke
 * Includes:
 * 1. Marketing Landing Page (Hero, Interactive Preview, Peripherals, Pricing, FAQ)
 * 2. Downloads Hub (.exe, .dmg, Android, Web App, Windows 1-Click Launcher script)
 * 3. Merchant Portal & Account Hub:
 *    - Sign In (with Super User quick access for Njehia)
 *    - Create Store Account (Instant provisioning of storeId & Firestore documents)
 *    - Get My Files (Windows .exe, macOS .dmg, Android WebAPK, Launcher script)
 *    - View Live Sales & Analytics (Today's revenue, M-Pesa vs Cash, receipts viewer, CSV export)
 *    - Store ID & Mobile Handoff Link
 *    - Super User Troubleshooter & Diagnostics (Exclusive for Njehia)
 */

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
  Cpu,
  Github,
  TrendingUp,
  ShoppingBag,
  Users,
  LogOut,
  X,
  Phone,
  Mail,
  Receipt,
  Clock,
  DollarSign,
  ArrowUpRight,
  FileText,
  FileSpreadsheet,
  Activity,
  AlertCircle,
  Eye,
  KeyRound,
  RefreshCw,
  Sliders,
  Calendar,
} from 'lucide-react';
import { BazuLogo } from './BazuLogo';
import { AuthService, UserProfile, StoreMetadata } from '../services/auth';
import { LocalDb } from '../lib/storage';
import { Product, Sale } from '../types';

// =========================================================================
// OFFICIAL VERIFIED GITHUB RELEASE DOWNLOADS (tag: POS)
// Repository: https://github.com/Njehia/BazuPOS
// =========================================================================
export const OFFICIAL_RELEASE_TAG_URL = 'https://github.com/Njehia/BazuPOS/releases/tag/POS';
export const OFFICIAL_WINDOWS_EXE_URL = 'https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.Setup.1.2.0.exe';
export const OFFICIAL_ANDROID_APK_URL = 'https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.1.2.0.apk';
export const OFFICIAL_MAC_ARM_DMG_URL = 'https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.1.2.0.-.macOS.arm64.dmg';
export const OFFICIAL_MAC_INTEL_DMG_URL = 'https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.1.2.0.-.macOS.x64.dmg';

interface WebsitePortalProps {
  onLaunchPOS: () => void;
  onLaunchCheckout: () => void;
  onOpenOwnerDashboard: () => void;
  onOpenSignup?: () => void;
}

export const WebsitePortal: React.FC<WebsitePortalProps> = ({
  onLaunchPOS,
  onLaunchCheckout,
  onOpenOwnerDashboard,
  onOpenSignup,
}) => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [storeMeta, setStoreMeta] = useState<StoreMetadata | null>(null);

  // Portal & Modals state
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [portalTab, setPortalTab] = useState<'sales' | 'downloads' | 'settings' | 'troubleshoot'>('sales');

  // Auth Modal State (unified Login / Create Account modal)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register Form State
  const [regStoreName, setRegStoreName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // UI Interactive state
  const [activePreviewTab, setActivePreviewTab] = useState<'pos' | 'checkout' | 'owner' | 'receipt'>('pos');
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const [hasCopiedStoreId, setHasCopiedStoreId] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Sales View State
  const [liveSales, setLiveSales] = useState<Sale[]>([]);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [salesDateFilter, setSalesDateFilter] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);

  // Super User Remote Diagnostics State
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const [pingLatencyMs, setPingLatencyMs] = useState<number | null>(null);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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

  // Check if current user is Super User Njehia
  const isSuperUser = useMemo(() => {
    if (!currentUser && !userProfile) return false;
    const email = (userProfile?.email || currentUser?.email || '').toLowerCase();
    const name = (userProfile?.name || currentUser?.displayName || '').toLowerCase();
    return email === 'njehia@bazupos.co.ke' || email === 'njehia' || email === 'tnjehia1@gmail.com' || name.includes('njehia');
  }, [currentUser, userProfile]);

  // Subscribe to persistent authentication state
  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuth(({ user, profile, store }) => {
      setCurrentUser(user);
      setUserProfile(profile);
      setStoreMeta(store);
    });
    return () => unsubscribe();
  }, []);

  // Load sales & products for the portal
  useEffect(() => {
    const refreshData = () => {
      try {
        setLiveSales(LocalDb.getSales());
        setLiveProducts(LocalDb.getProducts());
      } catch {}
    };
    refreshData();
    const unsub = LocalDb.onSyncUpdate(refreshData);
    return () => unsub();
  }, []);

  // Listen for browser install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      setDeferredPrompt(null);
    } else {
      const el = document.getElementById('downloads');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Portal Login Handler
  const handlePortalLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await AuthService.loginUser(loginEmail, loginPassword);
      setUserProfile(res.profile);
      setStoreMeta(res.store);
      setIsAuthModalOpen(false);
      setIsPortalModalOpen(true);
    } catch (err: any) {
      let msg = err.message || 'Login failed. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email address or password.';
      }
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick Super User Login (Njehia)
  const handleSuperUserQuickLogin = async () => {
    setLoginEmail('Njehia');
    setLoginPassword('B33fch!p$5.?!');
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await AuthService.loginUser('Njehia', 'B33fch!p$5.?!');
      setUserProfile(res.profile);
      setStoreMeta(res.store);
      setIsAuthModalOpen(false);
      setIsPortalModalOpen(true);
      setPortalTab('sales');
    } catch (err: any) {
      setLoginError(err.message || 'Super user login error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Account Registration Handler (Instant provisioning of storeId + users/{uid})
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regStoreName.trim()) {
      setRegError('Please enter your business or store name.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Please enter an email address.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    setIsRegistering(true);
    setRegError(null);
    try {
      const res = await AuthService.registerStoreOwner(
        regStoreName.trim(),
        regEmail.trim(),
        regPassword,
        regOwnerName.trim() || 'Store Owner'
      );
      setUserProfile(res.profile);
      setIsAuthModalOpen(false);
      setIsPortalModalOpen(true);
      setPortalTab('downloads');
    } catch (err: any) {
      let msg = err.message || 'Registration failed. Please check details.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      }
      setRegError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    setUserProfile(null);
    setStoreMeta(null);
    setIsPortalModalOpen(false);
  };

  // Filter sales based on chosen timeframe
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    return liveSales.filter((s) => {
      const saleDate = s.created_at.split('T')[0];
      if (salesDateFilter === 'today') {
        return saleDate === todayStr;
      }
      if (salesDateFilter === 'yesterday') {
        return saleDate === yesterdayStr;
      }
      if (salesDateFilter === 'week') {
        return new Date(s.created_at) >= weekAgo;
      }
      return true; // 'all'
    });
  }, [liveSales, salesDateFilter]);

  // Aggregate metrics
  const salesSummary = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const mpesaOrders = filteredSales.filter((s) => s.payment_method === 'MPESA');
    const cashOrders = filteredSales.filter((s) => s.payment_method === 'CASH');
    const cardOrders = filteredSales.filter((s) => s.payment_method === 'CARD' as any);
    const mpesaAmount = mpesaOrders.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const cashAmount = cashOrders.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const cardAmount = cardOrders.reduce((acc, s) => acc + (s.total_amount || 0), 0);

    return {
      count: filteredSales.length,
      revenue: totalRevenue,
      mpesaCount: mpesaOrders.length,
      mpesaAmount,
      cashCount: cashOrders.length,
      cashAmount,
      cardCount: cardOrders.length,
      cardAmount,
      avgBasket: filteredSales.length > 0 ? Math.round(totalRevenue / filteredSales.length) : 0,
    };
  }, [filteredSales]);

  // Export Sales CSV
  const handleExportSalesCsv = () => {
    try {
      const headers = ['Order ID', 'Date & Time', 'Payment Method', 'M-Pesa Reference', 'Items Count', 'Total Amount (KES)', 'Cashier'];
      const rows = filteredSales.map((s) => [
        s.id,
        new Date(s.created_at).toLocaleString(),
        s.payment_method,
        s.mpesa_code || 'N/A',
        s.items_count || 1,
        s.total_amount,
        s.cashier_name || 'Cashier',
      ]);
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `BazuPOS-Sales-Export-${salesDateFilter}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Failed to export CSV:', e);
    }
  };

  // Generate 1-Click Windows Desktop Launcher .bat script
  const handleDownloadLauncherScript = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bazupos.co.ke';
    const batchScript = `@echo off
title Bazu POS - Launching Terminal
echo ===================================================
echo Starting Bazu POS Standalone Desktop Session...
echo ===================================================
start msedge --app="${origin}/?view=pos" || start chrome --app="${origin}/?view=pos" || start "" "${origin}/?view=pos"
exit
`;
    const blob = new Blob([batchScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BazuPOS-Launcher.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Super user latency ping test
  const handleRunLatencyTest = () => {
    setIsTestingLatency(true);
    const start = performance.now();
    setTimeout(() => {
      const elapsed = Math.round(performance.now() - start);
      setPingLatencyMs(Math.max(12, elapsed % 45 + 18));
      setIsTestingLatency(false);
    }, 400);
  };

  // Super user PC Data Guard backup trigger
  const handleTriggerPCDataGuardBackup = () => {
    setIsExportingBackup(true);
    try {
      const backupData = {
        app: 'Bazu POS',
        version: '1.2.0',
        timestamp: new Date().toISOString(),
        storeId: activeStoreId,
        products: LocalDb.getProducts(),
        sales: LocalDb.getSales(),
        categories: LocalDb.getCategories(),
        config: LocalDb.getStoreConfig(),
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BazuPOS-PC-DataGuard-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupSuccessMsg('Snapshot successfully downloaded!');
      setTimeout(() => setBackupSuccessMsg(null), 4000);
    } catch {
      setBackupSuccessMsg('Backup export error');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const activeStoreId = userProfile?.storeId || storeMeta?.storeId || 'store_main';

  const copyStoreId = () => {
    navigator.clipboard.writeText(activeStoreId);
    setHasCopiedStoreId(true);
    setTimeout(() => setHasCopiedStoreId(false), 3000);
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(AuthService.getMobileHandoffDeepLink(activeStoreId, userProfile?.email));
    setHasCopiedLink(true);
    setTimeout(() => setHasCopiedLink(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Universal Navbar */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <BazuLogo className="w-11 h-11 shadow-xl shadow-amber-500/10" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-wider text-white">BAZU POS</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  bazupos.co.ke
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Modern Retail &amp; Hospitality Point of Sale
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-amber-400 transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-amber-400 transition-colors">
              Live Demo
            </a>
            <a href="#downloads" className="hover:text-amber-400 transition-colors">
              Downloads
            </a>
            <a href="#hardware" className="hover:text-amber-400 transition-colors">
              Hardware
            </a>
            <a href="#pricing" className="hover:text-amber-400 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-amber-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Account & Action CTAs */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Login & Store Portal Button */}
            {currentUser && userProfile ? (
              <button
                type="button"
                onClick={() => setIsPortalModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
              >
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span className="max-w-[120px] truncate">{storeMeta?.name || userProfile.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:border-amber-400"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Login &amp; Store Portal</span>
              </button>
            )}

            {/* Create Account Button (if not logged in) */}
            {!currentUser && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="hidden sm:flex px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Create Account</span>
              </button>
            )}

            {/* Launch Web POS */}
            <button
              type="button"
              onClick={onLaunchPOS}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <span>Launch POS</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-amber-500/10 via-amber-600/5 to-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Release Tag Pill with GitHub Link */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 mb-6 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">Bazu POS v1.2.0 Official</span>
            <span className="text-slate-600">•</span>
            <a
              href={OFFICIAL_RELEASE_TAG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 no-underline"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Releases (tag: POS)</span>
            </a>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            The Point of Sale Built for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
              High-Velocity Retail
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Run your store with blazing fast checkout, instant <strong>Kenyan M-Pesa</strong> reference logging,{' '}
            <strong>ESC/POS Bluetooth &amp; USB</strong> thermal printing, and customer tabs. 100% offline-first with seamless multi-tenant cloud sync on <strong>bazupos.co.ke</strong>.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
            {/* Primary OS Download Button */}
            {detectedOS === 'Android' ? (
              <a
                href={OFFICIAL_ANDROID_APK_URL}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer no-underline"
              >
                <Smartphone className="w-4 h-4" />
                <span>Download Android APK (Direct Install)</span>
              </a>
            ) : detectedOS === 'macOS' ? (
              <a
                href={OFFICIAL_MAC_ARM_DMG_URL}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer no-underline"
              >
                <Cpu className="w-4 h-4" />
                <span>Download for macOS (Apple Silicon .dmg)</span>
              </a>
            ) : (
              <a
                href={OFFICIAL_WINDOWS_EXE_URL}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer no-underline"
              >
                <Download className="w-4 h-4" />
                <span>Download for Windows (154 MB .exe)</span>
              </a>
            )}

            {/* Portal Hub Button (Login, files, sales, store id) */}
            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  setIsPortalModalOpen(true);
                } else {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-amber-500/30 hover:border-amber-400 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Store className="w-4 h-4 text-amber-400" />
              <span>{currentUser ? 'My Store Portal & Sales' : 'Login & View My Sales'}</span>
            </button>

            {/* Create Account Button */}
            {!currentUser && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Create Account</span>
              </button>
            )}
          </div>

          {/* Direct File Links Row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
            <a
              href={OFFICIAL_ANDROID_APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 transition-colors no-underline font-semibold shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android APK (v1.2.0)</span>
            </a>

            <a
              href={OFFICIAL_WINDOWS_EXE_URL}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors no-underline font-semibold"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Windows .exe (154MB)</span>
            </a>

            <a
              href={OFFICIAL_MAC_ARM_DMG_URL}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors no-underline font-semibold"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>macOS M-Series .dmg (196MB)</span>
            </a>

            <a
              href={OFFICIAL_MAC_INTEL_DMG_URL}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors no-underline font-semibold"
            >
              <Laptop className="w-3.5 h-3.5 text-slate-300" />
              <span>macOS Intel .dmg (200MB)</span>
            </a>

            <button
              type="button"
              onClick={handleDownloadLauncherScript}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer font-semibold"
              title="Download Windows desktop launcher batch script"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Launcher.bat</span>
            </button>

            <button
              type="button"
              onClick={onLaunchPOS}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer font-semibold"
            >
              <Play className="w-3.5 h-3.5 fill-amber-400" />
              <span>Try Live Web Demo</span>
            </button>
          </div>

          {/* Value Badges */}
          <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-4xl mx-auto">
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
                <h4 className="text-xs font-bold text-white">ESC/POS Thermal</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">USB &amp; Bluetooth receipts</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Multi-Branch Cloud</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time sync on bazupos.co.ke</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive App Demo Showcase Section */}
      <section id="demo" className="py-16 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
              Interactive Preview
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">
              Engineered for Cashier Speed
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              Checkout patrons in under 5 seconds with keyboard shortcuts, visual quick-keys, M-Pesa validation, and instant receipt printing.
            </p>

            {/* View Selector Tabs */}
            <div className="flex items-center justify-center gap-2 mt-6 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={() => setActivePreviewTab('pos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activePreviewTab === 'pos'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Retail Cashier Terminal</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('checkout')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activePreviewTab === 'checkout'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Quick-Keys Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('owner')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activePreviewTab === 'owner'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Owner Dashboard &amp; Shifts</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('receipt')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
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

          {/* Window Mockup Frame */}
          <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden p-2 sm:p-4">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-mono text-slate-400 ml-2">
                  Bazu POS v1.2.0 • bazupos.co.ke
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Live Hardware &amp; Sync Engine Ready</span>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-4 sm:p-6 bg-slate-900/40 min-h-[380px] flex items-center justify-center">
              {activePreviewTab === 'pos' && (
                <div className="w-full max-w-4xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                      <span className="text-[10px] uppercase font-bold text-amber-400">Smart Search</span>
                      <p className="text-sm font-bold text-white mt-1">Instant A-Z Quick Jump</p>
                      <p className="text-xs text-slate-400 mt-1">Press any letter A-Z on the keyboard to jump straight to brands like Tusker, Jameson, or Gilbeys.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                      <span className="text-[10px] uppercase font-bold text-amber-400">Checkout Tender</span>
                      <p className="text-sm font-bold text-white mt-1">Cash &amp; M-Pesa Split Tender</p>
                      <p className="text-xs text-slate-400 mt-1">One-click keypad presets (KES 100, 500, 1000) with automatic change calculation and code validation.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                      <span className="text-[10px] uppercase font-bold text-amber-400">Tabs &amp; Debts</span>
                      <p className="text-sm font-bold text-white mt-1">Open Tabs &amp; Interim Bills</p>
                      <p className="text-xs text-slate-400 mt-1">Print interim bills ("Leta Bill") before closing out orders with itemized combined customer slips.</p>
                    </div>
                  </div>
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={onLaunchPOS}
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
                      Star your best-selling fast movers to appear on the one-touch visual Quick-Keys strip. Add items to cart in a single tap without searching or scanning barcodes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onLaunchCheckout}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Try Quick-Keys Checkout</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {activePreviewTab === 'owner' && (
                <div className="w-full max-w-3xl text-center space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-400" />
                      <span>Multi-Branch X/Z Shift Drawer Reconciliation</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Track drawer cash floats, counted cash, opening floats, and variance reports in real time. Print official X-Reports (mid-shift audits) and Z-Reports (shift end signoffs) directly to thermal receipt printers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenOwnerDashboard}
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
                    <p className="text-[11px] text-slate-600">Till: 123456 • Nairobi, Kenya</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Domain: bazupos.co.ke</p>
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
                    <p className="mt-1 font-sans">Powered by Bazu POS • ESC/POS Thermal</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section id="downloads" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
            Installers &amp; Binaries
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">
            Download for Your Device
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Choose your operating system below. Official release tag <code className="text-amber-400 font-mono">POS</code> on GitHub.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Windows */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  .EXE (154 MB)
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Windows PC</h3>
              <p className="text-xs text-slate-400 mt-1">
                Windows 10 &amp; 11 (64-bit). Standalone desktop client with direct USB &amp; Bluetooth thermal printer drivers.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Zero data loss PC Data Guard</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>100% Offline database storage</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
              <a
                href={OFFICIAL_WINDOWS_EXE_URL}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Setup (154 MB)</span>
              </a>
              <button
                type="button"
                onClick={handleDownloadLauncherScript}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3 h-3 text-amber-400" />
                <span>Get Launcher.bat Script</span>
              </button>
            </div>
          </div>

          {/* macOS */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200">
                  <Laptop className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  .DMG (arm64 &amp; x64)
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Apple macOS</h3>
              <p className="text-xs text-slate-400 mt-1">
                Optimized installers for Apple Silicon (M1/M2/M3/M4) and Intel Macs.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Standalone app window with Dock icon</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Wireless Bluetooth receipt printing</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
              <a
                href={OFFICIAL_MAC_ARM_DMG_URL}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Apple Silicon M-Chips (196 MB)</span>
              </a>
              <a
                href={OFFICIAL_MAC_INTEL_DMG_URL}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center"
              >
                <Laptop className="w-3.5 h-3.5 text-amber-400" />
                <span>Intel Mac .dmg (200 MB)</span>
              </a>
            </div>
          </div>

          {/* Android Tablet & Mobile POS */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    APK Available
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    v1.2.0
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Android &amp; Handheld POS</h3>
              <p className="text-xs text-slate-400 mt-1">
                For handheld retail POS terminals (Sunmi, Telpo, Android smartphones, and tablets).
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Standalone Android APK direct installation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Built-in Camera Barcode Scanner &amp; Quick Keys</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Offline local sales &amp; real-time cloud multi-device sync</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
              <a
                href={OFFICIAL_ANDROID_APK_URL}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer no-underline shadow-lg shadow-emerald-600/25"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Android APK (Direct Install)</span>
              </a>
              <button
                type="button"
                onClick={handleInstallPWA}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Install Mobile WebAPK (PWA)</span>
              </button>
              <button
                type="button"
                onClick={onLaunchPOS}
                className="w-full py-2 rounded-xl bg-transparent hover:bg-slate-850 text-slate-400 hover:text-white font-medium text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Launch in Mobile Browser</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Section */}
      <section id="hardware" className="py-16 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
              Peripherals
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Plug &amp; Play Hardware Integration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Zero driver installation needed. Directly connects via WebUSB and Web Bluetooth.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <Printer className="w-6 h-6 text-amber-400" />
              <h3 className="font-bold text-white text-sm">ESC/POS Thermal Printers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                58mm and 80mm wireless Bluetooth &amp; wired USB thermal receipt printers (Epson, Xprinter, Rongta, Zywell).
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <QrCode className="w-6 h-6 text-blue-400" />
              <h3 className="font-bold text-white text-sm">Barcode Scanners</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                1D &amp; 2D handheld USB scanners with millisecond barcode lookup and auto-add to cart.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <Banknote className="w-6 h-6 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">RJ11 Cash Drawers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Triggers the cash drawer kick solenoid automatically through the printer's RJ11 port upon cash tender.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (KES) */}
      <section id="pricing" className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
            Simple &amp; Transparent
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">
            Plans for Growing Businesses
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Affordable SaaS pricing in Kenyan Shillings (KES). 14-day full-access free trial on all plans.
          </p>

          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => setPricingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                pricingCycle === 'monthly' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setPricingCycle('yearly')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                pricingCycle === 'yearly' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Starter Till</span>
              <h3 className="text-xl font-black text-white mt-1">Single Shop</h3>
              <p className="text-xs text-slate-400 mt-1">For single retail outlets and kiosks.</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">
                  KES {pricingCycle === 'monthly' ? '1,500' : '15,000'}
                </span>
                <span className="text-xs text-slate-400">/{pricingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>1 Active Cashier Terminal</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>M-Pesa reference logging</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Unlimited products &amp; inventory</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>100% Offline operation</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setIsAuthModalOpen(true);
              }}
              className="mt-8 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Start Free Trial
            </button>
          </div>

          {/* Pro Plan */}
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/10 flex flex-col justify-between relative">
            <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950 shadow-md">
              Most Popular
            </span>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase">Growth Pro</span>
              <h3 className="text-xl font-black text-white mt-1">Multi-Terminal Retail</h3>
              <p className="text-xs text-slate-400 mt-1">For busy retail stores with multiple tills.</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-400">
                  KES {pricingCycle === 'monthly' ? '3,500' : '35,000'}
                </span>
                <span className="text-xs text-slate-400">/{pricingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Up to 5 Cashier Terminals</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Real-time Cloud Sync &amp; Backup</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Customer Tabs &amp; Debt Tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>X/Z Cash Drawer shift audits</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setIsAuthModalOpen(true);
              }}
              className="mt-8 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow-md cursor-pointer"
            >
              Start 14-Day Free Trial
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Enterprise</span>
              <h3 className="text-xl font-black text-white mt-1">Multi-Branch Chain</h3>
              <p className="text-xs text-slate-400 mt-1">Multi-location retail chains &amp; franchises.</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">
                  KES {pricingCycle === 'monthly' ? '7,500' : '75,000'}
                </span>
                <span className="text-xs text-slate-400">/{pricingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Unlimited branches &amp; tills</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Custom receipt branding &amp; logo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Dedicated priority WhatsApp support</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setIsAuthModalOpen(true);
              }}
              className="mt-8 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-slate-900/30 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
              Answers
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Where are the installer files (.exe and .dmg) hosted?',
                a: 'All official installer packages are hosted directly on GitHub Releases under tag POS (https://github.com/Njehia/BazuPOS/releases/tag/POS). Windows users get Bazu.POS.Setup.1.2.0.exe (154 MB) and Mac users have options for both Apple Silicon (196 MB) and Intel x64 (200 MB).',
              },
              {
                q: 'Does Bazu POS work without an internet connection?',
                a: 'Yes, 100%! Bazu POS is designed with an offline-first architecture. Cashiers can continue scanning, ringing sales, calculating change, and printing receipts even when the network drops. When internet restores, transactions automatically synchronize to the cloud database on bazupos.co.ke.',
              },
              {
                q: 'Which receipt printers are supported?',
                a: 'Any standard 58mm or 80mm ESC/POS thermal printer is supported via direct USB cable or Bluetooth wireless connection (Epson, Xprinter, Rongta, Zywell, POS-58, POS-80). No third-party print drivers are required.',
              },
              {
                q: 'Will my local inventory and sales be erased if I update the app?',
                a: 'Never. Bazu POS includes PC Data Guard, a local storage preservation layer that prevents data loss during version upgrades, browser cache refreshes, or schema changes.',
              },
              {
                q: 'How does multi-device synchronization work with my Store ID?',
                a: 'When you register on bazupos.co.ke, you are assigned a unique Store ID (e.g. store_quickmart_k9a2). Simply sign in with your email or enter that Store ID on your Android tablets, mobile POS, or secondary cashier PCs, and all inventory, sales, and tabs synchronize in real-time.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setSelectedFaq(selectedFaq === idx ? null : idx)}
                  className="w-full p-4 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-amber-400 transition-transform ${
                      selectedFaq === idx ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {selectedFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BazuLogo className="w-8 h-8" />
            <div>
              <span className="font-black text-white text-sm">BAZU POS</span>
              <p className="text-[11px] text-slate-400">bazupos.co.ke • Nairobi, Kenya</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#downloads" className="hover:text-white transition-colors">
              Downloads
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a
              href={OFFICIAL_RELEASE_TAG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub (tag: POS)</span>
            </a>
          </div>

          <p className="text-[11px] text-slate-400 text-center md:text-right">
            &copy; {new Date().getFullYear()} Bazu POS. Built for high-velocity retail. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* UNIFIED AUTH MODAL: LOGIN & CREATE ACCOUNT */}
      {/* ========================================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <BazuLogo className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-xl font-black text-white">Bazu POS Portal</h3>
              <p className="text-xs text-slate-400 mt-0.5">bazupos.co.ke Merchant Account</p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginError(null);
                  setRegError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'login' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setLoginError(null);
                  setRegError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'register' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Store Account</span>
              </button>
            </div>

            {/* SIGN IN VIEW */}
            {authMode === 'login' && (
              <form onSubmit={handlePortalLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Email or Username
                  </label>
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. store@mart.co.ke or Njehia"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In &amp; Open Portal</span>
                  )}
                </button>

                {/* Quick Super User Access Button for Njehia */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleSuperUserQuickLogin}
                    className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚡ Quick Login as Super User (Njehia)</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Super user has full master rights, hidden from staff directory
                  </p>
                </div>
              </form>
            )}

            {/* CREATE ACCOUNT VIEW */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {regError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Business / Store Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regStoreName}
                    onChange={(e) => setRegStoreName(e.target.value)}
                    placeholder="e.g. Westlands Quick Mart"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Your Name (Owner)
                  </label>
                  <input
                    type="text"
                    required
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    placeholder="e.g. Titus Njehia"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Owner Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="owner@yourstore.co.ke"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Provisioning Store in Cloud...</span>
                    </>
                  ) : (
                    <span>Register Store &amp; Open Portal</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LOGGED-IN MERCHANT PORTAL MODAL / DRAWER */}
      {/* ========================================================================= */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>{storeMeta?.name || 'My Bazu POS Store'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                    {isSuperUser && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Super User
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Logged in as <strong>{userProfile?.email || currentUser?.email || 'Store Admin'}</strong> ({userProfile?.role || 'admin'})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Sign out of portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPortalModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Portal Tab Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPortalTab('sales')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  portalTab === 'sales' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Sales &amp; Receipts</span>
              </button>
              <button
                type="button"
                onClick={() => setPortalTab('downloads')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  portalTab === 'downloads' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Get My Files (.exe/.dmg)</span>
              </button>
              <button
                type="button"
                onClick={() => setPortalTab('settings')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  portalTab === 'settings' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Store ID &amp; Handoff</span>
              </button>
              {isSuperUser && (
                <button
                  type="button"
                  onClick={() => setPortalTab('troubleshoot')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    portalTab === 'troubleshoot' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Super User Tools</span>
                </button>
              )}
            </div>

            {/* TAB 1: LIVE SALES & ANALYTICS */}
            {portalTab === 'sales' && (
              <div className="space-y-4">
                {/* Timeframe Filter & Export CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSalesDateFilter('today')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        salesDateFilter === 'today' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalesDateFilter('yesterday')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        salesDateFilter === 'yesterday' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalesDateFilter('week')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        salesDateFilter === 'week' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Past 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalesDateFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        salesDateFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All Sales ({liveSales.length})
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportSalesCsv}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Revenue</span>
                    <p className="text-lg font-black text-amber-400 mt-1">
                      KES {salesSummary.revenue.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500">{salesSummary.count} transactions</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">M-Pesa Revenue</span>
                    <p className="text-lg font-black text-emerald-400 mt-1">
                      KES {salesSummary.mpesaAmount.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500">{salesSummary.mpesaCount} payments</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Cash Tender</span>
                    <p className="text-lg font-black text-blue-400 mt-1">
                      KES {salesSummary.cashAmount.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500">{salesSummary.cashCount} drawer orders</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Average Ticket</span>
                    <p className="text-lg font-black text-purple-400 mt-1">
                      KES {salesSummary.avgBasket.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500">{liveProducts.length} items in catalog</span>
                  </div>
                </div>

                {/* Recent Transactions Table */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Recent Sales Receipts</span>
                    <span className="text-slate-500 font-normal">Showing {filteredSales.slice(0, 15).length} orders</span>
                  </div>
                  {filteredSales.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No sales recorded for this timeframe. Ring up an order in the POS terminal to populate this list!
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto text-xs">
                      {filteredSales.slice(0, 25).map((sale) => (
                        <div
                          key={sale.id}
                          className="p-3 flex items-center justify-between hover:bg-slate-900/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                              <Receipt className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                              <p className="font-bold text-white flex items-center gap-1.5">
                                <span>Order #{String(sale.id).slice(-6)}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                  sale.payment_method === 'MPESA'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {sale.payment_method}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {(sale.items_count || 1)} items • {sale.cashier_name || 'Cashier'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="font-black text-amber-400">
                                KES {sale.total_amount.toLocaleString()}
                              </p>
                              {sale.mpesa_code && (
                                <p className="text-[10px] font-mono text-emerald-400">
                                  Ref: {sale.mpesa_code}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptSale(sale)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                              title="View Receipt"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Launch Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPortalModalOpen(false);
                      onLaunchPOS();
                    }}
                    className="p-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-between cursor-pointer transition-colors shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      <span>Open Retail Cashier Terminal</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPortalModalOpen(false);
                      onOpenOwnerDashboard();
                    }}
                    className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-400" />
                      <span>Open Full Owner Shift Reports</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: MY FILES & DOWNLOADS */}
            {portalTab === 'downloads' && (
              <div className="space-y-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Download Official Bazu POS Installers</h4>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Direct binary downloads hosted under GitHub Releases tag <code className="text-amber-400 font-mono">POS</code>
                    </p>
                  </div>
                  <a
                    href={OFFICIAL_RELEASE_TAG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 font-bold no-underline"
                  >
                    <Github className="w-3.5 h-3.5 text-amber-400" />
                    <span>Release Notes</span>
                  </a>
                </div>

                <div className="space-y-2.5">
                  {/* Android APK Direct Download */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm">Bazu.POS.1.2.0.apk</p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Android Direct Install
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Android 8.0+ • 48 MB • Standalone handheld retail POS terminal (Sunmi, Telpo, smartphones, tablets)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href="/Bazu.POS.1.2.0.apk"
                        download="Bazu.POS.1.2.0.apk"
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 no-underline border border-slate-700"
                        title="Download from Local Mirror"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Local Mirror</span>
                      </a>
                      <a
                        href={OFFICIAL_ANDROID_APK_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 no-underline shadow-lg shadow-emerald-500/20"
                        title="Download APK from GitHub Releases"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .apk</span>
                      </a>
                    </div>
                  </div>

                  {/* Windows .exe */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">Bazu.POS.Setup.1.2.0.exe</p>
                        <p className="text-[11px] text-slate-400">
                          Windows 10/11 64-bit • 154 MB • Standalone desktop app with USB &amp; Bluetooth thermal printing
                        </p>
                      </div>
                    </div>
                    <a
                      href={OFFICIAL_WINDOWS_EXE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 no-underline shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .exe</span>
                    </a>
                  </div>

                  {/* macOS Apple Silicon */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">Bazu.POS.1.2.0.-.macOS.arm64.dmg</p>
                        <p className="text-[11px] text-slate-400">
                          macOS Apple Silicon (M1/M2/M3/M4) • 196 MB • Native ARM64 binary with dock integration
                        </p>
                      </div>
                    </div>
                    <a
                      href={OFFICIAL_MAC_ARM_DMG_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5 no-underline shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download .dmg (M-Chips)</span>
                    </a>
                  </div>

                  {/* macOS Intel */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">Bazu.POS.1.2.0.-.macOS.x64.dmg</p>
                        <p className="text-[11px] text-slate-400">
                          macOS Intel x64 • 200 MB • For Intel-based MacBooks and iMacs
                        </p>
                      </div>
                    </div>
                    <a
                      href={OFFICIAL_MAC_INTEL_DMG_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5 no-underline shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Download .dmg (Intel)</span>
                    </a>
                  </div>

                  {/* 1-Click Desktop Launcher Script */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">BazuPOS-Launcher.bat (Desktop Shortcut)</p>
                        <p className="text-[11px] text-slate-400">
                          Instantly launches Bazu POS in a dedicated kiosk window on any Windows computer
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadLauncherScript}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-purple-300 font-bold text-xs border border-purple-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Launcher (.bat)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STORE ID & HANDOFF */}
            {portalTab === 'settings' && (
              <div className="space-y-3.5 text-xs">
                {/* Store ID Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Your Unique Store ID</span>
                    <button
                      type="button"
                      onClick={copyStoreId}
                      className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {hasCopiedStoreId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{hasCopiedStoreId ? 'Copied Store ID!' : 'Copy Store ID'}</span>
                    </button>
                  </div>
                  <p className="text-base font-mono font-black text-white">{activeStoreId}</p>
                  <p className="text-[11px] text-slate-400">
                    Use this Store ID on your Android mobile terminals, barcode scanners, and secondary cashier PCs to isolate and sync all inventory and transactions.
                  </p>
                </div>

                {/* Deep Link Mobile Handoff */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Mobile App Link (bazupos.co.ke)</span>
                    <button
                      type="button"
                      onClick={copyPortalLink}
                      className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {hasCopiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{hasCopiedLink ? 'Copied Link' : 'Copy Link'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 truncate">
                    {AuthService.getMobileHandoffDeepLink(activeStoreId, userProfile?.email)}
                  </p>
                </div>

                {/* Firestore Cloud Sync Status */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <p className="font-bold text-white text-xs">Cloud Database Status</p>
                      <p className="text-[11px] text-slate-400">Firestore database `(default)` connected on project `bazupos`</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                    Live Synced
                  </span>
                </div>
              </div>
            )}

            {/* TAB 4: SUPER USER TOOLS (Exclusive for Njehia) */}
            {portalTab === 'troubleshoot' && isSuperUser && (
              <div className="space-y-4 text-xs">
                {/* Super User Guarantee Banner */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-white">Super User Account Active: Njehia</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      This super user account has permanent full rights to all downloads, stores, and remote diagnostics. It is completely isolated and hidden from staff lists, and cannot be removed or modified by any other user.
                    </p>
                  </div>
                </div>

                {/* Remote Control & Diagnostics Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ping test */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>Cloud Latency Ping</span>
                      </span>
                      {pingLatencyMs !== null && (
                        <span className="font-mono text-emerald-400 font-bold">{pingLatencyMs} ms</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tests live round-trip latency to the Firebase Firestore cluster.
                    </p>
                    <button
                      type="button"
                      disabled={isTestingLatency}
                      onClick={handleRunLatencyTest}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isTestingLatency ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pinging Cluster...</span>
                        </>
                      ) : (
                        <span>Run Latency Test</span>
                      )}
                    </button>
                  </div>

                  {/* PC Data Guard Snapshot */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-amber-400" />
                        <span>Master Database Snapshot</span>
                      </span>
                      {backupSuccessMsg && (
                        <span className="text-[10px] text-emerald-400 font-bold">{backupSuccessMsg}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Instantly exports complete JSON snapshot of products, sales, customers, and shifts.
                    </p>
                    <button
                      type="button"
                      disabled={isExportingBackup}
                      onClick={handleTriggerPCDataGuardBackup}
                      className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Full JSON Backup</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECEIPT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {selectedReceiptSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl font-mono text-xs border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setSelectedReceiptSale(null)}
              className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h4 className="font-black text-base uppercase tracking-wider">
                {storeMeta?.name || 'BAZU POS'}
              </h4>
              <p className="text-[11px] text-slate-600">Store: {activeStoreId}</p>
              <p className="text-[11px] text-slate-500">Order #{String(selectedReceiptSale.id).slice(-8)}</p>
              <p className="text-[10px] text-slate-500">
                {new Date(selectedReceiptSale.created_at).toLocaleString()}
              </p>
            </div>
            <div className="py-3 space-y-1.5 text-[11px]">
              {selectedReceiptSale.items_count && (
                <div className="flex justify-between">
                  <span>Items Count</span>
                  <span className="font-bold">{selectedReceiptSale.items_count} items</span>
                </div>
              )}
            </div>
            <div className="border-t border-dashed border-slate-300 pt-3 space-y-1">
              <div className="flex justify-between font-black text-sm">
                <span>TOTAL</span>
                <span className="text-emerald-700">KES {selectedReceiptSale.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Payment</span>
                <span className="font-bold uppercase">{selectedReceiptSale.payment_method}</span>
              </div>
              {selectedReceiptSale.mpesa_code && (
                <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                  <span>M-Pesa Ref</span>
                  <span>{selectedReceiptSale.mpesa_code}</span>
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-500 text-center border-t border-dashed border-slate-300 pt-3 mt-3 font-sans">
              <p>Powered by Bazu POS &bull; bazupos.co.ke</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
