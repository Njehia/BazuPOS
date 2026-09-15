import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Banknote,
  ChevronRight,
  Clock,
  FileText,
  History,
  Home,
  KeyRound,
  Lock,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tags,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  CartItem,
  Category,
  Customer,
  PaymentMethod,
  Product,
  ProductCategory,
  Sale,
  SaleItem,
  SalePaymentStatus,
  StoreConfig,
  User as UserModel,
  getRoleLabel,
} from '../types';
import { LocalDb } from '../lib/storage';
import { applyStoreTheme } from '../lib/theme';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { AdminOverlay, AdminTab } from './AdminOverlay';
import { ChangePasswordModal } from './ChangePasswordModal';
import { PrintReceiptModule } from './PrintReceiptModule';
import { BazuLogo } from './BazuLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { HomeMenuScreen } from './HomeMenuScreen';
import { ThemeToggle } from './ThemeToggle';

interface PosTerminalProps {
  currentUser: UserModel;
  onLogout: () => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({ currentUser, onLogout }) => {
  // Inventory state from local storage
  const [products, setProducts] = useState<Product[]>(() => LocalDb.getProducts());
  const [categoriesList, setCategoriesList] = useState<Category[]>(() => LocalDb.getCategories());
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => LocalDb.getStoreConfig());

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerForSale, setSelectedCustomerForSale] = useState<Customer | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Navigation: First screen after login is 'home' (Menu First), user chooses where to go first
  const [currentView, setCurrentView] = useState<'home' | 'pos'>('home');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPrintReceiptModuleOpen, setIsPrintReceiptModuleOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<{ sale: Sale; items: SaleItem[] } | null>(null);
  const [activeUser, setActiveUser] = useState<UserModel>(currentUser);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Admin PIN prompt if salesperson tries to open admin
  const [showAdminPinPrompt, setShowAdminPinPrompt] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [unlockedAdminUser, setUnlockedAdminUser] = useState<UserModel | null>(null);

  // Current time for Nairobi
  const currentTimeStr = new Date().toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const refreshInventory = () => {
    setProducts(LocalDb.getProducts());
    setCategoriesList(LocalDb.getCategories());
  };

  // Dynamic Categories list derived from LocalDb and seed data
  const categoryOptions = useMemo(() => {
    return [
      { id: 'all', label: 'All Stock', icon: '🍷' },
      ...categoriesList.map((c) => ({
        id: c.id,
        label: c.name,
        icon: c.icon || '🏷️',
      })),
    ];
  }, [categoriesList]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery);
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart actions
  const addToCart = (product: Product) => {
    if (product.stock_qty <= 0) return; // Stock protection

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) {
          // Cannot add more than current available stock
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            // Bound between 1 and available stock
            const maxQty = item.product.stock_qty;
            if (newQty <= 0) return null;
            if (newQty > maxQty) return item; // Protected
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart calculations
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Checkout submission
  const handleCompleteSale = (paymentData: {
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
  }) => {
    const result = LocalDb.processSale(
      {
        cashier_name: currentUser.name,
        payment_method: paymentData.method,
        cash_tendered: paymentData.cashTendered,
        change_given: paymentData.changeGiven,
        mpesa_code: paymentData.mpesaCode,
        customer_id: paymentData.customerId,
        customer_name: paymentData.customerName,
        customer_phone: paymentData.customerPhone,
        amount_paid: paymentData.amountPaid,
        debt_amount: paymentData.debtAmount,
        payment_status: paymentData.paymentStatus,
      },
      cart
    );

    if (result.success && result.sale && result.items) {
      // Deduct stock in UI
      refreshInventory();
      // Open receipt modal
      setActiveReceipt({ sale: result.sale, items: result.items });
      // Reset cart and checkout modal
      setCart([]);
      setSelectedCustomerForSale(null);
      setIsCheckoutOpen(false);
    } else {
      alert(result.error || 'Failed to process transaction.');
    }
  };


  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab>('inventory');

  const handleOpenAdmin = (tab: AdminTab = 'inventory') => {
    setAdminInitialTab(tab);
    // Cashiers are granted direct access to:
    // - Customers & Debts
    // - Sales Reports & Daily Summary
    // - Inventory & Stock View
    // - Categories & Recent Transactions
    // Staff management ('users') and Store setup ('store') remain protected by Admin/Manager PIN
    const isProtectedTab = tab === 'users' || tab === 'store';

    if (!isProtectedTab || currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') {
      setUnlockedAdminUser(null);
      setIsAdminOpen(true);
    } else {
      setShowAdminPinPrompt(true);
      setAdminPinInput('');
      setAdminPinError('');
    }
  };

  const handleHomeNavigate = (
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
  ) => {
    if (destination === 'pos') {
      setCurrentView('pos');
    } else if (destination === 'receipts') {
      setIsPrintReceiptModuleOpen(true);
    } else {
      handleOpenAdmin(destination as AdminTab);
    }
  };

  const handleGoHome = () => {
    setCurrentView('home');
    setIsAdminOpen(false);
    setIsPrintReceiptModuleOpen(false);
    setIsMobileCartOpen(false);
    setIsCheckoutOpen(false);
    setShowAdminPinPrompt(false);
  };

  const handleVerifyAdminPinPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    const authResult = LocalDb.authenticate(adminPinInput);
    if (authResult.user && authResult.user.role === 'ADMIN') {
      setUnlockedAdminUser(authResult.user);
      setShowAdminPinPrompt(false);
      setIsAdminOpen(true);
    } else if (authResult.isSuspended) {
      setAdminPinError(authResult.error || 'Access Denied: This Administrator account is suspended.');
    } else {
      setAdminPinError('Invalid Admin PIN. Access Denied: Only active Administrator PIN can unlock.');
    }
  };

  const userInitials = useMemo(() => {
    return currentUser.name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [currentUser.name]);

  const renderCartContent = (isDrawer: boolean) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors duration-200">
      {/* Cart Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <span>Current Cart</span>
            <span className="text-xs sm:text-sm font-normal text-slate-400 dark:text-slate-500">({totalItemsCount} items)</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-bold border border-red-200 dark:border-red-900/40 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
            >
              CLEAR
            </button>
          )}
          {isDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Cart"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500 space-y-2">
            <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Your cart is empty.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Click any product in the catalog to add it to the order.</p>
          </div>
        ) : (
          cart.map(({ product, quantity }, cartIdx) => {
            const itemTotal = product.price * quantity;
            const isAtMaxStock = quantity >= product.stock_qty;

            return (
              <div key={`cart-row-${product.id}-${cartIdx}`} className="flex gap-2.5 sm:gap-3 items-center bg-slate-50/70 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {/* Vertical Counter Button Column */}
                <div className="flex flex-col items-center gap-1 w-9 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, 1)}
                    disabled={isAtMaxStock}
                    className={`w-full h-7 flex items-center justify-center rounded text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors ${
                      isAtMaxStock
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 cursor-pointer shadow-2xs'
                    }`}
                  >
                    +
                  </button>
                  <span className="text-xs font-bold py-0.5 text-slate-900 dark:text-white font-mono">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, -1)}
                    className="w-full h-7 flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-200 rounded text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                  >
                    -
                  </button>
                </div>

                {/* Product Name and Rate */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase leading-snug line-clamp-2">
                    {product.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                    KES {product.price.toLocaleString()} × {quantity}
                  </p>
                </div>

                {/* Total & Subtle delete */}
                <div className="text-right shrink-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
                    KES {itemTotal.toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id)}
                    className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-xs mt-1 p-1 transition-colors cursor-pointer"
                    title="Remove from cart"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Totals & Checkout Actions */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Subtotal</span>
          <span className="font-bold text-slate-900 dark:text-white font-mono">KES {totalAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Tax (VAT 16%)</span>
          <span className="font-bold text-slate-900 dark:text-white font-mono">
            KES {Math.round((totalAmount * 0.16) / 1.16).toLocaleString()}
          </span>
        </div>
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end">
          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white uppercase">Total</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none font-mono">
            <span className="text-xs align-top mr-1 font-normal text-slate-500 dark:text-slate-400">KES</span>
            {totalAmount.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              if (isDrawer) setIsMobileCartOpen(false);
              setIsCheckoutOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl py-3 px-2 flex flex-col items-center justify-center transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Payment</span>
            <span className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1">
              <Banknote className="w-4 h-4" /> CASH
            </span>
          </button>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              if (isDrawer) setIsMobileCartOpen(false);
              setIsCheckoutOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl py-3 px-2 flex flex-col items-center justify-center transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Payment</span>
            <span className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1">
              <Smartphone className="w-4 h-4" /> M-PESA
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-900 font-sans text-slate-800 select-none">
      {currentView === 'home' ? (
        <HomeMenuScreen
          currentUser={activeUser}
          storeConfig={storeConfig}
          cart={cart}
          onNavigate={handleHomeNavigate}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onLogout={onLogout}
        />
      ) : (
        <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden select-none transition-colors duration-200">
          {/* Top Header - Deep Indigo #1E1B4B with Amber Badge */}
          <header className="h-16 bg-[#1E1B4B] dark:bg-slate-900 border-b border-indigo-950/60 dark:border-slate-800 text-white flex items-center justify-between px-4 sm:px-6 shadow-md shrink-0 transition-colors duration-200">
            <div
              onClick={handleGoHome}
              className="flex items-center gap-3 sm:gap-4 cursor-pointer group"
              title="Return to Main Menu / First Screen"
            >
              <BazuLogo className="w-10 h-10 shrink-0 shadow-md group-hover:scale-105 transition-transform" />
              <div className="leading-tight">
                <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span>{storeConfig.store_name}</span>
                </h1>
                <p className="text-xs text-slate-300">
                  {storeConfig.branch} | Terminal {storeConfig.till_number}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Home Page Button */}
              <button
                type="button"
                onClick={handleGoHome}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer"
                title="Return to Main Menu / First Screen"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Home</span>
              </button>

              {/* Mobile & Minimized Screen Cart Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
                title="Open Current Cart"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="font-extrabold">Cart</span>
                {totalItemsCount > 0 && (
                  <span className="bg-slate-950 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-4 text-center">
                    {totalItemsCount}
                  </span>
                )}
              </button>

              {/* Theme Mode Toggle */}
              <ThemeToggle />

              {/* Download / Install Android App Button */}
              <PWAInstallButton />

              {/* Customers & Debts Button */}
              <button
                type="button"
                onClick={() => handleOpenAdmin('customers')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-xs font-semibold transition-all cursor-pointer"
                title="Customers Directory, Outstanding Debts & WhatsApp Statements"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Customers & Debts</span>
                <span className="md:hidden">Clients</span>
              </button>

              {/* Recent Transactions Button */}
              <button
                type="button"
                onClick={() => handleOpenAdmin('transactions')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-xs font-semibold transition-all cursor-pointer"
                title="Recent Transactions Journal & Itemized Details"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Transactions</span>
              </button>

              {/* Print Receipt / Search Slips Button */}
              <button
                type="button"
                onClick={() => setIsPrintReceiptModuleOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-xs font-semibold transition-all cursor-pointer"
                title="Search Sales History & Thermal Reprint Receipt"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Receipts</span>
              </button>

              {/* Admin Tools Quick Button */}
              <button
                type="button"
                onClick={() => handleOpenAdmin('inventory')}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Tools</span>
              </button>

              {/* Current Shift Cashier Display */}
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-300 uppercase font-medium tracking-wider">Current Shift</p>
                <p className="text-xs sm:text-sm font-semibold text-white">
                  {currentUser.name} ({getRoleLabel(currentUser.role)})
                </p>
              </div>

              {/* Cashier Avatar Pill */}
              <div className="h-10 w-10 bg-slate-700 dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-500 dark:border-slate-600 shrink-0 shadow-inner">
                <span className="text-xs font-bold text-white">{userInitials}</span>
              </div>

              {/* Change Password Button */}
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                title="Change Password"
                className="bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white px-2.5 py-1.5 rounded border border-white/15 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Change PIN</span>
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                title="Logout & Lock POS Terminal"
                className="bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded border border-red-500/30 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>LOGOUT</span>
              </button>
            </div>
          </header>

          {/* Main Workspace: Product Area (Left) + Cart Sidebar (Right) */}
          <main className="flex-1 flex overflow-hidden">
            {/* Left Column: Categories, Product Grid, and Bottom Search/Status Bar */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-200">
              {/* Category Filter Bar */}
              <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar items-center shrink-0 transition-colors duration-200">
                {categoryOptions.map((cat) => (
                  <button
                    key={`pos-cat-${cat.id}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}

                {/* Quick Add / Manage Category button for Admin */}
                {currentUser.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleOpenAdmin('categories')}
                    className="px-3 py-2 rounded-xl text-xs whitespace-nowrap bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-300 font-bold border border-dashed border-amber-300 dark:border-amber-700 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Create a new liquor category in Admin Panel"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>+ Category</span>
                  </button>
                )}
              </div>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs space-y-2 py-12">
                    <Package className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No products match your search or filter.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Try changing the category or search keyword.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredProducts.map((product, prodIdx) => {
                      const isOutOfStock = product.stock_qty <= 0;
                      const isLowStock = product.stock_qty > 0 && product.stock_qty < 10;
                      const cartEntry = cart.find((c) => c.product.id === product.id);
                      const inCartQty = cartEntry ? cartEntry.quantity : 0;
                      const isCartFull = inCartQty >= product.stock_qty;

                      return (
                        <div
                          key={`pos-prod-${product.id}-${product.barcode || prodIdx}`}
                          onClick={() => !isOutOfStock && !isCartFull && addToCart(product)}
                          className={`bg-white dark:bg-slate-900 border rounded-xl p-3 shadow-xs flex flex-col justify-between transition-all select-none ${
                            isOutOfStock
                              ? 'border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/30'
                              : inCartQty > 0
                              ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-400 dark:ring-amber-500 cursor-pointer shadow-md'
                              : 'border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-400 cursor-pointer hover:shadow-md'
                          }`}
                        >
                          <div>
                            <div
                              className={`text-xs font-bold mb-1 uppercase tracking-tight ${
                                isOutOfStock ? 'text-red-600 dark:text-red-400 tracking-tighter' : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {isOutOfStock ? 'Out of Stock' : product.category}
                            </div>
                            <h3 className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100 line-clamp-2 min-h-[36px]">
                              {product.name}
                            </h3>
                          </div>

                          <div className="mt-4 flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                              <span
                                className={`text-xs font-medium italic ${
                                  isOutOfStock
                                    ? 'text-red-500 dark:text-red-400 font-bold uppercase not-italic'
                                    : isLowStock
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {isOutOfStock ? 'STOCK: 0' : `Stock: ${product.stock_qty}`}
                              </span>
                              <span className="text-base font-extrabold text-slate-900 dark:text-white font-sans">
                                KES {product.price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Bar: Search Product & Shift Status */}
              <div className="mt-auto p-4 bg-slate-900 dark:bg-slate-950 flex flex-wrap sm:flex-nowrap items-center gap-4 text-white shrink-0 border-t border-slate-800">
                <div className="flex-1 min-w-[240px]">
                  <div className="text-[10px] uppercase text-slate-400 font-bold mb-1 tracking-widest">
                    Search Product
                  </div>
                  <div className="bg-slate-800 rounded px-3 py-2 flex items-center border border-slate-700 relative">
                    <span className="text-slate-500 mr-2 text-sm">🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type product name or scan barcode..."
                      className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-400 italic focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-auto sm:w-60 shrink-0">
                  <div className="text-[10px] uppercase text-slate-400 font-bold mb-1 tracking-widest">
                    Shift Status
                  </div>
                  <div className="text-xs text-green-400 font-bold flex items-center gap-2 pt-2 font-mono">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse shrink-0"></span>
                    <span>ONLINE (OFFLINE-FIRST SYNC)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Sleek Cart Sidebar (Visible on desktop >= 1024px, hidden on mobile/minimized screens) */}
            <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-white dark:bg-slate-900 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-200 dark:border-slate-800 shrink-0 transition-colors duration-200">
              {renderCartContent(false)}
            </div>
          </main>

          {/* Mobile & Minimized Screen Floating Cart Bar (Appears when cart has items) */}
          {cart.length > 0 && !isMobileCartOpen && (
            <div className="lg:hidden px-3 py-2.5 bg-slate-900 dark:bg-slate-950 text-white border-t border-slate-800 shadow-xl flex items-center justify-between gap-3 shrink-0 z-20">
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}</span>
                    <span className="text-amber-400 font-mono font-extrabold">• KES {totalAmount.toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Tap to edit or review cart</p>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  View Cart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <span>Pay KES {totalAmount.toLocaleString()}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Mobile & Minimized Screen Slide-in Cart Drawer */}
          {isMobileCartOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
                onClick={() => setIsMobileCartOpen(false)}
              />

              {/* Drawer Container */}
              <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
                {renderCartContent(true)}
              </div>
            </div>
          )}

          {/* Bottom Sleek Navigation Bar */}
          <nav className="h-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-4 sm:gap-10 shrink-0 select-none transition-colors duration-200">
            <button
              type="button"
              onClick={handleGoHome}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 font-black h-full px-3 text-xs tracking-wider cursor-pointer transition-colors"
              title="Return to Main Menu / First Screen"
            >
              <Home className="w-4 h-4 text-amber-500" />
              <span>HOME</span>
            </button>

            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold border-b-2 border-amber-600 dark:border-amber-400 h-full px-4 text-xs tracking-widest cursor-pointer">
              <span className="text-lg">🛒</span> TERMINAL
            </div>
            <div
              onClick={() => handleOpenAdmin('inventory')}
              className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold h-full px-4 text-xs tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <span className="text-lg opacity-60">📦</span> INVENTORY
            </div>
            <div
              onClick={() => handleOpenAdmin('summary')}
              className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold h-full px-4 text-xs tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <span className="text-lg opacity-60">📊</span> REPORTS
            </div>
            <div
              onClick={() => {
                if (currentUser.role === 'ADMIN') {
                  handleOpenAdmin('store');
                } else {
                  setIsChangePasswordOpen(true);
                }
              }}
              className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold h-full px-4 text-xs tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title={currentUser.role === 'ADMIN' ? 'Store & Staff Settings' : 'Account & Password Settings'}
            >
              <span className="text-lg opacity-60">⚙️</span> SETTINGS
            </div>
          </nav>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          currentUser={activeUser}
          onClose={() => setIsChangePasswordOpen(false)}
          onPasswordChanged={(updated) => {
            setActiveUser(updated);
            sessionStorage.setItem('bazu_pos_active_user', JSON.stringify(updated));
          }}
        />
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          totalAmount={totalAmount}
          itemsCount={totalItemsCount}
          storeConfig={storeConfig}
          cashierName={currentUser.name}
          initialCustomer={selectedCustomerForSale}
          onClose={() => {
            setIsCheckoutOpen(false);
            setSelectedCustomerForSale(null);
          }}
          onComplete={handleCompleteSale}
        />
      )}

      {/* Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          sale={activeReceipt.sale}
          items={activeReceipt.items}
          storeConfig={storeConfig}
          onClose={() => setActiveReceipt(null)}
          onNewSale={() => setActiveReceipt(null)}
        />
      )}

      {/* Admin Overlay */}
      {isAdminOpen && (
        <AdminOverlay
          currentUser={unlockedAdminUser || currentUser}
          initialTab={adminInitialTab}
          onClose={() => {
            setIsAdminOpen(false);
            setUnlockedAdminUser(null);
            refreshInventory();
          }}
          onGoHome={handleGoHome}
          onGoToPos={() => {
            setCurrentView('pos');
            setIsAdminOpen(false);
            setUnlockedAdminUser(null);
            refreshInventory();
          }}
          onInventoryChanged={refreshInventory}
          onStoreConfigChanged={(cfg) => {
            setStoreConfig(cfg);
            applyStoreTheme(cfg);
          }}
          onSelectCustomerForSale={(customer) => {
            setSelectedCustomerForSale(customer);
            setIsAdminOpen(false);
            setCurrentView('pos');
            if (cart.length > 0) {
              setIsCheckoutOpen(true);
            }
          }}
        />
      )}

      {/* Print Receipt / Slip History Module */}
      {isPrintReceiptModuleOpen && (
        <PrintReceiptModule
          storeConfig={storeConfig}
          onClose={() => setIsPrintReceiptModuleOpen(false)}
          onGoHome={handleGoHome}
        />
      )}

      {/* Admin PIN Prompt if Salesperson clicks Admin */}
      {showAdminPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl space-y-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Administrator Access Required</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Enter Admin 4-Digit PIN to unlock stock & price management
              </p>
            </div>

            <form onSubmit={handleVerifyAdminPinPrompt} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />

              {adminPinError && (
                <p className="text-[11px] text-rose-500 text-center font-medium">
                  {adminPinError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminPinPrompt(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer transition-colors"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
