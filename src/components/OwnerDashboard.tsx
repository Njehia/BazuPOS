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
  Tag,
  Edit2,
  Trash2,
  AlertOctagon,
  SlidersHorizontal,
  Bell,
  Copy,
  Check,
  ExternalLink,
  Download,
} from 'lucide-react';
import { usePOS, TenantProduct, TenantSale, TenantShift } from '../hooks/usePOS';
import { AuthService, TenantMetadata, TenantUser } from '../services/auth';
import { buildESCPOSShiftReport, printViaWebBluetooth, printViaWebUSB } from '../lib/escpos';
import { ShiftSummaryReport, StoreConfig } from '../types';
import { AddCategoryModal } from './AddCategoryModal';
import { EditProductModal, EditableProductData } from './EditProductModal';

interface OwnerDashboardProps {
  onBackToTerminal?: () => void;
  onOpenNewStore?: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onBackToTerminal, onOpenNewStore }) => {
  const {
    tenantId,
    products,
    categories: tenantCategories,
    sales,
    shifts,
    activeShift,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    deleteCategory,
    seedFullCatalog,
    startShift,
    closeShift,
  } = usePOS();

  // Tenant metadata & staff
  const [tenantMeta, setTenantMeta] = useState<TenantMetadata | null>(null);
  const [tenantStaff, setTenantStaff] = useState<TenantUser[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'categories' | 'alerts' | 'shifts' | 'staff' | 'settings'>('overview');
  const [ownerFeedback, setOwnerFeedback] = useState<string | null>(null);

  // Automated Inventory Alert & Reorder Threshold State
  const [reorderThreshold, setReorderThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`bazu_reorder_thresh_${tenantId}`);
      return saved ? Number(saved) : 15;
    } catch {
      return 15;
    }
  });

  const [usePerProductThreshold, setUsePerProductThreshold] = useState<boolean>(true);
  const [isAlertBannerDismissed, setIsAlertBannerDismissed] = useState(false);
  const [alertsSeverityFilter, setAlertsSeverityFilter] = useState<'ALL' | 'OUT_OF_STOCK' | 'CRITICAL' | 'WARNING'>('ALL');
  const [alertsSearchQuery, setAlertsSearchQuery] = useState('');
  const [alertsCategoryFilter, setAlertsCategoryFilter] = useState('ALL');
  const [alertsSortBy, setAlertsSortBy] = useState<'shortage' | 'stock' | 'name' | 'cost'>('shortage');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStockFilter, setInventoryStockFilter] = useState<'ALL' | 'BELOW_REORDER' | 'OUT_OF_STOCK'>('ALL');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('ALL');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Save reorder threshold changes
  const handleUpdateReorderThreshold = (newVal: number) => {
    const val = Math.max(1, newVal);
    setReorderThreshold(val);
    try {
      localStorage.setItem(`bazu_reorder_thresh_${tenantId}`, String(val));
    } catch {
      // ignore
    }
    setOwnerFeedback(`Global reorder threshold set to ${val} units.`);
    setTimeout(() => setOwnerFeedback(null), 3000);
  };

  // Modals state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<EditableProductData | null>(null);

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

  // Helper to determine active threshold for a product
  const getProductThreshold = (p: TenantProduct): number => {
    if (usePerProductThreshold && typeof p.lowStockThreshold === 'number' && p.lowStockThreshold > 0) {
      return p.lowStockThreshold;
    }
    return reorderThreshold;
  };

  // Products falling below specific reorder quantity threshold
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= getProductThreshold(p));
  }, [products, reorderThreshold, usePerProductThreshold]);

  // Breakdown by severity
  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= 0);
  }, [products]);

  const criticalStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5);
  }, [products]);

  const warningStockProducts = useMemo(() => {
    return products.filter((p) => {
      const thresh = getProductThreshold(p);
      return p.stockQuantity > 5 && p.stockQuantity <= thresh;
    });
  }, [products, reorderThreshold, usePerProductThreshold]);

  // Estimated replenishment cost for all low stock items
  const totalEstimatedReorderCost = useMemo(() => {
    return lowStockProducts.reduce((sum, p) => {
      const thresh = getProductThreshold(p);
      const suggestedOrderQty = Math.max(1, thresh * 2 - p.stockQuantity);
      const unitCost = p.costPrice || Math.round(p.price * 0.75);
      return sum + suggestedOrderQty * unitCost;
    }, 0);
  }, [lowStockProducts, reorderThreshold, usePerProductThreshold]);

  // Copy purchase order / reorder list to clipboard
  const handleCopyReorderList = () => {
    if (lowStockProducts.length === 0) return;
    const lines = [
      `=========================================`,
      `PURCHASE ORDER & INVENTORY REORDER LIST`,
      `Store: ${tenantMeta?.businessName || 'Bazu POS Store'}`,
      `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      `Reorder Threshold Target: ${reorderThreshold} units`,
      `Total Alerted Items: ${lowStockProducts.length} (${outOfStockProducts.length} Out of Stock)`,
      `=========================================`,
      '',
    ];

    lowStockProducts.forEach((p, idx) => {
      const thresh = getProductThreshold(p);
      const suggestedOrderQty = Math.max(1, thresh * 2 - p.stockQuantity);
      const estCost = suggestedOrderQty * (p.costPrice || Math.round(p.price * 0.75));

      lines.push(`${idx + 1}. ${p.name}`);
      lines.push(`   Barcode: ${p.barcode || 'N/A'} | Department: ${p.category}`);
      lines.push(`   Current Stock: ${p.stockQuantity} ${p.unit || 'pcs'} | Reorder Alert Threshold: ${thresh}`);
      lines.push(`   Suggested Order: +${suggestedOrderQty} ${p.unit || 'pcs'} (Est. Cost: KES ${estCost.toLocaleString()})`);
      lines.push('');
    });

    lines.push(`=========================================`);
    lines.push(`Total Estimated Replenishment Cost: KES ${totalEstimatedReorderCost.toLocaleString()}`);
    lines.push(`Generated by Bazu POS Automated Inventory Engine`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 3000);
  };

  // Export alerted items as CSV spreadsheet
  const handleExportReorderCSV = () => {
    if (lowStockProducts.length === 0) return;
    const headers = [
      'Product Name',
      'Barcode',
      'Category',
      'Current Stock',
      'Reorder Threshold',
      'Threshold Type',
      'Stock Shortage Deficit',
      'Suggested Reorder Qty',
      'Unit Cost (KES)',
      'Est Total Cost (KES)',
      'Selling Price (KES)',
    ];

    const rows = lowStockProducts.map((p) => {
      const thresh = getProductThreshold(p);
      const isCustom = usePerProductThreshold && typeof p.lowStockThreshold === 'number' && p.lowStockThreshold > 0;
      const deficit = Math.max(0, thresh - p.stockQuantity);
      const suggestedOrderQty = Math.max(1, thresh * 2 - p.stockQuantity);
      const unitCost = p.costPrice || Math.round(p.price * 0.75);
      const estCost = suggestedOrderQty * unitCost;

      return [
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${p.barcode || ''}"`,
        `"${p.category || ''}"`,
        p.stockQuantity,
        thresh,
        isCustom ? 'Custom Item' : 'Global Store',
        deficit,
        suggestedOrderQty,
        unitCost,
        estCost,
        p.price,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BazuPOS_Inventory_Reorder_Alerts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered and sorted alerted products
  const filteredAlertedProducts = useMemo(() => {
    let list = lowStockProducts;

    if (alertsSeverityFilter === 'OUT_OF_STOCK') {
      list = list.filter((p) => p.stockQuantity <= 0);
    } else if (alertsSeverityFilter === 'CRITICAL') {
      list = list.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5);
    } else if (alertsSeverityFilter === 'WARNING') {
      list = list.filter((p) => {
        const thresh = getProductThreshold(p);
        return p.stockQuantity > 5 && p.stockQuantity <= thresh;
      });
    }

    if (alertsCategoryFilter !== 'ALL') {
      list = list.filter((p) => p.category === alertsCategoryFilter);
    }

    if (alertsSearchQuery.trim()) {
      const q = alertsSearchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const threshA = getProductThreshold(a);
      const threshB = getProductThreshold(b);
      const deficitA = Math.max(0, threshA - a.stockQuantity);
      const deficitB = Math.max(0, threshB - b.stockQuantity);
      const costA = Math.max(1, threshA * 2 - a.stockQuantity) * (a.costPrice || Math.round(a.price * 0.75));
      const costB = Math.max(1, threshB * 2 - b.stockQuantity) * (b.costPrice || Math.round(b.price * 0.75));

      if (alertsSortBy === 'shortage') return deficitB - deficitA;
      if (alertsSortBy === 'stock') return a.stockQuantity - b.stockQuantity;
      if (alertsSortBy === 'name') return a.name.localeCompare(b.name);
      if (alertsSortBy === 'cost') return costB - costA;
      return 0;
    });
  }, [
    lowStockProducts,
    alertsSeverityFilter,
    alertsCategoryFilter,
    alertsSearchQuery,
    alertsSortBy,
    reorderThreshold,
    usePerProductThreshold,
  ]);

  // Filtered products for inventory catalog tab
  const filteredInventoryProducts = useMemo(() => {
    let list = products;

    if (inventoryStockFilter === 'BELOW_REORDER') {
      list = list.filter((p) => p.stockQuantity <= getProductThreshold(p));
    } else if (inventoryStockFilter === 'OUT_OF_STOCK') {
      list = list.filter((p) => p.stockQuantity <= 0);
    }

    if (inventoryCategoryFilter !== 'ALL') {
      list = list.filter((p) => p.category === inventoryCategoryFilter);
    }

    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, inventoryStockFilter, inventoryCategoryFilter, inventorySearch, reorderThreshold, usePerProductThreshold]);

  // Bulk replenish alerted stock to safety stock
  const handleBulkReplenishAlerts = async () => {
    if (lowStockProducts.length === 0) return;
    const confirmMsg = `Automatically restock all ${lowStockProducts.length} items to their target safety stock level (${reorderThreshold * 2} units)?`;
    if (!window.confirm(confirmMsg)) return;

    setOwnerFeedback(`Replenishing ${lowStockProducts.length} products to safety stock...`);
    for (const p of lowStockProducts) {
      const thresh = getProductThreshold(p);
      const targetStock = thresh * 2;
      const deficit = Math.max(0, targetStock - p.stockQuantity);
      if (deficit > 0) {
        await updateProduct(p.id, {
          stockQuantity: p.stockQuantity + deficit,
        });
      }
    }
    setOwnerFeedback(`All ${lowStockProducts.length} alerted products successfully replenished!`);
    setTimeout(() => setOwnerFeedback(null), 3500);
  };

  // Category lists and objects
  const categoryNames = useMemo(() => {
    const set = new Set<string>();
    if (tenantCategories) {
      tenantCategories.forEach((c) => {
        if (c.name) set.add(c.name);
      });
    }
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [tenantCategories, products]);

  const categoryObjects = useMemo(() => {
    return categoryNames.map((name) => {
      const found = tenantCategories?.find((tc) => tc.name === name);
      const count = products.filter((p) => p.category === name).length;
      return {
        id: found?.id || name.toLowerCase().replace(/\s+/g, '_'),
        name,
        icon: found?.icon || '🏷️',
        description: found?.description || '',
        productCount: count,
      };
    });
  }, [categoryNames, tenantCategories, products]);

  const handleSaveCategory = async (cat: { name: string; icon?: string; description?: string }) => {
    await addCategory(cat);
    setOwnerFeedback(`Category "${cat.name}" added successfully.`);
    setTimeout(() => setOwnerFeedback(null), 3000);
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    const count = products.filter((p) => p.category === catName).length;
    if (count > 0) {
      alert(`Cannot delete category "${catName}" because ${count} product(s) are assigned to it. Please reassign or update them first.`);
      return;
    }
    if (window.confirm(`Delete category "${catName}"?`)) {
      await deleteCategory(catId);
      setOwnerFeedback(`Category "${catName}" deleted.`);
      setTimeout(() => setOwnerFeedback(null), 3000);
    }
  };

  const handleSaveProduct = async (id: string, updates: Partial<EditableProductData>) => {
    await updateProduct(id, updates);
    setOwnerFeedback(`Product "${updates.name || ''}" updated with barcode ${updates.barcode || ''}!`);
    setTimeout(() => setOwnerFeedback(null), 3500);
    setShowEditProductModal(false);
  };

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
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Sales
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'alerts'
                ? 'bg-rose-500 text-white shadow-sm'
                : lowStockProducts.length > 0
                ? 'text-rose-400 hover:text-white bg-rose-500/10 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
            {lowStockProducts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                {lowStockProducts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Inventory ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Categories ({categoryObjects.length})
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'shifts'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            X/Z Shifts
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Staff &amp; Roles
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Feedback Alert Toast */}
        {ownerFeedback && (
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <span>{ownerFeedback}</span>
            <button onClick={() => setOwnerFeedback(null)} className="text-amber-400 hover:text-white ml-2">✕</button>
          </div>
        )}

        {/* Automated Inventory Alert Banner (Shows when products breach reorder threshold) */}
        {lowStockProducts.length > 0 && !isAlertBannerDismissed && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/70 border border-rose-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-sm text-white tracking-wide flex items-center gap-2">
                    <span>AUTOMATED INVENTORY ALERT</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider">
                      Reorder Threshold ({reorderThreshold} units)
                    </span>
                  </h3>
                </div>

                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                    {outOfStockProducts.length} Out of Stock
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="font-bold text-amber-400">
                    {criticalStockProducts.length} Critical (≤5 units)
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">
                    {warningStockProducts.length} Approaching Threshold
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">
                    Est. Restock: <strong className="text-white">KES {totalEstimatedReorderCost.toLocaleString()}</strong>
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => setActiveTab('alerts')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Review Alerts &amp; Reorder</span>
              </button>

              <button
                onClick={handleCopyReorderList}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy Purchase Order to Clipboard"
              >
                {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyFeedback ? 'Copied PO!' : 'Copy PO'}</span>
              </button>

              <button
                onClick={handleBulkReplenishAlerts}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Restock all alerted items to safety level"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Auto-Restock</span>
              </button>

              <button
                onClick={() => setIsAlertBannerDismissed(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}
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

          {/* Low Stock Depletion Alert Card */}
          <div
            onClick={() => setActiveTab('alerts')}
            className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 shadow-xl relative overflow-hidden cursor-pointer transition-all group"
            title="Click to view automated inventory alerts & reorder engine"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-0.5 group-hover:underline">
                <span>Alerts Hub</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Below Reorder Threshold
            </span>
            <p className="font-black text-3xl text-rose-400 mt-1">
              {lowStockProducts.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
              <span className={outOfStockProducts.length > 0 ? 'text-rose-400 font-bold' : ''}>
                {outOfStockProducts.length} out of stock
              </span>
              <span className="text-amber-400 font-bold">Thresh: {reorderThreshold}</span>
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

        {/* Tab: Automated Inventory Alerts & Reorder Management */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Reorder Threshold Engine & Global Controls Card */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                    <AlertOctagon className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-white tracking-wide flex items-center gap-2.5 flex-wrap">
                      <span>Automated Inventory Alert &amp; Reorder Engine</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                        {lowStockProducts.length} Items Alerted
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Automatically detects and flags items falling below your chosen reorder quantity threshold. Calculate shortage deficits, estimated replenishment expenditures, and generate instant supplier purchase orders.
                    </p>
                  </div>
                </div>

                {/* Quick PO / Bulk Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleExportReorderCSV}
                    disabled={lowStockProducts.length === 0}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Export alerted items to CSV spreadsheet"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Export Reorder CSV</span>
                  </button>

                  <button
                    onClick={handleCopyReorderList}
                    disabled={lowStockProducts.length === 0}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copy formatted purchase order list for supplier messaging"
                  >
                    {copyFeedback ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                    <span>{copyFeedback ? 'Copied PO!' : 'Copy Supplier PO'}</span>
                  </button>

                  <button
                    onClick={handleBulkReplenishAlerts}
                    disabled={lowStockProducts.length === 0}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                    title="Restock all alerted products to target safety stock"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Auto-Replenish All ({lowStockProducts.length})</span>
                  </button>
                </div>
              </div>

              {/* Threshold Configuration Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {/* Global Reorder Threshold Stepper */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block">
                      Global Reorder Threshold
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Trigger alert when stock drops to or below this qty
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateReorderThreshold(reorderThreshold - 5)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm flex items-center justify-center transition-colors"
                      title="Decrease threshold by 5"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateReorderThreshold(reorderThreshold - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm flex items-center justify-center transition-colors"
                      title="Decrease threshold by 1"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={reorderThreshold}
                      onChange={(e) => handleUpdateReorderThreshold(Number(e.target.value) || 1)}
                      className="flex-1 py-1.5 px-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-black text-center text-sm focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateReorderThreshold(reorderThreshold + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm flex items-center justify-center transition-colors"
                      title="Increase threshold by 1"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateReorderThreshold(reorderThreshold + 5)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm flex items-center justify-center transition-colors"
                      title="Increase threshold by 5"
                    >
                      +5
                    </button>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Presets:</span>
                    {[5, 10, 15, 20, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleUpdateReorderThreshold(preset)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                          reorderThreshold === preset
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Per-Product Override Switch */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      Custom Item Thresholds
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Allow specific products to use individual alert thresholds set via Edit Modal
                    </p>
                  </div>

                  <label className="flex items-center gap-3 mt-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={usePerProductThreshold}
                      onChange={(e) => setUsePerProductThreshold(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      {usePerProductThreshold
                        ? 'Enabled (Custom thresholds respected)'
                        : 'Disabled (Strict global threshold)'}
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-2">
                    {usePerProductThreshold
                      ? 'Products with customized reorder points will alert at their specific setting.'
                      : `All products strictly trigger alerts at ${reorderThreshold} units.`}
                  </p>
                </div>

                {/* Deficit & Breakdown Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Severity Breakdown
                  </span>
                  <div className="space-y-1.5 my-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-rose-400 font-bold">
                      <span>• Out of Stock (0):</span>
                      <span>{outOfStockProducts.length} items</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-400 font-bold">
                      <span>• Critical (1-5):</span>
                      <span>{criticalStockProducts.length} items</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>• Low Stock (6-{reorderThreshold}):</span>
                      <span>{warningStockProducts.length} items</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Calculated against {products.length} registered products
                  </span>
                </div>

                {/* Replenishment Financial Summary */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                      Estimated Restock Cost
                    </span>
                    <p className="font-black text-2xl text-white mt-1">
                      KES {totalEstimatedReorderCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
                    <p>
                      Safety target: <strong className="text-slate-200">2x reorder threshold</strong>
                    </p>
                    <p>
                      Total deficit units: <strong className="text-amber-300">{lowStockProducts.reduce((sum, p) => sum + Math.max(0, getProductThreshold(p) - p.stockQuantity), 0)}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Severity Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setAlertsSeverityFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    alertsSeverityFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  All Alerted ({lowStockProducts.length})
                </button>
                <button
                  onClick={() => setAlertsSeverityFilter('OUT_OF_STOCK')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    alertsSeverityFilter === 'OUT_OF_STOCK'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-rose-400 hover:bg-slate-750'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span>Out of Stock ({outOfStockProducts.length})</span>
                </button>
                <button
                  onClick={() => setAlertsSeverityFilter('CRITICAL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    alertsSeverityFilter === 'CRITICAL'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-amber-400 hover:bg-slate-750'
                  }`}
                >
                  Critical ≤5 ({criticalStockProducts.length})
                </button>
                <button
                  onClick={() => setAlertsSeverityFilter('WARNING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    alertsSeverityFilter === 'WARNING'
                      ? 'bg-yellow-600 text-slate-950'
                      : 'bg-slate-800 text-yellow-300 hover:bg-slate-750'
                  }`}
                >
                  Low Stock ({warningStockProducts.length})
                </button>
              </div>

              {/* Search, Category, and Sort */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={alertsSearchQuery}
                    onChange={(e) => setAlertsSearchQuery(e.target.value)}
                    placeholder="Search by product or barcode..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {alertsSearchQuery && (
                    <button
                      onClick={() => setAlertsSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={alertsCategoryFilter}
                  onChange={(e) => setAlertsCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">All Categories ({categoryNames.length})</option>
                  {categoryNames.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={alertsSortBy}
                  onChange={(e) => setAlertsSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-400"
                >
                  <option value="shortage">Sort: Shortage Deficit (Highest)</option>
                  <option value="stock">Sort: On-Hand Stock (Lowest)</option>
                  <option value="name">Sort: Product Name (A-Z)</option>
                  <option value="cost">Sort: Replenish Cost (Highest)</option>
                </select>
              </div>
            </div>

            {/* Alerted Products Table */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Products Requiring Reorder</span>
                  <span className="text-xs text-slate-400 font-normal">
                    (Showing {filteredAlertedProducts.length} of {lowStockProducts.length})
                  </span>
                </h3>

                <span className="text-[11px] text-slate-400 font-mono">
                  Applied Safety Stock: 2x Threshold
                </span>
              </div>

              {filteredAlertedProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Product Details</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-center">On-Hand Stock</th>
                        <th className="pb-3 font-semibold text-center">Reorder Threshold</th>
                        <th className="pb-3 font-semibold text-center">Shortage</th>
                        <th className="pb-3 font-semibold text-center">Suggested Order</th>
                        <th className="pb-3 font-semibold text-right">Est. Cost</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAlertedProducts.map((p) => {
                        const thresh = getProductThreshold(p);
                        const isCustom = usePerProductThreshold && typeof p.lowStockThreshold === 'number' && p.lowStockThreshold > 0;
                        const deficit = Math.max(0, thresh - p.stockQuantity);
                        const suggestedOrderQty = Math.max(1, thresh * 2 - p.stockQuantity);
                        const unitCost = p.costPrice || Math.round(p.price * 0.75);
                        const estCost = suggestedOrderQty * unitCost;

                        const isOutOfStock = p.stockQuantity <= 0;
                        const isCritical = p.stockQuantity > 0 && p.stockQuantity <= 5;

                        return (
                          <tr
                            key={p.id}
                            className={`transition-colors ${
                              isOutOfStock
                                ? 'bg-rose-950/20 hover:bg-rose-950/30'
                                : isCritical
                                ? 'bg-amber-950/15 hover:bg-amber-950/25'
                                : 'hover:bg-slate-850/50'
                            }`}
                          >
                            {/* Product Name & Info */}
                            <td className="py-3.5 pr-2">
                              <div className="flex items-center gap-2">
                                {p.quickKey && <span className="text-amber-400 font-bold" title="Cashier Quick Key">★</span>}
                                <div>
                                  <h4 className="font-bold text-white text-xs">{p.name}</h4>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                                    <span>{p.category}</span>
                                    <span>•</span>
                                    <span>SKU: {p.barcode || '—'}</span>
                                    <span>•</span>
                                    <span className="text-slate-300">KES {p.price.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-2">
                              {isOutOfStock ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                                  <span>Out of Stock</span>
                                </span>
                              ) : isCritical ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 w-fit block">
                                  Critical (≤5)
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 w-fit block">
                                  Low Stock
                                </span>
                              )}
                            </td>

                            {/* Current Stock */}
                            <td className="py-3.5 px-2 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className={`px-3 py-1 rounded-xl text-xs font-black font-mono ${
                                    isOutOfStock
                                      ? 'bg-rose-600 text-white'
                                      : isCritical
                                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                      : 'bg-slate-800 text-slate-200'
                                  }`}
                                >
                                  {p.stockQuantity} {p.unit || 'pcs'}
                                </span>
                                {/* Mini progress bar */}
                                <div className="w-14 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                  <div
                                    className={`h-full ${isOutOfStock ? 'bg-rose-500' : isCritical ? 'bg-amber-500' : 'bg-yellow-400'}`}
                                    style={{
                                      width: `${Math.min(100, Math.round((p.stockQuantity / thresh) * 100))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Reorder Threshold */}
                            <td className="py-3.5 px-2 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-mono font-bold text-white text-xs">
                                  {thresh} {p.unit || 'pcs'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  {isCustom ? (
                                    <span className="text-amber-400">Custom Item</span>
                                  ) : (
                                    <span>Store Global</span>
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* Deficit Shortage */}
                            <td className="py-3.5 px-2 text-center">
                              <span className="font-mono font-black text-rose-400 text-xs">
                                -{deficit} {p.unit || 'pcs'}
                              </span>
                            </td>

                            {/* Suggested Reorder Qty */}
                            <td className="py-3.5 px-2 text-center">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black font-mono text-xs">
                                +{suggestedOrderQty} {p.unit || 'pcs'}
                              </span>
                            </td>

                            {/* Estimated Cost */}
                            <td className="py-3.5 px-2 text-right">
                              <span className="font-black text-white font-mono text-xs block">
                                KES {estCost.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                @ KES {unitCost.toLocaleString()}/unit
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 pl-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleQuickRestock(p.id, 12)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                                  title="Add 12 to stock"
                                >
                                  +12
                                </button>
                                <button
                                  onClick={() => handleQuickRestock(p.id, 24)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                                  title="Add 24 to stock"
                                >
                                  +24
                                </button>
                                <button
                                  onClick={() => {
                                    setProductToEdit({
                                      id: p.id,
                                      name: p.name,
                                      category: p.category,
                                      price: p.price,
                                      costPrice: p.costPrice,
                                      stockQuantity: p.stockQuantity,
                                      barcode: p.barcode,
                                      quickKey: p.quickKey,
                                      unit: p.unit,
                                      lowStockThreshold: p.lowStockThreshold,
                                    });
                                    setShowEditProductModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Edit details or adjust specific reorder threshold"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit / Threshold</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base text-white">
                    {lowStockProducts.length === 0
                      ? 'All inventory items are healthy!'
                      : 'No items match your filter criteria'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    {lowStockProducts.length === 0
                      ? `Every product in your catalog has stock exceeding your target threshold of ${reorderThreshold} units. The automated inventory monitor is continuously active.`
                      : 'Try resetting your search query or selecting a different severity/category filter.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Inventory Catalog Management */}
        {activeTab === 'inventory' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-white">Tenant Product Catalog</h2>
                <p className="text-xs text-slate-400">
                  Total of {products.length} products stored under /tenants/{tenantId}/products across {categoryObjects.length} categories
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowAddCategoryModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Load 150+ products & 22 categories into this store?')) {
                      await seedFullCatalog();
                      setOwnerFeedback('Catalog loaded with 150+ products and categories!');
                      setTimeout(() => setOwnerFeedback(null), 3000);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Load standard multi-category catalog"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Seed 150+ Items</span>
                </button>
              </div>
            </div>

            {/* Inventory Search & Stock Filter Strip */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setInventoryStockFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inventoryStockFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  All Products ({products.length})
                </button>
                <button
                  onClick={() => setInventoryStockFilter('BELOW_REORDER')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    inventoryStockFilter === 'BELOW_REORDER'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-rose-300 hover:bg-slate-750'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Below Reorder Threshold ({lowStockProducts.length})</span>
                </button>
                <button
                  onClick={() => setInventoryStockFilter('OUT_OF_STOCK')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inventoryStockFilter === 'OUT_OF_STOCK'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  Out of Stock ({outOfStockProducts.length})
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Search name or barcode..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {inventorySearch && (
                    <button
                      onClick={() => setInventorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={inventoryCategoryFilter}
                  onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-semibold focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">All Categories</option>
                  {categoryNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
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
                    <th className="pb-3 font-semibold text-center">Reorder Alert Status</th>
                    <th className="pb-3 font-semibold">Barcode / SKU</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInventoryProducts.map((p) => {
                    const thresh = getProductThreshold(p);
                    const isBelowThreshold = p.stockQuantity <= thresh;
                    const isOut = p.stockQuantity <= 0;
                    const isCustom = usePerProductThreshold && typeof p.lowStockThreshold === 'number' && p.lowStockThreshold > 0;

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isBelowThreshold
                            ? 'bg-rose-950/20 hover:bg-rose-950/30 border-l-4 border-l-rose-500'
                            : 'hover:bg-slate-850/50'
                        }`}
                      >
                        <td className="py-3 font-bold text-white flex items-center gap-1.5">
                          {p.quickKey && <span className="text-amber-400" title="Quick Key">★</span>}
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
                            className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                              isOut
                                ? 'bg-rose-600 text-white'
                                : isBelowThreshold
                                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {p.stockQuantity} {p.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {isBelowThreshold ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>Reorder (≤ {thresh})</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">
                              Healthy (Thresh: {thresh}{isCustom ? '*' : ''})
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-mono text-slate-400">{p.barcode || '—'}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setProductToEdit({
                                  id: p.id,
                                  name: p.name,
                                  category: p.category,
                                  price: p.price,
                                  costPrice: p.costPrice,
                                  stockQuantity: p.stockQuantity,
                                  barcode: p.barcode,
                                  quickKey: p.quickKey,
                                  unit: p.unit,
                                  lowStockThreshold: p.lowStockThreshold,
                                });
                                setShowEditProductModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Edit product details or scan/change barcode"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit / Barcode</span>
                            </button>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Categories Management */}
        {activeTab === 'categories' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>Product Categories ({categoryObjects.length})</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage store departments and product categories for fast cashier navigation
                </p>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {categoryObjects.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                        {cat.icon || '🏷️'}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-sm">{cat.name}</h4>
                        <span className="text-[11px] text-amber-400 font-semibold font-mono">
                          {cat.productCount} {cat.productCount === 1 ? 'product' : 'products'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title={`Delete category ${cat.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {cat.description && (
                    <p className="text-xs text-slate-400 mt-2.5 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                </div>
              ))}
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

        {/* Tab 5: Settings & Multi-Store Management */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Multi-Store & Branch Network (Only visible to Admin) */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base text-white">Multi-Store &amp; Branch Network</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                        Admin Only
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Create and provision new retail storefronts or additional outlet branches. Each store maintains its own isolated cloud database, inventory catalog, and staff credentials.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenNewStore) onOpenNewStore();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Store</span>
                </button>
              </div>

              {/* Current Active Tenant Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Active Store Tenant
                  </span>
                  <p className="font-bold text-sm text-white mt-1">
                    {tenantMeta?.businessName || 'Bazu POS Store'}
                  </p>
                  <span className="text-[11px] font-mono text-amber-400 mt-0.5 block">
                    ID: {tenantId}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Subscription Tier
                  </span>
                  <p className="font-bold text-sm text-emerald-400 mt-1 uppercase">
                    {tenantMeta?.plan || 'Enterprise'} Plan
                  </p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Status: <strong className="text-white capitalize">{tenantMeta?.subscriptionStatus || 'Active'}</strong>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Store Owner / Admin
                  </span>
                  <p className="font-bold text-sm text-white mt-1">
                    {tenantMeta?.ownerName || 'Store Administrator'}
                  </p>
                  <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                    {tenantMeta?.ownerEmail || 'admin@store.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* Global Inventory Threshold Configuration Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                  <span>Inventory Alert Defaults</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust default reorder thresholds and automated stock depletion alerts for this location.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block">
                      Default Store Reorder Point
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Products with on-hand stock at or below this level trigger dashboard alerts
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleUpdateReorderThreshold(reorderThreshold - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={reorderThreshold}
                      onChange={(e) => handleUpdateReorderThreshold(Number(e.target.value) || 1)}
                      className="w-20 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateReorderThreshold(reorderThreshold + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      +
                    </button>
                    <span className="text-xs text-slate-400 ml-1">units</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      Per-Product Threshold Override
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Allow customized threshold quantities configured on individual items
                    </p>
                  </div>

                  <label className="flex items-center gap-2.5 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePerProductThreshold}
                      onChange={(e) => setUsePerProductThreshold(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      {usePerProductThreshold ? 'Active (Item overrides allowed)' : 'Strict global threshold only'}
                    </span>
                  </label>
                </div>
              </div>
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

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <AddCategoryModal
          isOpen={showAddCategoryModal}
          onClose={() => setShowAddCategoryModal(false)}
          onSave={handleSaveCategory}
        />
      )}

      {/* Edit Product & Barcode Modal */}
      {showEditProductModal && productToEdit && (
        <EditProductModal
          isOpen={showEditProductModal}
          product={productToEdit}
          categories={categoryObjects}
          onClose={() => {
            setShowEditProductModal(false);
            setProductToEdit(null);
          }}
          onSave={handleSaveProduct}
          onDelete={async (id) => {
            await deleteProduct(id);
            setOwnerFeedback(`Product deleted.`);
            setTimeout(() => setOwnerFeedback(null), 3000);
            setShowEditProductModal(false);
            setProductToEdit(null);
          }}
          onOpenAddCategory={() => {
            setShowAddCategoryModal(true);
          }}
        />
      )}
    </div>
  );
};
