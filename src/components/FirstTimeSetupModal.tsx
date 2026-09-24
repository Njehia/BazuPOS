import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Sparkles,
  Store,
  User as UserIcon,
  Package,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Phone,
  Receipt,
  Palette,
  X,
  Check,
  Upload,
} from 'lucide-react';
import { Category, Product, StoreConfig, User } from '../types';
import { LocalDb } from '../lib/storage';
import { THEME_PRESETS_LIST, applyStoreTheme } from '../lib/theme';
import { BazuLogo } from './BazuLogo';
import { SmartStockUploadModal } from './SmartStockUploadModal';

interface FirstTimeSetupModalProps {
  isOpen: boolean;
  canClose?: boolean;
  onClose?: () => void;
  onComplete: (configuredUser: User) => void;
}

interface TempProductItem {
  id: number;
  name: string;
  category: string;
  price: number;
  stock_qty: number;
  unit: string;
  barcode?: string;
}

export const FirstTimeSetupModal: React.FC<FirstTimeSetupModalProps> = ({
  isOpen,
  canClose = false,
  onClose,
  onComplete,
}) => {
  const currentConfig = LocalDb.getStoreConfig();
  const currentUsers = LocalDb.getUsers();
  const adminUser = currentUsers.find((u) => u.role === 'ADMIN') || currentUsers[0] || {
    id: 1,
    name: 'Store Administrator',
    username: 'admin',
    pin: '1234',
    password: 'admin',
    role: 'ADMIN' as const,
  };

  const categories = LocalDb.getCategories();

  // Wizard Step: 1 = Store Details, 2 = Admin Account, 3 = Initial Products
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Store info state
  const [storeName, setStoreName] = useState(currentConfig.store_name || '');
  const [branch, setBranch] = useState(currentConfig.branch || 'Main Branch');
  const [phone, setPhone] = useState(currentConfig.phone_number || '');
  const [till, setTill] = useState(currentConfig.till_number || '');
  const [receiptFooter, setReceiptFooter] = useState(
    currentConfig.receipt_footer || 'Thank you for shopping with us! Karibu tena.'
  );
  const [primaryColor, setPrimaryColor] = useState(currentConfig.primary_color || 'amber');
  const [lowStockThreshold, setLowStockThreshold] = useState(currentConfig.low_stock_threshold || 5);

  // Step 2: Admin user state
  const [adminName, setAdminName] = useState(adminUser.name || 'Store Owner');
  const [adminUsername, setAdminUsername] = useState(adminUser.username || 'admin');
  const [adminPin, setAdminPin] = useState(adminUser.pin || '1234');

  // Step 3: Initial Products state
  const [initialProducts, setInitialProducts] = useState<TempProductItem[]>([]);
  const [isSmartUploadOpen, setIsSmartUploadOpen] = useState(false);

  // Manual product input row
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState(categories[0]?.id || 'beer');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodUnit, setProdUnit] = useState('Bottle');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodInputError, setProdInputError] = useState('');

  const [formError, setFormError] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  if (!isOpen) return null;

  const handleAddManualProduct = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProdInputError('');

    const cleanName = prodName.trim();
    if (!cleanName) {
      setProdInputError('Product name is required.');
      return;
    }

    const priceNum = parseFloat(prodPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setProdInputError('Please enter a valid selling price in KES.');
      return;
    }

    const stockNum = parseInt(prodStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setProdInputError('Please enter a valid initial stock quantity.');
      return;
    }

    const newProd: TempProductItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: cleanName,
      category: prodCategory,
      price: priceNum,
      stock_qty: stockNum,
      unit: prodUnit.trim() || 'Unit',
      barcode: prodBarcode.trim() || `SKU-${Date.now().toString().slice(-6)}`,
    };

    setInitialProducts((prev) => [newProd, ...prev]);
    setProdName('');
    setProdPrice('');
    setProdStock('');
    setProdBarcode('');
  };

  const handleRemoveProduct = (id: number) => {
    setInitialProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSmartUploadApplied = () => {
    // Refresh products count from LocalDb
    setIsSmartUploadOpen(false);
  };

  const handleFinishSetup = () => {
    setFormError('');

    if (!storeName.trim()) {
      setCurrentStep(1);
      setFormError('Please enter your Store / Business Name.');
      return;
    }

    if (!adminName.trim()) {
      setCurrentStep(2);
      setFormError('Please enter Administrator Name.');
      return;
    }

    if (!adminPin.trim() || adminPin.trim().length < 4) {
      setCurrentStep(2);
      setFormError('Administrator PIN / Password must be at least 4 digits/characters.');
      return;
    }

    setIsFinishing(true);

    try {
      // 1. Save Store Configuration
      const cleanStoreId = storeName
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/^_+|_+$/g, '') || 'store_main';

      const updatedStoreConfig = LocalDb.updateStoreConfig({
        store_id: cleanStoreId,
        store_name: storeName.trim(),
        branch: branch.trim() || 'Main Branch',
        phone_number: phone.trim(),
        till_number: till.trim(),
        receipt_footer: receiptFooter.trim(),
        primary_color: primaryColor,
        low_stock_threshold: Number(lowStockThreshold) || 5,
      });

      LocalDb.registerStore(cleanStoreId, storeName.trim(), branch.trim() || 'Main Branch');
      applyStoreTheme(updatedStoreConfig);

      // 2. Update Admin user account
      let activeAdmin: User = adminUser;
      const cleanUsername = adminUsername.trim().toLowerCase() || 'admin';

      if (adminUser && adminUser.id) {
        const updateRes = LocalDb.updateUser(
          adminUser.id,
          {
            name: adminName.trim(),
            username: cleanUsername,
            pin: adminPin.trim(),
            password: adminPin.trim(),
            role: 'ADMIN',
          },
          'ADMIN'
        );
        if (updateRes.user) {
          activeAdmin = updateRes.user;
        }
      } else {
        const addRes = LocalDb.addUser(
          {
            name: adminName.trim(),
            username: cleanUsername,
            pin: adminPin.trim(),
            password: adminPin.trim(),
            role: 'ADMIN',
          },
          'ADMIN'
        );
        if (addRes.user) {
          activeAdmin = addRes.user;
        }
      }

      // 3. Add any manual products configured in Step 3
      if (initialProducts.length > 0) {
        for (const item of initialProducts) {
          LocalDb.addProduct(
            {
              name: item.name,
              category: item.category,
              price: item.price,
              stock_qty: item.stock_qty,
              unit: item.unit,
              barcode: item.barcode || `SKU-${Date.now()}`,
            },
            'ADMIN'
          );
        }
      }

      // 4. Mark setup as completed
      LocalDb.markSetupCompleted(true);

      setTimeout(() => {
        setIsFinishing(false);
        onComplete(activeAdmin);
      }, 300);
    } catch (err: any) {
      setIsFinishing(false);
      setFormError(err?.message || 'An error occurred while saving setup. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header with Bazu POS Branding */}
        <div className="bg-gradient-to-r from-slate-950 via-[#1E1B4B] to-slate-950 px-6 py-5 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <BazuLogo className="w-11 h-11 shrink-0 shadow-md ring-2 ring-amber-500/30 rounded-2xl" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-white">
                  Welcome to Bazu POS
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Initial Setup
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Setup your store information, administrator credentials, and initial stock
              </p>
            </div>
          </div>

          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Progress Pills */}
        <div className="bg-slate-50 dark:bg-slate-950/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 w-full justify-between">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                currentStep === 1
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                  currentStep === 1
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                1
              </span>
              <span className="hidden sm:inline">Store Details</span>
            </button>

            <div className="h-0.5 flex-1 mx-2 bg-slate-200 dark:bg-slate-800" />

            {/* Step 2 Pill */}
            <button
              type="button"
              onClick={() => {
                if (storeName.trim()) setCurrentStep(2);
                else setFormError('Please enter a Store Name first.');
              }}
              className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                currentStep === 2
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                  currentStep === 2
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                2
              </span>
              <span className="hidden sm:inline">Admin Account</span>
            </button>

            <div className="h-0.5 flex-1 mx-2 bg-slate-200 dark:bg-slate-800" />

            {/* Step 3 Pill */}
            <button
              type="button"
              onClick={() => {
                if (storeName.trim()) setCurrentStep(3);
                else setFormError('Please enter a Store Name first.');
              }}
              className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                currentStep === 3
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                  currentStep === 3
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                3
              </span>
              <span className="hidden sm:inline">Add Stock</span>
            </button>
          </div>
        </div>

        {/* Global Error Prompt */}
        {formError && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2 shrink-0">
            <span className="font-bold">Notice:</span>
            <span>{formError}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-800 dark:text-slate-200">
          {/* ==================================================== */}
          {/* STEP 1: STORE & BUSINESS PROFILE */}
          {/* ==================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Store className="w-4 h-4 text-amber-500" />
                <span>Step 1: Your Store & Business Information</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                This information will appear on printed customer receipts, PDF reports, and terminal headers.
              </p>

              {/* Store Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Store / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Valley Liquor Store, Apex Retail, QuickMart"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Branch & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branch / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Branch, Kilimani, Westlands"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +254 712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* M-Pesa Till & Alert Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    M-Pesa Buy Goods Till / Paybill
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 882190"
                    value={till}
                    onChange={(e) => setTill(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Low Stock Alert Warning (Units)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value) || 5)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Receipt Footer Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Welcome / Footer Disclaimer
                </label>
                <textarea
                  rows={2}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="e.g. Thank you for shopping with us! Karibu tena."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Theme Color Presets */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-500" />
                  <span>Choose Store Brand Accent Color</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {THEME_PRESETS_LIST.slice(0, 6).map((theme) => {
                    const isSelected = primaryColor === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setPrimaryColor(theme.id)}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-xs ring-2 ring-amber-500/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full shadow-xs border border-white"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {theme.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: ADMINISTRATOR PROFILE */}
          {/* ==================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Step 2: Setup Administrator Login Credentials</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                This account holds master administrator authority to add products, adjust selling prices, and oversee sales.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wanjiku Proprietor, Store Manager"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Login Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Staff and manager enter this to log into the terminal.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Security PIN / Password (min 4 chars) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1234"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Keep this PIN secure. You will use it to authenticate.
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Master Administrator Authority:</strong> You will be able to register additional cashiers,
                  supervisors, and accountants directly from the Admin Panel once inside.
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 3: ADD STOCK / PRODUCTS */}
          {/* ==================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Package className="w-4 h-4 text-amber-500" />
                <span>Step 3: Add Initial Products in Stock</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                All pre-seeded demo products and fake sales have been removed. Add your real products now or skip to add them in the terminal anytime.
              </p>

              {/* Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Smart Receipt Scan */}
                <div
                  onClick={() => setIsSmartUploadOpen(true)}
                  className="p-4 rounded-2xl border-2 border-dashed border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        AI Multimodal
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                      Scan Supplier Receipt / Invoice
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload a photo, PDF, or Excel sheet from your distributor to automatically extract and stock products in seconds.
                    </p>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Launch Smart Upload</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Option 2: Skip for now */}
                <div
                  onClick={handleFinishSetup}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Zero Stock Start
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                      Skip and Add Later in POS
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      You can start with an empty catalog and register products manually or scan invoices anytime from the terminal.
                    </p>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:translate-x-0.5 transition-transform">
                    <span>Proceed to Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Option 3: Quick Manual Entry Form */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Or Quick Add Product Manually
                  </span>
                  {initialProducts.length > 0 && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {initialProducts.length} product(s) ready to stock
                    </span>
                  )}
                </div>

                {prodInputError && (
                  <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                    {prodInputError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Product Brand & Name (e.g. Tusker 500ml)"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <input
                      type="number"
                      placeholder="Price (KES)"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      placeholder="Initial Stock Qty"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleAddManualProduct()}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>

                {/* List of manually added products */}
                {initialProducts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs mt-2">
                    {initialProducts.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            KES {item.price.toLocaleString()} • {item.stock_qty} in stock • {item.category}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(item.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setCurrentStep((prev) => (prev - 1) as any);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) {
                    if (!storeName.trim()) {
                      setFormError('Please enter your Store / Business Name.');
                      return;
                    }
                  } else if (currentStep === 2) {
                    if (!adminName.trim()) {
                      setFormError('Please enter Administrator Name.');
                      return;
                    }
                    if (!adminPin.trim() || adminPin.trim().length < 4) {
                      setFormError('Administrator PIN must be at least 4 digits.');
                      return;
                    }
                  }
                  setFormError('');
                  setCurrentStep((prev) => (prev + 1) as any);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isFinishing}
                onClick={handleFinishSetup}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isFinishing ? 'Configuring Store...' : 'Complete Setup & Launch POS'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Smart Stock Upload Modal */}
      {isSmartUploadOpen && (
        <SmartStockUploadModal
          isOpen={isSmartUploadOpen}
          currentUser={adminUser}
          storeConfig={currentConfig}
          onClose={() => setIsSmartUploadOpen(false)}
          onStockApplied={handleSmartUploadApplied}
        />
      )}
    </div>
  );
};
