import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Barcode,
  Camera,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  Printer,
  Sparkles,
  Wifi,
  WifiOff,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Tag,
  FileText,
  Clock,
  Building,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Store,
} from 'lucide-react';
import { usePOS, TenantProduct } from '../hooks/usePOS';
import { CartItem, ProductVariant, User } from '../types';
import { printViaWebBluetooth, printViaWebUSB, ESCPOSReceiptData } from '../lib/escpos';
import { ManagerPinOverrideModal } from './ManagerPinOverrideModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { AuthService, TenantMetadata } from '../services/auth';

interface CheckoutTerminalProps {
  currentUser?: User;
  onOpenOwnerDashboard?: () => void;
  onLogout?: () => void;
}

export const CheckoutTerminal: React.FC<CheckoutTerminalProps> = ({
  currentUser,
  onOpenOwnerDashboard,
  onLogout,
}) => {
  const {
    tenantId,
    products,
    isOnline,
    processSale,
    activeShift,
    startShift,
    closeShift,
  } = usePOS();

  // State
  const [tenantMeta, setTenantMeta] = useState<TenantMetadata | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showQuickKeysOnly, setShowQuickKeysOnly] = useState(false);

  // Scanner modal
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Payment modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentTender, setPaymentTender] = useState<'CASH' | 'MPESA' | 'CARD' | 'SPLIT' | 'DEBT'>('CASH');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitMpesaAmount, setSplitMpesaAmount] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [mpesaStatus, setMpesaStatus] = useState<'idle' | 'prompting' | 'confirmed' | 'failed'>('idle');

  // Manager override modal
  const [showManagerPinModal, setShowManagerPinModal] = useState(false);
  const [managerAction, setManagerAction] = useState<{
    type: 'VOID_ITEM' | 'CLEAR_CART' | 'DISCOUNT' | 'REFUND';
    targetIndex?: number;
  } | null>(null);

  // Printer feedback
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null);

  // Load tenant metadata
  useEffect(() => {
    AuthService.getActiveTenantMetadata(tenantId).then((meta) => {
      setTenantMeta(meta);
    });
  }, [tenantId]);

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (showQuickKeysOnly && !p.quickKey) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesBarcode = p.barcode.toLowerCase().includes(query);
        const matchesCategory = p.category.toLowerCase().includes(query);
        return matchesName || matchesBarcode || matchesCategory;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery, showQuickKeysOnly]);

  // USB/Bluetooth HID Barcode Hardware Scanner key listener
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      // If user is focused on an input other than search, let them type
      if (isInput && (activeEl as HTMLElement).id !== 'pos-search-input') {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // HID scanners type keys very fast (< 45ms between characters)
      if (diff > 90) {
        barcodeBufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const code = barcodeBufferRef.current.trim();
        if (code.length >= 4) {
          e.preventDefault();
          const matched = products.find(
            (p) => p.barcode.toLowerCase() === code.toLowerCase()
          );
          if (matched) {
            addToCart(matched);
            setSearchQuery('');
          }
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  // Cart operations
  const addToCart = (product: TenantProduct, variant?: ProductVariant) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          String(item.product.id) === String(product.id) &&
          item.selectedVariant?.id === variant?.id
      );

      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += 1;
        return copy;
      } else {
        return [
          ...prev,
          {
            product: {
              id: Number(product.id.replace(/\D/g, '')) || Date.now(),
              barcode: product.barcode,
              name: product.name,
              category: product.category,
              price: product.price,
              stock_qty: product.stockQuantity,
              unit: product.unit || 'pcs',
              is_quick_key: product.quickKey,
            },
            quantity: 1,
            selectedVariant: variant,
          },
        ];
      }
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index].quantity = newQty;
      }
      return copy;
    });
  };

  const removeItem = (index: number) => {
    // If cashier, optionally request manager override
    if (currentUser?.role === 'SALES_CASHIER' || currentUser?.role === 'SALES') {
      setManagerAction({ type: 'VOID_ITEM', targetIndex: index });
      setShowManagerPinModal(true);
      return;
    }
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (currentUser?.role === 'SALES_CASHIER' || currentUser?.role === 'SALES') {
      setManagerAction({ type: 'CLEAR_CART' });
      setShowManagerPinModal(true);
      return;
    }
    setCart([]);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const unitPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
      const discount = item.discountPercent ? (unitPrice * item.discountPercent) / 100 : 0;
      return acc + (unitPrice - discount) * item.quantity;
    }, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentTender('CASH');
    const half = Math.floor(subtotal / 2);
    setSplitCashAmount(half);
    setSplitMpesaAmount(subtotal - half);
    setCashTendered(String(subtotal));
    setMpesaStatus('idle');
    setShowCheckoutModal(true);
  };

  // Trigger STK Push
  const handleTriggerMpesaStk = () => {
    if (!customerPhone || customerPhone.length < 9) {
      alert('Please enter a valid M-Pesa phone number');
      return;
    }
    setMpesaStatus('prompting');
    setTimeout(() => {
      setMpesaStatus('confirmed');
    }, 3000);
  };

  // Finalize Sale
  const handleFinalizeSale = async () => {
    try {
      const sale = await processSale({
        cart,
        totalAmount: subtotal,
        paymentMethod: paymentTender,
        splitCashAmount: paymentTender === 'SPLIT' ? splitCashAmount : undefined,
        splitMpesaAmount: paymentTender === 'SPLIT' ? splitMpesaAmount : undefined,
        cashierId: currentUser ? String(currentUser.id) : 'cashier_1',
        cashierName: currentUser ? currentUser.name : 'Cashier',
        referenceCode: `BZ-${Date.now().toString().slice(-6)}`,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        shiftId: activeShift?.id,
      });

      setLastCompletedSale(sale);
      setCart([]);
      setShowCheckoutModal(false);
      setPrintStatus('Sale recorded! Ready for thermal print.');
    } catch (err: any) {
      alert('Error finalizing sale: ' + (err.message || String(err)));
    }
  };

  // Direct Thermal Printing via Web Bluetooth
  const handleBluetoothPrint = async () => {
    if (!lastCompletedSale) return;
    setIsPrinting(true);
    setPrintStatus('Connecting to Bluetooth Thermal Printer...');
    try {
      const receiptData: ESCPOSReceiptData = {
        storeConfig: {
          id: 1,
          store_name: tenantMeta?.businessName || 'Bazu Retail',
          branch: 'Main Terminal',
          phone_number: '0700000000',
          till_number: '123456',
          receipt_footer: 'Thank you for your business!',
          primary_color: 'amber',
        },
        sale: {
          id: Number(lastCompletedSale.id.replace(/\D/g, '')) || 101,
          cashier_name: lastCompletedSale.cashierName || 'Cashier',
          total_amount: lastCompletedSale.totalAmount,
          payment_method: lastCompletedSale.paymentMethod,
          created_at: lastCompletedSale.createdAt,
          items_count: lastCompletedSale.items.length,
          split_cash_amount: lastCompletedSale.splitCash,
          split_mpesa_amount: lastCompletedSale.splitMpesa,
        },
        items: lastCompletedSale.items.map((it: any, idx: number) => ({
          id: idx + 1,
          sale_id: 101,
          product_id: Number(it.productId.replace(/\D/g, '')) || idx + 1,
          product_name: it.name,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total_price: it.totalPrice,
        })),
      };

      const result = await printViaWebBluetooth(receiptData);
      setPrintStatus(result.message);
    } catch (err: any) {
      setPrintStatus('Bluetooth Print Failed: ' + (err.message || 'Device disconnected'));
    } finally {
      setIsPrinting(false);
    }
  };

  // Direct Thermal Printing via WebUSB
  const handleUsbPrint = async () => {
    if (!lastCompletedSale) return;
    setIsPrinting(true);
    setPrintStatus('Connecting to USB Thermal Printer...');
    try {
      const receiptData: ESCPOSReceiptData = {
        storeConfig: {
          id: 1,
          store_name: tenantMeta?.businessName || 'Bazu Retail',
          branch: 'Main Terminal',
          phone_number: '0700000000',
          till_number: '123456',
          receipt_footer: 'Thank you for your business!',
          primary_color: 'amber',
        },
        sale: {
          id: Number(lastCompletedSale.id.replace(/\D/g, '')) || 101,
          cashier_name: lastCompletedSale.cashierName || 'Cashier',
          total_amount: lastCompletedSale.totalAmount,
          payment_method: lastCompletedSale.paymentMethod,
          created_at: lastCompletedSale.createdAt,
          items_count: lastCompletedSale.items.length,
          split_cash_amount: lastCompletedSale.splitCash,
          split_mpesa_amount: lastCompletedSale.splitMpesa,
        },
        items: lastCompletedSale.items.map((it: any, idx: number) => ({
          id: idx + 1,
          sale_id: 101,
          product_id: Number(it.productId.replace(/\D/g, '')) || idx + 1,
          product_name: it.name,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total_price: it.totalPrice,
        })),
      };

      const result = await printViaWebUSB(receiptData);
      setPrintStatus(result.message);
    } catch (err: any) {
      setPrintStatus('USB Print Failed: ' + (err.message || 'Printer unavailable'));
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="h-16 px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base tracking-wider uppercase text-white">
                {tenantMeta?.businessName || 'Bazu POS'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {tenantMeta?.subscriptionStatus === 'trial' ? 'Trial Plan' : 'Active SaaS'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Tenant ID: <span className="text-slate-300 font-bold">{tenantId}</span>
            </p>
          </div>
        </div>

        {/* Center Status Controls */}
        <div className="flex items-center gap-2">
          {/* Connectivity Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isOnline
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Cloud Synced' : 'Offline Mode (IndexedDB)'}</span>
          </div>

          {/* Active Shift Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {activeShift
                ? `Shift Open (KES ${activeShift.openingCash.toLocaleString()})`
                : 'No Active Shift'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenOwnerDashboard && (
            <button
              onClick={onOpenOwnerDashboard}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Building className="w-3.5 h-3.5" />
              <span>Owner Dashboard</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Lock / Logout"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Terminal Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Product Catalog Grid & Search */}
        <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-900/60 overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="pos-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or scan barcode (SKU)..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Camera Barcode Trigger */}
            <button
              onClick={() => setShowCameraScanner(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Scan with Camera"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Camera</span>
            </button>

            {/* Quick Keys Toggle */}
            <button
              onClick={() => setShowQuickKeysOnly(!showQuickKeysOnly)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                showQuickKeysOnly
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Keys</span>
            </button>
          </div>

          {/* Category Pills Strip */}
          <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="group p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.98]"
              >
                {product.quickKey && (
                  <span className="absolute top-2 right-2 text-amber-400 text-xs">★</span>
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 block">
                    {product.category}
                  </span>
                  <h3 className="font-bold text-sm text-white line-clamp-2 mt-0.5 leading-snug">
                    {product.name}
                  </h3>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <span className="font-black text-amber-400 text-base">
                    KES {product.price.toLocaleString()}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      product.stockQuantity <= (product.lowStockThreshold || 10)
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {product.stockQuantity} left
                  </span>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-500">
                <Store className="w-12 h-12 stroke-1 mb-2 text-slate-600" />
                <p className="font-semibold text-sm">No products found</p>
                <p className="text-xs text-slate-600">Try changing category or search query</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart & Checkout Tray */}
        <div className="w-full md:w-96 flex flex-col bg-slate-950 border-t md:border-t-0 border-slate-800">
          {/* Cart Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Active Order</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300">
                {totalItemsCount} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {cart.map((item, idx) => {
              const unitPrice = item.selectedVariant
                ? item.selectedVariant.price
                : item.product.price;
              const lineTotal = unitPrice * item.quantity;

              return (
                <div
                  key={`${item.product.id}_${item.selectedVariant?.id || 'std'}_${idx}`}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-white truncate">{item.product.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      KES {unitPrice.toLocaleString()} × {item.quantity}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      onClick={() => updateQuantity(idx, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs w-5 text-center text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(idx, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Total & Remove */}
                  <div className="text-right">
                    <span className="font-black text-xs text-amber-400 block">
                      KES {lineTotal.toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-[10px] text-slate-500 hover:text-rose-400 mt-0.5"
                    >
                      Void
                    </button>
                  </div>
                </div>
              );
            })}

            {cart.length === 0 && (
              <div className="h-48 flex flex-col items-center justify-center text-slate-600">
                <Barcode className="w-10 h-10 stroke-1 mb-2" />
                <p className="text-xs font-semibold">Cart is currently empty</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Click any product or scan a barcode
                </p>
              </div>
            )}
          </div>

          {/* Cart Summary & Checkout Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Payable
              </span>
              <span className="font-black text-2xl text-amber-400">
                KES {subtotal.toLocaleString()}
              </span>
            </div>

            {/* Quick Checkout Button */}
            <button
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                cart.length > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>Charge KES {subtotal.toLocaleString()}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Hardware Print Controls */}
            {lastCompletedSale && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex-1 truncate text-[11px] text-slate-400">
                  {printStatus || 'Print last receipt'}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleBluetoothPrint}
                    disabled={isPrinting}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Print via Bluetooth"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>BT</span>
                  </button>
                  <button
                    onClick={handleUsbPrint}
                    disabled={isPrinting}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Print via USB"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>USB</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Selection Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-black text-lg text-white">Select Tender Method</h2>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Total Display */}
            <div className="my-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                Total Due
              </span>
              <p className="font-black text-3xl text-white mt-1">
                KES {subtotal.toLocaleString()}
              </p>
            </div>

            {/* Tender Options */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setPaymentTender('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentTender === 'CASH'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">CASH</span>
              </button>

              <button
                onClick={() => setPaymentTender('MPESA')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentTender === 'MPESA'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-xs">M-PESA</span>
              </button>

              <button
                onClick={() => setPaymentTender('SPLIT')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentTender === 'SPLIT'
                    ? 'bg-indigo-500 text-white border-indigo-400 font-black'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-5 h-5" />
                <span className="text-xs">SPLIT (Cash+M-Pesa)</span>
              </button>

              <button
                onClick={() => setPaymentTender('DEBT')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentTender === 'DEBT'
                    ? 'bg-rose-500 text-white border-rose-400 font-black'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">CREDIT / TAB</span>
              </button>
            </div>

            {/* Split Tender Inputs */}
            {paymentTender === 'SPLIT' && (
              <div className="space-y-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cash Portion:</span>
                  <input
                    type="number"
                    value={splitCashAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSplitCashAmount(val);
                      setSplitMpesaAmount(Math.max(0, subtotal - val));
                    }}
                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-white font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">M-Pesa Portion:</span>
                  <input
                    type="number"
                    value={splitMpesaAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSplitMpesaAmount(val);
                      setSplitCashAmount(Math.max(0, subtotal - val));
                    }}
                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-emerald-400 font-bold"
                  />
                </div>
              </div>
            )}

            {/* M-Pesa STK Push / QR Trigger */}
            {(paymentTender === 'MPESA' || paymentTender === 'SPLIT') && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400">Customer Phone (M-Pesa)</label>
                  <span className="text-[10px] text-slate-400">STK Push / Buy Goods</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono"
                  />
                  <button
                    onClick={handleTriggerMpesaStk}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Send Push
                  </button>
                </div>

                {/* Real-time Status Indicator */}
                {mpesaStatus === 'prompting' && (
                  <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold animate-pulse pt-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Awaiting customer PIN input on handset...</span>
                  </div>
                )}
                {mpesaStatus === 'confirmed' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>M-Pesa payment confirmed successfully!</span>
                  </div>
                )}
              </div>
            )}

            {/* Final Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeSale}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {showCameraScanner && (
        <BarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScan={(scannedBarcode) => {
            const matched = products.find(
              (p) => p.barcode.toLowerCase() === scannedBarcode.toLowerCase()
            );
            if (matched) {
              addToCart(matched);
            } else {
              setSearchQuery(scannedBarcode);
            }
            setShowCameraScanner(false);
          }}
        />
      )}

      {/* Manager PIN Override Modal */}
      {showManagerPinModal && (
        <ManagerPinOverrideModal
          isOpen={showManagerPinModal}
          onClose={() => setShowManagerPinModal(false)}
          actionName={managerAction?.type || 'Manager Authorization'}
          onAuthorized={() => {
            if (managerAction?.type === 'CLEAR_CART') {
              setCart([]);
            } else if (
              managerAction?.type === 'VOID_ITEM' &&
              managerAction.targetIndex !== undefined
            ) {
              setCart((prev) => prev.filter((_, i) => i !== managerAction.targetIndex));
            }
            setShowManagerPinModal(false);
          }}
        />
      )}
    </div>
  );
};
