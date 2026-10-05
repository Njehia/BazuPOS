import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileJson,
  FileSpreadsheet,
  Filter,
  Fingerprint,
  Hash,
  HelpCircle,
  History,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AuditAction, AuditChainVerificationResult, AuditLogEntry, AuditSeverity } from '../types';
import { AuditLogger } from '../lib/auditLogger';

interface AuditLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLedgerModal: React.FC<AuditLedgerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Verification state
  const [verification, setVerification] = useState<AuditChainVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Load logs
  const loadLogs = useCallback(() => {
    const list = AuditLogger.getLogs();
    setLogs(list);
  }, []);

  useEffect(() => {
    loadLogs();
    const unsubscribe = AuditLogger.subscribe(loadLogs);
    return () => unsubscribe();
  }, [loadLogs]);

  // Run integrity verification
  const handleVerifyChain = useCallback(async () => {
    setIsVerifying(true);
    try {
      const result = await AuditLogger.verifyChainIntegrity();
      setVerification(result);
    } catch {
      // ignore
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Run verification once on open
  useEffect(() => {
    handleVerifyChain();
  }, [handleVerifyChain]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => {
        if (selectedSeverity !== 'ALL' && l.severity !== selectedSeverity) return false;
        if (selectedAction !== 'ALL' && l.action !== selectedAction) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSummary = l.summary.toLowerCase().includes(q);
          const matchActor = l.actor.name.toLowerCase().includes(q);
          const matchAction = l.action.toLowerCase().includes(q);
          const matchId = l.id.toLowerCase().includes(q);
          const matchHash = l.hash.toLowerCase().includes(q);
          return matchSummary || matchActor || matchAction || matchId || matchHash;
        }
        return true;
      })
      .reverse(); // latest first
  }, [logs, selectedSeverity, selectedAction, searchQuery]);

  // Exports
  const handleExportJSON = async () => {
    await AuditLogger.exportAuditTrailJSON();
  };

  const handleExportCSV = () => {
    AuditLogger.exportAuditTrailCSV();
  };

  // Severity color mapping
  const getSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'SECURITY':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'WARNING':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs select-none"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Fingerprint className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Tamper-Evident Audit Ledger</h2>
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  SHA-256 Merkle Chained
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cryptographically sealed append-only log: any record deletion, modification, or stock manipulation is detected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cryptographic Chain Integrity Banner */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {verification?.isValid ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">
                    Chain Integrity Verified: 100% Untampered
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {verification.verifiedCount} cryptographic blocks validated • Root Genesis Hash: {verification.genesisHash.slice(0, 16)}...
                  </span>
                </div>
              </div>
            ) : verification && !verification.isValid ? (
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <span className="text-xs font-bold block text-rose-600 dark:text-rose-400">
                    CRITICAL: Tampering Detected!
                  </span>
                  <span className="text-[11px] text-rose-500">
                    {verification.failureReason}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Shield className="w-5 h-5" />
                <span>Checking ledger cryptographic hashes...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Verifying...' : 'Verify Cryptographic Proof'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Download signed JSON ledger with verification report"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Export Signed JSON</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Export CSV audit trail"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, user, amount, product or SHA-256 hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
              <option value="SECURITY">Security</option>
            </select>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Actions</option>
              <option value="SALE_CREATED">Sales Created</option>
              <option value="SALE_VOIDED">Sales Voided</option>
              <option value="PRODUCT_STOCK_UPDATED">Stock Changes</option>
              <option value="PRODUCT_PRICE_UPDATED">Price Changes</option>
              <option value="STOCK_BULK_UPLOAD">Bulk Uploads</option>
              <option value="SHIFT_OPENED">Shifts Opened</option>
              <option value="SHIFT_CLOSED">Shifts Closed</option>
              <option value="CASH_ADJUSTMENT">Cash Adjustments</option>
              <option value="USER_LOGIN_SUCCESS">Logins</option>
              <option value="USER_LOGIN_FAILED">Failed Logins</option>
              <option value="BACKUP_RESTORED">Backups Restored</option>
            </select>
          </div>
        </div>

        {/* Ledger Entries List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {logs.length === 0 ? 'Audit ledger initialized and ready.' : 'No audit entries match current filter.'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Every sale, inventory intake, drawer adjustment, or login attempt is logged here with an irreversible SHA-256 seal.
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const isExpanded = expandedLogId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 transition-all hover:border-amber-400/60 dark:hover:border-amber-500/60 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        #{entry.sequenceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getSeverityBadge(
                          entry.severity
                        )}`}
                      >
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {entry.actor.name}
                        </span>
                        {entry.actor.role && (
                          <span className="text-[10px] text-slate-400">({entry.actor.role})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0 self-start sm:self-center cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Cryptographic Details' : 'Verify Block'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Summary line */}
                  <div className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-100">
                    {entry.summary}
                  </div>

                  {/* Expanded Cryptographic Proof & Raw Data */}
                  {isExpanded && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-700/60 space-y-2.5 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Block Hash (SHA-256)
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-400 break-all select-all font-semibold">
                            {entry.hash}
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Previous Block Hash
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 break-all select-all">
                            {entry.previousHash}
                          </span>
                        </div>
                      </div>

                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Event Payload Manifest
                          </span>
                          <pre className="text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-40">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
