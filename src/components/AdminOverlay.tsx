import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Filter,
  History,
  Home,
  Info,
  KeyRound,
  Lock,
  Package,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Store,
  Tags,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';
import {
  Category,
  Product,
  ProductCategory,
  ROLE_DETAILS,
  Sale,
  SaleItem,
  StoreConfig,
  User,
  UserRole,
  getRoleLabel,
} from '../types';
import { LocalDb } from '../lib/storage';
import { ReceiptModal } from './ReceiptModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { PrintReceiptModule } from './PrintReceiptModule';
import { BazuLogo } from './BazuLogo';
import { CustomersSheet } from './CustomersSheet';

export type AdminTab = 'inventory' | 'categories' | 'summary' | 'customers' | 'users' | 'store';

interface AdminOverlayProps {
  currentUser: User;
  initialTab?: AdminTab;
  onClose: () => void;
  onGoHome?: () => void;
  onInventoryChanged: () => void;
  onStoreConfigChanged: (config: StoreConfig) => void;
  onSelectCustomerForSale?: (customer: any) => void;
}

export const AdminOverlay: React.FC<AdminOverlayProps> = ({
  currentUser,
  initialTab,
  onClose,
  onGoHome,
  onInventoryChanged,
  onStoreConfigChanged,
  onSelectCustomerForSale,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'inventory');
  const [products, setProducts] = useState<Product[]>(() => LocalDb.getProducts());
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'BELOW_THRESHOLD' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'HEALTHY'>('ALL');
  const [selectedInventoryCategory, setSelectedInventoryCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newStockInput, setNewStockInput] = useState<string>('');
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [newThresholdInput, setNewThresholdInput] = useState<string>('');
  const [productFeedbackError, setProductFeedbackError] = useState<string | null>(null);

  // Reorder Replenishment Slip modal state
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderCopied, setReorderCopied] = useState(false);
  const [batchRestockSuccess, setBatchRestockSuccess] = useState<string | null>(null);

  // Add Product modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>('beer');
  const [newProdPrice, setNewProdPrice] = useState('250');
  const [newProdStock, setNewProdStock] = useState('24');
  const [newProdUnit, setNewProdUnit] = useState('500ml');
  const [newProdThreshold, setNewProdThreshold] = useState('');

  // Summary & Sales Explorer state
  const [summaryData, setSummaryData] = useState(() => LocalDb.getDailySummary());
  const [allSales, setAllSales] = useState<Sale[]>(() => LocalDb.getSales());
  const [selectedSalesDate, setSelectedSalesDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [salesCashierFilter, setSalesCashierFilter] = useState<string>('ALL');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState<'ALL' | 'MPESA' | 'CASH'>('ALL');
  const [salesSearchQuery, setSalesSearchQuery] = useState<string>('');
  const [inspectingSale, setInspectingSale] = useState<Sale | null>(null);
  const [inspectingSaleItems, setInspectingSaleItems] = useState<SaleItem[]>([]);
  const [reprintSaleModal, setReprintSaleModal] = useState<Sale | null>(null);
  const [reprintSaleItems, setReprintSaleItems] = useState<SaleItem[]>([]);

  // Store config state
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => LocalDb.getStoreConfig());
  const [configSuccessMsg, setConfigSuccessMsg] = useState(false);

  // User Management State
  const [users, setUsers] = useState<User[]>(() => LocalDb.getUsers());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('SALES_CASHIER');
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<number, boolean>>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPin, setEditUserPin] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('SALES_CASHIER');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Password reset by admin & change password states
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [resetPasswordTargetUser, setResetPasswordTargetUser] = useState<User | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('1234');
  const [resetActionError, setResetActionError] = useState<string | null>(null);
  const [resetActionSuccess, setResetActionSuccess] = useState<string | null>(null);

  // Category Management State
  const [categories, setCategories] = useState<Category[]>(() => LocalDb.getCategories());
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🍺');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [categoryActionError, setCategoryActionError] = useState<string | null>(null);
  const [categoryActionSuccess, setCategoryActionSuccess] = useState<string | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<Category | null>(null);

  // Print Receipt Module state
  const [isPrintReceiptModuleOpen, setIsPrintReceiptModuleOpen] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';

  const reloadData = () => {
    setProducts(LocalDb.getProducts());
    setCategories(LocalDb.getCategories());
    setSummaryData(LocalDb.getDailySummary(selectedSalesDate === 'ALL' ? undefined : selectedSalesDate));
    setAllSales(LocalDb.getSales());
    setUsers(LocalDb.getUsers());
    onInventoryChanged();
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryActionError(null);

    const res = LocalDb.addCategory(
      {
        name: newCatName,
        icon: newCatIcon,
        description: newCatDesc,
      },
      currentUser.role
    );

    if (!res.success) {
      setCategoryActionError(res.error || 'Failed to create category.');
      return;
    }

    setIsAddCategoryModalOpen(false);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatIcon('🍺');
    setCategories(LocalDb.getCategories());
    setCategoryActionSuccess(`Category "${res.category?.name}" created successfully.`);
    setTimeout(() => setCategoryActionSuccess(null), 3500);
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || '🏷️');
    setEditCatDesc(cat.description || '');
    setCategoryActionError(null);
  };

  const handleSaveCategoryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setCategoryActionError(null);

    const res = LocalDb.updateCategory(
      editingCategory.id,
      {
        name: editCatName.trim(),
        icon: editCatIcon.trim() || '🏷️',
        description: editCatDesc.trim() || undefined,
      },
      currentUser.role
    );

    if (!res.success) {
      setCategoryActionError(res.error || 'Failed to update category.');
      return;
    }

    setEditingCategory(null);
    setCategories(LocalDb.getCategories());
    setCategoryActionSuccess('Category updated successfully.');
    setTimeout(() => setCategoryActionSuccess(null), 3500);
  };

  const handleConfirmDeleteCategory = () => {
    if (!deleteCategoryConfirm) return;
    setCategoryActionError(null);

    const res = LocalDb.deleteCategory(deleteCategoryConfirm.id, currentUser.role);
    if (!res.success) {
      setCategoryActionError(res.error || 'Failed to remove category.');
      setDeleteCategoryConfirm(null);
      return;
    }

    setDeleteCategoryConfirm(null);
    setCategories(LocalDb.getCategories());
    setCategoryActionSuccess(`Category "${deleteCategoryConfirm.name}" removed.`);
    setTimeout(() => setCategoryActionSuccess(null), 3500);
  };

  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    setNewPriceInput(product.price.toString());
    setNewStockInput(product.stock_qty.toString());
    setNewThresholdInput(product.low_stock_threshold !== undefined ? product.low_stock_threshold.toString() : '');
    setProductFeedbackError(null);
  };

  const handleSaveProductEdit = () => {
    if (!editingProduct) return;
    const stock = Math.max(0, Number(newStockInput) || 0);
    // ENFORCE: Non-admins cannot alter product price
    const price = isAdmin ? Math.max(0, Number(newPriceInput) || editingProduct.price) : editingProduct.price;
    const customThreshold = newThresholdInput.trim() === '' ? undefined : Math.max(1, Number(newThresholdInput) || 1);

    const res = LocalDb.updateProduct(
      editingProduct.id,
      {
        price,
        stock_qty: stock,
        low_stock_threshold: customThreshold,
      },
      currentUser.role
    );

    if (!res.success) {
      setProductFeedbackError(res.error || 'Failed to update product');
      return;
    }

    setEditingProduct(null);
    setProductFeedbackError(null);
    reloadData();
  };

  const handleQuickRestock = (productId: number, qtyToAdd: number) => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return;
    LocalDb.updateProduct(productId, {
      stock_qty: p.stock_qty + qtyToAdd,
    }, currentUser.role);
    reloadData();
  };

  const handleUpdateGlobalThreshold = (newThreshold: number) => {
    const validThreshold = Math.max(1, Math.min(1000, newThreshold));
    const updated = LocalDb.updateStoreConfig({ low_stock_threshold: validThreshold });
    setStoreConfig(updated);
    onStoreConfigChanged(updated);
  };

  const handleBatchRestockShortfalls = (items: { product: Product; shortfall: number }[]) => {
    if (items.length === 0) return;
    items.forEach(({ product, shortfall }) => {
      // Add shortfall plus a buffer to bring to safe level
      const qtyToAdd = Math.max(6, Math.ceil(shortfall / 6) * 6);
      LocalDb.updateProduct(product.id, {
        stock_qty: product.stock_qty + qtyToAdd,
      }, currentUser.role);
    });
    setBatchRestockSuccess(`Successfully replenished ${items.length} low-stock items with supplier order packs!`);
    setTimeout(() => setBatchRestockSuccess(null), 4000);
    reloadData();
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setProductFeedbackError('Permission Denied: Only the Administrator can add new products.');
      return;
    }
    if (!newProdName.trim()) return;

    const customThreshold = newProdThreshold.trim() === '' ? undefined : Math.max(1, Number(newProdThreshold) || 1);

    const res = LocalDb.addProduct(
      {
        name: newProdName.trim(),
        barcode: newProdBarcode || Date.now().toString().slice(-8),
        category: newProdCategory,
        price: Number(newProdPrice) || 100,
        stock_qty: Number(newProdStock) || 0,
        unit: newProdUnit || 'bottle',
        low_stock_threshold: customThreshold,
      },
      currentUser.role
    );

    if (!res.success) {
      setProductFeedbackError(res.error || 'Failed to add product');
      return;
    }

    setIsAddModalOpen(false);
    setNewProdName('');
    setNewProdBarcode('');
    setNewProdThreshold('');
    setProductFeedbackError(null);
    reloadData();
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = LocalDb.updateStoreConfig(storeConfig);
    setStoreConfig(updated);
    onStoreConfigChanged(updated);
    setConfigSuccessMsg(true);
    setTimeout(() => setConfigSuccessMsg(false), 2500);
  };

  // Staff User Management Handlers
  const handleOpenAddUser = () => {
    setNewUserName('');
    setNewUserPin('');
    setNewUserRole('SALES_CASHIER');
    setUserActionError(null);
    setIsAddUserModalOpen(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    const res = LocalDb.addUser(
      {
        name: newUserName,
        pin: newUserPin,
        role: newUserRole,
      },
      currentUser.role
    );

    if (!res.success) {
      setUserActionError(res.error || 'Failed to add staff member');
      return;
    }

    setIsAddUserModalOpen(false);
    setUsers(LocalDb.getUsers());
    setUserActionSuccess(`Staff user "${res.user?.name}" registered as ${getRoleLabel(newUserRole)}.`);
    setTimeout(() => setUserActionSuccess(null), 3500);
  };

  const handleStartEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserPin(u.pin);
    setEditUserRole(u.role);
    setUserActionError(null);
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserActionError(null);

    const res = LocalDb.updateUser(
      editingUser.id,
      {
        name: editUserName,
        pin: editUserPin,
        role: editUserRole,
      },
      currentUser.role
    );

    if (!res.success) {
      setUserActionError(res.error || 'Failed to update staff member');
      return;
    }

    setEditingUser(null);
    setUsers(LocalDb.getUsers());
    setUserActionSuccess('Staff user details updated successfully.');
    setTimeout(() => setUserActionSuccess(null), 3500);
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteConfirmUser) return;
    const res = LocalDb.deleteUser(deleteConfirmUser.id, currentUser.role);

    if (!res.success) {
      setUserActionError(res.error || 'Failed to remove user');
      setDeleteConfirmUser(null);
      return;
    }

    setDeleteConfirmUser(null);
    setUsers(LocalDb.getUsers());
    setUserActionSuccess('Staff account removed successfully.');
    setTimeout(() => setUserActionSuccess(null), 3500);
  };

  const handleToggleSuspension = (targetUser: User) => {
    if (!isAdmin) {
      setUserActionError('Permission Denied: Only Administrator can suspend or reactivate staff.');
      return;
    }
    const res = LocalDb.toggleUserSuspension(targetUser.id, currentUser.role, currentUser.id);
    if (!res.success) {
      setUserActionError(res.error || 'Failed to update account status.');
      return;
    }
    setUsers(res.users);
    const isNowSuspended = res.user?.suspended;
    setUserActionSuccess(
      `Staff member "${targetUser.name}" has been ${isNowSuspended ? 'SUSPENDED' : 'REACTIVATED'} successfully.`
    );
    setTimeout(() => setUserActionSuccess(null), 3500);
  };

  const togglePinVisibility = (id: number) => {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generateRandomPin = (setter: (p: string) => void) => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setter(randomPin);
  };

  // Sales Explorer Helpers
  const handleStepDate = (direction: 'PREV' | 'NEXT') => {
    const base = selectedSalesDate === 'ALL' ? new Date() : new Date(selectedSalesDate + 'T00:00:00');
    base.setDate(base.getDate() + (direction === 'PREV' ? -1 : 1));
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    const day = String(base.getDate()).padStart(2, '0');
    setSelectedSalesDate(`${year}-${month}-${day}`);
  };

  const handleSetRelativeDate = (daysAgo: number | 'ALL') => {
    if (daysAgo === 'ALL') {
      setSelectedSalesDate('ALL');
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedSalesDate(`${year}-${month}-${day}`);
  };

  const availableSalesDates = useMemo(() => {
    return LocalDb.getAvailableSalesDates();
  }, [allSales]);

  const filteredSales = useMemo(() => {
    return allSales.filter((s) => {
      const saleDate = s.created_at.slice(0, 10);
      if (selectedSalesDate !== 'ALL' && saleDate !== selectedSalesDate) {
        return false;
      }
      if (salesCashierFilter !== 'ALL' && s.cashier_name !== salesCashierFilter) {
        return false;
      }
      if (salesPaymentFilter !== 'ALL' && s.payment_method !== salesPaymentFilter) {
        return false;
      }
      if (salesSearchQuery.trim()) {
        const q = salesSearchQuery.toLowerCase().trim();
        const matchId = s.id.toString().includes(q) || `rcp-${s.id.toString().slice(-6)}`.toLowerCase().includes(q);
        const matchCashier = s.cashier_name.toLowerCase().includes(q);
        const matchMpesa = s.mpesa_code ? s.mpesa_code.toLowerCase().includes(q) : false;
        if (!matchId && !matchCashier && !matchMpesa) {
          return false;
        }
      }
      return true;
    });
  }, [allSales, selectedSalesDate, salesCashierFilter, salesPaymentFilter, salesSearchQuery]);

  const salesMetrics = useMemo(() => {
    const cashTotal = filteredSales
      .filter((s) => s.payment_method === 'CASH')
      .reduce((sum, s) => sum + s.total_amount, 0);
    const mpesaTotal = filteredSales
      .filter((s) => s.payment_method === 'MPESA')
      .reduce((sum, s) => sum + s.total_amount, 0);
    const grandTotal = cashTotal + mpesaTotal;
    const count = filteredSales.length;
    const totalUnits = filteredSales.reduce((acc, s) => acc + s.items_count, 0);
    const aov = count > 0 ? Math.round(grandTotal / count) : 0;
    return { cashTotal, mpesaTotal, grandTotal, count, totalUnits, aov };
  }, [filteredSales]);

  const hourlyData = useMemo(() => {
    const hours: { hour: number; label: string; count: number; total: number }[] = [];
    for (let h = 8; h <= 23; h++) {
      hours.push({
        hour: h,
        label: `${h.toString().padStart(2, '0')}:00`,
        count: 0,
        total: 0,
      });
    }
    for (const s of filteredSales) {
      const h = new Date(s.created_at).getHours();
      const entry = hours.find((item) => item.hour === h);
      if (entry) {
        entry.count += 1;
        entry.total += s.total_amount;
      }
    }
    const maxRevenue = Math.max(1, ...hours.map((h) => h.total));
    return { hours, maxRevenue };
  }, [filteredSales]);

  const handleInspectSale = (sale: Sale) => {
    const details = LocalDb.getSaleDetails(sale.id);
    setInspectingSale(sale);
    setInspectingSaleItems(details.items);
  };

  const handleReprintFromInspector = (sale: Sale, items: SaleItem[]) => {
    setReprintSaleModal(sale);
    setReprintSaleItems(items);
  };

  const defaultThreshold = storeConfig.low_stock_threshold ?? 10;

  // Proactive Liquor Supply Metrics & Shortfall Calculations
  const inventoryMetrics = useMemo(() => {
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let healthyCount = 0;
    const belowThresholdItems: { product: Product; threshold: number; shortfall: number }[] = [];

    products.forEach((p) => {
      const threshold = p.low_stock_threshold ?? defaultThreshold;
      if (p.stock_qty <= 0) {
        outOfStockCount++;
        belowThresholdItems.push({ product: p, threshold, shortfall: threshold });
      } else if (p.stock_qty <= threshold) {
        lowStockCount++;
        belowThresholdItems.push({ product: p, threshold, shortfall: threshold - p.stock_qty });
      } else {
        healthyCount++;
      }
    });

    return {
      total: products.length,
      outOfStockCount,
      lowStockCount,
      totalBelowThreshold: outOfStockCount + lowStockCount,
      healthyCount,
      belowThresholdItems: belowThresholdItems.sort((a, b) => b.shortfall - a.shortfall),
    };
  }, [products, defaultThreshold]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const threshold = p.low_stock_threshold ?? defaultThreshold;
      const isOut = p.stock_qty <= 0;
      const isLow = p.stock_qty > 0 && p.stock_qty <= threshold;
      const isHealthy = p.stock_qty > threshold;

      if (stockFilter === 'BELOW_THRESHOLD' && !isOut && !isLow) return false;
      if (stockFilter === 'OUT_OF_STOCK' && !isOut) return false;
      if (stockFilter === 'LOW_STOCK' && !isLow) return false;
      if (stockFilter === 'HEALTHY' && !isHealthy) return false;

      if (selectedInventoryCategory !== 'all' && p.category !== selectedInventoryCategory) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(query) ||
          p.barcode.includes(query) ||
          p.category.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [products, searchQuery, stockFilter, selectedInventoryCategory, defaultThreshold]);

  const filteredUsers = users.filter((u) => {
    const isSuspended = !!u.suspended || u.status === 'SUSPENDED';
    if (userStatusFilter === 'ACTIVE' && isSuspended) return false;
    if (userStatusFilter === 'SUSPENDED' && !isSuspended) return false;

    const matchesSearch =
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      getRoleLabel(u.role).toLowerCase().includes(userSearchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-40 bg-[#F8FAFC] text-slate-800 flex flex-col overflow-hidden animate-fade-in">
      {/* Top Navbar */}
      <header className="h-16 px-4 sm:px-6 bg-[#1E1B4B] text-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Home Page Button */}
          <button
            type="button"
            onClick={() => {
              if (onGoHome) {
                onGoHome();
              }
              onClose();
            }}
            className="p-2 sm:px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-xs"
            title="Return to Home Menu"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Close overlay"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to POS</span>
          </button>
          <div className="flex items-center gap-2.5">
            <BazuLogo className="w-9 h-9 shrink-0 shadow-md" />
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                Admin Control Panel
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold">
                  {currentUser.name}
                </span>
              </h1>
              <p className="text-[11px] text-slate-300">Manage Inventory, Shift Audits, and Store Setup</p>
            </div>
          </div>
        </div>

        {/* Right Header Utilities & Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPrintReceiptModuleOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            title="Open Receipt Printing & Reprint Module"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Receipt Module</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-indigo-950/80 p-1 rounded-xl border border-indigo-900 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventory</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Tags className="w-3.5 h-3.5" />
              <span>Categories</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">
                {categories.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Daily Summary</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customers & Debts</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff & Roles</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">
                {users.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'store'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Store Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC]">
        {/* TAB 1: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Policy Banner if not admin */}
            {!isAdmin && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="leading-snug">
                  <span className="font-bold text-amber-950">Role Permission Enforcement: </span>
                  Logged in as <strong>{currentUser.name} ({getRoleLabel(currentUser.role)})</strong>.
                  Only the Administrator is permitted to add new products and set selling prices. You may review items and adjust physical stock.
                </div>
              </div>
            )}

            {productFeedbackError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>{productFeedbackError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProductFeedbackError(null)}
                  className="p-1 text-red-400 hover:text-red-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* PROACTIVE LIQUOR SUPPLY MANAGEMENT ALERT BANNER */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                inventoryMetrics.totalBelowThreshold > 0
                  ? 'bg-gradient-to-r from-amber-50/90 via-rose-50/60 to-amber-50/90 border-amber-300 shadow-xs'
                  : 'bg-emerald-50/80 border-emerald-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      inventoryMetrics.outOfStockCount > 0
                        ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                        : inventoryMetrics.lowStockCount > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {inventoryMetrics.outOfStockCount > 0 ? (
                      <AlertOctagon className="w-6 h-6" />
                    ) : inventoryMetrics.lowStockCount > 0 ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {inventoryMetrics.totalBelowThreshold > 0
                          ? `Proactive Liquor Supply Alert: ${inventoryMetrics.totalBelowThreshold} Items Below Reorder Threshold`
                          : `Liquor Supply Fully Stocked: All Items Above Safety Threshold`}
                      </h3>
                      {inventoryMetrics.outOfStockCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wider animate-pulse">
                          {inventoryMetrics.outOfStockCount} Out of Stock
                        </span>
                      )}
                      {inventoryMetrics.lowStockCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px]">
                          {inventoryMetrics.lowStockCount} Low Stock
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {inventoryMetrics.totalBelowThreshold > 0
                        ? 'Items flagged in amber/red need replenishment before peak sales hours to prevent stockouts and revenue loss.'
                        : `All ${inventoryMetrics.total} catalog liquor items have stock counts comfortably above the defined ${defaultThreshold}-unit threshold.`}
                    </p>
                  </div>
                </div>

                {/* Right Side: Reorder Sheet Button & Defined Threshold Tuner */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  {/* Interactive Defined Threshold Controller */}
                  <div className="flex items-center gap-2 bg-white/90 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] font-semibold text-slate-600">Defined Alert Threshold:</span>
                    <div className="flex items-center gap-1">
                      {[5, 10, 15, 20].map((th) => (
                        <button
                          key={`th-preset-${th}`}
                          type="button"
                          onClick={() => handleUpdateGlobalThreshold(th)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            defaultThreshold === th
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title={`Set store default low-stock alert threshold to ${th} units`}
                        >
                          {th}
                        </button>
                      ))}
                      <div className="flex items-center ml-1">
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={defaultThreshold}
                          onChange={(e) => handleUpdateGlobalThreshold(Math.max(1, Number(e.target.value) || 1))}
                          className="w-12 text-center bg-slate-50 border border-slate-200 rounded-md py-0.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                          title="Custom defined threshold count"
                        />
                        <span className="text-[10px] font-medium text-slate-400 ml-1">units</span>
                      </div>
                    </div>
                  </div>

                  {/* Replenishment Order Slip Modal Button */}
                  <button
                    type="button"
                    onClick={() => setIsReorderModalOpen(true)}
                    className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Replenishment Slip</span>
                    {inventoryMetrics.totalBelowThreshold > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                        {inventoryMetrics.totalBelowThreshold}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {batchRestockSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in font-medium">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{batchRestockSuccess}</span>
              </div>
            )}

            {/* Toolbar & Filter Bar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search liquor item name, barcode, or category..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Category Filter Dropdown */}
                  <select
                    value={selectedInventoryCategory}
                    onChange={(e) => setSelectedInventoryCategory(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs capitalize"
                  >
                    <option value="all">All Categories ({products.length})</option>
                    {categories.map((cat) => (
                      <option key={`filter-cat-${cat.id}`} value={cat.id}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                      </option>
                    ))}
                  </select>

                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setProductFeedbackError(null);
                        setIsAddModalOpen(true);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-450 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Product</span>
                    </button>
                  ) : (
                    <div
                      className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs flex items-center gap-1.5 font-medium select-none shrink-0"
                      title="Strict Store Policy: Only the Administrator can add new products and set prices."
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Product (Admin Only)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stock Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setStockFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    stockFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Items ({inventoryMetrics.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('BELOW_THRESHOLD')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    stockFilter === 'BELOW_THRESHOLD'
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : inventoryMetrics.totalBelowThreshold > 0
                      ? 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Below Threshold ({inventoryMetrics.totalBelowThreshold})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('OUT_OF_STOCK')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    stockFilter === 'OUT_OF_STOCK'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : inventoryMetrics.outOfStockCount > 0
                      ? 'bg-rose-50 border border-rose-300 text-rose-800 hover:bg-rose-100 font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Out of Stock ({inventoryMetrics.outOfStockCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('LOW_STOCK')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    stockFilter === 'LOW_STOCK'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : inventoryMetrics.lowStockCount > 0
                      ? 'bg-amber-50/70 border border-amber-200 text-amber-800 hover:bg-amber-100'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Low Stock ({inventoryMetrics.lowStockCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('HEALTHY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    stockFilter === 'HEALTHY'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Well Stocked ({inventoryMetrics.healthyCount})</span>
                </button>
              </div>
            </div>

            {/* Inventory Table with Low-Stock Highlighting */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Item Details</th>
                      <th className="py-3 px-4">Barcode</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Selling Price (KES)</th>
                      <th className="py-3 px-4 text-center">Available Stock</th>
                      <th className="py-3 px-4 text-center">Defined Threshold</th>
                      <th className="py-3 px-4 text-right">Quick Replenish & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm font-medium text-slate-600">No liquor items found</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {stockFilter !== 'ALL'
                              ? `No items match the "${stockFilter.replace('_', ' ')}" filter.`
                              : 'No products match your current search or category query.'}
                          </p>
                          {stockFilter !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => setStockFilter('ALL')}
                              className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold text-xs cursor-pointer"
                            >
                              Reset Status Filter
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p, pIdx) => {
                        const threshold = p.low_stock_threshold ?? defaultThreshold;
                        const isOut = p.stock_qty <= 0;
                        const isLow = p.stock_qty > 0 && p.stock_qty <= threshold;
                        const isCustomThreshold = p.low_stock_threshold !== undefined;
                        const shortfall = Math.max(0, threshold - p.stock_qty);

                        return (
                          <tr
                            key={`admin-prod-${p.id}-${p.barcode || pIdx}`}
                            className={`transition-colors ${
                              isOut
                                ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500'
                                : isLow
                                ? 'bg-amber-50/75 hover:bg-amber-100/70 border-l-4 border-l-amber-500'
                                : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{p.name}</span>
                                    {isOut && (
                                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wider">
                                        Out
                                      </span>
                                    )}
                                    {isLow && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold text-[9px]">
                                        Low
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                    <span>{p.unit}</span>
                                    {isLow && (
                                      <span className="text-amber-800 font-medium">
                                        Deficit: {shortfall} unit{shortfall === 1 ? '' : 's'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">{p.barcode}</td>
                            <td className="py-3 px-4">
                              <span className="capitalize px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                              KES {p.price.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold font-mono text-xs shadow-xs ${
                                  isOut
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {isOut ? (
                                  <>
                                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                                    <span>0 units</span>
                                  </>
                                ) : isLow ? (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                    <span>{p.stock_qty} units</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{p.stock_qty} units</span>
                                  </>
                                )}
                              </span>
                              {isOut && (
                                <span className="text-[9px] text-rose-700 font-extrabold uppercase tracking-wider block mt-0.5">
                                  Out of Stock
                                </span>
                              )}
                              {isLow && (
                                <span className="text-[9px] text-amber-800 font-bold block mt-0.5">
                                  Low Stock (≤ {threshold})
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-mono font-bold text-slate-800 text-xs">
                                  {threshold} units
                                </span>
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5 ${
                                    isCustomThreshold
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {isCustomThreshold ? 'Custom Item Rule' : 'Store Default'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Quick restock buttons - accented if below threshold */}
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(p.id, 6)}
                                  title="Restock +6 bottles (half pack)"
                                  className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold border transition-colors cursor-pointer ${
                                    isOut || isLow
                                      ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-900 border-amber-300'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  +6
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(p.id, 12)}
                                  title="Restock +12 crate pack"
                                  className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold border transition-colors cursor-pointer ${
                                    isOut || isLow
                                      ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-900 border-amber-300'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  +12
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(p.id, 24)}
                                  title="Restock +24 full case"
                                  className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold border transition-colors cursor-pointer hidden sm:inline-block ${
                                    isOut || isLow
                                      ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-900 border-amber-300'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  +24
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(p)}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer ml-0.5"
                                  title="Edit Price, Stock Count & Alert Threshold"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Role permission banner */}
            {!isAdmin ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="leading-snug">
                  <span className="font-bold text-amber-950">Role Permission Enforcement: </span>
                  Logged in as <strong>{currentUser.name} ({getRoleLabel(currentUser.role)})</strong>.
                  Only the Administrator has master authority to create, edit, or delete product categories. You may view and browse category catalogs.
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="leading-snug">
                  <span className="font-bold text-indigo-950">Master Category Authority: </span>
                  You are logged in as Administrator. You have full authority to create new categories, assign custom icons, and organize your store's liquor inventory hierarchy.
                </div>
              </div>
            )}

            {/* Notification Alerts */}
            {categoryActionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{categoryActionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryActionError(null)}
                  className="p-1 text-rose-400 hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {categoryActionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{categoryActionSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryActionSuccess(null)}
                  className="p-1 text-emerald-400 hover:text-emerald-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Header & Controls Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                    <Tags className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Product Categories & Catalog Structure
                    </h2>
                    <p className="text-xs text-slate-500">
                      Create and manage liquor beverage groups displayed across the POS Terminal and product catalog.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCategorySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Create Category Button */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatName('');
                      setNewCatDesc('');
                      setNewCatIcon('🍺');
                      setCategoryActionError(null);
                      setIsAddCategoryModalOpen(true);
                    }}
                    className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-450 text-white font-bold text-xs flex items-center gap-2 shadow-xs active:scale-98 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Category</span>
                  </button>
                )}
              </div>
            </div>

            {/* Categories Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Categories
                </span>
                <span className="text-xl font-black font-mono text-slate-900">
                  {categories.length}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Catalog Products
                </span>
                <span className="text-xl font-black font-mono text-amber-600">
                  {products.length}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Active Stock (Bottles)
                </span>
                <span className="text-xl font-black font-mono text-emerald-700">
                  {products.reduce((acc, p) => acc + p.stock_qty, 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Sync Status
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cloud & Local Synchronized
                </span>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories
                .filter((cat) => {
                  if (!categorySearchQuery.trim()) return true;
                  const q = categorySearchQuery.toLowerCase();
                  return (
                    cat.name.toLowerCase().includes(q) ||
                    cat.id.toLowerCase().includes(q) ||
                    (cat.description && cat.description.toLowerCase().includes(q))
                  );
                })
                .map((cat) => {
                  const assignedProducts = products.filter(
                    (p) => p.category === cat.id || p.category.toLowerCase() === cat.name.toLowerCase()
                  );
                  const count = assignedProducts.length;
                  const totalStock = assignedProducts.reduce((sum, p) => sum + p.stock_qty, 0);

                  return (
                    <div
                      key={`cat-card-${cat.id}`}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-amber-400/80 transition-all hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                              {cat.icon || '🏷️'}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                                {cat.name}
                              </h3>
                              <span className="text-[10px] font-mono text-slate-400">
                                ID: {cat.id}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              count > 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {count} {count === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {cat.description && (
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                            {cat.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500 py-2 border-t border-slate-100">
                          <span>Total Units in Stock:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {totalStock.toLocaleString()} bottles
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery(cat.name);
                            setActiveTab('inventory');
                          }}
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                        >
                          View Products →
                        </button>

                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditCategory(cat)}
                              title="Edit Category Details"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (count > 0) {
                                  setCategoryActionError(
                                    `Cannot remove category "${cat.name}": ${count} product(s) are currently assigned to it. Please reassign those items first.`
                                  );
                                  return;
                                }
                                setDeleteCategoryConfirm(cat);
                              }}
                              title={
                                count > 0
                                  ? `${count} products assigned. Cannot delete.`
                                  : 'Delete category'
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                count > 0
                                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 3: SALES & REVENUE EXPLORER */}
        {activeTab === 'summary' && (
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Date Navigator & Controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Sales Journal & Day Explorer
                      </h2>
                      <p className="text-xs text-slate-500">
                        Browse individual sales records over time, filter by cashier or payment method, and inspect itemized slips.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Day Navigation Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleStepDate('PREV')}
                      title="Previous Day"
                      className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="date"
                      value={selectedSalesDate !== 'ALL' ? selectedSalesDate : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedSalesDate(e.target.value);
                        }
                      }}
                      className="bg-transparent font-mono text-xs font-bold text-slate-800 px-2.5 py-1 focus:outline-none cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepDate('NEXT')}
                      title="Next Day"
                      className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Relative Date Presets */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSetRelativeDate(0)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        selectedSalesDate === new Date().toISOString().slice(0, 10)
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetRelativeDate(1)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetRelativeDate('ALL')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        selectedSalesDate === 'ALL'
                          ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      All Records
                    </button>
                  </div>

                  {/* Jump to available recorded day dropdown */}
                  {availableSalesDates.length > 0 && (
                    <select
                      value={selectedSalesDate}
                      onChange={(e) => setSelectedSalesDate(e.target.value)}
                      className="bg-white border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="ALL">Jump to Recorded Day...</option>
                      {availableSalesDates.map((item) => (
                        <option key={item.date} value={item.date}>
                          {item.date} ({item.count} sales • KES {item.totalRevenue.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={reloadData}
                    title="Refresh Data"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Current Context Banner */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>
                    Viewing records for:{' '}
                    <strong className="text-slate-900 font-mono">
                      {selectedSalesDate === 'ALL'
                        ? 'All Time Sales Journal'
                        : new Date(selectedSalesDate + 'T12:00:00').toLocaleDateString('en-KE', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                    </strong>
                  </span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Showing <strong className="text-slate-800">{filteredSales.length}</strong> sales transactions
                </div>
              </div>
            </div>

            {/* Performance KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Gross Revenue</span>
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <CircleDollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  KES {salesMetrics.grandTotal.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Total sales volume</span>
                  <span className="font-mono text-slate-700 font-semibold">{salesMetrics.totalUnits} items sold</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">M-Pesa Receipts</span>
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Smartphone className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600 font-mono">
                  KES {salesMetrics.mpesaTotal.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Till #{storeConfig.till_number}</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Cash in Drawer</span>
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Banknote className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 font-mono">
                  KES {salesMetrics.cashTotal.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Physical Currency</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Receipts & AOV</span>
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {salesMetrics.count}{' '}
                  <span className="text-xs font-normal text-slate-500">receipts</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Avg Order: <strong className="font-mono text-slate-800">KES {salesMetrics.aov.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Hourly Sales Distribution Strip (when day has transactions) */}
            {filteredSales.length > 0 && selectedSalesDate !== 'ALL' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800">Hourly Sales Activity (08:00 - 23:00)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Peak hour insights</span>
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 items-end h-16 pt-2 border-b border-slate-100">
                  {hourlyData.hours.map((h) => {
                    const heightPercent = h.total > 0 ? Math.max(15, Math.round((h.total / hourlyData.maxRevenue) * 100)) : 0;
                    return (
                      <div key={h.label} className="flex flex-col items-center h-full justify-end group relative">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-sm transition-all ${
                            h.total > 0 ? 'bg-amber-400 group-hover:bg-amber-500' : 'bg-slate-100'
                          }`}
                        ></div>
                        {/* Tooltip */}
                        {h.total > 0 && (
                          <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                            <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap">
                              <span className="font-bold">{h.label}</span>: KES {h.total.toLocaleString()} ({h.count} orders)
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 mt-1 text-[9px] font-mono text-slate-400 text-center">
                  {hourlyData.hours.map((h) => (
                    <span key={h.label}>{h.hour}h</span>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Sales Records Table & Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Individual Transaction Records
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Click any sale to inspect all purchased items, unit prices, timestamp, and reprint receipt.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={salesSearchQuery}
                      onChange={(e) => setSalesSearchQuery(e.target.value)}
                      placeholder="Receipt # or M-Pesa ref..."
                      className="bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-2.5 py-1.5 w-44 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Cashier Filter */}
                  <select
                    value={salesCashierFilter}
                    onChange={(e) => setSalesCashierFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="ALL">All Cashiers</option>
                    {users.map((u) => (
                      <option key={`cashier-filter-${u.id}`} value={u.name}>
                        {u.name} ({getRoleLabel(u.role)})
                      </option>
                    ))}
                  </select>

                  {/* Payment Method Filter */}
                  <select
                    value={salesPaymentFilter}
                    onChange={(e) => setSalesPaymentFilter(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="ALL">All Payment Methods</option>
                    <option value="MPESA">M-Pesa Only</option>
                    <option value="CASH">Cash Only</option>
                  </select>

                  {(salesSearchQuery || salesCashierFilter !== 'ALL' || salesPaymentFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSalesSearchQuery('');
                        setSalesCashierFilter('ALL');
                        setSalesPaymentFilter('ALL');
                      }}
                      className="text-xs text-amber-600 hover:text-amber-800 font-semibold px-2 py-1 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {filteredSales.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No Sales Records Found</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                    No transactions match the selected day ({selectedSalesDate}) or filter criteria.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetRelativeDate(0)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      View Today's Sales
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetRelativeDate('ALL')}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      View All Recorded History
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3.5">Date & Time</th>
                        <th className="py-3 px-3.5">Receipt #</th>
                        <th className="py-3 px-3.5">Cashier</th>
                        <th className="py-3 px-3.5">Payment Method</th>
                        <th className="py-3 px-3.5 text-center">Items</th>
                        <th className="py-3 px-3.5 text-right">Amount (KES)</th>
                        <th className="py-3 px-3.5 text-right">Audit Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map((s, sIdx) => {
                        const dateObj = new Date(s.created_at);
                        const timeStr = dateObj.toLocaleTimeString('en-KE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const dateStr = dateObj.toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <tr
                            key={`admin-sale-${s.id}-${sIdx}`}
                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                            onClick={() => handleInspectSale(s)}
                          >
                            <td className="py-3 px-3.5">
                              <div className="font-mono text-slate-800 font-bold">{timeStr}</div>
                              <div className="text-[10px] text-slate-400">{dateStr}</div>
                            </td>
                            <td className="py-3 px-3.5 font-mono font-bold text-amber-600">
                              RCP-{s.id.toString().slice(-6)}
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-slate-800">{s.cashier_name}</div>
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold font-mono text-[10px] ${
                                  s.payment_method === 'MPESA'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {s.payment_method === 'MPESA' ? (
                                  <Smartphone className="w-3 h-3 text-blue-500" />
                                ) : (
                                  <Banknote className="w-3 h-3 text-emerald-500" />
                                )}
                                <span>{s.payment_method}</span>
                                {s.mpesa_code && <span className="text-slate-500">• {s.mpesa_code}</span>}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-600">
                              {s.items_count}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 text-sm">
                              KES {s.total_amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleInspectSale(s)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs transition-colors cursor-pointer"
                                >
                                  Inspect Slip
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const details = LocalDb.getSaleDetails(s.id);
                                    handleReprintFromInspector(s, details.items);
                                  }}
                                  title="Reprint Thermal Receipt"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STAFF & ROLES MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Header & Role Guide */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    Staff Directory & Role-Based Access Control
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage team accounts, assign user roles, and define 4-digit PIN access for POS operations.
                  </p>
                </div>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={handleOpenAddUser}
                    className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-450 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer shrink-0 self-start sm:self-center"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Staff Member</span>
                  </button>
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs flex items-center gap-1.5 font-medium">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Manage Staff (Admin Only)</span>
                  </div>
                )}
              </div>

              {/* Strict Privilege Notice */}
              <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-bold text-amber-900">Enforced Store Policy: </strong>
                  The <strong>Administrator</strong> is strictly the only authority allowed to add new products and set selling prices. Supervisors and Accountants can audit shifts and inventory but cannot alter prices or create products.
                </div>
              </div>

              {/* Roles Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Administrator</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Master control. Sole role permitted to <strong>add new products</strong> and <strong>set prices</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/70">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>Supervisor</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Floor oversight, stock counts & crate restock. Cannot add products or change prices.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/70">
                  <div className="flex items-center gap-1.5 font-bold text-sky-900">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <span>Accountant</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Daily sales reports, M-Pesa/Cash reconciliation & audits. Cannot add products or change prices.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Sales Cashier</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Fast POS sales, barcode scanning, cart management & thermal receipts.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Alerts */}
            {userActionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{userActionSuccess}</span>
              </div>
            )}
            {userActionError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{userActionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUserActionError(null)}
                  className="p-1 text-red-400 hover:text-red-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Users Filter & List */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search staff name or role..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Status Filters */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        userStatusFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({users.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('ACTIVE')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        userStatusFilter === 'ACTIVE'
                          ? 'bg-emerald-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Active ({users.filter((u) => !u.suspended && u.status !== 'SUSPENDED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserStatusFilter('SUSPENDED')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        userStatusFilter === 'SUSPENDED'
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Suspended ({users.filter((u) => u.suspended || u.status === 'SUSPENDED').length})
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Showing: <strong className="text-slate-800">{filteredUsers.length}</strong> staff accounts
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">4-Digit Security PIN</th>
                      <th className="py-3 px-4">Permissions Scope</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u, uIdx) => {
                      const isSelf = u.id === currentUser.id;
                      const isVisible = visiblePins[u.id];
                      const isSuspended = !!u.suspended || u.status === 'SUSPENDED';

                      let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (u.role === 'ADMIN') badgeColor = 'bg-amber-100 text-amber-900 border-amber-200 font-bold';
                      if (u.role === 'SUPERVISOR') badgeColor = 'bg-indigo-100 text-indigo-900 border-indigo-200 font-semibold';
                      if (u.role === 'ACCOUNTANT') badgeColor = 'bg-sky-100 text-sky-900 border-sky-200 font-semibold';
                      if (u.role === 'SALES_CASHIER' || u.role === 'SALES') badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-200 font-semibold';

                      const isLastActiveAdmin =
                        u.role === 'ADMIN' &&
                        users.filter((us) => us.role === 'ADMIN' && !us.suspended && us.status !== 'SUSPENDED').length <= 1;

                      return (
                        <tr
                          key={`admin-staff-${u.id}-${u.pin}-${uIdx}`}
                          className={`transition-colors ${
                            isSuspended ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                                  isSuspended ? 'bg-rose-200 text-rose-800' : 'bg-slate-800 text-white'
                                }`}
                              >
                                {u.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span className={isSuspended ? 'line-through text-slate-500' : ''}>{u.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID #{u.id.toString().slice(-4)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${badgeColor}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              <span>{getRoleLabel(u.role)}</span>
                            </span>
                          </td>

                          {/* Account Status Badge */}
                          <td className="py-3.5 px-4">
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                <span>Suspended</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Active</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold tracking-widest text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 min-w-[70px] text-center">
                                {isVisible ? u.pin : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePinVisibility(u.id)}
                                title={isVisible ? 'Hide PIN' : 'Reveal PIN'}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {u.role === 'ADMIN' ? (
                                <>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                    Add Products & Prices
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Staff Management
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Store Setup
                                  </span>
                                </>
                              ) : u.role === 'SUPERVISOR' ? (
                                <>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
                                    Stock Counts & Restock
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Shift Audits
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                    No Price Changes
                                  </span>
                                </>
                              ) : u.role === 'ACCOUNTANT' ? (
                                <>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200">
                                    Daily Sales Reconciliation
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    M-Pesa / Cash Audit
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                    No Product/Price Edit
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                                    POS Terminal Checkout
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Thermal Receipts
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Suspend / Reactivate Action Button */}
                                {isSuspended ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSuspension(u)}
                                    disabled={isSelf}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={isSelf ? 'Cannot reactivate self' : 'Reactivate staff access to POS'}
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Reactivate</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSuspension(u)}
                                    disabled={isSelf || isLastActiveAdmin}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={
                                      isSelf
                                        ? 'You cannot suspend your own account'
                                        : isLastActiveAdmin
                                        ? 'Cannot suspend the only active Administrator'
                                        : 'Suspend staff login access to POS'
                                    }
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetPasswordTargetUser(u);
                                    setTempPasswordInput('1234');
                                    setResetActionError(null);
                                    setResetActionSuccess(null);
                                  }}
                                  className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                                  title="Reset Staff Password"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditUser(u)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit Staff Member"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmUser(u)}
                                  disabled={u.role === 'ADMIN' && users.filter((us) => us.role === 'ADMIN').length <= 1}
                                  className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                  title="Delete Staff Member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">View Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STORE CUSTOMIZATION */}
        {activeTab === 'store' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-500" />
                Store Configuration & Receipt Branding
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customizes store details saved into the local SQLite `store_config` table
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Store / Business Name</label>
                <input
                  type="text"
                  value={storeConfig.store_name}
                  onChange={(e) => setStoreConfig({ ...storeConfig, store_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Branch / Location</label>
                  <input
                    type="text"
                    value={storeConfig.branch}
                    onChange={(e) => setStoreConfig({ ...storeConfig, branch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Store Phone Number</label>
                  <input
                    type="text"
                    value={storeConfig.phone_number}
                    onChange={(e) => setStoreConfig({ ...storeConfig, phone_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  M-Pesa Buy Goods Till / Paybill Number
                </label>
                <input
                  type="text"
                  value={storeConfig.till_number}
                  onChange={(e) => setStoreConfig({ ...storeConfig, till_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Default Low Stock Alert Threshold (Bottles / Units)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={storeConfig.low_stock_threshold ?? 10}
                    onChange={(e) => setStoreConfig({ ...storeConfig, low_stock_threshold: Math.max(1, Number(e.target.value) || 10) })}
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                  <span className="text-[11px] text-slate-500">
                    Liquor items with stock at or below this count will trigger amber/red warnings in the inventory list.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Receipt Footer Disclaimer / Slogan
                </label>
                <textarea
                  rows={3}
                  value={storeConfig.receipt_footer}
                  onChange={(e) => setStoreConfig({ ...storeConfig, receipt_footer: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {configSuccessMsg && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Store settings saved to local SQLite!
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-450 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>

            {/* My Password & Security Settings */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>My Password & Security</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Logged in as <strong>{currentUser.name}</strong> ({currentUser.username || 'admin'})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Change My Password</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CUSTOMERS & DEBTS MANAGEMENT */}
        {activeTab === 'customers' && (
          <div className="max-w-7xl mx-auto">
            <CustomersSheet
              onSelectCustomerForSale={(customer) => {
                if (onSelectCustomerForSale) {
                  onSelectCustomerForSale(customer);
                }
                onClose();
              }}
            />
          </div>
        )}
      </main>

      {/* EDIT MODAL FOR INVENTORY */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{editingProduct.name}</h3>
                <span className="text-[11px] text-slate-500 font-mono">{editingProduct.barcode}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">Selling Price (KES)</label>
                  {!isAdmin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Admin Only
                    </span>
                  )}
                </div>
                {isAdmin ? (
                  <input
                    type="number"
                    value={newPriceInput}
                    onChange={(e) => setNewPriceInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <div>
                    <input
                      type="number"
                      disabled
                      value={newPriceInput}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-500 font-mono font-bold text-sm cursor-not-allowed"
                    />
                    <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 shrink-0" />
                      Selling price can strictly only be modified by the Administrator.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Physical Stock Count (Bottles/Units)
                </label>
                <input
                  type="number"
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">
                    Low Stock Alert Threshold (Units)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Store Default: {defaultThreshold}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder={`Inherit store default (${defaultThreshold})`}
                  value={newThresholdInput}
                  onChange={(e) => setNewThresholdInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave empty to use store default ({defaultThreshold} units), or define a custom reorder threshold for this specific bottle.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProductEdit}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                {isAdmin ? 'Update Record & Price' : 'Update Stock Count'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add New Liquor Product</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Product Brand & Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tusker Malt, Baileys Irish Cream"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Category</label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewCatName('');
                          setNewCatDesc('');
                          setNewCatIcon('🍺');
                          setIsAddCategoryModalOpen(true);
                        }}
                        className="text-[10px] text-amber-600 hover:text-amber-800 font-bold hover:underline cursor-pointer"
                      >
                        + New
                      </button>
                    )}
                  </div>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as ProductCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium capitalize"
                  >
                    {categories.map((cat) => (
                      <option key={`opt-cat-${cat.id}`} value={cat.id}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Size / Unit</label>
                  <input
                    type="text"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    placeholder="e.g. 500ml, 750ml, 1L"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Selling Price (KES)</label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Barcode (Optional)</label>
                  <input
                    type="text"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    placeholder="Scanned EAN-13 or auto"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Alert Threshold <span className="text-slate-400 font-normal">({defaultThreshold} def)</span>
                  </label>
                  <input
                    type="number"
                    value={newProdThreshold}
                    onChange={(e) => setNewProdThreshold(e.target.value)}
                    placeholder={`Default: ${defaultThreshold}`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STAFF MEMBER MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-amber-500" />
                  Add New Staff Member
                </h3>
                <p className="text-[11px] text-slate-500">Register employee and assign role permissions</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dennis Kiprop, Faith Cherono"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Staff Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="SALES_CASHIER">Sales Cashier (Fast POS sales, cash & M-Pesa receipts)</option>
                  <option value="ACCOUNTANT">Accountant (Shift summaries, audits, M-Pesa reconciliations)</option>
                  <option value="SUPERVISOR">Supervisor (Inventory counts, restock, floor operations)</option>
                  <option value="ADMIN">Administrator (Master access: add products & set prices)</option>
                </select>
              </div>

              {/* Dynamic Role Explanation Note */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-snug">
                <strong className="text-slate-800 font-semibold block mb-0.5">Role Permissions:</strong>
                {newUserRole === 'ADMIN' && (
                  <span className="text-amber-800 font-medium">
                    Sole authority to add new products, set selling prices, manage staff accounts, and configure store settings.
                  </span>
                )}
                {newUserRole === 'SUPERVISOR' && (
                  <span>
                    Can audit shift sales and adjust physical stock / restock crates. <strong>Cannot add products or change selling prices.</strong>
                  </span>
                )}
                {newUserRole === 'ACCOUNTANT' && (
                  <span>
                    Can view daily sales reports, payment splits (M-Pesa vs Cash), and transaction audits. <strong>Cannot add products or set prices.</strong>
                  </span>
                )}
                {newUserRole === 'SALES_CASHIER' && (
                  <span>
                    Can ring up sales, apply payments, and print customer receipts on the POS terminal.
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">4-Digit Security PIN</label>
                  <button
                    type="button"
                    onClick={() => generateRandomPin(setNewUserPin)}
                    className="text-[11px] text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
                  >
                    Generate Random PIN
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="e.g. 4321"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold tracking-widest text-sm focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Must be 4 numeric digits used for fast POS authentication.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newUserPin.length !== 4 || !newUserName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-450 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Register Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MEMBER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  Edit Staff Member
                </h3>
                <span className="text-[11px] text-slate-500">Update details for {editingUser.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="SALES_CASHIER">Sales Cashier (Fast POS sales, cash & M-Pesa receipts)</option>
                  <option value="ACCOUNTANT">Accountant (Shift summaries, audits, M-Pesa reconciliations)</option>
                  <option value="SUPERVISOR">Supervisor (Inventory counts, restock, floor operations)</option>
                  <option value="ADMIN">Administrator (Master access: add products & set prices)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">4-Digit Security PIN</label>
                  <button
                    type="button"
                    onClick={() => generateRandomPin(setEditUserPin)}
                    className="text-[11px] text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
                  >
                    Generate Random PIN
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    inputMode="numeric"
                    value={editUserPin}
                    onChange={(e) => setEditUserPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold tracking-widest text-sm focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUserPin.length !== 4 || !editUserName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-450 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">Remove Staff Member?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{deleteConfirmUser.name}</strong> ({getRoleLabel(deleteConfirmUser.role)})? Their 4-digit PIN will no longer be permitted to log in.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Yes, Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALE INSPECTION SLIP MODAL */}
      {inspectingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  Transaction Audit Slip #RCP-{inspectingSale.id.toString().slice(-6)}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {new Date(inspectingSale.created_at).toLocaleString('en-KE', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSale(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cashier & Payment Meta Box */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cashier in Charge</span>
                <span className="font-semibold text-slate-800">{inspectingSale.cashier_name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method</span>
                <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                  {inspectingSale.payment_method === 'MPESA' ? (
                    <span className="text-blue-600 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      M-Pesa {inspectingSale.mpesa_code ? `(${inspectingSale.mpesa_code})` : ''}
                    </span>
                  ) : (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5" />
                      Cash ({inspectingSale.currency || 'KES'})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Itemized Sold Products */}
            <div className="flex-1 overflow-y-auto min-h-[160px] border border-slate-200 rounded-2xl p-3 bg-white">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Purchased Line Items ({inspectingSaleItems.length})
              </div>
              {inspectingSaleItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Item details not found in local journal.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-100 font-semibold">
                    <tr>
                      <th className="pb-1.5">Item</th>
                      <th className="pb-1.5 text-center">Qty</th>
                      <th className="pb-1.5 text-right">Price</th>
                      <th className="pb-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectingSaleItems.map((item, itIdx) => (
                      <tr key={`inspect-item-${item.id}-${itIdx}`} className="py-2">
                        <td className="py-2 font-medium text-slate-800">
                          {item.product_name}
                        </td>
                        <td className="py-2 text-center font-mono font-bold text-slate-600">
                          {item.quantity}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-600">
                          {item.unit_price.toLocaleString()}
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-slate-900">
                          KES {item.subtotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Total Footer */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Total Transaction Amount
                </span>
                <span className="text-xs text-slate-300">
                  {inspectingSale.items_count} items billed
                </span>
              </div>
              <div className="text-xl font-black font-mono text-amber-400">
                KES {inspectingSale.total_amount.toLocaleString()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setInspectingSale(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleReprintFromInspector(inspectingSale, inspectingSaleItems)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-450 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Reprint Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPRINT RECEIPT MODAL */}
      {reprintSaleModal && (
        <ReceiptModal
          sale={reprintSaleModal.sale}
          items={reprintSaleModal.items}
          storeConfig={storeConfig}
          cashierName={reprintSaleModal.sale.cashier_name}
          onClose={() => setReprintSaleModal(null)}
        />
      )}

      {/* ADMIN RESET STAFF PASSWORD MODAL */}
      {resetPasswordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Staff Password</h3>
                  <p className="text-[11px] text-slate-500">{resetPasswordTargetUser.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordTargetUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetActionError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {resetActionError}
              </div>
            )}

            {resetActionSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{resetActionSuccess}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Set a temporary password for <strong>{resetPasswordTargetUser.name}</strong>. They will be required to change and confirm their password immediately upon next login.
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Temporary Password</label>
                <input
                  type="text"
                  value={tempPasswordInput}
                  onChange={(e) => setTempPasswordInput(e.target.value)}
                  placeholder="e.g. 1234 or welcome2025"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordTargetUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = LocalDb.adminResetPassword(
                      resetPasswordTargetUser.id,
                      tempPasswordInput,
                      currentUser.role
                    );
                    if (res.success) {
                      setResetActionSuccess('Password reset! Staff will be prompted to create a new password on next login.');
                      setResetActionError(null);
                      reloadData();
                      setTimeout(() => {
                        setResetPasswordTargetUser(null);
                      }, 1500);
                    } else {
                      setResetActionError(res.error || 'Failed to reset password.');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-450 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE MY PASSWORD MODAL */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}

      {/* CREATE NEW CATEGORY MODAL */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Tags className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create New Category</h3>
                  <p className="text-[11px] text-slate-500">Add a dynamic product category to your inventory catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {categoryActionError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {categoryActionError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tequila & Mezcal, Cider & Coolers, Energy & Mixers"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Category Icon / Emoji
                </label>
                {/* Preset emoji picker */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['🍺', '🥃', '🍸', '🧊', '🍹', '🍷', '🌵', '☕', '🥤', '🍾', '🥂', '🏷️', '📦'].map(
                    (emoji) => (
                      <button
                        key={`emoji-${emoji}`}
                        type="button"
                        onClick={() => setNewCatIcon(emoji)}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                          newCatIcon === emoji
                            ? 'bg-amber-100 border-2 border-amber-500 scale-105 shadow-xs'
                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    placeholder="Type or paste any emoji"
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-base focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-slate-400">
                    Selected icon displayed on POS terminal tabs
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note on what brands or spirit types belong in this group..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Live Preview of POS Tab */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  POS Tab Preview
                </span>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500 text-white font-bold text-xs shadow-xs">
                  <span>{newCatIcon || '🏷️'}</span>
                  <span>{newCatName.trim() || 'New Category'}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-450 disabled:opacity-50 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit Category: {editingCategory.name}</h3>
                <span className="text-[10px] font-mono text-slate-400">ID: {editingCategory.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {categoryActionError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {categoryActionError}
              </div>
            )}

            <form onSubmit={handleSaveCategoryEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Category Icon / Emoji
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['🍺', '🥃', '🍸', '🧊', '🍹', '🍷', '🌵', '☕', '🥤', '🍾', '🥂', '🏷️', '📦'].map(
                    (emoji) => (
                      <button
                        key={`edit-emoji-${emoji}`}
                        type="button"
                        onClick={() => setEditCatIcon(emoji)}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                          editCatIcon === emoji
                            ? 'bg-amber-100 border-2 border-amber-500 scale-105 shadow-xs'
                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    )
                  )}
                </div>
                <input
                  type="text"
                  value={editCatIcon}
                  onChange={(e) => setEditCatIcon(e.target.value)}
                  placeholder="Emoji"
                  className="w-24 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-base focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editCatDesc}
                  onChange={(e) => setEditCatDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editCatName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-450 disabled:opacity-50 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CATEGORY MODAL */}
      {deleteCategoryConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remove Category?</h3>
                <p className="text-xs text-slate-500">{deleteCategoryConfirm.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>{deleteCategoryConfirm.name}</strong> from the catalog? This will remove the tab from the POS interface.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCategoryConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT SEARCH & THERMAL PRINT MODULE */}
      {isPrintReceiptModuleOpen && (
        <PrintReceiptModule
          storeConfig={storeConfig}
          onClose={() => setIsPrintReceiptModuleOpen(false)}
        />
      )}
    </div>
  );
};
