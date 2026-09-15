import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Key,
  LogOut,
  Package,
  Printer,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Tags,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  CartItem,
  Category,
  Customer,
  Product,
  Sale,
  StoreConfig,
  User,
  getRoleLabel,
} from '../types';
import { LocalDb } from '../lib/storage';
import { BazuLogo } from './BazuLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeToggle } from './ThemeToggle';

interface HomeMenuScreenProps {
  currentUser: User;
  storeConfig: StoreConfig;
  cart: CartItem[];
  onNavigate: (
    destination:
      | 'pos'
      | 'inventory'
      | 'customers'
      | 'summary'
      | 'transactions'
      | 'categories'
      | 'receipts'
      | 'users'
      | 'store'
  ) => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

export const HomeMenuScreen: React.FC<HomeMenuScreenProps> = ({
  currentUser,
  storeConfig,
  cart,
  onNavigate,
  onOpenChangePassword,
  onLogout,
}) => {
  // Live stats computed from LocalDb
  const stats = useMemo(() => {
    const products: Product[] = LocalDb.getProducts();
    const sales: Sale[] = LocalDb.getSales();
    const categories: Category[] = LocalDb.getCategories();
    const customers: Customer[] = LocalDb.getCustomers();
    const users: User[] = LocalDb.getUsers();

    // Today's date string YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter today's sales
    const todaySales = sales.filter((s) => {
      try {
        const saleDate = new Date(s.created_at).toISOString().split('T')[0];
        return saleDate === todayStr;
      } catch {
        return false;
      }
    });

    const todayTotal = todaySales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const todayCash = todaySales
      .filter((s) => s.payment_method === 'CASH')
      .reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const todayMpesa = todaySales
      .filter((s) => s.payment_method === 'MPESA')
      .reduce((acc, s) => acc + (s.total_amount || 0), 0);

    // Low stock products (stock <= 5)
    const lowStockProducts = products.filter((p) => p.stock_qty <= 5);

    // Outstanding customer debts using LocalDb summaries
    const customerSummaries = LocalDb.getAllCustomerSummaries();
    const customersWithDebt = customerSummaries.filter((cs) => cs.outstandingDebt > 0);
    const totalDebtAmount = customersWithDebt.reduce(
      (acc, cs) => acc + cs.outstandingDebt,
      0
    );

    return {
      totalProducts: products.length,
      categoriesCount: categories.length,
      usersCount: users.length,
      todaySalesCount: todaySales.length,
      todaySalesTotal: todayTotal,
      todayCashTotal: todayCash,
      todayMpesaTotal: todayMpesa,
      lowStockCount: lowStockProducts.length,
      debtCustomersCount: customersWithDebt.length,
      totalDebtAmount,
      totalSalesCount: sales.length,
    };
  }, []);

  // Cart summary
  const cartItemsCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );
  const cartTotalAmount = useMemo(
    () => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [cart]
  );

