import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Loader2,
  Phone,
  Plus,
  QrCode,
  Smartphone,
  User,
  UserPlus,
  X,
  Ban,
  ShieldAlert,
  Layers,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { Customer, PaymentMethod, SalePaymentStatus, StoreConfig } from '../types';
import { LocalDb } from '../lib/storage';
import { CustomerFormModal } from './CustomerFormModal';

interface CheckoutModalProps {
  totalAmount: number;
  itemsCount: number;
  storeConfig: StoreConfig;
  cashierName: string;
  initialCustomer?: Customer | null;
  onClose: () => void;
  onComplete: (paymentData: {
    method: PaymentMethod;
    cashTendered?: number;
    changeGiven?: number;
    mpesaCode?: string;
    customerId?: number;
    customerName?: string;
    customerPhone?: string;
    amountPaid?: number;
    debtAmount?: number;
    paymentStatus?: SalePaymentStatus;
    split_cash_amount?: number;
    split_mpesa_amount?: number;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  totalAmount,
  itemsCount,
  storeConfig,
  cashierName,
  initialCustomer = null,
  onClose,
  onComplete,
}) => {
  // Customer selection state
  const [customers, setCustomers] = useState<Customer[]>(() => LocalDb.getCustomers());
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 'walkin'>(
    initialCustomer ? initialCustomer.id : 'walkin'
  );
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // Selected customer details and debt summary
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'walkin') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const customerSummary = useMemo(() => {
    if (!selectedCustomer) return null;
    return LocalDb.getCustomerSummary(selectedCustomer.id);
  }, [selectedCustomer]);

  // Payment method: MPESA, CASH, SPLIT, or DEBT (Full Credit)
  const [method, setMethod] = useState<PaymentMethod>('MPESA');

  // Payment Term: 'full' | 'partial' | 'credit'
  const [paymentTerm, setPaymentTerm] = useState<'full' | 'partial' | 'credit'>('full');

  // Partial or specific amount paid now
  const [amountPaidNow, setAmountPaidNow] = useState<number>(totalAmount);

  // Cash tendered for change calculation
  const [cashTendered, setCashTendered] = useState<number>(totalAmount);

  // Split payment state (Cash + M-Pesa)
  const [splitCashAmount, setSplitCashAmount] = useState<number>(() => Math.floor(totalAmount / 2));
  const [splitMpesaAmount, setSplitMpesaAmount] = useState<number>(() => totalAmount - Math.floor(totalAmount / 2));
  const [splitCashTendered, setSplitCashTendered] = useState<number>(() => Math.floor(totalAmount / 2));

  // Phone number for M-Pesa STK push
  const [phoneNumber, setPhoneNumber] = useState<string>(
    selectedCustomer ? selectedCustomer.phone : '0712345678'
  );
  const [mpesaViewMode, setMpesaViewMode] = useState<'stk' | 'qr'>('stk');
  const [mpesaStatus, setMpesaStatus] = useState<'idle' | 'prompting' | 'confirmed' | 'failed'>('idle');
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [stkCountdown, setStkCountdown] = useState<number>(20);
  const [stkErrorMessage, setStkErrorMessage] = useState<string>('');

  // Handle customer change
  const handleSelectCustomer = (val: string) => {
    if (val === 'walkin') {
      setSelectedCustomerId('walkin');
      setPaymentTerm('full');
      setAmountPaidNow(totalAmount);
    } else {
      const numId = Number(val);
      setSelectedCustomerId(numId);
      const cust = customers.find((c) => c.id === numId);
      if (cust) {
        setPhoneNumber(cust.phone);
      }
    }
  };

  // Determine actual amount paid now and debt created on this sale
  const actualPaidNow = useMemo(() => {
    if (method === 'DEBT' || paymentTerm === 'credit') {
      return 0;
    }
    if (method === 'SPLIT') {
      return (Number(splitCashAmount) || 0) + (Number(splitMpesaAmount) || 0);
    }
    if (paymentTerm === 'partial') {
      return Math.max(0, Math.min(totalAmount, Number(amountPaidNow) || 0));
    }
    return totalAmount;
  }, [method, paymentTerm, amountPaidNow, splitCashAmount, splitMpesaAmount, totalAmount]);

  const saleDebtAmount = useMemo(() => {
    return Math.max(0, totalAmount - actualPaidNow);
  }, [totalAmount, actualPaidNow]);

