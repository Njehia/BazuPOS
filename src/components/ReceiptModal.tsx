import React, { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  Printer,
  Send,
  Share2,
  ShoppingBag,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { Sale, SaleItem, StoreConfig } from '../types';

interface ReceiptModalProps {
  sale: Sale;
  items: SaleItem[];
  storeConfig: StoreConfig;
  cashierName?: string;
  onClose: () => void;
  onNewSale?: () => void;
  onOpenWhatsApp?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  items,
  storeConfig,
  cashierName,
  onClose,
  onNewSale,
  onOpenWhatsApp,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.created_at).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleCopyText = () => {
    const divider = '--------------------------------';
    const lines = [
      storeConfig.store_name.toUpperCase(),
      storeConfig.branch,
      `Tel: ${storeConfig.phone_number}`,
      `Till: ${storeConfig.till_number}`,
      divider,
      `Receipt: RCP-${sale.id.toString().slice(-6)}`,
      `Date: ${formattedDate}`,
      `Cashier: ${cashierName || sale.cashier_name}`,
      sale.customer_name ? `Customer: ${sale.customer_name} (${sale.customer_phone || ''})` : '',
      `Payment: ${sale.payment_method}${sale.mpesa_code ? ` (${sale.mpesa_code})` : ''}`,
      sale.payment_status ? `Status: ${sale.payment_status}` : '',
      divider,
      ...items.map(
        (it) =>
          `${it.product_name}\n  ${it.quantity} x KES ${it.unit_price.toLocaleString()} = KES ${it.total_price.toLocaleString()}`
      ),
      divider,
      `TOTAL: KES ${sale.total_amount.toLocaleString()}`,
      sale.amount_paid !== undefined ? `Paid: KES ${sale.amount_paid.toLocaleString()}` : '',
      sale.debt_amount ? `Debt/Unpaid: KES ${sale.debt_amount.toLocaleString()}` : '',
      sale.payment_method === 'CASH' && sale.cash_tendered
        ? `Tendered: KES ${sale.cash_tendered.toLocaleString()} | Change: KES ${(sale.change_given ?? 0).toLocaleString()}`
        : '',
      divider,
      storeConfig.receipt_footer || 'Thank you for shopping with us!',
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMpesa = sale.payment_method === 'MPESA';
  const isDebt = sale.payment_method === 'DEBT' || sale.payment_status === 'DEBT';
  const isPartial = sale.payment_status === 'PARTIAL';

  const handleDirectWhatsApp = () => {
    if (!sale.customer_phone) return;
    let digits = sale.customer_phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
      digits = '254' + digits.substring(1);
    } else if (digits.length === 9) {
      digits = '254' + digits;
    }

    const itemsSummary = items
      .map((i) => `• ${i.product_name} (${i.quantity}x @ KES ${i.unit_price.toLocaleString()})`)
      .join('\n');

    const msg = `Habari ${sale.customer_name || 'Valued Customer'},

Receipt from *${storeConfig.store_name}*:
Receipt: *RCP-${sale.id.toString().slice(-6)}*
Date: ${formattedDate}

*Purchased Items:*
${itemsSummary}

*Total Bill:* KES ${sale.total_amount.toLocaleString()}
*Payment Method:* ${sale.payment_method}
${sale.amount_paid !== undefined ? `*Amount Paid:* KES ${sale.amount_paid.toLocaleString()}\n` : ''}${
      sale.debt_amount
        ? `*Remaining Debt/Balance:* *KES ${sale.debt_amount.toLocaleString()}*\n`
        : '*Status:* Fully Paid ✓\n'
    }Till: ${storeConfig.till_number}

Thank you for your business! 🍷`;

    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Actions */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                isDebt
                  ? 'bg-rose-500/20 text-rose-400'
                  : isMpesa
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isDebt ? (
                <AlertCircle className="w-4 h-4" />
              ) : isMpesa ? (
                <Smartphone className="w-4 h-4" />
              ) : (
                <Banknote className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white">
                  {isDebt
                    ? 'Credit Sale (Debt Recorded)'
                    : isPartial
                    ? 'Partial Payment Sale'
                    : isMpesa
                    ? 'M-Pesa Sale Confirmed'
                    : 'Cash Sale Confirmed'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                    isDebt
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isPartial
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isDebt ? (
                    '⚠️ Debt'
                  ) : isPartial ? (
                    'Partial'
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Receipt #RCP-{sale.id.toString().slice(-6)} • KES {sale.total_amount.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size Selector & Quick Summary Bar */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium mr-1">Roll Size:</span>
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                paperWidth === '80mm'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                paperWidth === '58mm'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              58mm
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-semibold cursor-pointer px-2 py-0.5 rounded hover:bg-slate-200 transition-colors"
            title="Copy plain-text receipt for thermal printer or sharing"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>

        {/* Receipt Preview Canvas (Paper style) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-200/70 flex justify-center">
          <div
            id="thermal-receipt"
            style={{ maxWidth: paperWidth === '58mm' ? '240px' : '340px' }}
            className="w-full bg-white text-slate-900 p-5 rounded-md shadow-md font-mono text-xs border-t-8 border-amber-500 print:shadow-none print:m-0 transition-all"
          >
            {/* Store Branding */}
            <div className="text-center pb-3 border-b border-dashed border-stone-400">
              <div className="font-extrabold text-base tracking-wider uppercase text-stone-950">
                {storeConfig.store_name}
              </div>
              <div className="text-[11px] text-stone-600 font-sans font-medium">{storeConfig.branch}</div>
              <div className="text-[11px] text-stone-600">Tel: {storeConfig.phone_number}</div>
              <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                M-PESA TILL: {storeConfig.till_number}
              </div>
            </div>

            {/* Meta Details */}
            <div className="py-2.5 border-b border-dashed border-stone-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Receipt No:</span>
                <span className="font-bold">RCP-{sale.id.toString().slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Cashier:</span>
                <span>{cashierName || sale.cashier_name}</span>
              </div>

              {sale.customer_name && (
                <div className="flex justify-between bg-stone-100 px-1.5 py-0.5 rounded text-stone-900 font-semibold">
                  <span>Client:</span>
                  <span>
                    {sale.customer_name}
                    {sale.customer_phone ? ` (${sale.customer_phone})` : ''}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-stone-500">Payment:</span>
                <span className="font-bold text-stone-900">
                  {sale.payment_method === 'MPESA'
                    ? 'M-PESA EXPRESS'
                    : sale.payment_method === 'DEBT'
                    ? 'CREDIT / DEBT'
                    : 'CASH'}
                </span>
              </div>

              {sale.payment_status && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span
                    className={`font-bold ${
                      sale.payment_status === 'DEBT'
                        ? 'text-rose-600'
                        : sale.payment_status === 'PARTIAL'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {sale.payment_status}
                  </span>
                </div>
              )}

              {sale.mpesa_code && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>M-Pesa Ref:</span>
                  <span className="font-mono">{sale.mpesa_code}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-3 border-b border-dashed border-stone-400">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-300 text-[10px] text-stone-500 uppercase">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Price</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((item, idx) => (
                    <tr key={`receipt-row-${item.id || item.product_id || idx}-${idx}`} className="text-[11px]">
                      <td className="py-1.5 font-medium max-w-[120px] truncate">{item.product_name}</td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right">{item.unit_price.toLocaleString()}</td>
                      <td className="py-1.5 text-right font-bold">{item.total_price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Items Count:</span>
                <span>{totalItemsCount} units</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-stone-200">
                <span>TOTAL BILL:</span>
                <span>KES {sale.total_amount.toLocaleString()}</span>
              </div>

              {/* Amount paid vs Debt breakdown */}
              {sale.amount_paid !== undefined && (
                <div className="flex justify-between text-stone-700 pt-0.5 text-[11px]">
                  <span>Amount Paid Now:</span>
                  <span className="font-bold text-emerald-700">
                    KES {sale.amount_paid.toLocaleString()}
                  </span>
                </div>
              )}

              {sale.debt_amount !== undefined && sale.debt_amount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold pt-0.5 text-[11px] bg-rose-50 px-1.5 py-0.5 rounded">
                  <span>Balance Added to Debt:</span>
                  <span>KES {sale.debt_amount.toLocaleString()}</span>
                </div>
              )}

              {sale.payment_method === 'CASH' && sale.cash_tendered !== undefined && (
                <>
                  <div className="flex justify-between text-stone-600 pt-1 text-[11px]">
                    <span>Cash Tendered:</span>
                    <span>KES {sale.cash_tendered.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900 text-[11px]">
                    <span>Change Due:</span>
                    <span>KES {(sale.change_given ?? 0).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            {/* Tax breakdown note */}
            <div className="pt-2 text-[10px] text-stone-500 text-center">
              16% VAT Inclusive where applicable • ETR Verified
            </div>

            {/* Custom Footer */}
            <div className="mt-3 pt-2 text-[10px] text-center text-stone-600 italic whitespace-pre-line border-t border-dotted border-stone-300">
              {storeConfig.receipt_footer || 'Thank you for your business! Karibu tena.'}
            </div>

            {/* Barcode Simulation */}
            <div className="mt-3 pt-2 flex flex-col items-center justify-center">
              <div className="h-7 w-48 bg-stone-900 flex items-center justify-center text-[9px] text-white tracking-widest font-mono">
                |||| | |||||| || | |||| |||
              </div>
              <span className="text-[9px] text-stone-500 mt-0.5 font-mono">
                *BZ-{sale.id.toString().slice(-8)}*
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print</span>
          </button>

          {/* WhatsApp share button */}
          {sale.customer_phone && (
            <button
              type="button"
              onClick={handleDirectWhatsApp}
              className="py-3 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
              title="Send digital receipt directly to client via WhatsApp"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          )}

          {onNewSale && (
            <button
              type="button"
              onClick={onNewSale}
              className="flex-1 py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>New Sale</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

