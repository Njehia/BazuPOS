/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
import { Building, Store, Monitor } from 'lucide-react';
import { getActiveTenantId, setActiveTenantId } from './lib/firebase';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<'checkout_terminal' | 'pos_classic' | 'owner_dashboard'>('checkout_terminal');
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [activeTenantId, setActiveTenant] = useState<string>(getActiveTenantId());

  // Check and purge legacy demo data on first boot if needed
  useEffect(() => {
    try {
      LocalDb.purgeLegacyDemoDataIfNeeded();
      const config = LocalDb.getStoreConfig();
      applyStoreTheme(config);
      const mode = getStoredThemeMode();
      applyThemeMode(mode);
    } catch {
      // ignore
    }
  }, []);

  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(() => {
    try {
      LocalDb.purgeLegacyDemoDataIfNeeded();
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
    // Default logged in user for immediate usability
    return {
      id: 1,
      name: 'Store Manager',
      role: 'ADMIN',
      pin: '1234',
    };
  });

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

  const handleMerchantSuccess = (newTenantId: string) => {
    setActiveTenantId(newTenantId);
    setActiveTenant(newTenantId);
    setShowMerchantModal(false);
    setCurrentScreen('owner_dashboard');
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-white transition-colors duration-200 relative">
      {/* Startup Logo Animation */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Global Quick SaaS Navigation Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-700/60 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-1.5 text-xs text-slate-300">
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

        <button
          onClick={() => setCurrentScreen('pos_classic')}
          className={`hidden sm:flex px-3 py-1 rounded-full font-bold transition-all cursor-pointer items-center gap-1.5 ${
            currentScreen === 'pos_classic'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'hover:text-white'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Classic View</span>
        </button>

        <div className="w-px h-4 bg-slate-700 mx-1" />

        <button
          onClick={() => setShowMerchantModal(true)}
          className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold transition-colors cursor-pointer text-[11px]"
          title="Sign up a new merchant store"
        >
          + New Store
        </button>
      </div>

      {/* Main Screens */}
      {isFirstTimeSetup ? (
        <FirstTimeSetupModal
          isOpen={true}
          canClose={false}
          onComplete={handleSetupComplete}
        />
      ) : !currentUser ? (
        <PinAuthScreen onAuthenticated={handleAuthenticated} />
      ) : currentScreen === 'owner_dashboard' ? (
        <OwnerDashboard onBackToTerminal={() => setCurrentScreen('checkout_terminal')} />
      ) : currentScreen === 'pos_classic' ? (
        <PosTerminal currentUser={currentUser} onLogout={handleLogout} />
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
