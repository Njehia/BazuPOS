/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from './types';
import { PinAuthScreen } from './components/PinAuthScreen';
import { PosTerminal } from './components/PosTerminal';
import { SplashScreen } from './components/SplashScreen';
import { LocalDb } from './lib/storage';
import { applyStoreTheme, applyThemeMode, getStoredThemeMode } from './lib/theme';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    try {
      const config = LocalDb.getStoreConfig();
      applyStoreTheme(config);
      const mode = getStoredThemeMode();
      applyThemeMode(mode);
    } catch {
      // ignore
    }
  }, []);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('bazu_pos_active_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleAuthenticated = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('bazu_pos_active_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('bazu_pos_active_user');
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-white transition-colors duration-200">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {!currentUser ? (
        <PinAuthScreen onAuthenticated={handleAuthenticated} />
      ) : (
        <PosTerminal currentUser={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}