  // Current Date display
  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-KE', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const userInitials = useMemo(() => {
    return currentUser.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [currentUser.name]);

  const isAdminOrManager = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-100 flex flex-col select-none overflow-y-auto transition-colors duration-200">
      {/* Top Main Navigation Bar */}
      <header className="h-16 sm:h-20 bg-white dark:bg-[#1E1B4B] border-b border-slate-200 dark:border-indigo-950/60 px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-sm dark:shadow-lg sticky top-0 z-30 transition-colors duration-200">
        {/* Brand & Store Details */}
        <div className="flex items-center gap-3 sm:gap-4">
          <BazuLogo className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 shadow-md ring-2 ring-amber-500/30 rounded-xl" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide uppercase">
                {storeConfig.store_name}
              </h1>
              <span className="hidden md:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30">
                {storeConfig.branch}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-2">
              <span>Terminal {storeConfig.till_number}</span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500">•</span>
              <span className="hidden sm:inline text-amber-600 dark:text-amber-400 font-mono">
                {currentDateFormatted}
              </span>
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Mode Toggle */}
          <ThemeToggle />

          {/* Android PWA Install */}
          <PWAInstallButton />

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold tracking-wide uppercase mt-0.5">
                {getRoleLabel(currentUser.role)}
              </p>
            </div>
          </div>

          {/* Change PIN Button */}
          <button
            type="button"
            onClick={onOpenChangePassword}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Change Login PIN"
          >
            <Key className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="hidden md:inline">Change PIN</span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 border border-red-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Sign out of current shift"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-900/60 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  Main System Menu
                </span>
                <span className="text-xs text-slate-400">• Select an option to proceed</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5">
                Welcome, {currentUser.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Choose where you would like to start today. You can return to this Home Menu anytime
                by clicking the <strong className="text-amber-400">Home</strong> button.
              </p>
            </div>

            {/* Quick Action Button to Launch POS */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('pos')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-lg hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Make a Sale (POS Register)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Cart Notification Banner if cart has items */}
          {cartItemsCount > 0 && (
            <div className="mt-4 pt-4 border-t border-indigo-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 rounded-b-2xl border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-300">
                    Order In Progress: {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'} in Cart
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Current Total: <span className="font-mono font-bold text-white">KES {cartTotalAmount.toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('pos')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Resume Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Live Business Pulse Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Today's Sales */}
          <div
            onClick={() => onNavigate('summary')}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 rounded-xl transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Today&apos;s Takings</span>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
              KES {stats.todaySalesTotal.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.todaySalesCount}</span> orders completed
            </p>
          </div>

          {/* Cash vs M-Pesa */}
          <div
            onClick={() => onNavigate('summary')}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 rounded-xl transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Cash &amp; M-Pesa Split</span>
              <Smartphone className="w-4 h-4 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">M-Pesa:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">KES {stats.todayMpesaTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Cash:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">KES {stats.todayCashTotal.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Click to view shift audit</p>
          </div>

          {/* Low Stock Warning */}
          <div
            onClick={() => onNavigate('inventory')}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 rounded-xl transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Stock Alerts</span>
              <Package className="w-4 h-4 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-1 flex items-center gap-2">
              <span>{stats.lowStockCount}</span>
              {stats.lowStockCount > 0 && (
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Needs Restock
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Out of {stats.totalProducts} registered products
            </p>
          </div>

          {/* Outstanding Debts */}
          <div
            onClick={() => onNavigate('customers')}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 rounded-xl transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Customer Debts</span>
              <Users className="w-4 h-4 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
              KES {stats.totalDebtAmount.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {stats.debtCustomersCount} customers owe balance
            </p>
          </div>
        </div>

        {/* Section Heading */}
        <div className="pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            System Modules &amp; Actions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any module below to jump directly into that workspace.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Make a Sale (POS Register) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('pos')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('pos');
            }}
            className="bg-amber-500/5 dark:bg-gradient-to-b dark:from-slate-900 dark:to-indigo-950/40 hover:bg-amber-500/10 dark:hover:to-indigo-950 border-2 border-amber-500/50 hover:border-amber-500 p-5 rounded-2xl transition-all cursor-pointer group shadow-md hover:shadow-amber-500/10 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Make a Sale (POS Register)
              </h4>
              <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              Launch the point-of-sale checkout terminal, barcode scanner, bottle catalog, and
              instant Cash &amp; M-Pesa payments.
            </p>
            <div className="mt-4 pt-3 border-t border-amber-500/20 dark:border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for checkout
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">{stats.totalProducts} items in stock</span>
            </div>
          </div>

          {/* 2. Inventory & Stock Management */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('inventory')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('inventory');
            }}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Inventory &amp; Stock
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              Monitor live stock levels, add new liquor bottles, update cost &amp; retail prices,
              record incoming stock, and print barcodes.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {stats.lowStockCount > 0 ? `${stats.lowStockCount} Low stock alerts` : 'Stock is healthy'}
              </span>
              <span className="font-mono text-slate-400">{stats.totalProducts} Products</span>
            </div>
          </div>

          {/* 3. Customers & Debts Management */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('customers')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('customers');
            }}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Customers &amp; Debts
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              Customer accounts ledger, track credit sales, record debt repayments, and send
              instant WhatsApp statement reminders.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">
                KES {stats.totalDebtAmount.toLocaleString()} Debt
              </span>
              <span className="text-slate-500 dark:text-slate-400">{stats.debtCustomersCount} Accounts</span>
            </div>
          </div>

          {/* 4. Sales Reports & Daily Summary */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('summary')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('summary');
            }}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Sales Reports &amp; Summary
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              View daily gross sales, profit margins, cashier performance audits, top-selling
              liquor bottles, and hourly revenue curves.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {stats.todaySalesCount} Today
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">KES {stats.todaySalesTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* 5. Recent Transactions Journal & Audit */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('transactions')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('transactions');
            }}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Recent Transactions
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              Scrollable ledger of sales, exact timestamps, cash &amp; M-Pesa totals, cashier names,
              itemized lines, and reprint receipt slips.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-amber-600 dark:text-amber-400 font-medium">Scrollable Journal</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">{stats.totalSalesCount} Transactions</span>
            </div>
          </div>

          {/* 5. Product Categories */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('categories')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('categories');
            }}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Tags className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                Product Categories
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              Manage category taxonomy: Whisky, Vodka, Gin, Beers, Wines, Spirits, Cigarettes,
              and Soft Drinks.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-teal-600 dark:text-teal-400 font-medium">Categorized Shelf</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">{stats.categoriesCount} Categories</span>
            </div>
          </div>

          {/* 6. Receipts & Slips Search */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('receipts')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('receipts');
            }}
            className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Printer className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Search &amp; Print Receipts
              </h4>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              Look up past transaction slips by slip number or date, verify items sold, and print
              80mm or 58mm thermal receipts.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-purple-600 dark:text-purple-400 font-medium">Thermal 80mm/58mm</span>
              <span className="text-slate-500 dark:text-slate-400">Slip History</span>
            </div>
          </div>

          {/* 7. Staff & Cashier Accounts (Admin/Manager only) */}
          {isAdminOrManager && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onNavigate('users')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onNavigate('users');
              }}
              className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Staff &amp; Cashiers
                </h4>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                Add cashiers and managers, assign 4-digit security PINs, and manage shift access
                privileges.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-rose-600 dark:text-rose-400 font-medium">Access Control</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">{stats.usersCount} Staff Users</span>
              </div>
            </div>
          )}

          {/* 8. Store Setup & Configuration (Admin/Manager only) */}
          {isAdminOrManager && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onNavigate('store')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onNavigate('store');
              }}
              className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-5 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Store Setup &amp; Settings
                </h4>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                Configure store legal name, M-Pesa Buy Goods Till / Paybill number, VAT PIN, receipt
                footer message, and currency.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-700 dark:text-slate-300 font-mono">Till: {storeConfig.till_number}</span>
                <span className="text-slate-500 dark:text-slate-400">Settings</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-4 border-t border-slate-200 dark:border-indigo-950/60 text-center text-xs text-slate-500 dark:text-slate-400 shrink-0 bg-white/50 dark:bg-transparent">
        <p>
          {storeConfig.store_name} • BazuPOS Retail &amp; Wholesale • Operating on Terminal{' '}
          {storeConfig.till_number}
        </p>
      </footer>
    </div>
  );
};
