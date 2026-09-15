import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { User } from '../types';
import { LocalDb } from '../lib/storage';
import { BazuLogo } from './BazuLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeToggle } from './ThemeToggle';

interface LoginAuthScreenProps {
  onAuthenticated: (user: User) => void;
}

export const LoginAuthScreen: React.FC<LoginAuthScreenProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [showAdminResetForm, setShowAdminResetForm] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [targetStaffUsername, setTargetStaffUsername] = useState('');
  const [newTempPassword, setNewTempPassword] = useState('');
  const [adminResetError, setAdminResetError] = useState('');
  const [adminResetSuccess, setAdminResetSuccess] = useState('');

  // First-time password change step
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [firstTimeError, setFirstTimeError] = useState('');
  const [isSavingFirstPassword, setIsSavingFirstPassword] = useState(false);

  useEffect(() => {
    // Ensure live cloud sync is active in background
    LocalDb.initLiveSync();
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMsg('Please enter your username.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      const authResult = LocalDb.authenticate(cleanUser, cleanPass);
      if (authResult.user) {
        const user = authResult.user;
        // Check if user must change password on first login or after reset
        const requiresPasswordChange = user.must_change_password || user.has_changed_initial_password === false;
        if (requiresPasswordChange) {
          setPendingUser(user);
          setNewPassword('');
          setConfirmPassword('');
          setFirstTimeError('');
        } else {
          onAuthenticated(user);
        }
      } else {
        setErrorMsg(authResult.error || 'Invalid username or password. Please verify credentials.');
      }
      setIsSubmitting(false);
    }, 200);
  };

  const handleFirstTimePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    const pass = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (pass.length < 4) {
      setFirstTimeError('New password must be at least 4 characters long.');
      return;
    }
    if (pass !== confirm) {
      setFirstTimeError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSavingFirstPassword(true);
    setFirstTimeError('');

    setTimeout(() => {
      const result = LocalDb.firstTimeSetPassword(pendingUser.id, pass);
      if (result.success && result.user) {
        onAuthenticated(result.user);
      } else {
        setFirstTimeError(result.error || 'Failed to update password. Please try again.');
        setIsSavingFirstPassword(false);
      }
    }, 250);
  };

  const handleAdminResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminResetError('');
    setAdminResetSuccess('');

    const cleanAdminUser = adminUsername.trim();
    const cleanAdminPass = adminPassword.trim();
    const cleanTargetUser = targetStaffUsername.trim();
    const cleanNewPass = newTempPassword.trim();

    if (!cleanAdminUser || !cleanAdminPass || !cleanTargetUser || !cleanNewPass) {
      setAdminResetError('All fields are required.');
      return;
    }

    // Verify admin credentials
    const adminAuth = LocalDb.authenticate(cleanAdminUser, cleanAdminPass);
    if (!adminAuth.user || adminAuth.user.role !== 'ADMIN') {
      setAdminResetError('Invalid Administrator credentials.');
      return;
    }

    // Find target user
    const allUsers = LocalDb.getUsers();
    const target = allUsers.find(
      (u) =>
        u.username?.toLowerCase() === cleanTargetUser.toLowerCase() ||
        u.name.toLowerCase() === cleanTargetUser.toLowerCase()
    );

    if (!target) {
      setAdminResetError(`Staff member "${cleanTargetUser}" not found.`);
      return;
    }

    const resetResult = LocalDb.adminResetPassword(target.id, cleanNewPass, adminAuth.user.role);
    if (resetResult.success) {
      setAdminResetSuccess(
        `Password for ${target.name} has been reset. They will be required to choose a new password upon login.`
      );
      setNewTempPassword('');
      setTargetStaffUsername('');
    } else {
      setAdminResetError(resetResult.error || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-white relative transition-colors duration-200">
      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl transition-colors duration-200">
        {/* App Logo & Brand Title */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <BazuLogo className="w-20 h-20 mb-3 shadow-lg hover:scale-105 transition-transform" />
          <h1 className="text-2xl font-black tracking-wide text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
            <span className="text-amber-500">BAZU</span>
            <span className="text-slate-900 dark:text-white">POS</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Nairobi Liquor POS Terminal & Inventory</p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Login Form: Username and Password Only */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="login-username">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Username"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="login-password">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(true);
                  setAdminResetSuccess('');
                  setAdminResetError('');
                  setShowAdminResetForm(false);
                }}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 font-medium transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Password"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Android PWA / Home Screen Installation Card */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
          <PWAInstallButton variant="card" />
        </div>
      </div>

      {/* MODAL 1: FIRST-TIME LOGIN PASSWORD CHANGE PROMPT */}
      {pendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 transition-colors">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Create New Password</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Hello <span className="font-semibold text-slate-900 dark:text-slate-200">{pendingUser.name}</span>, please update and confirm your password before accessing the terminal.
              </p>
            </div>

            {firstTimeError && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                <span>{firstTimeError}</span>
              </div>
            )}

            <form onSubmit={handleFirstTimePasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (firstTimeError) setFirstTimeError('');
                    }}
                    placeholder="Enter at least 4 characters"
                    required
                    autoFocus
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Confirm New Password</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (firstTimeError) setFirstTimeError('');
                  }}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingFirstPassword || !newPassword || !confirmPassword}
                className="w-full py-2.5 mt-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingFirstPassword ? 'Saving Password...' : 'Save Password & Enter Terminal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FORGOT PASSWORD INFO & ADMIN RESET */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Forgot Password</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                To reset your password, please notify your store <strong>Administrator</strong>.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                The Administrator can reset your password from the Staff Settings dashboard. Once reset, you will be prompted to choose a new password upon your next login.
              </p>
            </div>

            {/* Quick Admin Master Reset Toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              {!showAdminResetForm ? (
                <button
                  type="button"
                  onClick={() => setShowAdminResetForm(true)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Administrator: Reset Staff Password Here</span>
                </button>
              ) : (
                <form onSubmit={handleAdminResetSubmit} className="space-y-3 pt-2 text-xs">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Administrator Master Reset
                  </div>

                  {adminResetError && (
                    <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px]">
                      {adminResetError}
                    </div>
                  )}

                  {adminResetSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{adminResetSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Admin Username</label>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="e.g. admin"
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Admin Password</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Admin password"
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Staff Username</label>
                      <input
                        type="text"
                        value={targetStaffUsername}
                        onChange={(e) => setTargetStaffUsername(e.target.value)}
                        placeholder="e.g. brian"
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">New Temp Password</label>
                      <input
                        type="text"
                        value={newTempPassword}
                        onChange={(e) => setNewTempPassword(e.target.value)}
                        placeholder="e.g. 1234"
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdminResetForm(false)}
                      className="flex-1 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold cursor-pointer hover:bg-amber-400"
                    >
                      Reset Password
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
