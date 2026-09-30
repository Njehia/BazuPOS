import React, { useState } from 'react';
import { AlertOctagon, KeyRound, Lock, Eye, EyeOff, X, Trash2, Loader2 } from 'lucide-react';
import { User } from '../types';
import { LocalDb } from '../lib/storage';

interface DeleteAllProductsModalProps {
  isOpen: boolean;
  totalProductsCount: number;
  currentUser?: User;
  onClose: () => void;
  onSuccess: (deletedCount: number) => void;
  onConfirmCustom?: (password: string) => Promise<{ success: boolean; count?: number; error?: string }>;
}

export const DeleteAllProductsModal: React.FC<DeleteAllProductsModalProps> = ({
  isOpen,
  totalProductsCount,
  currentUser,
  onClose,
  onSuccess,
  onConfirmCustom,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setErrorMsg('Please enter your Administrator password to confirm.');
      return;
    }

    setIsDeleting(true);
    setErrorMsg('');

    try {
      if (onConfirmCustom) {
        const res = await onConfirmCustom(cleanPassword);
        if (!res.success) {
          setErrorMsg(res.error || 'Incorrect administrator password. Deletion cancelled.');
          setIsDeleting(false);
          return;
        }
        setIsDeleting(false);
        onSuccess(res.count ?? totalProductsCount);
        onClose();
        return;
      }

      // Default to LocalDb deletion
      const res = LocalDb.deleteAllProducts('ADMIN', cleanPassword, currentUser);
      if (!res.success) {
        setErrorMsg(res.error || 'Incorrect administrator password. Deletion cancelled.');
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      onSuccess(res.count);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setErrorMsg(err.message || 'An unexpected error occurred during product deletion.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100 relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete All Products</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                  Admin Verification
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Irreversible bulk catalog deletion
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Details */}
        <div className="p-4 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2 text-rose-900 dark:text-rose-200 text-xs">
          <p className="font-semibold leading-relaxed">
            You are about to permanently remove <strong className="font-black underline">{totalProductsCount} products</strong> from your catalog.
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800/90 dark:text-rose-300/90">
            <li>Product records and on-hand stock counts will be erased.</li>
            <li>Completed sales transactions and financial shift audits will be preserved.</li>
            <li>This action cannot be undone.</li>
          </ul>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Enter Administrator Password to Verify:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                disabled={isDeleting}
                autoFocus
                placeholder="Enter Admin Password"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Requires Administrator authority (default password: <code className="font-mono text-slate-500 dark:text-slate-400">admin</code> or custom PIN)
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel / Keep Products
            </button>

            <button
              type="submit"
              disabled={isDeleting || !password.trim()}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying &amp; Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Verify Password &amp; Delete All</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
