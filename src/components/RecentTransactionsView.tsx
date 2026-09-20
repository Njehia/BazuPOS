import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Home,
  Info,
  Package,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Tag,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { Sale, SaleItem, StoreConfig, User, getRoleLabel } from '../types';
import { LocalDb } from '../lib/storage';
import { ReceiptModal } from './ReceiptModal';
import { exportTransactionsExcel, exportTransactionsPDF } from '../lib/exportUtils';
import { maskPhoneNumber } from '../lib/phoneUtils';

interface RecentTransactionsViewProps {
  currentUser: User;
  storeConfig: StoreConfig;
  onSelectCustomer?: (customer: any) => void;
  onClose?: () => void;
  onGoHome?: () => void;
  onGoToPos?: () => void;
}

type DateRangePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export const RecentTransactionsView: React.FC<RecentTransactionsViewProps> = ({
  currentUser,
  storeConfig,
  onSelectCustomer,
  onClose,
  onGoHome,
  onGoToPos,
}) => {
  const [sales, setSales] = useState<Sale[]>(() => LocalDb.getSales());
  const [allSaleItems, setAllSaleItems] = useState<SaleItem[]>(() => LocalDb.getSaleItems());
  const [users] = useState<User[]>(() => LocalDb.getUsers());

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'CASH' | 'MPESA' | 'DEBT'>('ALL');
  const [cashierFilter, setCashierFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Interactive detail row state (expanded row IDs)
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<number>>(new Set());

  // Receipt Modal State
  const [reprintSale, setReprintSale] = useState<Sale | null>(null);
  const [reprintItems, setReprintItems] = useState<SaleItem[]>([]);

  // UI Feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reloadData = () => {
    setIsRefreshing(true);
    setSales(LocalDb.getSales());
    setAllSaleItems(LocalDb.getSaleItems());
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Map sale_id to list of items for quick preview and line-item details
  const itemsBySaleId = useMemo(() => {
    const map = new Map<number, SaleItem[]>();
    for (const item of allSaleItems) {
      const list = map.get(item.sale_id) || [];
      list.push(item);
      map.set(item.sale_id, list);
    }
    return map;
  }, [allSaleItems]);

  const toggleExpand = (saleId: number) => {
    setExpandedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(filteredSales.map((s) => s.id));
    setExpandedSaleIds(allIds);
  };

  const collapseAll = () => {
    setExpandedSaleIds(new Set());
  };

  const handleCopyReceiptNumber = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    const rcpNumber = `RCP-${sale.id.toString().slice(-6)}`;
    navigator.clipboard.writeText(rcpNumber);
    setCopiedId(sale.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReprint = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    const items = itemsBySaleId.get(sale.id) || LocalDb.getSaleItems(sale.id);
    setReprintSale(sale);
    setReprintItems(items);
  };

  // Filtered & Sorted Sales List
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);

    return sales
      .filter((sale) => {
        const saleDate = new Date(sale.created_at);
        const saleDayStr = sale.created_at.slice(0, 10);

        // Date filter preset
        if (datePreset === 'today' && saleDayStr !== todayStr) return false;
        if (datePreset === 'yesterday' && saleDayStr !== yesterdayStr) return false;
        if (datePreset === 'week' && saleDate < weekAgo) return false;
        if (datePreset === 'month' && saleDate < monthAgo) return false;
        if (datePreset === 'custom' && saleDayStr !== customDate) return false;

        // Payment Method
        if (paymentMethodFilter !== 'ALL' && sale.payment_method !== paymentMethodFilter) {
          return false;
        }

        // Cashier filter
        if (cashierFilter !== 'ALL' && sale.cashier_name !== cashierFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const rcpCode = `rcp-${sale.id.toString().slice(-6)}`.toLowerCase();
          const matchId = sale.id.toString().includes(q) || rcpCode.includes(q);
          const matchCashier = sale.cashier_name.toLowerCase().includes(q);
          const matchMpesa = sale.mpesa_code ? sale.mpesa_code.toLowerCase().includes(q) : false;
          const matchCustomer = sale.customer_name ? sale.customer_name.toLowerCase().includes(q) : false;
          const matchPhone = sale.customer_phone ? sale.customer_phone.toLowerCase().includes(q) : false;

          // Also check if any item in this sale matches the search
          const saleItems = itemsBySaleId.get(sale.id) || [];
          const matchItem = saleItems.some((item) =>
            item.product_name.toLowerCase().includes(q)
          );

          if (!matchId && !matchCashier && !matchMpesa && !matchCustomer && !matchPhone && !matchItem) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'highest') {
          return b.total_amount - a.total_amount;
        }
        if (sortBy === 'lowest') {
          return a.total_amount - b.total_amount;
        }
        return 0;
      });
  }, [sales, datePreset, customDate, paymentMethodFilter, cashierFilter, searchQuery, sortBy, itemsBySaleId]);

  // Aggregate Metrics for currently filtered list
  const metrics = useMemo(() => {
    const totalCount = filteredSales.length;
    let totalRevenue = 0;
    let mpesaRevenue = 0;
    let cashRevenue = 0;
    let debtRevenue = 0;
    let totalItems = 0;

    for (const s of filteredSales) {
      totalRevenue += s.total_amount;
      totalItems += s.items_count || 1;
      if (s.payment_method === 'MPESA') mpesaRevenue += s.total_amount;
      else if (s.payment_method === 'CASH') cashRevenue += s.total_amount;
      else if (s.payment_method === 'DEBT') debtRevenue += s.total_amount;
    }

    const averageOrderValue = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

    return {
      totalCount,
      totalRevenue,
      mpesaRevenue,
      cashRevenue,
      debtRevenue,
      totalItems,
      averageOrderValue,
    };
  }, [filteredSales]);

  // Format timestamp nicely
  const formatTimestamp = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const timeStr = date.toLocaleTimeString('en-KE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateStr = date.toLocaleDateString('en-KE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // Relative calculation
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let relative = '';
      if (diffMins < 1) relative = 'Just now';
      else if (diffMins < 60) relative = `${diffMins}m ago`;
      else if (diffHours < 24) relative = `${diffHours}h ago`;
      else if (diffDays === 1) relative = 'Yesterday';
      else relative = `${diffDays}d ago`;

      return { dateStr, timeStr, relative };
    } catch {
      return { dateStr: isoStr, timeStr: '', relative: '' };
    }
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      'Receipt #',
      'Timestamp (ISO)',
      'Date',
      'Time',
      'Cashier',
      'Payment Method',
      'M-Pesa Reference',
      'Customer Name',
      'Customer Phone',
      'Items Count',
      'Items Summary',
      'Total Amount (KES)',
      'Amount Paid (KES)',
      'Debt Amount (KES)',
    ];

    const rows = filteredSales.map((s) => {
      const d = new Date(s.created_at);
      const items = itemsBySaleId.get(s.id) || [];
      const itemsSummary = items
        .map((i) => `${i.quantity}x ${i.product_name} (@${i.unit_price})`)
        .join('; ');

      return [
        `RCP-${s.id.toString().slice(-6)}`,
        `"${s.created_at}"`,
        `"${d.toLocaleDateString('en-KE')}"`,
        `"${d.toLocaleTimeString('en-KE')}"`,
        `"${s.cashier_name}"`,
        `"${s.payment_method}"`,
        `"${s.mpesa_code || ''}"`,
        `"${s.customer_name || ''}"`,
        `"${s.customer_phone || ''}"`,
        s.items_count,
        `"${itemsSummary}"`,
        s.total_amount,
        s.amount_paid ?? s.total_amount,
        s.debt_amount ?? 0,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BazuPOS_Transactions_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Banner & Audit Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrator Financial Audit
              </span>
              <span className="text-xs text-slate-400">
                • Continuous Real-Time Transactions Ledger
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              Recent Transactions Journal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review individual customer purchases, timestamps, cash &amp; M-Pesa breakdowns,
              audit receipts, and itemized sales lines.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Return to Home Menu"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            )}

            {(onClose || onGoHome) && (
              <button
                type="button"
                onClick={onGoHome || onClose}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                title="Go Back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={reloadData}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Reload live transactions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportTransactionsPDF(filteredSales, allSaleItems, storeConfig, {
                  filterSummary: `Filtered by: Date (${datePreset}), Method (${paymentMethodFilter}), Cashier (${cashierFilter}), ${filteredSales.length} records`,
                })
              }
              disabled={filteredSales.length === 0}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Download formatted PDF report with store theme & branding"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportTransactionsExcel(filteredSales, allSaleItems, storeConfig, {
                  filterSummary: `Filtered by: Date (${datePreset}), Method (${paymentMethodFilter}), Cashier (${cashierFilter}), ${filteredSales.length} records`,
                })
              }
              disabled={filteredSales.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Download full Excel spreadsheet (.xlsx) with item details"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredSales.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Download CSV report of current records"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Print transaction summary audit"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Audit</span>
            </button>

            {(onClose || onGoHome) && (
              <button
                type="button"
                onClick={onGoHome || onClose}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-100">
          {/* Total Transactions */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Transactions
            </span>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
              {metrics.totalCount}
            </div>
            <span className="text-[10px] text-slate-500">{metrics.totalItems} total items billed</span>
          </div>

          {/* Total Gross Volume */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Total Revenue
            </span>
            <div className="text-xl font-black font-mono text-amber-900 mt-0.5">
              KES {metrics.totalRevenue.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-700">Gross sales volume</span>
          </div>

          {/* M-Pesa Total */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> M-Pesa Total
            </span>
            <div className="text-xl font-black font-mono text-blue-800 mt-0.5">
              KES {metrics.mpesaRevenue.toLocaleString()}
            </div>
            <span className="text-[10px] text-blue-600">Till #{storeConfig.till_number}</span>
          </div>

          {/* Cash Total */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block flex items-center gap-1">
              <Banknote className="w-3 h-3" /> Cash Total
            </span>
            <div className="text-xl font-black font-mono text-emerald-900 mt-0.5">
              KES {metrics.cashRevenue.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-700">In physical drawer</span>
          </div>

          {/* Debt / Credit */}
          <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> Credit Sales
            </span>
            <div className="text-xl font-black font-mono text-purple-900 mt-0.5">
              KES {metrics.debtRevenue.toLocaleString()}
            </div>
            <span className="text-[10px] text-purple-700">Accounts receivable</span>
          </div>

          {/* Average Basket */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Avg Basket (AOV)
            </span>
            <div className="text-xl font-black font-mono text-slate-800 mt-0.5">
              KES {metrics.averageOrderValue.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">Per customer visit</span>
          </div>
        </div>
      </div>

      {/* Filter and Date Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                datePreset === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Recent
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                datePreset === 'today'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('yesterday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                datePreset === 'yesterday'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                datePreset === 'week'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past 7 Days
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                datePreset === 'month'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                datePreset === 'custom'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Date
            </button>
          </div>

          {/* Custom Date Input */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Quick Expand / Collapse All Toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Search, Payment, Cashier, and Sorting Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          {/* Search Field */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt #, M-Pesa ref, customer, item, cashier..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="MPESA">M-Pesa Receipts Only</option>
              <option value="CASH">Cash in Drawer Only</option>
              <option value="DEBT">Credit / Debt Sales Only</option>
            </select>
          </div>

          {/* Cashier Filter */}
          <div>
            <select
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Cashiers</option>
              {users.map((u) => (
                <option key={`cashier-opt-${u.id}`} value={u.name}>
                  {u.name} ({getRoleLabel(u.role)})
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="highest">Sort: Highest Amount</option>
              <option value="lowest">Sort: Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicator & Reset */}
        {(searchQuery || paymentMethodFilter !== 'ALL' || cashierFilter !== 'ALL' || datePreset !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Active filters showing <strong className="text-slate-800 font-mono">{filteredSales.length}</strong> of{' '}
              <span className="font-mono">{sales.length}</span> recorded transactions
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPaymentMethodFilter('ALL');
                setCashierFilter('ALL');
                setDatePreset('all');
                setSortBy('newest');
              }}
              className="text-amber-600 hover:text-amber-800 font-bold cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Transactions List View */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* List Header Bar */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Transaction Records ({filteredSales.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Scrollable log • Click any row to expand itemized breakdown
          </span>
        </div>

        {/* Scrollable Container */}
        {filteredSales.length === 0 ? (
          <div className="py-20 text-center px-4 bg-slate-50/50">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No Transactions Found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              No sales match the selected filters or search parameters. Try clearing your filters or
              adjusting the date range.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPaymentMethodFilter('ALL');
                  setCashierFilter('ALL');
                  setDatePreset('all');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[640px] divide-y divide-slate-100 divide-solid">
            {filteredSales.map((sale) => {
              const isExpanded = expandedSaleIds.has(sale.id);
              const items = itemsBySaleId.get(sale.id) || [];
              const timeInfo = formatTimestamp(sale.created_at);
              const isCopied = copiedId === sale.id;

              return (
                <div
                  key={`tx-row-${sale.id}`}
                  className={`transition-colors ${
                    isExpanded ? 'bg-amber-50/20' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Transaction Summary Row */}
                  <div
                    onClick={() => toggleExpand(sale.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    {/* Left Column: Timestamp & Receipt # */}
                    <div className="flex items-start sm:items-center gap-3 min-w-[240px]">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-600 mt-0.5 sm:mt-0 shrink-0">
                        <Receipt className="w-5 h-5 text-slate-700" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-600">
                            RCP-{sale.id.toString().slice(-6)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleCopyReceiptNumber(sale, e)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy receipt number"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>

                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {timeInfo.relative}
                          </span>
                        </div>

                        {/* Exact Timestamp */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono font-semibold">{timeInfo.timeStr}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">{timeInfo.dateStr}</span>
                        </div>

                        {/* Cashier attribution */}
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Cashier:{' '}
                          <strong className="text-slate-700 font-medium">
                            {sale.cashier_name}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Payment Method & Customer Details */}
                    <div className="flex-1 min-w-[200px] flex flex-col justify-center">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Payment badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                            sale.payment_method === 'MPESA'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : sale.payment_method === 'CASH'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {sale.payment_method === 'MPESA' ? (
                            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span>{sale.payment_method}</span>
                          {sale.mpesa_code && (
                            <span className="text-slate-500 font-normal">
                              • Ref: {sale.mpesa_code}
                            </span>
                          )}
                        </span>

                        {/* Customer attribution if exists */}
                        {sale.customer_name && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                            <UserIcon className="w-3 h-3 text-amber-600" />
                            <span>{sale.customer_name}</span>
                            {sale.customer_phone && (
                              <span className="text-slate-400 text-[10px]">
                                ({sale.customer_phone})
                              </span>
                            )}
                          </span>
                        )}

                        {/* Credit / Debt Badge */}
                        {sale.debt_amount && sale.debt_amount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            Debt: KES {sale.debt_amount.toLocaleString()}
                          </span>
                        ) : null}
                      </div>

                      {/* Items Quick Preview tags */}
                      <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-700 font-mono">
                          {sale.items_count} {sale.items_count === 1 ? 'item' : 'items'}:
                        </span>
                        {items.slice(0, 3).map((it, idx) => (
                          <span
                            key={`tag-${sale.id}-${idx}`}
                            className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]"
                          >
                            {it.quantity}x {it.product_name}
                          </span>
                        ))}
                        {items.length > 3 && (
                          <span className="text-[11px] text-slate-400 italic">
                            +{items.length - 3} more...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Total Amount & Action Controls */}
                    <div className="flex items-center justify-between md:justify-end gap-4 min-w-[200px]">
                      <div className="text-left md:text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Total Amount
                        </div>
                        <div className="text-lg sm:text-xl font-black font-mono text-slate-900">
                          KES {sale.total_amount.toLocaleString()}
                        </div>
                        {sale.amount_paid !== undefined && sale.amount_paid < sale.total_amount && (
                          <div className="text-[10px] text-slate-500">
                            Paid: <strong className="text-emerald-700">KES {sale.amount_paid.toLocaleString()}</strong>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleReprint(sale, e)}
                          title="Reprint Thermal Receipt Slip"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 transition-colors cursor-pointer border border-slate-200"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpand(sale.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer border border-slate-200"
                          title={isExpanded ? 'Collapse details' : 'Expand line items'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-amber-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Itemized Detail Panel */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 animate-fade-in">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Itemized Product Breakdown (Receipt #RCP-{sale.id.toString().slice(-6)})
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleReprint(sale, e)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Reprint Thermal Receipt</span>
                            </button>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Item Name</th>
                                <th className="py-2.5 px-3 text-center">Quantity</th>
                                <th className="py-2.5 px-3 text-right">Unit Price</th>
                                <th className="py-2.5 px-3 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {items.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-4 text-center text-slate-400">
                                    No item records found for this receipt ID.
                                  </td>
                                </tr>
                              ) : (
                                items.map((item, itIdx) => {
                                  const lineTotal =
                                    item.total_price ?? (item.quantity * item.unit_price);

                                  return (
                                    <tr key={`item-row-${item.id}-${itIdx}`} className="hover:bg-slate-50/60">
                                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                                        {item.product_name}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                        {item.quantity}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                        KES {item.unit_price.toLocaleString()}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                                        KES {lineTotal.toLocaleString()}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-200 font-bold text-xs bg-slate-50/50">
                              <tr>
                                <td colSpan={3} className="py-2.5 px-3 text-right text-slate-700 uppercase">
                                  Total Amount:
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-sm">
                                  KES {sale.total_amount.toLocaleString()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Audit Details Strip */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Cashier Account
                            </span>
                            <span className="font-semibold text-slate-800">{sale.cashier_name}</span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Payment Breakdown
                            </span>
                            <div className="font-mono text-slate-800">
                              {sale.payment_method === 'CASH' ? (
                                <span>
                                  Tendered: KES {(sale.cash_tendered || sale.total_amount).toLocaleString()}
                                  {sale.change_given ? ` • Change: KES ${sale.change_given.toLocaleString()}` : ''}
                                </span>
                              ) : sale.payment_method === 'MPESA' ? (
                                <span>Confirmation Code: {sale.mpesa_code || 'Verified In App'}</span>
                              ) : (
                                <span>Customer Ledger Account</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Exact ISO Timestamp
                            </span>
                            <span className="font-mono text-slate-700 text-[11px]">
                              {sale.created_at}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Statistics Banner */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 font-mono">{filteredSales.length}</strong> of{' '}
            <span className="font-mono">{sales.length}</span> total system transactions
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            Total of Displayed Orders: <strong className="text-slate-900">KES {metrics.totalRevenue.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Reprint Thermal Receipt Modal */}
      {reprintSale && (
        <ReceiptModal
          sale={reprintSale}
          items={reprintItems}
          storeConfig={storeConfig}
          cashierName={reprintSale.cashier_name}
          onClose={() => {
            setReprintSale(null);
            setReprintItems([]);
          }}
        />
      )}
    </div>
  );
};
