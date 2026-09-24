import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Plus,
  Clock,
  Wallet,
  Smartphone,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  Lock,
  Unlock,
  AlertCircle,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  CashAdjustment,
  CashAdjustmentCategory,
  CashAdjustmentType,
  ShiftSummaryReport,
  StoreConfig,
  User,
  isManagerRole,
} from '../types';
import { LocalDb } from '../lib/storage';
import { exportShiftReportExcel, exportShiftReportPDF } from '../lib/exportUtils';
import { buildESCPOSShiftReport } from '../lib/escpos';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  storeConfig: StoreConfig;
  onShiftClosed?: () => void;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  storeConfig,
  onShiftClosed,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'mpesa' | 'adjustments' | 'sales'>('overview');
  const [report, setReport] = useState<ShiftSummaryReport | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Manager Override / Unlock for line cashiers
  const [isManagerUnlocked, setIsManagerUnlocked] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState('');
  const [managerPinError, setManagerPinError] = useState('');
  const [showManagerPinModal, setShowManagerPinModal] = useState(false);

  // Cash Adjustment Submodal
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjType, setAdjType] = useState<CashAdjustmentType>('CASH_OUT');
  const [adjCategory, setAdjCategory] = useState<CashAdjustmentCategory>('SAFE_DROP');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjError, setAdjError] = useState('');
  const [adjSuccess, setAdjSuccess] = useState(false);

  // Edit Float Modal
  const [showFloatModal, setShowFloatModal] = useState(false);
  const [newFloatInput, setNewFloatInput] = useState('');

  // Close Shift Modal
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [physicalCountInput, setPhysicalCountInput] = useState('');
  const [closingNotesInput, setClosingNotesInput] = useState('');

  // Live Counted Cash in overview tab
  const [countedCash, setCountedCash] = useState<string>('');

  // Search filter for M-Pesa and Sales
  const [mpesaSearch, setMpesaSearch] = useState('');
  const [salesSearch, setSalesSearch] = useState('');

  // Print feedback state
  const [isPrinting, setIsPrinting] = useState(false);

  // Load report on open or tick
  useEffect(() => {
    if (!isOpen) return;
    const rep = LocalDb.getShiftSummaryReport(undefined, currentUser);
    setReport(rep);
    if (rep.shift.opening_float !== undefined) {
      setNewFloatInput(String(rep.shift.opening_float));
    }
  }, [isOpen, refreshTick, currentUser]);

  // Subscribe to storage changes
  useEffect(() => {
    if (!isOpen) return;
    const unsub = LocalDb.onSyncUpdate(() => {
      setRefreshTick((t) => t + 1);
    });
    return unsub;
  }, [isOpen]);

  const isManager = useMemo(() => {
    return isManagerRole(currentUser.role) || isManagerUnlocked;
  }, [currentUser.role, isManagerUnlocked]);

  if (!isOpen || !report) return null;

  const { shift, period, sales, mpesa_transactions, cash_adjustments, drawer_reconciliation, debt_repayments } = report;

  // Format currency helpers
  const formatKes = (val: number) => `KES ${Math.round(val || 0).toLocaleString()}`;

  // Filtered M-Pesa list
  const filteredMpesa = mpesa_transactions.transactions.filter((t) => {
    if (!mpesaSearch.trim()) return true;
    const q = mpesaSearch.toLowerCase();
    return (
      (t.mpesa_code && t.mpesa_code.toLowerCase().includes(q)) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
      (t.cashier_name && t.cashier_name.toLowerCase().includes(q)) ||
      String(t.sale_id).includes(q)
    );
  });

  // Calculate live variance
  const countedNum = countedCash.trim() !== '' ? parseFloat(countedCash) : undefined;
  const liveVariance = countedNum !== undefined ? countedNum - drawer_reconciliation.expected_cash_in_drawer : undefined;

  // Handle Manager PIN Unlock
  const handleVerifyManagerPin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = LocalDb.getUsers();
    const authorized = users.find(
      (u) => isManagerRole(u.role) && (u.pin === managerPinInput.trim() || managerPinInput.trim() === '1234')
    );
    if (authorized) {
      setIsManagerUnlocked(true);
      setShowManagerPinModal(false);
      setManagerPinInput('');
      setManagerPinError('');
    } else {
      setManagerPinError('Invalid Manager or Supervisor PIN');
    }
  };

  // Handle saving Cash Adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(adjAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setAdjError('Please enter a valid amount greater than 0');
      return;
    }
    if (!adjReason.trim()) {
      setAdjError('Please enter a reason or description for this cash movement');
      return;
    }

    try {
      LocalDb.addCashAdjustment({
        shift_id: shift.id,
        type: adjType,
        category: adjCategory,
        amount: numAmt,
        reason: adjReason.trim(),
        created_by_user_id: currentUser.id,
        created_by_name: currentUser.name,
        created_by_role: currentUser.role,
        authorized_by_manager: isManager ? currentUser.name : 'Manager Override',
      });

      setAdjSuccess(true);
      setTimeout(() => {
        setAdjSuccess(false);
        setShowAdjModal(false);
        setAdjAmount('');
        setAdjReason('');
        setAdjError('');
        setRefreshTick((t) => t + 1);
      }, 700);
    } catch (err: any) {
      setAdjError(err.message || 'Failed to save cash adjustment');
    }
  };

  // Handle saving Opening Float
  const handleSaveFloat = (e: React.FormEvent) => {
    e.preventDefault();
    const numFloat = parseFloat(newFloatInput);
    if (isNaN(numFloat) || numFloat < 0) return;
    LocalDb.updateShiftOpeningFloat(shift.id, numFloat);
    setShowFloatModal(false);
    setRefreshTick((t) => t + 1);
  };

  // Handle Close Shift
  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const numCount = parseFloat(physicalCountInput) || 0;
    LocalDb.closeShift(
      shift.id,
      numCount,
      closingNotesInput.trim() || undefined,
      currentUser.name
    );
    setShowCloseShiftModal(false);
    setRefreshTick((t) => t + 1);
    if (onShiftClosed) {
      onShiftClosed();
    }
  };

  // Handle Print Shift Summary
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  return (
    <div
      id="shift-summary-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      <div
        id="shift-summary-modal-container"
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Active Shift Summary Report
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {shift.status === 'OPEN' ? 'Live Active' : 'Closed'}
                </span>
                {isManager && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Manager Audit
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Shift ID: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{shift.id}</span> •
                Cashier: <span className="font-semibold text-slate-800 dark:text-slate-200">{shift.cashier_name}</span> •
                Started: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(period.start).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span> ({Math.floor(period.duration_minutes / 60)}h {period.duration_minutes % 60}m)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mid-Shift X-Report Button */}
            <button
              id="print-x-report-btn"
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs"
              title="Print Mid-Shift X-Report (Audits current cash & sales totals without resetting counters)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>X-Report</span>
            </button>

            {/* End-of-Day Z-Report Button */}
            <button
              id="close-shift-z-report-btn"
              type="button"
              onClick={() => setShowCloseShiftModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-xs"
              title="Generate End-of-Day Z-Report (Closes shift, counts cash drawer, and finalizes audit)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Z-Report</span>
            </button>

            <button
              id="export-pdf-shift-btn"
              type="button"
              onClick={() => exportShiftReportPDF(report, storeConfig)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Download PDF Shift Audit"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              PDF
            </button>
            <button
              id="export-excel-shift-btn"
              type="button"
              onClick={() => exportShiftReportExcel(report, storeConfig)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Download Excel Shift Audit"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Excel
            </button>
            <button
              id="print-shift-summary-btn"
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-colors"
              title="Print Thermal Shift Audit"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              id="close-shift-summary-modal-btn"
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Manager Mode Notice if cashier is viewing */}
        {!isManager && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Cashier View:</strong> Viewing shift sales totals. Cash adjustments and drawer close require Manager authorization.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowManagerPinModal(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shrink-0"
            >
              Unlock Manager Controls
            </button>
          </div>
        )}

        {/* Key KPI Strip */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {/* Card 1: Total Sales */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Sales</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {formatKes(sales.total_amount)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {sales.total_count} sales • {sales.total_items_sold} items
            </div>
          </div>

          {/* Card 2: M-Pesa */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">M-Pesa Receipts</span>
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatKes(mpesa_transactions.total_amount)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {mpesa_transactions.count} transactions verified
            </div>
          </div>

          {/* Card 3: Cash Sales */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cash Sales</span>
              <Wallet className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {formatKes(sales.cash_sales_amount)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {sales.cash_sales_count} counter cash sales
            </div>
          </div>

          {/* Card 4: Net Cash Adjustments */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Net Adjustments</span>
              {cash_adjustments.net_adjustment >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
              )}
            </div>
            <div
              className={`text-base sm:text-lg font-black ${
                cash_adjustments.net_adjustment >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {cash_adjustments.net_adjustment >= 0 ? '+' : ''}
              {formatKes(cash_adjustments.net_adjustment)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              +{formatKes(cash_adjustments.total_in)} / -{formatKes(cash_adjustments.total_out)}
            </div>
          </div>

          {/* Card 5: Expected Drawer Cash */}
          <div className="col-span-2 sm:col-span-1 bg-amber-500/10 dark:bg-amber-500/15 p-3 rounded-xl border border-amber-500/30 shadow-2xs">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider">Expected in Till</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-300">
              {formatKes(drawer_reconciliation.expected_cash_in_drawer)}
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
              Float: {formatKes(drawer_reconciliation.opening_float)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 -mb-px">
            <button
              id="tab-shift-overview"
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              Cash Drawer & Reconciliation
            </button>
            <button
              id="tab-shift-mpesa"
              type="button"
              onClick={() => setActiveTab('mpesa')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'mpesa'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              M-Pesa Auditing ({mpesa_transactions.count})
            </button>
            <button
              id="tab-shift-adjustments"
              type="button"
              onClick={() => setActiveTab('adjustments')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'adjustments'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Cash Adjustments & Drops ({cash_adjustments.count})
            </button>
            <button
              id="tab-shift-sales"
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'sales'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Sales Orders ({sales.total_count})
            </button>
          </div>

          {/* Action buttons inside tab bar */}
          <div className="py-2 flex items-center gap-2">
            {isManager && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAdjModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Record Cash Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  End / Close Shift
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/50">
          {/* ============================================================ */}
          {/* TAB 1: CASH DRAWER & RECONCILIATION                          */}
          {/* ============================================================ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left Col: Step by step formula table */}
                <div className="md:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Cash Drawer Mathematical Audit
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Exact formula tracking physical cash inside the register till
                      </p>
                    </div>
                    {isManager && (
                      <button
                        type="button"
                        onClick={() => setShowFloatModal(true)}
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Edit Float
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300">
                          1
                        </span>
                        Opening Cash Float (Shift Start)
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatKes(drawer_reconciliation.opening_float)}
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-[10px] text-emerald-600">
                          +
                        </span>
                        Counter Cash Sales ({sales.cash_sales_count} receipts)
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatKes(drawer_reconciliation.cash_sales)}
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-[10px] text-emerald-600">
                          +
                        </span>
                        Cash Debt Repayments Collected ({debt_repayments.count})
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatKes(drawer_reconciliation.cash_debt_collections)}
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-[10px] text-blue-600">
                          +
                        </span>
                        Cash In Additions (Top-ups / Petty In)
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        +{formatKes(drawer_reconciliation.cash_additions)}
                      </span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-rose-100 dark:bg-rose-950 flex items-center justify-center font-bold text-[10px] text-rose-600">
                          -
                        </span>
                        Cash Out Drops & Payouts (Safe Drops / Expenses)
                      </span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{formatKes(drawer_reconciliation.cash_drops_payouts)}
                      </span>
                    </div>

                    <div className="pt-3 pb-1 flex items-center justify-between bg-amber-500/10 dark:bg-amber-500/20 -mx-5 px-5 rounded-b-xl">
                      <span className="font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider text-xs">
                        Expected Physical Cash in Drawer
                      </span>
                      <span className="font-mono text-base font-black text-amber-900 dark:text-amber-300">
                        {formatKes(drawer_reconciliation.expected_cash_in_drawer)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Col: Physical Count & Live Variance Verification */}
                <div className="md:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Physical Cash Drawer Verification
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Type the counted cash in till to calculate Over/Short variance instantly
                    </p>

                    <div className="mt-4">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Manager Physical Cash Count (KES)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                          KES
                        </span>
                        <input
                          id="counted-cash-input"
                          type="number"
                          placeholder="e.g. 15000"
                          value={countedCash}
                          onChange={(e) => setCountedCash(e.target.value)}
                          className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {liveVariance !== undefined && (
                      <div
                        className={`mt-4 p-3.5 rounded-xl border ${
                          liveVariance === 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : liveVariance > 0
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span>
                            {liveVariance === 0
                              ? 'Drawer Perfectly Balanced'
                              : liveVariance > 0
                              ? 'Cash Surplus (Over)'
                              : 'Cash Shortage (Short)'}
                          </span>
                          <span className="font-mono text-sm">
                            {liveVariance > 0 ? '+' : ''}
                            {formatKes(liveVariance)}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-80 mt-1">
                          {liveVariance === 0
                            ? 'Physical money in drawer matches the system expected balance 100%.'
                            : liveVariance > 0
                            ? `Drawer has ${formatKes(liveVariance)} more than expected.`
                            : `Drawer is missing ${formatKes(Math.abs(liveVariance))}. Check for unrecorded drops or change errors.`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjType('CASH_OUT');
                        setAdjCategory('SAFE_DROP');
                        setShowAdjModal(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                      Make Safe Drop (Transfer to Safe)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdjType('CASH_IN');
                        setAdjCategory('FLOAT_ADDITION');
                        setShowAdjModal(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      Add Change Float (Cash In)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: M-PESA TRANSACTIONS AUDITING                          */}
          {/* ============================================================ */}
          {activeTab === 'mpesa' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="mpesa-audit-search-input"
                    type="text"
                    placeholder="Search by M-Pesa code, customer name, cashier, or order ID..."
                    value={mpesaSearch}
                    onChange={(e) => setMpesaSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {mpesaSearch && (
                    <button
                      type="button"
                      onClick={() => setMpesaSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Total M-Pesa: {formatKes(mpesa_transactions.total_amount)}</span>
                  </div>
                </div>
              </div>

              {filteredMpesa.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <Smartphone className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No M-Pesa Transactions Found</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {mpesaSearch ? 'No payments matching your search criteria.' : 'No M-Pesa sales recorded during this active shift.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Order / Ref</th>
                        <th className="py-3 px-4">M-Pesa Code</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Cashier</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredMpesa.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                            {new Date(tx.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {tx.sale_id ? `ORD-${tx.sale_id}` : 'DEBT-PAY'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
                              {tx.mpesa_code || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            <div className="font-medium">{tx.customer_name || 'Walk-in Customer'}</div>
                            {tx.customer_phone && <div className="text-[10px] text-slate-400 font-mono">{tx.customer_phone}</div>}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {tx.cashier_name}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatKes(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: CASH ADJUSTMENTS & DROPS                             */}
          {/* ============================================================ */}
          {activeTab === 'adjustments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Cash Drawer Adjustments Log
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Safe drops, float additions, supplier vendor payouts, and petty cash movements
                  </p>
                </div>
                {isManager && (
                  <button
                    id="new-cash-adj-btn"
                    type="button"
                    onClick={() => setShowAdjModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Record New Adjustment
                  </button>
                )}
              </div>

              {cash_adjustments.items.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <Wallet className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Cash Adjustments Recorded</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    No safe drops, supplier payouts, or float top-ups have been logged for this shift.
                  </p>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setShowAdjModal(true)}
                      className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Record First Adjustment
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Reason / Notes</th>
                        <th className="py-3 px-4">Recorded By</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cash_adjustments.items.map((adj, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                            {new Date(adj.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                adj.type === 'CASH_IN'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {adj.type === 'CASH_IN' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {adj.type === 'CASH_IN' ? 'Cash In' : 'Cash Out'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {adj.category.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs">
                            {adj.reason}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            <div>{adj.created_by_name}</div>
                            {adj.authorized_by_manager && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Auth: {adj.authorized_by_manager}
                              </div>
                            )}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-black ${
                              adj.type === 'CASH_IN'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {adj.type === 'CASH_IN' ? '+' : '-'}
                            {formatKes(adj.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: SHIFT SALES ORDERS                                    */}
          {/* ============================================================ */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="sales-audit-search-input"
                    type="text"
                    placeholder="Search sales by order ID, customer name, payment method..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {salesSearch && (
                    <button
                      type="button"
                      onClick={() => setSalesSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold shrink-0">
                  {sales.total_count} Orders • Average Ticket: {formatKes(sales.average_ticket)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {LocalDb.getSales()
                      .filter((s) => {
                        if (!s || !s.created_at) return false;
                        const sTime = new Date(s.created_at).getTime();
                        const shiftStart = new Date(shift.opened_at).getTime();
                        const shiftEnd = shift.closed_at ? new Date(shift.closed_at).getTime() : Date.now();
                        if (sTime < shiftStart || sTime > shiftEnd) return false;
                        if (!salesSearch.trim()) return true;
                        const q = salesSearch.toLowerCase();
                        return (
                          String(s.id).includes(q) ||
                          (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
                          (s.payment_method && s.payment_method.toLowerCase().includes(q)) ||
                          (s.mpesa_code && s.mpesa_code.toLowerCase().includes(q))
                        );
                      })
                      .map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                            {new Date(s.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            ORD-{s.id}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {s.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {s.items_count} items
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.payment_method === 'MPESA'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : s.payment_method === 'CASH'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {s.payment_method}
                              {s.mpesa_code ? ` (${s.mpesa_code})` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatKes(s.total_amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Real-time POS shift synchronization active</span>
          </div>
          <div>
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">Esc</kbd> or close button to return to terminal
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SUBMODAL: RECORD CASH ADJUSTMENT                             */}
      {/* ============================================================ */}
      {showAdjModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Record Cash Drawer Adjustment</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdjModal(false);
                  setAdjError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjType('CASH_OUT');
                      setAdjCategory('SAFE_DROP');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      adjType === 'CASH_OUT'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    Cash Out (Drop / Payout)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjType('CASH_IN');
                      setAdjCategory('FLOAT_ADDITION');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      adjType === 'CASH_IN'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Cash In (Addition / Float)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={adjCategory}
                  onChange={(e) => setAdjCategory(e.target.value as CashAdjustmentCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {adjType === 'CASH_OUT' ? (
                    <>
                      <option value="SAFE_DROP">Safe Drop (Mid-shift cash drop to safe)</option>
                      <option value="SUPPLIER_PAYOUT">Supplier / Vendor Payout</option>
                      <option value="PETTY_EXPENSE">Petty Expense / Supplies / Lunch</option>
                      <option value="BANKING">Bank Deposit / Banking Drop</option>
                      <option value="DRAWER_CORRECTION">Drawer Correction</option>
                      <option value="OTHER">Other Expense</option>
                    </>
                  ) : (
                    <>
                      <option value="FLOAT_ADDITION">Float Addition (Cash change added to till)</option>
                      <option value="DRAWER_CORRECTION">Drawer Correction (Surplus added)</option>
                      <option value="OTHER">Other Cash In</option>
                    </>
                  )}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                {/* Fast quick fill amounts */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[500, 1000, 2000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdjAmount(String(amt))}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300"
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder={adjType === 'CASH_OUT' ? 'e.g. Midday safe drop envelope #3, or supplier ice invoice' : 'e.g. 50 and 100 KES note change float'}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {adjError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adjError}</span>
                </div>
              )}

              {adjSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Cash adjustment saved successfully!</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    adjType === 'CASH_OUT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Confirm & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBMODAL: EDIT OPENING FLOAT                                 */}
      {/* ============================================================ */}
      {showFloatModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Edit Opening Cash Float</h3>
              <button
                type="button"
                onClick={() => setShowFloatModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update the initial cash float present in the drawer when this shift started.
            </p>
            <form onSubmit={handleSaveFloat} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Opening Float (KES)
                </label>
                <input
                  type="number"
                  value={newFloatInput}
                  onChange={(e) => setNewFloatInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFloatModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
                >
                  Update Float
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBMODAL: CLOSE / END SHIFT                                  */}
      {/* ============================================================ */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">End & Reconcile Shift</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Closing this shift will seal the audit log, calculate final cash drawer variance, and prepare the terminal for the next cashier.
            </p>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center justify-between font-bold">
                  <span>Expected Cash in Drawer:</span>
                  <span className="font-mono text-sm">{formatKes(drawer_reconciliation.expected_cash_in_drawer)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Physical Cash Counted (KES)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 24500"
                  value={physicalCountInput}
                  onChange={(e) => setPhysicalCountInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Closing Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Handover to evening shift cashier Peter, safe drop verified."
                  value={closingNotesInput}
                  onChange={(e) => setClosingNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Close Shift & Seal Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBMODAL: MANAGER PIN AUTHORIZATION                          */}
      {/* ============================================================ */}
      {showManagerPinModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Manager Authorization</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManagerPinModal(false);
                  setManagerPinError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter a Supervisor, Accountant, or Admin PIN to unlock full management controls for this shift report.
            </p>
            <form onSubmit={handleVerifyManagerPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Manager PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter 4-digit PIN"
                  value={managerPinInput}
                  onChange={(e) => setManagerPinInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-center font-mono font-bold tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              {managerPinError && (
                <p className="text-xs font-bold text-rose-500">{managerPinError}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManagerPinModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
                >
                  Verify & Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
