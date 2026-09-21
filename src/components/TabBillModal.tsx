import React, { useState } from 'react';
import { Beer, Clock, Copy, Check, Printer, User, X } from 'lucide-react';
import { CustomerTab, StoreConfig } from '../types';

interface TabBillModalProps {
  tab: CustomerTab;
  storeConfig: StoreConfig;
  onClose: () => void;
  onSettleTab: (tab: CustomerTab) => void;
}

export const TabBillModal: React.FC<TabBillModalProps> = ({
  tab,
  storeConfig,
  onClose,
  onSettleTab,
}) => {
  const [copied, setCopied] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const openedDate = new Date(tab.opened_at || Date.now()).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const roundsList = tab.rounds || [];

  const handleCopyText = () => {
    const divider = '--------------------------------';
    const lines = [
      (storeConfig.store_name || 'BAZU POS').toUpperCase(),
      storeConfig.branch || '',
      `Tel: ${storeConfig.phone_number || ''}`,
      `Till: ${storeConfig.till_number || ''}`,
      divider,
      `TAB BILL / CHECK (INTERIM)`,
      `Tab: ${(tab.tab_name || '').toUpperCase()}`,
      `Opened: ${openedDate}`,
      `Cashier: ${tab.opened_by_cashier || 'Cashier'}`,
      tab.customer_name ? `Customer: ${tab.customer_name}` : '',
      divider,
      ...roundsList.flatMap((round) => [
        `ROUND #${round.round_number} (${new Date(round.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        ...(round.items || []).map(
          (it) =>
            `  ${it.product?.name || 'Item'} x${it.quantity} = KES ${(((it.product?.price || 0) * it.quantity)).toLocaleString()}`
        ),
      ]),
      divider,
      `TOTAL DRINKS: ${tab.total_items_count || 0}`,
      `TOTAL BILL: KES ${(tab.total_amount || 0).toLocaleString()}`,
      divider,
      `Please clear at the counter or request M-Pesa Till`,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Beer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">Interim Tab Check (Leta Bill)</h2>
              <p className="text-xs text-slate-400">{tab.tab_name} • {roundsList.length} Rounds</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                paperWidth === '80mm'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                paperWidth === '58mm'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              58mm
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-5 flex-1 overflow-y-auto bg-slate-200 dark:bg-slate-950/60 flex justify-center">
          <div
            id="printable-tab-receipt"
            className={`bg-white text-slate-900 p-5 rounded-lg shadow-sm border border-slate-300 font-mono text-xs transition-all ${
              paperWidth === '58mm' ? 'w-[260px]' : 'w-[320px]'
            }`}
          >
            {/* Store Banner */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-0.5">
              <h3 className="font-black text-sm uppercase tracking-wider">{storeConfig.store_name}</h3>
              <p className="text-[10px] text-slate-600">{storeConfig.branch}</p>
              <p className="text-[10px] text-slate-600">Till: {storeConfig.till_number}</p>
              <p className="text-[10px] text-slate-600">Tel: {storeConfig.phone_number}</p>
            </div>

            {/* Bill Header */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="text-center font-black uppercase text-amber-800 bg-amber-50 py-0.5 rounded">
                CUSTOMER TAB BILL
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tab:</span>
                <span className="font-bold uppercase">{tab.tab_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Opened:</span>
                <span>{openedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{tab.opened_by_cashier}</span>
              </div>
              {tab.customer_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span>{tab.customer_name}</span>
                </div>
              )}
            </div>

            {/* Rounds and Items Breakdown */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-3 text-[11px]">
              {roundsList.map((round) => (
                <div key={round.id} className="space-y-1">
                  <div className="font-black text-[10px] uppercase text-slate-600 bg-slate-100 px-1 py-0.5 flex justify-between">
                    <span>Round #{round.round_number}</span>
                    <span>KES {(round.round_total || 0).toLocaleString()}</span>
                  </div>
                  {(round.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between pl-1">
                      <span className="truncate pr-2">
                        {it.quantity}× {it.product?.name || 'Item'}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {(((it.product?.price || 0) * it.quantity)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 pb-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Drinks:</span>
                <span className="font-bold">{tab.total_items_count || 0} units</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
                <span>TOTAL BILL:</span>
                <span>KES {(tab.total_amount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center pt-3 text-[10px] text-slate-500 border-t border-dashed border-slate-300 italic">
              Please present this tab slip to cashier or waiter to clear bill. Thank you!
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onSettleTab(tab);
            }}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Proceed to Settle Tab (KES {tab.total_amount.toLocaleString()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
