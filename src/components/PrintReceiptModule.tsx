import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Search,
  Calendar,
  Check,
  Copy,
  Download,
  Smartphone,
  Banknote,
  X,
  FileText,
  Home,
  Clock,
  User,
  ShoppingBag,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { Sale, SaleItem, StoreConfig } from '../types';
import { LocalDb } from '../lib/storage';

interface PrintReceiptModuleProps {
  storeConfig: StoreConfig;
  onClose: () => void;
  onGoHome?: () => void;
  initialSaleId?: number;
}

export const PrintReceiptModule: React.FC<PrintReceiptModuleProps> = ({
  storeConfig,
  onClose,
  onGoHome,
  initialSaleId,
}) => {
  const [sales, setSales] = useState<Sale[]>(() => LocalDb.getSales());
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'MPESA' | 'CASH'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK'>('ALL');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Selected sale
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(() => {
    if (initialSaleId) return initialSaleId;
    const all = LocalDb.getSales();
    return all.length > 0 ? all[0].id : null;
  });

  // Reload sales if storage updates
  useEffect(() => {
    const unsub = LocalDb.onSyncUpdate(() => {
      setSales(LocalDb.getSales());
    });
    return () => unsub();
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter sales
  const filteredSales = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return sales.filter((s) => {
      // Payment filter
      if (paymentFilter !== 'ALL' && s.payment_method !== paymentFilter) {
        return false;
      }

      // Date filter
      const saleDateStr = s.created_at.slice(0, 10);
      const saleDate = new Date(s.created_at);
      if (dateFilter === 'TODAY' && saleDateStr !== todayStr) return false;
      if (dateFilter === 'YESTERDAY' && saleDateStr !== yesterdayStr) return false;
      if (dateFilter === 'WEEK' && saleDate < weekAgo) return false;

      // Text query
      if (query) {
        const idStr = s.id.toString();
        const rcpStr = `rcp-${idStr.slice(-6)}`.toLowerCase();
        const matchesId = idStr.includes(query) || rcpStr.includes(query);
        const matchesCashier = s.cashier_name.toLowerCase().includes(query);
        const matchesMpesa = s.mpesa_code ? s.mpesa_code.toLowerCase().includes(query) : false;
        const matchesAmount = s.total_amount.toString().includes(query);
        return matchesId || matchesCashier || matchesMpesa || matchesAmount;
      }

      return true;
    });
  }, [sales, searchQuery, paymentFilter, dateFilter]);

  // If currently selected sale is not in list or was null, pick first match
  useEffect(() => {
    if (filteredSales.length > 0) {
      if (!selectedSaleId || !filteredSales.some((s) => s.id === selectedSaleId)) {
        setSelectedSaleId(filteredSales[0].id);
      }
    }
  }, [filteredSales, selectedSaleId]);

  // Get details for currently selected sale
  const selectedSaleDetails = useMemo(() => {
    if (!selectedSaleId) return null;
    return LocalDb.getSaleDetails(selectedSaleId);
  }, [selectedSaleId]);

  const activeSale = selectedSaleDetails?.sale || null;
  const activeItems = selectedSaleDetails?.items || [];

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = activeSale
    ? new Date(activeSale.created_at).toLocaleString('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  const totalUnits = activeItems.reduce((sum, item) => sum + item.quantity, 0);

  const generateReceiptText = () => {
    if (!activeSale) return '';
    const divider = '--------------------------------';
    const lines = [
      storeConfig.store_name.toUpperCase(),
      storeConfig.branch,
      `Tel: ${storeConfig.phone_number}`,
      `Till: ${storeConfig.till_number}`,
      divider,
      `RECEIPT: RCP-${activeSale.id.toString().slice(-6)}`,
      `DATE: ${formattedDate}`,
      `CASHIER: ${activeSale.cashier_name}`,
      `PAYMENT: ${activeSale.payment_method}${activeSale.mpesa_code ? ` (${activeSale.mpesa_code})` : ''}`,
      `STATUS: COMPLETED (DUPLICATE COPY)`,
      divider,
      ...activeItems.map(
        (it) =>
          `${it.product_name}\n  ${it.quantity} x KES ${it.unit_price.toLocaleString()} = KES ${it.total_price.toLocaleString()}`
      ),
      divider,
      `TOTAL AMOUNT: KES ${activeSale.total_amount.toLocaleString()}`,
      activeSale.payment_method === 'CASH' && activeSale.cash_tendered !== undefined
        ? `Cash Tendered: KES ${activeSale.cash_tendered.toLocaleString()} | Change: KES ${(activeSale.change_given ?? 0).toLocaleString()}`
        : '',
      divider,
      '16% VAT Inclusive where applicable',
      storeConfig.receipt_footer || 'Thank you for shopping with us! Karibu tena.',
      `*BZ-${activeSale.id.toString().slice(-8)}*`,
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleCopyReceipt = () => {
    const text = generateReceiptText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReceipt = () => {
    const text = generateReceiptText();
    if (!text || !activeSale) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-RCP-${activeSale.id.toString().slice(-6)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col h-[92vh] max-h-[850px]">
        {/* Module Header */}
        <header className="px-5 py-4 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Receipt Printing Module
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Thermal POS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Search sales history, preview formatted slips, and print directly to 80mm or 58mm thermal rolls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onGoHome && (
              <button
                type="button"
                onClick={() => {
                  onGoHome();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Return to Main Menu / Home Screen"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Print Module (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Module Body: Two Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Sales Search & Selection */}
          <div className="w-full md:w-5/12 border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden">
            {/* Search and Filters Bar */}
            <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-white shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search receipt #, cashier, M-Pesa code, or amount..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium mr-0.5">Date:</span>
                  <button
                    type="button"
                    onClick={() => setDateFilter('ALL')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                      dateFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('TODAY')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                      dateFilter === 'TODAY'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('WEEK')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                      dateFilter === 'WEEK'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    7 Days
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium mr-0.5">Mode:</span>
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('ALL')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                      paymentFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('MPESA')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                      paymentFilter === 'MPESA'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    M-Pesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('CASH')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                      paymentFilter === 'CASH'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Cash
                  </button>
                </div>
              </div>
            </div>

            {/* Sales List Header */}
            <div className="px-3.5 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0">
              <span>{filteredSales.length} Transactions Found</span>
              <span>Click to Select & Print</span>
            </div>

            {/* Sales List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No matching sales records</p>
                  <p className="text-[11px] text-slate-400">
                    Try adjusting the search query or date filters.
                  </p>
                </div>
              ) : (
                filteredSales.map((s) => {
                  const isSelected = s.id === selectedSaleId;
                  const isMpesa = s.payment_method === 'MPESA';
                  const timeStr = new Date(s.created_at).toLocaleTimeString('en-KE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const dateShort = new Date(s.created_at).toLocaleDateString('en-KE', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <button
                      key={`receipt-sel-${s.id}`}
                      type="button"
                      onClick={() => setSelectedSaleId(s.id)}
                      className={`w-full text-left p-3 transition-all flex items-center justify-between gap-2.5 cursor-pointer border-l-4 ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-500 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            RCP-{s.id.toString().slice(-6)}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isMpesa
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isMpesa ? 'M-PESA' : 'CASH'}
                          </span>
                          {s.mpesa_code && (
                            <span className="text-[10px] text-blue-700 font-mono font-semibold">
                              {s.mpesa_code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {dateShort} • {timeStr}
                          </span>
                          <span>•</span>
                          <span className="truncate">{s.cashier_name}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-extrabold text-xs text-slate-900">
                          KES {s.total_amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {s.items_count} {s.items_count === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Thermal Receipt Preview & Printing Actions */}
          <div className="w-full md:w-7/12 flex flex-col h-full bg-slate-100 overflow-hidden">
            {/* Action Bar */}
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Paper Roll Size Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Roll Width:</span>
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaperWidth('80mm')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      paperWidth === '80mm'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    80mm (Standard POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperWidth('58mm')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      paperWidth === '58mm'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    58mm (Mobile POS)
                  </button>
                </div>
              </div>

              {/* Utility buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  disabled={!activeSale}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Copy formatted plain text receipt to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  disabled={!activeSale}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Download receipt as text file"
                >
                  {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{downloaded ? 'Downloaded' : 'Export .txt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!activeSale}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-450 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>

            {/* Receipt Preview Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
              {activeSale ? (
                <div
                  id="thermal-receipt"
                  style={{ maxWidth: paperWidth === '58mm' ? '250px' : '340px' }}
                  className={`w-full bg-white text-slate-900 p-5 rounded-lg shadow-md font-mono text-xs border-t-8 border-amber-500 print:shadow-none print:m-0 transition-all ${
                    paperWidth === '58mm' ? 'paper-58mm text-[11px]' : ''
                  }`}
                >
                  {/* Duplicate / Reprint Notice */}
                  <div className="mb-3 text-center pb-2 border-b border-dashed border-stone-300">
                    <span className="inline-block uppercase tracking-widest text-[9px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                      REPRINT / DUPLICATE RECEIPT
                    </span>
                  </div>

                  {/* Store Branding */}
                  <div className="text-center pb-3 border-b border-dashed border-stone-400">
                    <div className="font-extrabold text-sm uppercase tracking-wide">
                      {storeConfig.store_name}
                    </div>
                    <div className="text-[11px] text-stone-600 font-sans font-medium">
                      {storeConfig.branch}
                    </div>
                    <div className="text-[11px] text-stone-600">Tel: {storeConfig.phone_number}</div>
                    <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                      M-PESA TILL: {storeConfig.till_number}
                    </div>
                  </div>

                  {/* Transaction Metadata */}
                  <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Receipt No:</span>
                      <span className="font-bold">RCP-{activeSale.id.toString().slice(-6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Date:</span>
                      <span>{formattedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Cashier:</span>
                      <span>{activeSale.cashier_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Payment:</span>
                      <span className="font-bold text-stone-900">
                        {activeSale.payment_method === 'MPESA' ? 'M-PESA BUY GOODS' : 'CASH'}
                      </span>
                    </div>
                    {activeSale.mpesa_code && (
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span className="text-stone-500">M-Pesa Ref:</span>
                        <span className="font-mono">{activeSale.mpesa_code}</span>
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <div className="py-2.5 border-b border-dashed border-stone-400">
                    <table className="w-full">
                      <thead>
                        <tr className="text-stone-500 border-b border-stone-200 text-[10px]">
                          <th className="text-left pb-1">ITEM</th>
                          <th className="text-center pb-1">QTY</th>
                          <th className="text-right pb-1">PRICE</th>
                          <th className="text-right pb-1">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {activeItems.map((item, idx) => (
                          <tr
                            key={`print-item-${item.id || item.product_id || idx}-${idx}`}
                            className="text-[11px]"
                          >
                            <td className="py-1.5 font-medium max-w-[120px] truncate">
                              {item.product_name}
                            </td>
                            <td className="py-1.5 text-center">{item.quantity}</td>
                            <td className="py-1.5 text-right font-mono">
                              {item.unit_price.toLocaleString()}
                            </td>
                            <td className="py-1.5 text-right font-mono font-bold">
                              {item.total_price.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Calculation */}
                  <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Items Count:</span>
                      <span>{totalUnits} units</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-stone-200">
                      <span>TOTAL (KES):</span>
                      <span>KES {activeSale.total_amount.toLocaleString()}</span>
                    </div>

                    {activeSale.payment_method === 'CASH' &&
                      activeSale.cash_tendered !== undefined && (
                        <>
                          <div className="flex justify-between text-stone-600 pt-1 text-[11px]">
                            <span>Cash Tendered:</span>
                            <span>KES {activeSale.cash_tendered.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-bold text-stone-900 text-[11px]">
                            <span>Change Given:</span>
                            <span>KES {(activeSale.change_given ?? 0).toLocaleString()}</span>
                          </div>
                        </>
                      )}
                  </div>

                  {/* Tax Note */}
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
                      *BZ-{activeSale.id.toString().slice(-8)}*
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 text-slate-400">
                  <Printer className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">No Sale Selected</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select a transaction from the left column to view and print its thermal receipt.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Footer with Big Print Trigger */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                {activeSale ? (
                  <span>
                    Selected: <strong className="text-slate-800">RCP-{activeSale.id.toString().slice(-6)}</strong> • KES {activeSale.total_amount.toLocaleString()} ({activeSale.payment_method})
                  </span>
                ) : (
                  <span>Select a transaction to print</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!activeSale}
                  className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Send to Printer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
