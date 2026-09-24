import React, { useState } from 'react';
import { ShieldAlert, KeyRound, X, CheckCircle2, Lock } from 'lucide-react';
import { User } from '../types';
import { LocalDb } from '../lib/storage';

interface ManagerPinOverrideModalProps {
  isOpen: boolean;
  actionTitle: string;
  actionDescription: string;
  onAuthorized: (manager: User) => void;
  onClose: () => void;
}

export const ManagerPinOverrideModal: React.FC<ManagerPinOverrideModalProps> = ({
  isOpen,
  actionTitle,
  actionDescription,
  onAuthorized,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();

    if (!cleanPin) {
      setErrorMsg('Please enter Manager or Administrator PIN.');
      return;
    }

    const users = LocalDb.getUsers();
    const manager = users.find(
      (u) =>
        (u.role === 'ADMIN' || u.role === 'SUPERVISOR') &&
        !u.suspended &&
        (u.pin === cleanPin || u.password === cleanPin)
    );

    if (!manager) {
      setErrorMsg('Invalid Manager or Administrator PIN. Access Denied.');
      return;
    }

    onAuthorized(manager);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Manager Override Required</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Restricted cashier action</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1">
          <div className="font-bold text-xs text-amber-900 dark:text-amber-300">{actionTitle}</div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
            {actionDescription}
          </p>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Enter Manager / Admin PIN
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="••••"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Authorize</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
