/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from './types';
import { PinAuthScreen } from './components/PinAuthScreen';
import { PosTerminal } from './components/PosTerminal';
import { CheckoutTerminal } from './components/CheckoutTerminal';
import { OwnerDashboard } from './components/OwnerDashboard';
import { MerchantSignupModal } from './components/MerchantSignupModal';
import { SplashScreen } from './components/SplashScreen';
import { FirstTimeSetupModal } from './components/FirstTimeSetupModal';
import { LocalDb } from './lib/storage';
import { applyStoreTheme, applyThemeMode, getStoredThemeMode } from './lib/theme';
import { Building, Store, Monitor, Sparkles } from 'lucide-react';
import { getActiveTenantId, setActiveTenantId, setActiveStoreId, testFirestoreConnection } from './lib/firebase';
import { WebsitePortal } from './components/WebsitePortal';
import { AndroidInstallBanner } from './components/AndroidInstallBanner';
import { AuthService } from './services/auth';

export type ScreenType = 'website' | 'pos_classic' | 'checkout_terminal' | 'owner_dashboard';

export default function App() {
  const [showSplash, setShowSplash] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('view') === 'pos' || urlParams.get('view') === 'classic') {
        return 'pos_classic';
      }
      if (urlParams.get('view') === 'checkout') {
        return 'checkout_terminal';
      }
      if (urlParams.get('view') === 'owner' || urlParams.get('view') === 'admin') {
        return 'owner_dashboard';
      }
    }
    // Default to the official Bazu POS website & merchant portal
    return 'website';
  });

  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [activeTenantId, setActiveTenant] = useState<string>(getActiveTenantId());

  // Check URL query parameters for deep linking on load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlStoreId = params.get('storeId');
      if (urlStoreId) {
        setActiveStoreId(urlStoreId);
        setActiveTenantId(urlStoreId);
        setActiveTenant(urlStoreId);
      }
      const view = params.get('view');
      if (view === 'register' || view === 'signup') {
        setShowMerchantModal(true);
      }
    } catch {}
  }, []);

  // Persistent Cross-Platform Auth State Listener
  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuth(({ user, profile }) => {
      if (profile && user) {
        const mappedUser: User = {
          id: 1,
          name: profile.name || user.displayName || 'Store Admin',
          username: profile.email || 'admin',
          pin: '1234',
          role: profile.role === 'admin' ? 'ADMIN' : 'SALES_CASHIER',
          status: profile.status === 'active' ? 'ACTIVE' : 'SUSPENDED',
          suspended: profile.status !== 'active',
          must_change_password: false,
          has_changed_initial_password: true,
        };
        setCurrentUser(mappedUser);
        sessionStorage.setItem('bazu_pos_active_user', JSON.stringify(mappedUser));

        if (profile.role === 'admin') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('view') !== 'pos' && urlParams.get('view') !== 'checkout') {
            setCurrentScreen('owner_dashboard');
          }
        } else {
          setCurrentScreen('pos_classic');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Run seamless schema upgrade and preserve existing data
  useEffect(() => {
    try {
      LocalDb.runSeamlessUpgradeAndMigration();
      const config = LocalDb.getStoreConfig();
      applyStoreTheme(config);
      const mode = getStoredThemeMode();
      applyThemeMode(mode);
      testFirestoreConnection().catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(() => {
    try {
      LocalDb.runSeamlessUpgradeAndMigration();
      return !LocalDb.isSetupCompleted();
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('bazu_pos_active_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Secure production default: require explicit authentication
    return null;
  });

  const handleFinishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleAuthenticated = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('bazu_pos_active_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('bazu_pos_active_user');
  };

  const handleSetupComplete = (configuredUser: User) => {
    setIsFirstTimeSetup(false);
    handleAuthenticated(configuredUser);
  };

  const handleMerchantSuccess = (storeId: string, role?: string) => {
    setActiveStoreId(storeId);
    setActiveTenantId(storeId);
    setActiveTenant(storeId);
    setShowMerchantModal(false);
    if (role === 'admin' || !role) {
      setCurrentScreen('owner_dashboard');
    } else {
      setCurrentScreen('pos_classic');
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-white transition-colors duration-200 relative">
      {/* Startup Logo Animation */}
      {showSplash && <SplashScreen onFinish={handleFinishSplash} />}

      {/* Android Native Install & APK Banner */}
      <AndroidInstallBanner onOpenMobilePos={() => setCurrentScreen('pos_classic')} />

      {/* Global Quick SaaS Navigation Bar (Adaptive: Native Android dock on mobile, floating pill on desktop) */}
      {/* Mobile Android Bottom Dock */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 shadow-2xl flex items-center justify-around px-2 py-1 safe-area-pb">
        <button
          onClick={() => setCurrentScreen('website')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            currentScreen === 'website'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${currentScreen === 'website' ? 'bg-amber-500/20 text-amber-400' : ''}`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight">Portal</span>
        </button>

        <button
          onClick={() => setCurrentScreen('pos_classic')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            currentScreen === 'pos_classic'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${currentScreen === 'pos_classic' ? 'bg-amber-500/20 text-amber-400' : ''}`}>
            <Store className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight">Classic POS</span>
        </button>

        <button
          onClick={() => setCurrentScreen('checkout_terminal')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            currentScreen === 'checkout_terminal'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${currentScreen === 'checkout_terminal' ? 'bg-amber-500/20 text-amber-400' : ''}`}>
            <Monitor className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight">Terminal</span>
        </button>

        <button
          onClick={() => setCurrentScreen('owner_dashboard')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            currentScreen === 'owner_dashboard'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${currentScreen === 'owner_dashboard' ? 'bg-amber-500/20 text-amber-400' : ''}`}>
            <Building className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight">Owner</span>
        </button>
      </nav>

      {/* Desktop Floating Pill Navigation */}
      <nav aria-label="Desktop Navigation" className="hidden md:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-full px-3 py-1.5 shadow-2xl items-center gap-1.5 text-xs text-slate-300">
        <button
          onClick={() => setCurrentScreen('website')}
          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            currentScreen === 'website'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'hover:text-white'
          }`}
          title="Official Website & Merchant Portal (bazupos.co.ke)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Website &amp; Portal</span>
        </button>

        <button
          onClick={() => setCurrentScreen('pos_classic')}
          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            currentScreen === 'pos_classic'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'hover:text-white'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Classic View</span>
        </button>

        <button
          onClick={() => setCurrentScreen('checkout_terminal')}
          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            currentScreen === 'checkout_terminal'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Checkout Terminal</span>
        </button>

        <button
          onClick={() => setCurrentScreen('owner_dashboard')}
          className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            currentScreen === 'owner_dashboard'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'hover:text-white'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Owner Dashboard</span>
        </button>
      </nav>

      {/* Main Screens */}
      {currentScreen === 'website' ? (
        <WebsitePortal
          onLaunchPOS={() => setCurrentScreen('pos_classic')}
          onLaunchCheckout={() => setCurrentScreen('checkout_terminal')}
          onOpenOwnerDashboard={() => setCurrentScreen('owner_dashboard')}
          onOpenSignup={() => setShowMerchantModal(true)}
        />
      ) : isFirstTimeSetup ? (
        <FirstTimeSetupModal
          isOpen={true}
          canClose={true}
          onClose={() => setIsFirstTimeSetup(false)}
          onComplete={handleSetupComplete}
        />
      ) : !currentUser ? (
        <PinAuthScreen onAuthenticated={handleAuthenticated} />
      ) : currentScreen === 'owner_dashboard' ? (
        <OwnerDashboard
          currentUser={currentUser}
          onBackToTerminal={() => setCurrentScreen('pos_classic')}
          onOpenNewStore={() => setShowMerchantModal(true)}
        />
      ) : currentScreen === 'pos_classic' ? (
        <PosTerminal
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenNewStore={() => setShowMerchantModal(true)}
          onOpenDownloadSite={() => setCurrentScreen('website')}
        />
      ) : (
        <CheckoutTerminal
          currentUser={currentUser}
          onOpenOwnerDashboard={() => setCurrentScreen('owner_dashboard')}
          onLogout={handleLogout}
        />
      )}

      {/* Self-Service Merchant Onboarding Modal */}
      <MerchantSignupModal
        isOpen={showMerchantModal}
        onClose={() => setShowMerchantModal(false)}
        onSuccess={handleMerchantSuccess}
      />
    </div>
  );
}
