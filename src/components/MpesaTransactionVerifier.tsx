import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Search,
  ArrowRight,
  RefreshCw,
  X,
  FileText,
  DollarSign,
  Clock,
  Sparkles,
  ClipboardPaste,
  HelpCircle,
  Phone,
  User,
} from 'lucide-react';
import { LocalDb } from '../lib/storage';

export type MpesaMatchStatus = 'EXACT_MATCH' | 'UNDERPAYMENT' | 'OVERPAYMENT' | 'INVALID_CODE';

export interface MpesaVerificationResult {
  code: string;
  receivedAmount: number;
  expectedAmount: number;
  difference: number;
  status: MpesaMatchStatus;
  senderName?: string;
  senderPhone?: string;
  timestamp?: string;
  isDuplicate: boolean;
  duplicateDetails?: any;
}

export interface MpesaTransactionVerifierProps {
  isOpen: boolean;
  onClose: () => void;
  expectedAmount?: number;
  orderId?: string | number;
  customerName?: string;
  customerPhone?: string;
  onVerifiedAndApply?: (result: MpesaVerificationResult) => void;
}

export const MpesaTransactionVerifier: React.FC<MpesaTransactionVerifierProps> = ({
  isOpen,
  onClose,
  expectedAmount: initialExpectedAmount = 0,
  orderId,
  customerName: initialCustomerName,
  customerPhone: initialCustomerPhone,
  onVerifiedAndApply,
}) => {
  // Input fields
  const [transactionCode, setTransactionCode] = useState('');
  const [expectedTotal, setExpectedTotal] = useState<number>(initialExpectedAmount);
  const [receivedAmount, setReceivedAmount] = useState<number>(initialExpectedAmount);
  const [rawSmsInput, setRawSmsInput] = useState('');
  const [showSmsParser, setShowSmsParser] = useState(false);
  const [senderName, setSenderName] = useState(initialCustomerName || '');
  const [senderPhone, setSenderPhone] = useState(initialCustomerPhone || '');
  const [timestamp, setTimestamp] = useState(() => new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // UI status
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setExpectedTotal(initialExpectedAmount);
      setReceivedAmount(initialExpectedAmount);
      if (initialCustomerName) setSenderName(initialCustomerName);
      if (initialCustomerPhone) setSenderPhone(initialCustomerPhone);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialExpectedAmount, initialCustomerName, initialCustomerPhone]);

  // Clean and normalize transaction code
  const cleanCode = useMemo(() => {
    return (transactionCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }, [transactionCode]);

  // Safaricom M-Pesa standard format: 10 alphanumeric characters (e.g. SHB7XX9912, QJ18KL8899)
  const isValidFormat = useMemo(() => {
    return /^[A-Z0-9]{10}$/.test(cleanCode);
  }, [cleanCode]);

  // Check duplicate in local database
  const duplicateCheck = useMemo(() => {
    if (!cleanCode || cleanCode.length < 5) return null;
    return LocalDb.findTransactionByMpesaCode(cleanCode);
  }, [cleanCode]);

  const isDuplicate = !!duplicateCheck?.found;

  // Difference calculation
  const difference = useMemo(() => {
    const rec = Number(receivedAmount) || 0;
    const exp = Number(expectedTotal) || 0;
    return rec - exp;
  }, [receivedAmount, expectedTotal]);

  // Determine Match Status
  const matchStatus: MpesaMatchStatus = useMemo(() => {
    if (!cleanCode) return 'INVALID_CODE';
    const rec = Number(receivedAmount) || 0;
    const exp = Number(expectedTotal) || 0;

    if (Math.abs(difference) < 0.01) {
      return 'EXACT_MATCH';
    }
    if (rec < exp) {
      return 'UNDERPAYMENT';
    }
    return 'OVERPAYMENT';
  }, [cleanCode, receivedAmount, expectedTotal, difference]);

  // Parse Raw Safaricom SMS message
  const handleParseSms = (smsText: string) => {
    const text = (smsText || '').trim();
    if (!text) return;

    let parsedCode = '';
    let parsedAmount = 0;
    let parsedSender = '';
    let parsedPhone = '';
    let parsedTime = '';

    // 1. Extract 10-char M-Pesa Code (usually first word or after 'Ref:')
    const codeMatch = text.match(/\b([A-Z0-9]{10})\b/i);
    if (codeMatch) {
      parsedCode = codeMatch[1].toUpperCase();
    }

    // 2. Extract Amount: e.g. 'Ksh2,450.00' or 'Ksh 2,450' or 'KSh2450'
    const amountMatch = text.match(/(?:Ksh|KSh|KES)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (amountMatch) {
      const cleanNum = amountMatch[1].replace(/,/g, '');
      parsedAmount = parseFloat(cleanNum) || 0;
    }

    // 3. Extract Sender Name & Phone
    // e.g. "received Ksh1,500.00 from JOHN DOE 0712345678" or "sent to ... from 254712345678"
    const senderMatch = text.match(/from\s+([A-Z\s]+)\s+(254\d{9}|07\d{8}|01\d{8})/i);
    if (senderMatch) {
      parsedSender = senderMatch[1].trim();
      parsedPhone = senderMatch[2].trim();
    } else {
      const phoneOnly = text.match(/\b(254\d{9}|07\d{8}|01\d{8})\b/);
      if (phoneOnly) parsedPhone = phoneOnly[1];
    }

    // 4. Extract Date / Time
    const dateMatch = text.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (dateMatch) {
      parsedTime = `${dateMatch[1]} ${dateMatch[2]}`;
    }

    // Apply parsed values
    if (parsedCode) setTransactionCode(parsedCode);
    if (parsedAmount > 0) setReceivedAmount(parsedAmount);
    if (parsedSender) setSenderName(parsedSender);
    if (parsedPhone) setSenderPhone(parsedPhone);
    if (parsedTime) setTimestamp(parsedTime);

    setShowSmsParser(false);
    setRawSmsInput('');
    setFeedbackToast('✅ Successfully parsed M-Pesa SMS message!');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Quick Preset Test Cases for cashiers and merchants
  const handleApplyPreset = (type: 'exact' | 'under' | 'over' | 'duplicate') => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomSuffix = Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('') + Math.floor(10 + Math.random() * 89);

    if (type === 'exact') {
      setTransactionCode('SH' + randomSuffix);
      setReceivedAmount(expectedTotal || 1500);
    } else if (type === 'under') {
      setTransactionCode('QJ' + randomSuffix);
      const underAmt = Math.max(100, Math.floor((expectedTotal || 1500) * 0.7));
      setReceivedAmount(underAmt);
    } else if (type === 'over') {
      setTransactionCode('RB' + randomSuffix);
      setReceivedAmount((expectedTotal || 1500) + 500);
    } else if (type === 'duplicate') {
      const pastSales = LocalDb.getSales().filter((s) => s.mpesa_code);
      if (pastSales.length > 0) {
        setTransactionCode(pastSales[0].mpesa_code || 'SHB7XX9912');
        setReceivedAmount(pastSales[0].total_amount);
      } else {
        setTransactionCode('SHB7XX9912');
        setReceivedAmount(expectedTotal || 2450);
      }
    }
  };

  // Copy Verification Receipt
  const handleCopyReceipt = () => {
    const summary = `==============================
BAZU POS - M-PESA TRANSACTION VERIFICATION
==============================
M-Pesa Code: ${cleanCode || 'N/A'}
Status: ${matchStatus.replace('_', ' ')}
Expected Order Total: KES ${expectedTotal.toLocaleString()}
Received Payment: KES ${receivedAmount.toLocaleString()}
Difference: ${difference >= 0 ? '+' : ''}KES ${difference.toLocaleString()}
${isDuplicate ? '⚠️ DUPLICATE CODE: Previously logged in database!' : '🛡️ Verified: Fresh & Unique'}
Customer/Sender: ${senderName || 'Walk-in'} (${senderPhone || 'N/A'})
Verification Time: ${new Date().toLocaleString()}
==============================`;

    navigator.clipboard.writeText(summary);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  // Apply to order
  const handleApplyToOrder = () => {
    if (!cleanCode) return;
    if (onVerifiedAndApply) {
      onVerifiedAndApply({
        code: cleanCode,
        receivedAmount,
        expectedAmount: expectedTotal,
        difference,
        status: matchStatus,
        senderName,
        senderPhone,
        timestamp,
        isDuplicate,
        duplicateDetails: duplicateCheck,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg text-white">M-Pesa Transaction Verifier</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Lipa Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Match M-Pesa confirmation code against order total &amp; detect duplicate receipts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close Verifier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Toast */}
        {feedbackToast && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{feedbackToast}</span>
            <button onClick={() => setFeedbackToast(null)} className="text-emerald-400 hover:text-white ml-2">✕</button>
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[75vh]">

          {/* Quick Helper Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Test Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('exact')}
                className="px-2 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold cursor-pointer transition-colors"
              >
                Exact Match
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('under')}
                className="px-2 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 text-[11px] font-bold cursor-pointer transition-colors"
              >
                Underpayment
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('over')}
                className="px-2 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border border-blue-500/30 text-[11px] font-bold cursor-pointer transition-colors"
              >
                Overpayment
              </button>
              <button
                type="button"
                onClick={() => setShowSmsParser(!showSmsParser)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
              >
                <ClipboardPaste className="w-3 h-3 text-amber-400" />
                <span>Paste SMS</span>
              </button>
            </div>
          </div>

          {/* Collapsible SMS Parser Box */}
          {showSmsParser && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2.5 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste Full Safaricom Confirmation SMS</span>
                </span>
                <button
                  onClick={() => setShowSmsParser(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
              <textarea
                value={rawSmsInput}
                onChange={(e) => setRawSmsInput(e.target.value)}
                placeholder="e.g. QJ18KL8899 Confirmed. Ksh2,450.00 sent to BAZU LIQUORS Till 123456 on 04/10/26 at 20:30. New M-PESA balance..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleParseSms(rawSmsInput)}
                disabled={!rawSmsInput.trim()}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Extract Transaction Code &amp; Amount</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Primary Input 1: Transaction Code */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>M-Pesa Transaction Code</span>
                <span className="text-amber-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  isValidFormat ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {cleanCode.length}/10 chars {isValidFormat ? '✓' : ''}
                </span>
              </div>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value.toUpperCase())}
                maxLength={12}
                placeholder="e.g. SHB7XX9912 or QK18LL7720"
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl py-3 pl-4 pr-12 text-lg font-black tracking-widest text-emerald-400 placeholder-slate-600 focus:outline-none font-mono transition-colors"
              />
              {cleanCode && (
                <button
                  type="button"
                  onClick={() => setTransactionCode('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Standard Safaricom confirmation code (10 uppercase alphanumeric characters).
            </p>
          </div>

          {/* Primary Input 2 & 3: Expected Order Total vs Received Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Expected Total */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Order Bill Total
                </span>
                {orderId && (
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    Order #{orderId}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  KES
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expectedTotal || ''}
                  onChange={(e) => setExpectedTotal(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-12 pr-3 text-base font-black text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">Amount required for order</p>
            </div>

            {/* Received Amount */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Received via M-Pesa
                </span>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">
                  Safaricom
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">
                  KES
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={receivedAmount || ''}
                  onChange={(e) => setReceivedAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-12 pr-3 text-base font-black text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">Amount stated in SMS receipt</p>
            </div>
          </div>

          {/* VERIFICATION RESULTS PANEL */}
          {cleanCode ? (
            <div className="space-y-3 pt-2">
              {/* 1. Duplicate / Fraud Check Card */}
              {isDuplicate ? (
                <div className="p-4 rounded-2xl bg-rose-950/50 border-2 border-rose-500 text-rose-200 space-y-2 animate-shake">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <h4 className="font-black text-sm text-rose-300 uppercase tracking-wide">
                        🚨 Duplicate Code Detected — Potential Fraud Alert!
                      </h4>
                      <p className="text-xs text-rose-300/90 leading-tight mt-0.5">
                        Code <strong>{cleanCode}</strong> was already used and settled in this store!
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-900/60 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Previous Type:</span>
                      <span className="text-white font-bold">{duplicateCheck?.type === 'sale' ? `Sale #${duplicateCheck.id}` : 'Debt Repayment'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount Settled:</span>
                      <span className="text-rose-400 font-black">KES {duplicateCheck?.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Logged By Cashier:</span>
                      <span className="text-slate-200">{duplicateCheck?.cashier || 'System'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date Recorded:</span>
                      <span className="text-slate-300">{duplicateCheck?.date ? new Date(duplicateCheck.date).toLocaleString('en-KE') : 'Past record'}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-rose-400 font-semibold">
                    Do not hand over goods for this code. Require the customer to provide a fresh transaction reference.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Fraud Check: Code is unique &amp; unused in local database</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    CLEARED
                  </span>
                </div>
              )}

              {/* 2. Amount Reconciliation Card */}
              {matchStatus === 'EXACT_MATCH' && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/80 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-emerald-300 uppercase tracking-wider">
                          Exact Payment Match
                        </h4>
                        <p className="text-xs text-slate-300">
                          Order total of KES {expectedTotal.toLocaleString()} is 100% matched by M-Pesa.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-emerald-500 text-slate-950">
                      PAID IN FULL
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/30 text-center font-mono">
                    <div className="p-2 rounded-xl bg-slate-950/60">
                      <span className="text-[10px] text-slate-400 block">Expected</span>
                      <span className="text-xs font-bold text-white">KES {expectedTotal.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60">
                      <span className="text-[10px] text-slate-400 block">Received</span>
                      <span className="text-xs font-bold text-emerald-400">KES {receivedAmount.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60">
                      <span className="text-[10px] text-slate-400 block">Difference</span>
                      <span className="text-xs font-bold text-slate-300">KES 0.00</span>
                    </div>
                  </div>
                </div>
              )}

              {matchStatus === 'UNDERPAYMENT' && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-500/80 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-amber-300 uppercase tracking-wider">
                          Partial Payment (Underpayment)
                        </h4>
                        <p className="text-xs text-amber-200/90">
                          Payment is less than expected bill. Customer owes a remaining balance.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-amber-500 text-slate-950">
                      DEFICIT
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-500/30 text-center font-mono">
                    <div className="p-2 rounded-xl bg-slate-950/60">
                      <span className="text-[10px] text-slate-400 block">Expected</span>
                      <span className="text-xs font-bold text-white">KES {expectedTotal.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60">
                      <span className="text-[10px] text-slate-400 block">Received M-Pesa</span>
                      <span className="text-xs font-bold text-amber-300">KES {receivedAmount.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-amber-500/40">
                      <span className="text-[10px] text-amber-400 block font-bold">Balance Due</span>
                      <span className="text-xs font-black text-rose-400">KES {Math.abs(difference).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-amber-300">
                    💡 <strong>Cashier Options:</strong> Collect remaining <strong>KES {Math.abs(difference).toLocaleString()}</strong> in cash, or record deficit on customer tab/credit.
                  </p>
                </div>
              )}

              {matchStatus === 'OVERPAYMENT' && (
                <div className="p-4 rounded-2xl bg-blue-950/40 border-2 border-blue-500/80 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black shrink-0">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-blue-300 uppercase tracking-wider">
                          Overpayment (Change Due)
                        </h4>
                        <p className="text-xs text-blue-200/90">
                          Customer sent more than order total. Return cash change or credit account.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-blue-500 text-white">
                      OVERPAID
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-500/30 text-center font-mono">
                    <div className="p-2 rounded-xl bg-slate-950/60">
                      <span className="text-[10px] text-slate-400 block">Expected</span>
                      <span className="text-xs font-bold text-white">KES {expectedTotal.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60">
                      <span className="text-[10px] text-slate-400 block">Received M-Pesa</span>
                      <span className="text-xs font-bold text-blue-300">KES {receivedAmount.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-blue-500/40">
                      <span className="text-[10px] text-blue-400 block font-bold">Change Due</span>
                      <span className="text-xs font-black text-emerald-400">KES {difference.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-300">
                    💡 <strong>Action Required:</strong> Hand over <strong>KES {difference.toLocaleString()}</strong> cash change to customer.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600 stroke-1" />
              <p className="text-xs font-semibold text-slate-400">
                Enter or paste an M-Pesa transaction reference code above
              </p>
              <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                The verifier will instantly validate the code format, check for past duplicate redemptions, and calculate exact payment matching.
              </p>
            </div>
          )}

          {/* Optional Sender / Customer Metadata Details */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Customer / Audit Details (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Customer Name"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="Customer Phone (07XX...)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyReceipt}
              disabled={!cleanCode}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Copy verification report to clipboard"
            >
              {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedReceipt ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTransactionCode('');
                setReceivedAmount(expectedTotal);
              }}
              className="py-2.5 px-3 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>

            {onVerifiedAndApply && (
              <button
                type="button"
                onClick={handleApplyToOrder}
                disabled={!cleanCode || isDuplicate}
                className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Apply to Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
