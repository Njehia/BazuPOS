import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileJson,
  FileText,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { LocalBackupData, StoreConfig, User } from '../types';
import { LocalDb } from '../lib/storage';

interface LocalBackupModalProps {
  isOpen?: boolean;
  currentUser?: User;
  storeConfig?: StoreConfig;
  onClose: () => void;
  onRestored?: () => void;
}

export const LocalBackupModal: React.FC<LocalBackupModalProps> = ({
  isOpen = true,
  currentUser,
  storeConfig,
  onClose,
  onRestored,
}) => {
  if (isOpen === false) return null;

  const [activeTab, setActiveTab] = useState<'BACKUP' | 'RESTORE'>('BACKUP');
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<LocalBackupData | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Live database counts
  const liveStats = useMemo(() => {
    return {
      products: LocalDb.getProducts().length,
      categories: LocalDb.getCategories().length,
      sales: LocalDb.getSales().length,
      customers: LocalDb.getCustomers().length,
      debts: LocalDb.getCustomerPayments().length,
      shifts: LocalDb.getRequisitions().length,
      tabs: LocalDb.getCustomerTabs().length,
    };
  }, []);

  // Trigger Backup Download
  const handleDownloadBackup = () => {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      const res = LocalDb.downloadLocalBackup(currentUser?.name || 'Cashier');
      setSuccessMsg(`Backup successfully downloaded to your computer as "${res.filename}".`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate local backup file.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle selecting a JSON backup file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as LocalBackupData;

        // Basic verification of backup structure
        if (!parsed.products || !Array.isArray(parsed.products) || !parsed.metadata) {
          throw new Error('Selected file does not appear to be a valid Bazu POS backup file.');
        }

        setBackupFile(parsed);
      } catch (err: any) {
        setBackupFile(null);
        setErrorMsg(err.message || 'Invalid JSON file. Please select a valid POS backup.');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read selected file from your computer.');
    };
    reader.readAsText(file);
  };

  // Execute Database Restore
  const handleApplyRestore = () => {
    if (!backupFile) return;

    const confirmed = window.confirm(
      restoreMode === 'REPLACE'
        ? `Are you sure you want to restore? This will replace your local database with ${backupFile.products.length} products and ${backupFile.sales.length} sales from the backup file.`
        : `Merge records from "${selectedFileName}" into your existing local database?`
    );

    if (!confirmed) return;

    setIsRestoring(true);
    setErrorMsg(null);

    try {
      const result = LocalDb.restoreFromLocalBackup(backupFile, restoreMode);
      if (!result.success) {
        throw new Error(result.error || 'Restore failed.');
      }

      setSuccessMsg(
        `Database successfully restored! Loaded ${backupFile.products.length} products, ${backupFile.sales.length} sales records, and ${backupFile.customer_tabs?.length || 0} customer tabs.`
      );
      setBackupFile(null);
      setSelectedFileName('');
      onRestored();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while restoring database.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Local Machine Backup & Restore</span>
              </h2>
              <p className="text-xs text-slate-400">
                Save full snapshots to your computer or restore your POS records without internet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('BACKUP');
              setErrorMsg(null);
            }}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'BACKUP'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Create Local Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('RESTORE');
              setErrorMsg(null);
            }}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'RESTORE'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Restore from File</span>
          </button>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="mx-5 mt-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-3 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* TAB 1: BACKUP */}
          {activeTab === 'BACKUP' && (
            <div className="space-y-5 max-w-xl mx-auto py-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Download className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Save Full Database to Computer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                  Downloads an unencrypted, offline-compatible JSON file containing all liquor products, categories, historical sales, customer tabs, and debt ledgers.
                </p>

                {/* Current Counts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 text-left">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Products
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {liveStats.products}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Sales
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {liveStats.sales}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Tabs
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {liveStats.tabs}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Customers
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {liveStats.customers}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isExporting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup File Now (.json)</span>
                </button>
              </div>

              <div className="bg-slate-100/80 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                    Safe for Flash Drives & Hard Drives
                  </span>
                  <span>
                    You can copy this backup file onto a USB flash drive or store it in your computer's personal Documents folder for periodic disaster recovery.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE */}
          {activeTab === 'RESTORE' && (
            <div className="space-y-5 max-w-xl mx-auto py-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json"
                className="hidden"
              />

              {!backupFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Select Backup File from Your Computer (.json)
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Click here to choose a previously saved Bazu POS backup file
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <FileJson className="w-5 h-5 text-blue-500" />
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-xs">
                          {selectedFileName}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Exported by {backupFile.metadata.exported_by_user} on{' '}
                          {new Date(backupFile.metadata.exported_at).toLocaleDateString()}{' '}
                          {new Date(backupFile.metadata.exported_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBackupFile(null);
                        setSelectedFileName('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Backup Contents Preview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Products
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {backupFile.products.length}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Sales Records
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {backupFile.sales.length}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Customer Tabs
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {backupFile.customer_tabs?.length || 0}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Customers
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {backupFile.customers.length}
                      </span>
                    </div>
                  </div>

                  {/* Restore Mode Choice */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Choose Restore Mode:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('REPLACE')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          restoreMode === 'REPLACE'
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Complete Replace (Recommended)
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Overwrites all local tables to match this backup exactly.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('MERGE')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          restoreMode === 'MERGE'
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Merge Records
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Combines backup records with your existing local database.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Confirmation Trigger */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={handleApplyRestore}
                      disabled={isRestoring}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                      <span>
                        {isRestoring ? 'Restoring Database...' : 'Confirm & Apply Database Restore'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>All backups are stored directly on your computer</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
