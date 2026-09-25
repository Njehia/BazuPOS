import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  Clock,
  Printer,
  Plus,
  RefreshCw,
  ArrowLeft,
  Users,
  Building,
  CheckCircle,
  Shield,
  Search,
  Package,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { usePOS, TenantProduct, TenantSale, TenantShift } from '../hooks/usePOS';
import { AuthService, TenantMetadata, TenantUser } from '../services/auth';
import { buildESCPOSShiftReport, printViaWebBluetooth, printViaWebUSB } from '../lib/escpos';
import { ShiftSummaryReport, StoreConfig } from '../types';

interface OwnerDashboardProps {
  onBackToTerminal?: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onBackToTerminal }) => {
  const {
    tenantId,
    products,
    sales,
    shifts,
    activeShift,
    addProduct,
    updateProduct,
    startShift,
    closeShift,
  } = usePOS();

  // Tenant metadata & staff
  const [tenantMeta, setTenantMeta] = useState<TenantMetadata | null>(null);
  const [tenantStaff, setTenantStaff] = useState<TenantUser[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'shifts' | 'staff'>('overview');

  // New product modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Beer');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCost, setNewProductCost] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductBarcode, setNewProductBarcode] = useState('');

  // Shift report state
  const [reportType, setReportType] = useState<'X' | 'Z'>('X');
  const [closingCashInput, setClosingCashInput] = useState('');
  const [shiftFeedback, setShiftFeedback] = useState<string | null>(null);

  // New staff modal state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [newStaffPin, setNewStaffPin] = useState('1234');

  // Load tenant metadata & staff
  useEffect(() => {
    AuthService.getActiveTenantMetadata(tenantId).then((meta) => setTenantMeta(meta));
    AuthService.getTenantUsers(tenantId).then((users) => setTenantStaff(users));
  }, [tenantId]);

  // Today's Sales calculation
  const todaySales = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sales.filter((s) => s.createdAt.startsWith(todayStr));
  }, [sales]);

  // Key KPI metrics
  const totalRevenue = useMemo(() => {
    return todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  }, [todaySales]);

  const transactionCount = todaySales.length;

  const averageOrderValue = useMemo(() => {
    return transactionCount > 0 ? Math.round(totalRevenue / transactionCount) : 0;
  }, [totalRevenue, transactionCount]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let mpesa = 0;
    let other = 0;

    todaySales.forEach((s) => {
      if (s.paymentMethod === 'CASH') cash += s.totalAmount;
      else if (s.paymentMethod === 'MPESA') mpesa += s.totalAmount;
      else if (s.paymentMethod === 'SPLIT') {
        cash += s.splitCash || 0;
        mpesa += s.splitMpesa || 0;
      } else {
        other += s.totalAmount;
      }
    });

    return { cash, mpesa, other };
  }, [todaySales]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= (p.lowStockThreshold || 10));
  }, [products]);

  // Quick Restock Handler
  const handleQuickRestock = async (productId: string, addQty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    await updateProduct(productId, {
      stockQuantity: prod.stockQuantity + addQty,
    });
  };

  // Add Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPrice) return;

    await addProduct({
      name: newProductName.trim(),
      category: newProductCategory,
      price: Number(newProductPrice) || 0,
      costPrice: Number(newProductCost) || 0,
      stockQuantity: Number(newProductStock) || 0,
      barcode: newProductBarcode.trim() || String(Date.now()),
      quickKey: true,
      unit: 'pcs',
    });

    setShowAddProductModal(false);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductCost('');
    setNewProductStock('');
    setNewProductBarcode('');
  };

  // Add Staff Submit
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    await AuthService.addTenantStaff(tenantId, {
      name: newStaffName.trim(),
      email: newStaffEmail.trim() || `${newStaffName.toLowerCase().replace(/\s+/g, '')}@bazu.local`,
      role: newStaffRole,
      pinHash: newStaffPin || '1234',
    });

    const updated = await AuthService.getTenantUsers(tenantId);
    setTenantStaff(updated);
    setShowAddStaffModal(false);
    setNewStaffName('');
    setNewStaffEmail('');
  };

  // Print X/Z Report via Web Bluetooth / USB
  const handlePrintReport = async (kind: 'BT' | 'USB') => {
    setShiftFeedback(`Preparing ${reportType}-Report for print...`);
    try {
      const storeConfig: StoreConfig = {
        id: 1,
        store_name: tenantMeta?.businessName || 'Bazu POS',
        branch: 'Main Branch',
        phone_number: '0700000000',
        till_number: '123456',
        receipt_footer: 'End of Report',
        primary_color: 'amber',
      };

      const report: ShiftSummaryReport = {
        shift: {
          id: activeShift?.id || 'SHIFT-001',
          store_id: tenantId,
          cashier_id: 1,
          cashier_name: activeShift?.cashierName || 'Cashier',
          opened_at: activeShift?.openTime || new Date().toISOString(),
          status: (activeShift?.status as any) || 'OPEN',
          opening_float: activeShift?.openingCash || 5000,
        },
        period: {
          start: activeShift?.openTime || new Date().toISOString(),
          end: new Date().toISOString(),
          duration_minutes: 240,
          is_active: true,
        },
        sales: {
          total_amount: totalRevenue,
          total_count: transactionCount,
          total_items_sold: todaySales.reduce((a, b) => a + b.items.length, 0),
          average_ticket: averageOrderValue,
          cash_sales_amount: paymentBreakdown.cash,
          cash_sales_count: todaySales.filter((s) => s.paymentMethod === 'CASH').length,
          mpesa_sales_amount: paymentBreakdown.mpesa,
          mpesa_sales_count: todaySales.filter((s) => s.paymentMethod === 'MPESA').length,
          debt_sales_amount: paymentBreakdown.other,
          debt_sales_count: 0,
          split_sales_amount: 0,
          split_sales_count: 0,
        },
        mpesa_transactions: {
          total_amount: paymentBreakdown.mpesa,
          count: todaySales.filter((s) => s.paymentMethod === 'MPESA').length,
          transactions: [],
        },
        cash_adjustments: {
          total_in: 0,
          total_out: 0,
          net_adjustment: 0,
          count: 0,
          items: [],
        },
        debt_repayments: {
          total_cash: 0,
          total_mpesa: 0,
          count: 0,
        },
        drawer_reconciliation: {
          opening_float: activeShift?.openingCash || 5000,
          cash_sales: paymentBreakdown.cash,
          cash_debt_collections: 0,
          cash_additions: 0,
          cash_drops_payouts: 0,
          expected_cash_in_drawer: (activeShift?.openingCash || 5000) + paymentBreakdown.cash,
        },
      };

      const bytes = buildESCPOSShiftReport(report, reportType, storeConfig);

      if (kind === 'BT') {
        await printViaWebBluetooth(bytes);
      } else {
        await printViaWebUSB(bytes);
      }
      setShiftFeedback(`${reportType}-Report printed successfully!`);
    } catch (err: any) {
      setShiftFeedback(`Print failed: ${err.message || String(err)}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onBackToTerminal && (
            <button
              onClick={onBackToTerminal}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Return to Cashier Terminal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg text-white">Owner Monitoring Dashboard</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Merchant: <span className="font-bold text-slate-200">{tenantMeta?.businessName || 'Bazu POS'}</span> • Tenant:{' '}
              <span className="font-mono text-amber-400">{tenantId}</span>
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Sales
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inventory ({lowStockProducts.length} low)
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'shifts'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            X/Z Shifts
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Staff &amp; Roles
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Today's Gross Sales
            </span>
            <p className="font-black text-3xl text-white mt-1">
              KES {totalRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">
              Live updates via Cloud Firestore
            </p>
          </div>

          {/* Transactions */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Total Transactions
            </span>
            <p className="font-black text-3xl text-white mt-1">
              {transactionCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Orders checked out today
            </p>
          </div>

          {/* Average Order Value */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Average Order Value (AOV)
            </span>
            <p className="font-black text-3xl text-white mt-1">
              KES {averageOrderValue.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Per customer receipt
            </p>
          </div>

          {/* Low Stock Warning */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Low Stock Items
            </span>
            <p className="font-black text-3xl text-rose-400 mt-1">
              {lowStockProducts.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Items need replenishment
            </p>
          </div>
        </div>

        {/* Payment Breakdown Strip */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Cash:</span>
              <span className="font-black text-sm text-white">
                KES {paymentBreakdown.cash.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">M-Pesa:</span>
              <span className="font-black text-sm text-emerald-400">
                KES {paymentBreakdown.mpesa.toLocaleString()}
              </span>
            </div>
            {paymentBreakdown.other > 0 && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-400">Other/Debt:</span>
                <span className="font-black text-sm text-indigo-300">
                  KES {paymentBreakdown.other.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="text-xs font-mono text-slate-400">
            Subscription: <span className="font-bold text-emerald-400 uppercase">{tenantMeta?.subscriptionStatus || 'Active'}</span> ({tenantMeta?.plan || 'Starter'} Plan)
          </div>
        </div>

        {/* Tab 1: Live Overview & Feed */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Sales Feed */}
            <div className="lg:col-span-2 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-white">Real-Time Transactions Stream</h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {todaySales.length} today
                </span>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {todaySales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-amber-400 font-mono">
                          {sale.referenceCode}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {sale.paymentMethod}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-semibold mt-1">
                        {sale.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cashier: {sale.cashierName || 'Cashier'} • {new Date(sale.createdAt).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-base text-white block">
                        KES {sale.totalAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">
                        {sale.status}
                      </span>
                    </div>
                  </div>
                ))}

                {todaySales.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                    <ShoppingBag className="w-8 h-8 stroke-1 mb-2" />
                    <p className="text-xs font-semibold">No sales recorded yet today</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      New transactions will appear here instantly
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Low Stock Highlight */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <h2 className="font-bold text-base text-white">Stock Depletion Warnings</h2>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-white truncate">{p.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        KES {p.price.toLocaleString()} • {p.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/30 text-rose-300">
                        {p.stockQuantity} left
                      </span>
                      <button
                        onClick={() => handleQuickRestock(p.id, 12)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-400 transition-colors cursor-pointer"
                        title="Add 12 units to stock"
                      >
                        +12
                      </button>
                    </div>
                  </div>
                ))}

                {lowStockProducts.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-300">Inventory levels are healthy</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      No products below low-stock threshold
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Inventory Catalog Management */}
        {activeTab === 'inventory' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-white">Tenant Product Catalog</h2>
                <p className="text-xs text-slate-400">
                  Total of {products.length} products stored under /tenants/{tenantId}/products
                </p>
              </div>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Product Name</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold text-right">Selling Price</th>
                    <th className="pb-3 font-semibold text-right">Cost Price</th>
                    <th className="pb-3 font-semibold text-center">On-Hand Stock</th>
                    <th className="pb-3 font-semibold">Barcode / SKU</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-850/50">
                      <td className="py-3 font-bold text-white flex items-center gap-1.5">
                        {p.quickKey && <span className="text-amber-400">★</span>}
                        <span>{p.name}</span>
                      </td>
                      <td className="py-3 text-slate-300">{p.category}</td>
                      <td className="py-3 text-right font-black text-amber-400">
                        KES {p.price.toLocaleString()}
                      </td>
                      <td className="py-3 text-right text-slate-400">
                        KES {p.costPrice.toLocaleString()}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            p.stockQuantity <= (p.lowStockThreshold || 10)
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {p.stockQuantity}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-400">{p.barcode}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleQuickRestock(p.id, 12)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                            title="Add 12 to stock"
                          >
                            +12
                          </button>
                          <button
                            onClick={() => handleQuickRestock(p.id, 24)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                            title="Add 24 to stock"
                          >
                            +24
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Shift Management & X/Z Reports */}
        {activeTab === 'shifts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shift Controls & X/Z Generator */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <h2 className="font-bold text-base text-white">Shift Reconciliation &amp; X/Z Reports</h2>
              <p className="text-xs text-slate-400">
                Generate mid-shift readings (X-Report) or perform end-of-day closure (Z-Report) with cash drawer balancing.
              </p>

              {/* Status Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Shift Status:</span>
                  <span className="font-bold text-emerald-400 uppercase">
                    {activeShift ? 'Shift Active (Open)' : 'No Open Shift'}
                  </span>
                </div>
                {activeShift && (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Opening Float:</span>
                      <span className="font-mono text-white font-bold">
                        KES {activeShift.openingCash.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Cash Sales Today:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        KES {paymentBreakdown.cash.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                      <span className="text-slate-300 font-bold">Expected Drawer Cash:</span>
                      <span className="font-mono text-emerald-400 font-black text-sm">
                        KES {(activeShift.openingCash + paymentBreakdown.cash).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Report Selection Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setReportType('X')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    reportType === 'X'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  X-Report (Snapshot)
                </button>
                <button
                  onClick={() => setReportType('Z')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    reportType === 'Z'
                      ? 'bg-rose-500 text-white border-rose-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Z-Report (End-of-Day)
                </button>
              </div>

              {/* Print Report Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintReport('BT')}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print via Bluetooth</span>
                </button>
                <button
                  onClick={() => handlePrintReport('USB')}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print via USB</span>
                </button>
              </div>

              {shiftFeedback && (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono text-amber-300">
                  {shiftFeedback}
                </div>
              )}
            </div>

            {/* Shift History Log */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <h2 className="font-bold text-base text-white">Shift Audit History</h2>
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {s.cashierName || 'Cashier'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'OPEN'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Opened: {new Date(s.openTime).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Float / Closing</span>
                      <span className="font-bold text-xs text-amber-400 font-mono">
                        KES {s.openingCash.toLocaleString()} /{' '}
                        {s.closingCash !== undefined
                          ? `KES ${s.closingCash.toLocaleString()}`
                          : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Staff & Permissions */}
        {activeTab === 'staff' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-white">Store Staff &amp; Terminal Operators</h2>
                <p className="text-xs text-slate-400">
                  Manage cashier logins, supervisor roles, and quick PIN credentials.
                </p>
              </div>
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tenantStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="font-bold text-sm text-white">{staff.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{staff.email}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      {staff.role}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">PIN</span>
                    <span className="font-mono text-xs font-bold text-slate-300">••••</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProduct}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base text-white">Add Catalog Product</h3>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Tusker Cider 500ml"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Beer">Beer</option>
                    <option value="Spirits">Spirits</option>
                    <option value="Wine">Wine</option>
                    <option value="Soft Drinks">Soft Drinks</option>
                    <option value="Mixers">Mixers</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Barcode / SKU</label>
                  <input
                    type="text"
                    value={newProductBarcode}
                    onChange={(e) => setNewProductBarcode(e.target.value)}
                    placeholder="Scan or type barcode"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Selling Price</label>
                  <input
                    type="number"
                    required
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    placeholder="250"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Cost Price</label>
                  <input
                    type="number"
                    value={newProductCost}
                    onChange={(e) => setNewProductCost(e.target.value)}
                    placeholder="190"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Initial Stock</label>
                  <input
                    type="number"
                    value={newProductStock}
                    onChange={(e) => setNewProductStock(e.target.value)}
                    placeholder="48"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateStaff}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base text-white">Add Staff Member</h3>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Faith Wanjiku"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Email</label>
                <input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="faith@store.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Store Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Terminal PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newStaffPin}
                    onChange={(e) => setNewStaffPin(e.target.value)}
                    placeholder="4-digit PIN"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center tracking-widest"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Create Staff Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