  const previousDebt = customerSummary ? customerSummary.outstandingDebt : 0;
  const projectedTotalDebt = previousDebt + saleDebtAmount;

  // Change calculation for CASH
  const change = Math.max(0, cashTendered - actualPaidNow);
  const isCashInsufficient = method === 'CASH' && cashTendered < actualPaidNow;

  // Split cash change
  const splitCashChange = Math.max(0, splitCashTendered - splitCashAmount);
  const isSplitCashInsufficient = splitCashTendered < splitCashAmount;
  const splitRemainingBalance = Math.max(0, totalAmount - (splitCashAmount + splitMpesaAmount));

  // Preset cash shortcuts in Kenyan Shillings
  const denominations = useMemo(() => {
    const target = actualPaidNow > 0 ? actualPaidNow : totalAmount;
    return [
      target,
      Math.ceil(target / 500) * 500,
      1000,
      2000,
      3000,
      5000,
    ].filter((v, idx, arr) => v >= target && arr.indexOf(v) === idx).slice(0, 5);
  }, [actualPaidNow, totalAmount]);

  // STK Push countdown timer
  React.useEffect(() => {
    let timer: any = null;
    if (mpesaStatus === 'prompting') {
      if (stkCountdown > 0) {
        timer = setTimeout(() => {
          setStkCountdown((c) => c - 1);
        }, 1000);
      } else {
        // Complete successfully upon simulated confirmation
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const randomCode =
          'SH' +
          Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('') +
          Math.floor(10 + Math.random() * 89);
        setMpesaCode(randomCode);
        setMpesaStatus('confirmed');
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mpesaStatus, stkCountdown]);

  const triggerStkPush = (targetAmt?: number) => {
    const amt = targetAmt !== undefined ? targetAmt : (method === 'SPLIT' ? splitMpesaAmount : actualPaidNow);
    if (!phoneNumber || phoneNumber.replace(/[^0-9]/g, '').length < 9) {
      alert('Please enter a valid Kenyan Safaricom phone number (e.g. 0712345678).');
      return;
    }
    setStkErrorMessage('');
    setStkCountdown(4); // 4-second fast, realistic interactive simulation
    setMpesaStatus('prompting');
  };

  const simulateStkFailure = () => {
    setMpesaStatus('failed');
    setStkErrorMessage('STK Push request timed out or was cancelled by the customer on handset.');
  };

  const handleFinalize = () => {
    // If credit or partial debt is chosen, customer account is required
    if (saleDebtAmount > 0 && !selectedCustomer) {
      alert('Please select or register a Customer to record this sale on debt / credit.');
      return;
    }

    // Blacklisted customers CANNOT be given product on credit
    if (saleDebtAmount > 0 && selectedCustomer?.blacklisted) {
      alert(
        `CREDIT SALE BLOCKED: Customer "${selectedCustomer.name}" is BLACKLISTED.\n\n` +
        `Reason: ${selectedCustomer.blacklist_reason || 'Flagged by administration'}\n\n` +
        `Blacklisted customers cannot be given products on credit or partial payment. Full payment via M-Pesa or Cash is required.`
      );
      return;
    }

    if (method === 'CASH' && isCashInsufficient) {
      return;
    }

    if (method === 'SPLIT') {
      if (splitRemainingBalance > 0 && !selectedCustomer) {
        alert('Split tenders do not cover the full bill. Please select a customer to record the remainder on debt.');
        return;
      }
      if (isSplitCashInsufficient) {
        alert('Cash tendered is less than the cash portion amount.');
        return;
      }
    }

    let finalPaymentStatus: SalePaymentStatus = 'PAID';
    if (saleDebtAmount >= totalAmount) {
      finalPaymentStatus = 'DEBT';
    } else if (saleDebtAmount > 0) {
      finalPaymentStatus = 'PARTIAL';
    }

    const finalMpesaCode =
      method === 'MPESA' || method === 'SPLIT'
        ? mpesaCode || 'MP-' + Math.random().toString(36).substring(2, 9).toUpperCase()
        : undefined;

    onComplete({
      method: method === 'DEBT' ? 'DEBT' : method,
      cashTendered: method === 'CASH' ? cashTendered : method === 'SPLIT' ? splitCashTendered : undefined,
      changeGiven: method === 'CASH' ? change : method === 'SPLIT' ? splitCashChange : undefined,
      mpesaCode: finalMpesaCode,
      customerId: selectedCustomer ? selectedCustomer.id : undefined,
      customerName: selectedCustomer ? selectedCustomer.name : undefined,
      customerPhone: selectedCustomer ? selectedCustomer.phone : undefined,
      amountPaid: actualPaidNow,
      debtAmount: saleDebtAmount,
      paymentStatus: finalPaymentStatus,
      split_cash_amount: method === 'SPLIT' ? splitCashAmount : undefined,
      split_mpesa_amount: method === 'SPLIT' ? splitMpesaAmount : undefined,
    });
  };

  return (
    <div
      id="checkout-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="checkout-modal-container"
        className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-indigo-950 flex items-center justify-between bg-[#1E1B4B] text-white">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
              Checkout & Payment
            </span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              KES {totalAmount.toLocaleString()}
              <span className="text-xs font-normal text-slate-300">({itemsCount} items)</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Selector Section */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer Account (Debt & Credit Tracking)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> + New Customer
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCustomerId}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
            >
              <option value="walkin">👤 Walk-in Customer (Guest - No Account)</option>
              <optgroup label="Registered Customers">
                {customers.map((c) => {
                  const s = LocalDb.getCustomerSummary(c.id);
                  const hasDebt = s && s.outstandingDebt > 0;
                  return (
                    <option key={`cust-opt-${c.id}`} value={c.id}>
                      {c.name} ({c.phone}) {hasDebt ? `[⚠️ Debt: KES ${s.outstandingDebt.toLocaleString()}]` : '[✓ Cleared]'}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          {/* If Customer Selected: Show Lifetime Spent & Outstanding Debt */}
          {selectedCustomer && customerSummary && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    selectedCustomer.blacklisted
                      ? 'bg-rose-600 text-white'
                      : customerSummary.hasDebt
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedCustomer.blacklisted ? <Ban className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{selectedCustomer.name}</span>
                    {selectedCustomer.blacklisted && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-rose-600 text-white font-black rounded-md">
                        BLACKLISTED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Lifetime Spend: <strong>KES {customerSummary.totalSpent.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Debt Status with user requirement: "You can still sell to a customer with outstanding debts" */}
              <div>
                {customerSummary.hasDebt ? (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-rose-600 block uppercase">
                      ⚠️ Outstanding Debt
                    </span>
                    <span className="text-xs font-black font-mono text-rose-700">
                      KES {customerSummary.outstandingDebt.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Fully Cleared
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Blacklisted Customer Warning Banner */}
          {selectedCustomer?.blacklisted && (
            <div className="mt-2 text-xs text-white bg-rose-600 p-2.5 rounded-xl border border-rose-700 flex items-center gap-2 shadow-xs animate-shake">
              <ShieldAlert className="w-5 h-5 shrink-0 text-white" />
              <div className="leading-tight">
                <div className="font-black uppercase tracking-wider text-[11px]">
                  Blacklisted Customer &mdash; Credit Prohibited
                </div>
                <div className="text-[11px] text-rose-100 font-medium mt-0.5">
                  This client cannot be given product on credit or partial debt. Full payment via Cash or M-Pesa is required.
                  {selectedCustomer.blacklist_reason && ` (${selectedCustomer.blacklist_reason})`}
                </div>
              </div>
            </div>
          )}

          {/* User directive reassurance banner */}
          {selectedCustomer && !selectedCustomer.blacklisted && customerSummary && customerSummary.hasDebt && (
            <div className="mt-1.5 text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>
                Customer has active debt of <strong>KES {customerSummary.outstandingDebt.toLocaleString()}</strong>.
                You can still sell to this client.
              </span>
            </div>
          )}
        </div>

        {/* Payment Method Selector Tabs - 4 Options */}
        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setMethod('MPESA');
              if (paymentTerm === 'credit') setPaymentTerm('full');
            }}
            className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
              method === 'MPESA'
                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl ${
                method === 'MPESA' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Lipa M-Pesa</span>
            <span className="text-[10px] text-blue-600 font-medium">STK &amp; QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('CASH');
              if (paymentTerm === 'credit') setPaymentTerm('full');
            }}
            className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
              method === 'CASH'
                ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl ${
                method === 'CASH' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Banknote className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Cash Payment</span>
            <span className="text-[10px] text-amber-700 font-medium">Change Calc</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('SPLIT');
              if (paymentTerm === 'credit') setPaymentTerm('full');
            }}
            className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
              method === 'SPLIT'
                ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl ${
                method === 'SPLIT' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Split Tender</span>
            <span className="text-[10px] text-purple-700 font-medium">Cash + M-Pesa</span>
          </button>

          <button
            type="button"
            disabled={Boolean(selectedCustomer?.blacklisted)}
            onClick={() => {
              if (selectedCustomer?.blacklisted) return;
              setMethod('DEBT');
              setPaymentTerm('credit');
            }}
            className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
              selectedCustomer?.blacklisted
                ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                : method === 'DEBT'
                ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs cursor-pointer'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer'
            }`}
            title={selectedCustomer?.blacklisted ? 'Blacklisted: Credit purchases strictly prohibited' : 'Credit Sale / Pay Later'}
          >
            <div
              className={`p-1.5 rounded-xl ${
                selectedCustomer?.blacklisted
                  ? 'bg-slate-200 text-slate-400'
                  : method === 'DEBT'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">
              {selectedCustomer?.blacklisted ? 'Credit Blocked' : 'Pay Later / Debt'}
            </span>
            <span className="text-[10px] text-rose-600 font-medium">
              {selectedCustomer?.blacklisted ? 'Blacklisted' : 'Customer Tab'}
            </span>
          </button>
        </div>

        {/* Payment Term Selection (Full vs Partial vs Full Credit) */}
        {method !== 'DEBT' && method !== 'SPLIT' && selectedCustomer && (
          <div className="px-4 pt-3 pb-1 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold">Payment Terms:</span>
            <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setPaymentTerm('full');
                  setAmountPaidNow(totalAmount);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paymentTerm === 'full'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pay Full
              </button>
              <button
                type="button"
                disabled={Boolean(selectedCustomer?.blacklisted)}
                onClick={() => {
                  if (selectedCustomer?.blacklisted) return;
                  setPaymentTerm('partial');
                  setAmountPaidNow(Math.round(totalAmount / 2));
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedCustomer?.blacklisted
                    ? 'text-slate-400 opacity-40 cursor-not-allowed'
                    : paymentTerm === 'partial'
                    ? 'bg-amber-500 text-white shadow-xs cursor-pointer'
                    : 'text-slate-600 hover:text-slate-900 cursor-pointer'
                }`}
                title={selectedCustomer?.blacklisted ? 'Blacklisted: Partial debt not allowed' : 'Partial Payment'}
              >
                Partial Payment
              </button>
              <button
                type="button"
                disabled={Boolean(selectedCustomer?.blacklisted)}
                onClick={() => {
                  if (selectedCustomer?.blacklisted) return;
                  setPaymentTerm('credit');
                  setMethod('DEBT');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  selectedCustomer?.blacklisted
                    ? 'text-slate-400 opacity-40 cursor-not-allowed'
                    : 'text-rose-700 hover:bg-rose-50 cursor-pointer'
                }`}
                title={selectedCustomer?.blacklisted ? 'Blacklisted: Credit not allowed' : 'Take all on Credit'}
              >
                All on Credit
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-slate-800">
          {/* If Partial Payment mode is enabled */}
          {paymentTerm === 'partial' && method !== 'DEBT' && method !== 'SPLIT' && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900">Enter Amount Paid Now:</span>
                <span className="font-mono text-xs text-amber-700 font-bold">
                  Total Bill: KES {totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">
                  KES
                </span>
                <input
                  type="number"
                  min="1"
                  max={totalAmount - 1}
                  value={amountPaidNow || ''}
                  onChange={(e) => setAmountPaidNow(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-white border border-amber-300 rounded-xl py-2 pl-12 pr-4 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-between text-xs text-amber-900 font-semibold pt-1 border-t border-amber-200">
                <span>Remaining to add to Debt:</span>
                <span className="font-mono font-bold text-rose-700">
                  KES {saleDebtAmount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* SPLIT TENDER VIEW */}
          {method === 'SPLIT' ? (
            <div className="space-y-4">
              {/* Balance Summary Header */}
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">
                    Split Bill Allocation
                  </span>
                  <div className="text-lg font-black text-purple-950 font-mono">
                    Total: KES {totalAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  {splitRemainingBalance === 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      Unallocated: KES {splitRemainingBalance.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Tender 1: Cash Tender */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <Banknote className="w-4 h-4 text-amber-600" />
                    <span>Tender 1: Cash Payment</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitCashAmount(totalAmount - splitMpesaAmount);
                      setSplitCashTendered(totalAmount - splitMpesaAmount);
                    }}
                    className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                  >
                    Auto Fill Remaining
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Cash Amount (KES)
                    </label>
                    <input
                      type="number"
                      value={splitCashAmount || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setSplitCashAmount(val);
                        setSplitCashTendered(val);
                      }}
                      className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Cash Tendered
                    </label>
                    <input
                      type="number"
                      value={splitCashTendered || ''}
                      onChange={(e) => setSplitCashTendered(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold text-amber-900 pt-1 border-t border-amber-200/80">
                  <span>Change to Return on Cash:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    KES {splitCashChange.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Tender 2: M-Pesa Tender */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Tender 2: M-Pesa Portion</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSplitMpesaAmount(Math.max(0, totalAmount - splitCashAmount))}
                    className="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                  >
                    Match Remainder
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      M-Pesa Amount (KES)
                    </label>
                    <input
                      type="number"
                      value={splitMpesaAmount || ''}
                      onChange={(e) => setSplitMpesaAmount(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-blue-300 rounded-xl py-2 px-3 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Customer Phone
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full bg-white border border-blue-300 rounded-xl py-2 px-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Split M-Pesa STK Push Trigger & Status */}
                <div className="pt-1">
                  {mpesaStatus === 'idle' && (
                    <button
                      type="button"
                      disabled={splitMpesaAmount <= 0}
                      onClick={() => triggerStkPush(splitMpesaAmount)}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Send STK Push for KES {splitMpesaAmount.toLocaleString()}</span>
                    </button>
                  )}

                  {mpesaStatus === 'prompting' && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        <span>Awaiting PIN on phone ({stkCountdown}s)...</span>
                      </div>
                      <button
                        type="button"
                        onClick={simulateStkFailure}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                      >
                        Simulate Cancel
                      </button>
                    </div>
                  )}

                  {mpesaStatus === 'confirmed' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>M-Pesa Verified: {mpesaCode}</span>
                      </div>
                      <span className="text-[10px] font-black font-mono text-emerald-700">PAID</span>
                    </div>
                  )}

                  {mpesaStatus === 'failed' && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 space-y-1">
                      <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>STK Push Failed / Cancelled</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => triggerStkPush(splitMpesaAmount)}
                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                        >
                          Retry Push
                        </button>
                      </div>
                      {stkErrorMessage && (
                        <p className="text-[10px] text-rose-600">{stkErrorMessage}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : method === 'DEBT' ? (
            /* DEBT / FULL CREDIT VIEW */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <CreditCard className="w-5 h-5 text-rose-600" />
                  <span>Credit Sale (Pay Later)</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed">
                  The entire bill of <strong>KES {totalAmount.toLocaleString()}</strong> will be recorded
                  against the customer account without immediate cash or M-Pesa collection.
                </p>

                {!selectedCustomer && (
                  <div className="p-2.5 rounded-xl bg-white border border-rose-300 text-xs text-rose-800 font-bold flex items-center justify-between">
                    <span>⚠️ Please select a customer account above</span>
                    <button
                      type="button"
                      onClick={() => setIsAddCustomerOpen(true)}
                      className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px]"
                    >
                      + Register
                    </button>
                  </div>
                )}
              </div>

              {/* Debt Projection Breakdown */}
              {selectedCustomer && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Customer Account:</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Previous Outstanding Debt:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      KES {previousDebt.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>+ This Sale (Unpaid):</span>
                    <span className="font-mono">KES {totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200 text-slate-900">
                    <span>New Total Customer Debt:</span>
                    <span className="font-mono text-rose-600">
                      KES {projectedTotalDebt.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : method === 'MPESA' ? (
            /* MPESA VIEW WITH STK PUSH & DYNAMIC QR CODE */
            <div className="space-y-4">
              {/* STK vs QR Mode Toggle */}
              <div className="flex items-center justify-between bg-blue-50/80 p-1.5 rounded-xl border border-blue-200 text-xs">
                <span className="text-[11px] font-bold text-blue-900 pl-1">Payment Method:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setMpesaViewMode('stk')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mpesaViewMode === 'stk'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    STK Push (Phone)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMpesaViewMode('qr')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mpesaViewMode === 'qr'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Dynamic QR Code
                  </button>
                </div>
              </div>

              {mpesaViewMode === 'qr' ? (
                /* Dynamic QR Code Display */
                <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-inner">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Scan with M-Pesa App or Camera
                  </span>

                  {/* High Quality SVG QR Code Simulation */}
                  <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-md">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-36 h-36"
                      shapeRendering="crispEdges"
                    >
                      {/* Corner Position Detection Squares */}
                      <rect x="0" y="0" width="30" height="30" fill="#0f172a" />
                      <rect x="4" y="4" width="22" height="22" fill="#ffffff" />
                      <rect x="8" y="8" width="14" height="14" fill="#0f172a" />

                      <rect x="70" y="0" width="30" height="30" fill="#0f172a" />
                      <rect x="74" y="4" width="22" height="22" fill="#ffffff" />
                      <rect x="78" y="8" width="14" height="14" fill="#0f172a" />

                      <rect x="0" y="70" width="30" height="30" fill="#0f172a" />
                      <rect x="4" y="74" width="22" height="22" fill="#ffffff" />
                      <rect x="8" y="78" width="14" height="14" fill="#0f172a" />

                      {/* Dynamic Mock Data Grid Pixels */}
                      <rect x="36" y="8" width="6" height="6" fill="#0f172a" />
                      <rect x="46" y="14" width="6" height="6" fill="#0f172a" />
                      <rect x="56" y="8" width="6" height="6" fill="#0f172a" />
                      <rect x="36" y="24" width="6" height="6" fill="#0f172a" />
                      <rect x="48" y="24" width="6" height="6" fill="#0f172a" />

                      <rect x="8" y="36" width="6" height="6" fill="#0f172a" />
                      <rect x="18" y="46" width="6" height="6" fill="#0f172a" />
                      <rect x="8" y="56" width="6" height="6" fill="#0f172a" />

                      <rect x="36" y="36" width="12" height="12" fill="#2563eb" />
                      <rect x="52" y="40" width="8" height="8" fill="#0f172a" />
                      <rect x="44" y="56" width="10" height="6" fill="#0f172a" />
                      <rect x="62" y="52" width="6" height="12" fill="#0f172a" />

                      <rect x="76" y="36" width="8" height="8" fill="#0f172a" />
                      <rect x="88" y="48" width="6" height="10" fill="#0f172a" />
                      <rect x="74" y="62" width="10" height="6" fill="#0f172a" />

                      <rect x="36" y="76" width="8" height="8" fill="#0f172a" />
                      <rect x="48" y="72" width="6" height="10" fill="#0f172a" />
                      <rect x="60" y="78" width="12" height="6" fill="#0f172a" />
                      <rect x="42" y="88" width="8" height="8" fill="#0f172a" />
                      <rect x="56" y="88" width="6" height="6" fill="#0f172a" />
                      <rect x="78" y="84" width="14" height="10" fill="#0f172a" />
                    </svg>
                  </div>

                  <div>
                    <div className="text-sm font-black text-slate-900 font-mono">
                      KES {actualPaidNow.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-blue-700">
                      Till: {storeConfig.till_number} &bull; {storeConfig.store_name}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Customer simply opens camera or M-Pesa App to scan and pay.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
                      const randomCode =
                        'SH' +
                        Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('') +
                        Math.floor(10 + Math.random() * 89);
                      setMpesaCode(randomCode);
                      setMpesaStatus('confirmed');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Customer Has Scanned &amp; Paid</span>
                  </button>
                </div>
              ) : (
                /* STK Push Direct View */
                <>
                  {/* Till Info Box */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                        Safaricom Buy Goods Till
                      </span>
                      <div className="text-2xl font-black text-slate-900 tracking-widest font-mono">
                        {storeConfig.till_number}
                      </div>
                      <span className="text-[11px] text-slate-600">{storeConfig.store_name}</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-600">
                      <Smartphone className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Customer Mobile prompt */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Customer Phone (for STK Push prompt)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="07XXXXXXXX or 01XXXXXXXX"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {/* STK Push Trigger and Status Indicators */}
                  <div className="pt-1">
                    {mpesaStatus === 'idle' && (
                      <button
                        type="button"
                        onClick={() => triggerStkPush(actualPaidNow)}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>
                          Prompt KES {actualPaidNow.toLocaleString()} via M-Pesa STK Push
                        </span>
                      </button>
                    )}

                    {mpesaStatus === 'prompting' && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-amber-900 font-bold text-xs">
                            <Loader2 className="w-5 h-5 animate-spin text-amber-600 shrink-0" />
                            <span>
                              Awaiting Customer PIN on {phoneNumber}...
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-200 text-amber-900">
                            00:0{stkCountdown}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Safaricom SIM popup dispatched to customer handset. Prompting for secret M-Pesa PIN.
                        </p>
                        <div className="flex justify-end gap-2 pt-1 border-t border-amber-200/80">
                          <button
                            type="button"
                            onClick={simulateStkFailure}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                          >
                            Simulate Customer Cancel / Timeout
                          </button>
                        </div>
                      </div>
                    )}

                    {mpesaStatus === 'confirmed' && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Payment Confirmed via Safaricom</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono text-[10px] font-black uppercase">
                            Verified
                          </span>
                        </div>
                        <div className="text-sm font-black font-mono text-emerald-950">
                          Ref: {mpesaCode} &bull; KES {actualPaidNow.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {mpesaStatus === 'failed' && (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-2 animate-shake">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>STK Push Failed or Expired</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => triggerStkPush(actualPaidNow)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry Push</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-rose-700 leading-relaxed">
                          {stkErrorMessage || 'Transaction was cancelled or the user did not enter their PIN in time.'}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* CASH VIEW */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cash Tendered by Customer (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    KES
                  </span>
                  <input
                    type="number"
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 text-lg font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {denominations.map((denom, idx) => (
                    <button
                      key={`bill-preset-${denom}-${idx}`}
                      type="button"
                      onClick={() => setCashTendered(denom)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                        cashTendered === denom
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {denom === actualPaidNow ? 'Exact' : `KES ${denom.toLocaleString()}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Calculation Display */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isCashInsufficient
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <span className="text-xs text-slate-500 block">
                    {isCashInsufficient ? 'Amount Still Needed:' : 'Change to Return:'}
                  </span>
                  <div
                    className={`text-2xl font-black font-mono ${
                      isCashInsufficient ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    KES{' '}
                    {isCashInsufficient
                      ? (actualPaidNow - cashTendered).toLocaleString()
                      : change.toLocaleString()}
                  </div>
                </div>
                {!isCashInsufficient && (
                  <div className="text-right text-[11px] text-slate-500">
                    <div>Tendered: KES {cashTendered.toLocaleString()}</div>
                    <div>Payable: KES {actualPaidNow.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debt Summary Projection if sale involves debt */}
          {saleDebtAmount > 0 && selectedCustomer && (
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-rose-800">
                <span>Credit Amount on this sale:</span>
                <span className="font-mono">+ KES {saleDebtAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Projected New Balance for {selectedCustomer.name}:</span>
                <span className="font-mono font-black text-rose-700">
                  KES {projectedTotalDebt.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={
              (method === 'CASH' && isCashInsufficient) ||
              (method === 'SPLIT' && (isSplitCashInsufficient || (splitRemainingBalance > 0 && !selectedCustomer))) ||
              (saleDebtAmount > 0 && !selectedCustomer)
            }
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
              (method === 'CASH' && isCashInsufficient) ||
              (method === 'SPLIT' && (isSplitCashInsufficient || (splitRemainingBalance > 0 && !selectedCustomer))) ||
              (saleDebtAmount > 0 && !selectedCustomer)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                : method === 'DEBT'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : method === 'MPESA'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : method === 'SPLIT'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-white'
            }`}
          >
            <span>
              {method === 'DEBT'
                ? 'Record Credit Sale & Issue Receipt'
                : method === 'SPLIT'
                ? 'Complete Split Payment & Issue Receipt'
                : saleDebtAmount > 0
                ? 'Complete Partial Sale & Issue Receipt'
                : 'Complete & Issue Receipt'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Add Customer Modal inside Checkout */}
      {isAddCustomerOpen && (
        <CustomerFormModal
          onClose={() => setIsAddCustomerOpen(false)}
          onCustomerSaved={(savedCustomer) => {
            setIsAddCustomerOpen(false);
            setCustomers(LocalDb.getCustomers());
            setSelectedCustomerId(savedCustomer.id);
            setPhoneNumber(savedCustomer.phone);
          }}
        />
      )}
    </div>
  );
};
