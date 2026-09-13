import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Receipt,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { CustomerSummary, PaymentMethod, StoreConfig } from '../types';
import { LocalDb } from '../lib/storage';

interface CustomerPaymentModalProps {
  customerSummary: CustomerSummary;
  storeConfig: StoreConfig;
  cashierName: string;
  onClose: () => void;
  onPaymentRecorded: (newDebt: number) => void;
  onOpenWhatsApp?: () => void;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  customerSummary,
  storeConfig,
  cashierName,
  onClose,
  onPaymentRecorded,
  onOpenWhatsApp,
}) => {
  const { customer, outstandingDebt } = customerSummary;
  const [amount, setAmount] = useState<number>(outstandingDebt > 0 ? outstandingDebt : 500);
  const [method, setMethod] = useState<'CASH' | 'MPESA'>('MPESA');
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successResult, setSuccessResult] = useState<{
    newDebt: number;
    amountPaid: number;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (method === 'MPESA' && !mpesaCode.trim()) {
      // Auto-generate realistic code if left blank or prompt
      const generatedCode =
        'SH' +
        Math.random().toString(36).substring(2, 8).toUpperCase() +
        Math.floor(10 + Math.random() * 89);
      setMpesaCode(generatedCode);
    }

    const finalMpesaCode =
      method === 'MPESA'
        ? mpesaCode.trim() ||
          'SH' +
            Math.random().toString(36).substring(2, 8).toUpperCase() +
            Math.floor(10 + Math.random() * 89)
        : undefined;

    const res = LocalDb.recordCustomerPayment({
      customer_id: customer.id,
      amount: Number(amount),
      payment_method: method,
      mpesa_code: finalMpesaCode,
      cashier_name: cashierName,
      notes: notes.trim() || undefined,
    });

    if (res.success && res.payment) {
      setSuccessResult({
        newDebt: res.newDebt,
        amountPaid: Number(amount),
      });
      onPaymentRecorded(res.newDebt);
    } else {
      setError(res.error || 'Failed to record debt repayment.');
    }
  };

  return (
    <div
      id="customer-payment-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="customer-payment-modal-container"
        className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-indigo-950 flex items-center justify-between bg-[#1E1B4B] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Receipt className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                Debt Settlement
              </span>
              <h2 className="text-lg font-bold text-white leading-tight">
                Record Customer Payment
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Success */}
        {successResult ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Recorded Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1">
                KES {successResult.amountPaid.toLocaleString()} paid by {customer.name} via {method}.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-xs text-slate-500 font-medium">New Outstanding Debt Balance</div>
              <div
                className={`text-2xl font-black font-mono mt-1 ${
                  successResult.newDebt > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {successResult.newDebt > 0
                  ? `KES ${successResult.newDebt.toLocaleString()}`
                  : 'KES 0 (Fully Cleared ✓)'}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWhatsApp();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" /> Send Updated WhatsApp Statement
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800 flex-1 overflow-y-auto">
            {/* Customer info card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{customer.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{customer.phone}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">
                  Current Debt
                </span>
                <span className="text-sm font-black font-mono text-rose-600">
                  KES {outstandingDebt.toLocaleString()}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMethod('MPESA')}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition-all ${
                    method === 'MPESA'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Lipa na M-Pesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('CASH')}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition-all ${
                    method === 'CASH'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-amber-600" />
                  <span>Cash Payment</span>
                </button>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount to Settle (KES)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  KES
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 text-base font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Quick Amount Shortcuts */}
              {outstandingDebt > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setAmount(outstandingDebt)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      amount === outstandingDebt
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Pay Full Debt (KES {outstandingDebt.toLocaleString()})
                  </button>
                  {outstandingDebt > 500 && (
                    <button
                      type="button"
                      onClick={() => setAmount(Math.round(outstandingDebt / 2))}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 cursor-pointer"
                    >
                      50% (KES {Math.round(outstandingDebt / 2).toLocaleString()})
                    </button>
                  )}
                  {[500, 1000, 2000].map((val) => (
                    <button
                      key={`shortcut-${val}`}
                      type="button"
                      onClick={() => setAmount(val)}
                      className="px-2 py-1 rounded-lg text-[11px] font-mono border bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 cursor-pointer"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Projected Remaining Debt */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Projected Balance After Payment:</span>
              <span className="font-mono font-black text-indigo-900">
                KES {Math.max(0, outstandingDebt - (amount || 0)).toLocaleString()}
              </span>
            </div>

            {/* M-Pesa Code Input if MPESA */}
            {method === 'MPESA' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  M-Pesa Transaction Code (Optional)
                </label>
                <input
                  type="text"
                  value={mpesaCode}
                  onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SH8921KP4"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono uppercase text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cleared weekend tab or counter cash"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>Confirm & Record Payment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
