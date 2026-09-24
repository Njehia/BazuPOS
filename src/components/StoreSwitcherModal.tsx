import React, { useState, useEffect } from 'react';
import {
  Store,
  Check,
  Plus,
  Building2,
  ShieldCheck,
  X,
  ArrowRight,
  Sparkles,
  MapPin,
  Lock,
} from 'lucide-react';
import { StoreConfig } from '../types';
import { LocalDb } from '../lib/storage';

interface StoreSwitcherModalProps {
  currentConfig: StoreConfig;
  isOpen: boolean;
  onClose: () => void;
  onStoreSwitched: (newConfig: StoreConfig) => void;
}

export const StoreSwitcherModal: React.FC<StoreSwitcherModalProps> = ({
  currentConfig,
  isOpen,
  onClose,
  onStoreSwitched,
}) => {
  const [stores, setStores] = useState<{ id: string; name: string; branch: string }[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newTill, setNewTill] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStores(LocalDb.getRegisteredStores());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeStoreId = LocalDb.getStoreConfig().store_id || 'store_main';

  const handleSelectStore = (storeId: string, storeName: string, branch: string) => {
    const newConfig = LocalDb.switchStore(storeId, storeName, branch);
    onStoreSwitched(newConfig);
    onClose();
    // Soft reload window so all components reload with isolated storage keys
    window.location.reload();
  };

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    const cleanId = newStoreName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');

    LocalDb.registerStore(cleanId, newStoreName.trim(), newBranch.trim() || 'Main Branch');
    const newConfig = LocalDb.switchStore(cleanId, newStoreName.trim(), newBranch.trim() || 'Main Branch');
    
    if (newTill.trim() || newPhone.trim()) {
      LocalDb.updateStoreConfig({
        till_number: newTill.trim() || newConfig.till_number,
        phone_number: newPhone.trim() || newConfig.phone_number,
      });
    }

    onStoreSwitched(LocalDb.getStoreConfig());
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-16 bg-[#1E1B4B] dark:bg-slate-950 px-6 flex items-center justify-between text-white shrink-0 border-b border-indigo-950/60 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Multi-Store Instance Manager</h3>
              <p className="text-[11px] text-slate-300">Independent store data isolation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Isolation Notice */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="leading-relaxed">
            <strong>Strict Multi-Tenant Data Isolation Active:</strong> Each store instance operates
            with completely independent products, pricing, sales reports, customer debts, and
            cashier accounts. Data is never shared across stores.
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!isAddingNew ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Active Store Instance
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register New Store</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {stores.map((s) => {
                  const isActive = (currentConfig.store_id || 'the_buzz_liquor') === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStore(s.id, s.name, s.branch)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                        isActive
                          ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/50 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {s.name}
                            </h4>
                            {isActive && (
                              <span className="text-[10px] uppercase font-black px-2 py-0.2 rounded-full bg-amber-500 text-slate-950">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {s.branch} • ID: <code className="font-mono text-[10px]">{s.id}</code>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        {isActive ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-4 h-4 text-emerald-500 font-black" /> Current
                          </span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Switch <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Register New Store Form */
            <form onSubmit={handleCreateStore} className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Register New Store Client
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Back to List
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Store Legal / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="E.g. The Early Kick-Off Liquor"
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Branch / Location Name
                </label>
                <input
                  type="text"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="E.g. Kilimani Branch / Westlands"
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    M-Pesa Till / Paybill
                  </label>
                  <input
                    type="text"
                    value={newTill}
                    onChange={(e) => setNewTill(e.target.value)}
                    placeholder="E.g. 543210"
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="E.g. 0712 345 678"
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl p-2.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
                >
                  Create &amp; Switch to Store
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
