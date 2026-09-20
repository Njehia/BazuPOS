import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Printer,
  Smartphone,
  User,
  Users,
  X,
} from 'lucide-react';
import { Customer, CustomerTab, PaymentMethod, Sale, SaleItem, StoreConfig } from '../types';
import { LocalDb } from '../lib/storage';

interface SettleTabModalProps {
  tab: CustomerTab;
  storeConfig: StoreConfig;
  cashierName: string;
  onClose: () => void;
  onSettled: (sale: Sale, items: SaleItem[]) => void;
}

export const SettleTabModal: React.FC<SettleTabModalProps> = ({
  tab,
  storeConfig,
  cashierName,
  onClose,
  onSettled,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<string>(tab.total_amount.toString());
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(tab.customer_id);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const customers = useMemo(() => LocalDb.getCustomers(), []);

  const totalAmount = tab.total_amount;
  const numCashTendered = parseFloat(cashTendered) || 0;
  const changeReturned = Math.max(0, numCashTendered - totalAmount);

  // Quick cash buttons
  const quickCashOptions = useMemo(() => {
    const opts = [totalAmount];
    if (totalAmount % 500 !== 0) {
      opts.push(Math.ceil(totalAmount / 500) * 500);
    }
    if (totalAmount % 1000 !== 0) {
      opts.push(Math.ceil(totalAmount / 1000) * 1000);
    }
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }, [totalAmount]);

  const handleConfirmSettle = () => {
    setErrorMsg(null);

    if (paymentMethod === 'CASH' && numCashTendered < totalAmount) {
      setErrorMsg(`Cash tendered (KES ${numCashTendered.toLocaleString()}) is less than tab total (KES ${totalAmount.toLocaleString()}).`);
      return;
    }

    if (paymentMethod === 'DEBT' && !selectedCustomerId) {
      setErrorMsg('Please select a registered customer to record this tab as debt.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = LocalDb.settleCustomerTab({
        tab_id: tab.id,
        payment_method: paymentMethod,
        cashier_name: cashierName,
        mpesa_code: paymentMethod === 'MPESA' ? mpesaCode.trim() || undefined : undefined,
        cash_tendered: paymentMethod === 'CASH' ? numCashTendered : undefined,
        customer_id: selectedCustomerId,
      });

      if (!res.success || !res.sale || !res.items) {
        throw new Error(res.error || 'Failed to settle tab.');
      }

      onSettled(res.sale, res.items);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while settling tab.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold">Settle Customer Tab</h2>
            <p className="text-xs text-slate-400">
              {tab.tab_name} • {tab.total_items_count} items across {tab.rounds.length} rounds
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Total Header Banner */}
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 block">
              Total Amount Payable
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              KES {totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Till Number
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
              {storeConfig.till_number}
            </span>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mx-5 mt-3 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-black">CASH</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('MPESA')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'MPESA'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-xs font-black">M-PESA</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('DEBT')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'DEBT'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs font-black">DEBT / TAB</span>
              </button>
            </div>
          </div>

          {/* Cash Payment Fields */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cash Amount Tendered (KES)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {quickCashOptions.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(amt.toString())}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:border-emerald-500 cursor-pointer"
                  >
                    KES {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Change Output */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Change Due to Customer:</span>
                <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  KES {changeReturned.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* M-Pesa Payment Fields */}
          {paymentMethod === 'MPESA' && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  M-Pesa Transaction Code (Optional)
                </label>
                <input
                  type="text"
                  value={mpesaCode}
                  onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                  placeholder="e.g., TCH89JHG22"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 uppercase font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Customer should pay to Till: <strong className="text-slate-800 dark:text-white font-mono">{storeConfig.till_number}</strong> ({storeConfig.store_name})
              </p>
            </div>
          )}

          {/* Debt Customer Link */}
          {paymentMethod === 'DEBT' && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Customer Ledger <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCustomerId || ''}
                  onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Choose Registered Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - Current Debt: KES {c.current_debt.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                This amount will be added to the customer's outstanding debt balance.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmSettle}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Settlement & Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
