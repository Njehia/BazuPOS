import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  X,
  Home,
  ShoppingBag,
  Trash2,
  ArrowRight,
  Filter,
  Check,
  Building2,
  User as UserIcon,
  ChevronDown,
  Printer,
  Sparkles,
  MessageSquare,
  Mail,
  FileSpreadsheet,
  FileText,
  Download,
  ExternalLink,
  Share2,
  Copy,
  Phone,
  Send,
} from 'lucide-react';
import {
  Product,
  Requisition,
  RequisitionItem,
  RequisitionStatus,
  RequisitionUrgency,
  StoreConfig,
  User,
  getRoleLabel,
} from '../types';
import { LocalDb } from '../lib/storage';
import { exportRequisitionPDF, exportRequisitionExcel } from '../lib/exportUtils';

function cleanKenyanPhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return '254' + digits.slice(1);
  }
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
    return '254' + digits;
  }
  return digits;
}

function buildRequisitionWhatsAppText(req: Requisition, store: StoreConfig): string {
  const itemsText = req.items
    .map(
      (it, idx) =>
        `${idx + 1}. *${it.product_name}* - Order: *${it.requested_qty} ${it.unit}s* (Stock: ${it.current_stock})`
    )
    .join('\n');

  return (
    `📦 *RESTOCK REQUISITION ORDER*\n\n` +
    `*Requisition:* ${req.requisition_no}\n` +
    `*Store:* ${store.store_name} (${store.branch})\n` +
    `*Requested By:* ${req.requested_by_name} (${getRoleLabel(req.requested_by_role)})\n` +
    `*Date:* ${new Date(req.created_at).toLocaleString('en-KE')}\n` +
    `*Urgency:* ${req.urgency}\n` +
    `*Status:* ${req.status}\n\n` +
    `*ITEMS REQUESTED:*\n${itemsText}\n\n` +
    (req.notes ? `*Staff Notes:* ${req.notes}\n\n` : '') +
    `_Please review and approve this restock order in Bazu POS._`
  );
}

function buildRequisitionEmailBody(req: Requisition, store: StoreConfig): string {
  const itemsText = req.items
    .map(
      (it, idx) =>
        `${idx + 1}. ${it.product_name} - Requested: ${it.requested_qty} ${it.unit}s (Current Stock: ${it.current_stock})`
    )
    .join('\n');

  return (
    `STORE RESTOCK REQUISITION ORDER\n` +
    `====================================\n\n` +
    `Requisition No: ${req.requisition_no}\n` +
    `Store: ${store.store_name} (${store.branch})\n` +
    `Date: ${new Date(req.created_at).toLocaleString('en-KE')}\n` +
    `Requested By: ${req.requested_by_name} (${getRoleLabel(req.requested_by_role)})\n` +
    `Urgency: ${req.urgency}\n` +
    `Status: ${req.status}\n\n` +
    `ITEMS TO RESTOCK:\n` +
    `------------------------------------\n` +
    `${itemsText}\n\n` +
    (req.notes ? `Staff Notes:\n${req.notes}\n\n` : '') +
    `Total Products: ${req.items.length}\n` +
    `Total Units Requested: ${req.items.reduce((s, i) => s + i.requested_qty, 0)}\n\n` +
    `Sent from Bazu POS System.`
  );
}

interface RequisitionsModalProps {
  currentUser: User;
  storeConfig: StoreConfig;
  onClose: () => void;
  onGoHome?: () => void;
  onGoToPos?: () => void;
  onInventoryChanged?: () => void;
}

export const RequisitionsModal: React.FC<RequisitionsModalProps> = ({
  currentUser,
  storeConfig,
  onClose,
  onGoHome,
  onGoToPos,
  onInventoryChanged,
}) => {
  const [requisitions, setRequisitions] = useState<Requisition[]>(() => LocalDb.getRequisitions());
  const [products, setProducts] = useState<Product[]>(() => LocalDb.getProducts());
  const [statusFilter, setStatusFilter] = useState<'ALL' | RequisitionStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);

  // New Requisition Form State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedItems, setSelectedItems] = useState<RequisitionItem[]>([]);
  const [reqUrgency, setReqUrgency] = useState<RequisitionUrgency>('NORMAL');
  const [reqNotes, setReqNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Admin review note state
  const [adminNoteInput, setAdminNoteInput] = useState('');

  // Share & Notification Modals
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [adminPhoneInput, setAdminPhoneInput] = useState(storeConfig.phone_number || '');
  const [adminEmailInput, setAdminEmailInput] = useState(
    storeConfig.admin_email || `admin@${storeConfig.store_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'liquor'}.com`
  );
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const isAdminOrSupervisor = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR';

  const reloadRequisitions = () => {
    setRequisitions(LocalDb.getRequisitions());
    setProducts(LocalDb.getProducts());
  };

  useEffect(() => {
    reloadRequisitions();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set);
  }, [products]);

  const filteredProductsToAdd = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode.includes(q);
        if (!matchName && !matchBarcode) return false;
      }
      return true;
    });
  }, [products, selectedCategory, productSearch]);

  const handleAddItem = (product: Product) => {
    if (selectedItems.some((item) => item.product_id === product.id)) {
      return; // Already added
    }
    const defaultQty = product.stock_qty <= 5 ? 12 : 6;
    const newItem: RequisitionItem = {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      current_stock: product.stock_qty,
      requested_qty: defaultQty,
      unit: product.unit || 'Bottle',
      estimated_cost: product.price ? product.price * 0.8 : 0,
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const handleUpdateItemQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setSelectedItems(selectedItems.filter((i) => i.product_id !== productId));
    } else {
      setSelectedItems(
        selectedItems.map((i) => (i.product_id === productId ? { ...i, requested_qty: qty } : i))
      );
    }
  };

  const handleRemoveItem = (productId: number) => {
    setSelectedItems(selectedItems.filter((i) => i.product_id !== productId));
  };

  const handleAddAllLowStockItems = () => {
    const lowStock = products.filter((p) => p.stock_qty <= (p.low_stock_threshold || 10));
    const newItems: RequisitionItem[] = [];
    lowStock.forEach((p) => {
      if (!selectedItems.some((i) => i.product_id === p.id)) {
        newItems.push({
          product_id: p.id,
          product_name: p.name,
          category: p.category,
          current_stock: p.stock_qty,
          requested_qty: Math.max(12, (p.low_stock_threshold || 10) * 2 - p.stock_qty),
          unit: p.unit || 'Bottle',
          estimated_cost: p.price ? p.price * 0.8 : 0,
        });
      }
    });
    setSelectedItems([...selectedItems, ...newItems]);
  };

  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (selectedItems.length === 0) {
      setErrorMsg('Please select at least one product to restock.');
      return;
    }

    const res = LocalDb.addRequisition({
      requested_by_name: currentUser.name,
      requested_by_id: currentUser.id,
      requested_by_role: currentUser.role,
      urgency: reqUrgency,
      items: selectedItems,
      notes: reqNotes,
    });

    if (res.success && res.requisition) {
      setSuccessMsg(
        `Requisition ${res.requisition.requisition_no} submitted successfully! You can now send it to the Admin via WhatsApp, Email, or Print.`
      );
      setIsCreating(false);
      setSelectedItems([]);
      setReqNotes('');
      setReqUrgency('NORMAL');
      setSelectedRequisition(res.requisition);
      setShowWhatsAppModal(true);
      reloadRequisitions();
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg(res.error || 'Failed to submit requisition.');
    }
  };

  const handleUpdateStatus = (status: RequisitionStatus) => {
    if (!selectedRequisition) return;
    const res = LocalDb.updateRequisitionStatus(
      selectedRequisition.id,
      status,
      adminNoteInput.trim() || undefined
    );
    if (res.success && res.requisition) {
      // If status is RECEIVED, prompt or auto-update product stock
      if (status === 'RECEIVED') {
        res.requisition.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.product_id);
          if (prod) {
            LocalDb.updateProduct(prod.id, {
              stock_qty: prod.stock_qty + item.requested_qty,
            });
          }
        });
        if (onInventoryChanged) onInventoryChanged();
        setSuccessMsg(`Requisition marked as RECEIVED and inventory stock updated!`);
      } else {
        setSuccessMsg(`Requisition status updated to ${status}`);
      }
      setSelectedRequisition(res.requisition);
      reloadRequisitions();
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleDeleteRequisition = (id: string) => {
    if (confirm('Are you sure you want to delete this requisition?')) {
      LocalDb.deleteRequisition(id);
      setSelectedRequisition(null);
      reloadRequisitions();
    }
  };

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = r.requisition_no.toLowerCase().includes(q);
        const matchUser = r.requested_by_name.toLowerCase().includes(q);
        const matchItems = r.items.some((i) => i.product_name.toLowerCase().includes(q));
        if (!matchNo && !matchUser && !matchItems) return false;
      }
      return true;
    });
  }, [requisitions, statusFilter, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col font-sans text-slate-800 dark:text-slate-100 select-none overflow-hidden animate-fade-in">
      {/* Top Header Bar with navigation buttons */}
      <header className="h-16 bg-[#1E1B4B] dark:bg-slate-900 border-b border-indigo-950/60 dark:border-slate-800 text-white flex items-center justify-between px-4 sm:px-6 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Restock Requisitions
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {storeConfig.store_name}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Staff Restock Order Requests &amp; Admin Approval Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Go Home Button */}
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-xs font-semibold cursor-pointer transition-colors"
              title="Return to Main Menu"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}

          {/* Go to POS Button */}
          {onGoToPos && (
            <button
              type="button"
              onClick={onGoToPos}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs cursor-pointer transition-colors"
              title="Open POS Terminal"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">POS Terminal</span>
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Requisitions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Left Side / Master List */}
        <div className="w-full md:w-5/12 lg:w-4/12 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shrink-0">
          {/* Top Search & Actions */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true);
                  setSelectedRequisition(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Restock Request</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requisition #, product, staff..."
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl pl-8 pr-3 py-1.5 text-xs border border-transparent focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
              {(['ALL', 'PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'REJECTED'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      statusFilter === st
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All Requests' : st}
                  </button>
                )
              )}
            </div>
          </div>

          {/* List of Requisitions */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
            {filteredRequisitions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ClipboardList className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-semibold">No requisitions found</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  Click &quot;New Restock Request&quot; to create one
                </p>
              </div>
            ) : (
              filteredRequisitions.map((req) => {
                const isSelected = selectedRequisition?.id === req.id;
                const statusColor =
                  req.status === 'RECEIVED'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : req.status === 'APPROVED' || req.status === 'ORDERED'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    : req.status === 'REJECTED'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';

                return (
                  <div
                    key={req.id}
                    onClick={() => {
                      setSelectedRequisition(req);
                      setIsCreating(false);
                      setAdminNoteInput(req.admin_notes || '');
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                        {req.requisition_no}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${statusColor}`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <strong>{req.requested_by_name}</strong> ({getRoleLabel(req.requested_by_role)})
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(req.created_at).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{req.total_items} item(s) • {req.total_units || req.items.reduce((s, i) => s + i.requested_qty, 0)} units</span>
                      {req.urgency !== 'NORMAL' && (
                        <span className="font-bold text-rose-500 uppercase text-[10px]">
                          {req.urgency} URGENCY
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side / Workspace: Create Form OR Detail View */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 p-4 sm:p-6">
          {isCreating ? (
            /* CREATE REQUISITION FORM */
            <form onSubmit={handleSubmitRequisition} className="max-w-4xl mx-auto w-full space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Submit New Restock Requisition
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Any staff member can request stock replenishment from warehouse/distributor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>

              {/* Quick Actions & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Restock Urgency
                  </label>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(['NORMAL', 'HIGH', 'URGENT'] as const).map((urg) => (
                      <button
                        key={urg}
                        type="button"
                        onClick={() => setReqUrgency(urg)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          reqUrgency === urg
                            ? urg === 'URGENT'
                              ? 'bg-rose-500 text-white border-rose-600'
                              : urg === 'HIGH'
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent'
                        }`}
                      >
                        {urg}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Auto-Populate Low Stock
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Quickly add all bottles currently below low-stock threshold.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAllLowStockItems}
                    className="mt-2 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Add All Low Stock Items</span>
                  </button>
                </div>
              </div>

              {/* Product Catalog Picker */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Select Products to Restock
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search bottle or barcode..."
                        className="w-full bg-slate-50 dark:bg-slate-800 text-xs rounded-xl pl-8 pr-2.5 py-1.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 text-xs rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Products Grid to Add */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  {filteredProductsToAdd.map((p) => {
                    const isAlreadyAdded = selectedItems.some((i) => i.product_id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isAlreadyAdded}
                        onClick={() => handleAddItem(p)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          isAlreadyAdded
                            ? 'opacity-40 bg-slate-200 dark:bg-slate-800 cursor-not-allowed border-transparent'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:shadow-xs'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                          <span>Stock: <strong>{p.stock_qty}</strong></span>
                          <span>{p.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Items Table */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Requested Items ({selectedItems.length})
                  </span>
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedItems([])}
                      className="text-xs text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedItems.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Package className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-xs">No items selected yet. Click products above to add them.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    {selectedItems.map((item) => (
                      <div
                        key={item.product_id}
                        className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.product_name}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Current Stock: {item.current_stock} {item.unit}s
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 font-medium">Order Qty:</span>
                            <input
                              type="number"
                              min={1}
                              value={item.requested_qty}
                              onChange={(e) =>
                                handleUpdateItemQty(item.product_id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 bg-slate-50 dark:bg-slate-800 text-center font-mono font-bold text-xs py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                            <span className="text-xs text-slate-500">{item.unit}s</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.product_id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Staff Notes &amp; Justification
                </label>
                <textarea
                  rows={2}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="E.g. Expected high demand for Champions League this weekend, customer asked for whole carton..."
                  className="w-full bg-slate-50 dark:bg-slate-800 text-xs rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md cursor-pointer transition-colors"
                >
                  Submit Requisition to Admin
                </button>
              </div>
            </form>
          ) : selectedRequisition ? (
            /* DETAIL VIEW FOR SELECTED REQUISITION */
            <div className="max-w-4xl mx-auto w-full space-y-5">
              {/* Header Details Card */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">
                      {selectedRequisition.requisition_no}
                    </h3>
                    <span
                      className={`text-xs uppercase font-black px-2.5 py-0.5 rounded-full border ${
                        selectedRequisition.status === 'RECEIVED'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : selectedRequisition.status === 'APPROVED' || selectedRequisition.status === 'ORDERED'
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                          : selectedRequisition.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      }`}
                    >
                      {selectedRequisition.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Requested by <strong>{selectedRequisition.requested_by_name}</strong> (
                    {getRoleLabel(selectedRequisition.requested_by_role)}) on{' '}
                    {new Date(selectedRequisition.created_at).toLocaleString('en-KE')}
                  </p>
                </div>

                {/* Admin Delete Action */}
                {isAdminOrSupervisor && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRequisition(selectedRequisition.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs font-bold flex items-center gap-1.5 self-start cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Requisition</span>
                  </button>
                )}
              </div>

              {/* Communication & Actions Toolbar */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* WhatsApp Admin */}
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                    title="Notify Admin via WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Admin</span>
                  </button>

                  {/* Email Admin */}
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                    title="Send Requisition via Email"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email Requisition</span>
                  </button>

                  {/* Print Restock Slip */}
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                    title="Print Restock Order Slip"
                  >
                    <Printer className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                    <span>Print Slip</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* PDF Download */}
                  <button
                    type="button"
                    onClick={() => exportRequisitionPDF(selectedRequisition, storeConfig)}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Export as PDF Document"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  {/* Excel Download */}
                  <button
                    type="button"
                    onClick={() => exportRequisitionExcel(selectedRequisition, storeConfig)}
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Export as Excel Spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Products Listed</div>
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    {selectedRequisition.items.length} items
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Units to Order</div>
                  <div className="text-base font-black text-amber-600 font-mono mt-0.5">
                    {selectedRequisition.items.reduce((s, i) => s + (Number(i.requested_qty) || 0), 0)} units
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Priority / Urgency</div>
                  <div
                    className={`text-base font-black font-mono mt-0.5 ${
                      selectedRequisition.urgency === 'HIGH' ||
                      selectedRequisition.urgency === 'CRITICAL' ||
                      selectedRequisition.urgency === 'URGENT'
                        ? 'text-rose-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {selectedRequisition.urgency}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Requested Restock Bottles &amp; Items
                </h4>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {selectedRequisition.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.product_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Category: {item.category} • Current Stock: {item.current_stock}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                          +{item.requested_qty} {item.unit}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Card */}
              {selectedRequisition.notes && (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Staff Notes
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200">
                    {selectedRequisition.notes}
                  </p>
                </div>
              )}

              {/* Admin Action Review Panel */}
              {isAdminOrSupervisor ? (
                <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-500/30 rounded-2xl space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      Administrator Review &amp; Status Controls
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Manage supplier fulfillment. Marking as <strong>RECEIVED</strong> will automatically restock inventory.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Admin / Supplier Notes
                    </label>
                    <input
                      type="text"
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                      placeholder="E.g. Delivery truck arriving 2pm Tuesday..."
                      className="w-full mt-1 bg-white dark:bg-slate-900 text-xs rounded-xl p-2.5 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Status Change Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('APPROVED')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        selectedRequisition.status === 'APPROVED'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
                      }`}
                    >
                      Mark Approved
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('ORDERED')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        selectedRequisition.status === 'ORDERED'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
                      }`}
                    >
                      Mark Ordered with Distributor
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('RECEIVED')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        selectedRequisition.status === 'RECEIVED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 inline mr-1" />
                      Mark Received &amp; Restock Bottles
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('REJECTED')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        selectedRequisition.status === 'REJECTED'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200'
                      }`}
                    >
                      Reject Request
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <p>
                    This requisition is under review by the store administrator. When approved and received,
                    inventory counts will update automatically.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* EMPTY WORKSPACE STATE */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <ClipboardList className="w-14 h-14 opacity-25 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Requisition Selected
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Select an existing stock order from the list on the left to review details, or click
                &quot;New Restock Request&quot; to order new liquor bottles.
              </p>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
              >
                Create Restock Request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. WHATSAPP NOTIFICATION MODAL */}
      {/* ========================================================================= */}
      {showWhatsAppModal && selectedRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-emerald-900 flex items-center justify-between bg-[#064E3B] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <MessageSquare className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> WhatsApp Restock Notice
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Send to Admin ({selectedRequisition.requisition_no})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              {/* Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Admin WhatsApp Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={adminPhoneInput}
                    onChange={(e) => setAdminPhoneInput(e.target.value)}
                    placeholder="e.g. 0722123456 or 254722123456"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  WhatsApp recipient: <strong className="text-emerald-600 font-mono">+{cleanKenyanPhone(adminPhoneInput) || '...'}</strong>
                </span>
              </div>

              {/* PDF Attachment Download Banner */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    Send PDF as Attachment
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Download the official PDF order slip to attach it directly in your WhatsApp chat with the Admin.
                  </p>
                  <button
                    type="button"
                    onClick={() => exportRequisitionPDF(selectedRequisition, storeConfig)}
                    className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF Attachment</span>
                  </button>
                </div>
              </div>

              {/* Message Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  WhatsApp Message Preview
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed text-slate-800 dark:text-slate-200 select-all">
                  {buildRequisitionWhatsAppText(selectedRequisition, storeConfig)}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(buildRequisitionWhatsAppText(selectedRequisition, storeConfig));
                  setCopiedWhatsApp(true);
                  setTimeout(() => setCopiedWhatsApp(false), 2500);
                }}
                className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {copiedWhatsApp ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const phone = cleanKenyanPhone(adminPhoneInput);
                    const msg = encodeURIComponent(buildRequisitionWhatsAppText(selectedRequisition, storeConfig));
                    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EMAIL NOTIFICATION MODAL */}
      {/* ========================================================================= */}
      {showEmailModal && selectedRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-indigo-900 flex items-center justify-between bg-[#312E81] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Mail className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Email Dispatch
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Email Requisition to Admin
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              {/* Email Address Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Recipient Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="admin@store.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs font-mono text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Subject line */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Subject Line
                </label>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200">
                  [RESTOCK REQUISITION {selectedRequisition.requisition_no}] {storeConfig.store_name} ({selectedRequisition.urgency})
                </div>
              </div>

              {/* PDF Attachment Banner */}
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    Attach Official PDF File
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Download the printable PDF order form to attach to your email client.
                  </p>
                  <button
                    type="button"
                    onClick={() => exportRequisitionPDF(selectedRequisition, storeConfig)}
                    className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF Attachment</span>
                  </button>
                </div>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Email Body Preview
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed text-slate-800 dark:text-slate-200 select-all">
                  {buildRequisitionEmailBody(selectedRequisition, storeConfig)}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(buildRequisitionEmailBody(selectedRequisition, storeConfig));
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2500);
                }}
                className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Body</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const subject = encodeURIComponent(
                      `[RESTOCK REQUISITION ${selectedRequisition.requisition_no}] ${storeConfig.store_name}`
                    );
                    const body = encodeURIComponent(
                      buildRequisitionEmailBody(selectedRequisition, storeConfig)
                    );
                    window.location.href = `mailto:${adminEmailInput}?subject=${subject}&body=${body}`;
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Launch Mail App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRINT RESTOCK SLIP MODAL */}
      {/* ========================================================================= */}
      {showPrintModal && selectedRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Printer className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Restock Document
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Print Order Slip ({selectedRequisition.requisition_no})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Preview */}
            <div className="p-5 flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950">
              <div className="max-w-xl mx-auto bg-white text-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 font-sans">
                {/* Store Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    {storeConfig.store_name}
                  </h2>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    {storeConfig.branch} • Tel: {storeConfig.phone_number} • Till: {storeConfig.till_number}
                  </div>
                  <div className="mt-2 inline-block px-3 py-1 bg-amber-100 text-amber-900 font-black text-xs uppercase tracking-wider rounded-md border border-amber-300">
                    Official Restock Requisition Order Slip
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-slate-500 font-medium">Requisition No:</span>{' '}
                    <strong className="font-mono text-slate-900">{selectedRequisition.requisition_no}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium">Date:</span>{' '}
                    <strong>{new Date(selectedRequisition.created_at).toLocaleString('en-KE')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Requested By:</span>{' '}
                    <strong>{selectedRequisition.requested_by_name}</strong> ({getRoleLabel(selectedRequisition.requested_by_role)})
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium">Urgency:</span>{' '}
                    <strong className={selectedRequisition.urgency !== 'NORMAL' ? 'text-rose-600' : ''}>
                      {selectedRequisition.urgency}
                    </strong>
                  </div>
                </div>

                {/* Table of Items */}
                <table className="w-full text-xs mb-4 border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-700">
                      <th className="text-left py-2 font-black w-8">#</th>
                      <th className="text-left py-2 font-black">Product Name</th>
                      <th className="text-right py-2 font-black w-20">In Stock</th>
                      <th className="text-right py-2 font-black w-24">Order Qty</th>
                      <th className="text-center py-2 font-black w-16">Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedRequisition.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 font-bold text-slate-900">{item.product_name}</td>
                        <td className="py-2 text-right text-slate-500 font-mono">{item.current_stock}</td>
                        <td className="py-2 text-right font-black text-slate-900 font-mono">
                          {item.requested_qty} {item.unit}s
                        </td>
                        <td className="py-2 text-center">
                          <span className="inline-block w-4 h-4 border-2 border-slate-400 rounded-sm"></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-black">
                      <td colSpan={3} className="py-2 text-right text-slate-700 uppercase">
                        Total Units to Restock:
                      </td>
                      <td className="py-2 text-right font-mono text-sm">
                        {selectedRequisition.items.reduce((s, i) => s + (Number(i.requested_qty) || 0), 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Notes */}
                {selectedRequisition.notes && (
                  <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="font-bold text-slate-700">Requester Notes:</span> {selectedRequisition.notes}
                  </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-dashed border-slate-300 text-xs">
                  <div>
                    <div className="text-slate-500 font-bold mb-6">Requester Signature:</div>
                    <div className="border-b border-slate-400 pb-1 font-mono text-[11px] text-slate-700">
                      {selectedRequisition.requested_by_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-bold mb-6">Store Admin Approval:</div>
                    <div className="border-b border-slate-400 pb-1 text-[11px] text-slate-400">
                      Signature &amp; Date
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => exportRequisitionPDF(selectedRequisition, storeConfig)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save as PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DEDICATED PRINTABLE SLIP FOR BROWSER PRINT (Ctrl+P / window.print()) */}
      {/* ========================================================================= */}
      {selectedRequisition && (
        <div id="printable-requisition" className="hidden print:block font-sans text-black bg-white">
          <div className="text-center border-b-2 border-black pb-3 mb-3">
            <h1 className="text-2xl font-black uppercase tracking-tight">{storeConfig.store_name}</h1>
            <p className="text-sm font-bold text-black mt-0.5">
              {storeConfig.branch} • Tel: {storeConfig.phone_number} • Till: {storeConfig.till_number}
            </p>
            <div className="mt-2 inline-block px-3 py-1 font-black text-xs uppercase border-2 border-black">
              Restock Requisition Order Voucher
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3 pb-2 border-b border-black font-mono">
            <div><strong>Requisition:</strong> {selectedRequisition.requisition_no}</div>
            <div className="text-right"><strong>Date:</strong> {new Date(selectedRequisition.created_at).toLocaleString('en-KE')}</div>
            <div><strong>Requested By:</strong> {selectedRequisition.requested_by_name} ({getRoleLabel(selectedRequisition.requested_by_role)})</div>
            <div className="text-right"><strong>Urgency:</strong> {selectedRequisition.urgency}</div>
            <div><strong>Status:</strong> {selectedRequisition.status}</div>
          </div>

          <table className="w-full text-xs mb-4 border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-1 w-8">#</th>
                <th className="py-1">Product Name</th>
                <th className="py-1 text-right w-20">In Stock</th>
                <th className="py-1 text-right w-24">Order Qty</th>
                <th className="py-1 text-center w-16">Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {selectedRequisition.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 font-mono">{idx + 1}</td>
                  <td className="py-1 font-bold">{item.product_name}</td>
                  <td className="py-1 text-right font-mono">{item.current_stock}</td>
                  <td className="py-1 text-right font-mono font-black">{item.requested_qty} {item.unit}s</td>
                  <td className="py-1 text-center">[  ]</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-black">
                <td colSpan={3} className="py-1 text-right uppercase">Total Units:</td>
                <td className="py-1 text-right font-mono text-sm">
                  {selectedRequisition.items.reduce((s, i) => s + (Number(i.requested_qty) || 0), 0)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {selectedRequisition.notes && (
            <div className="mb-4 p-2 border border-black text-xs font-mono">
              <strong>Staff Notes:</strong> {selectedRequisition.notes}
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-black text-xs">
            <div>
              <p className="font-bold mb-8">Staff Requester:</p>
              <p className="border-t border-black pt-1">{selectedRequisition.requested_by_name}</p>
            </div>
            <div>
              <p className="font-bold mb-8">Admin / Manager Approval:</p>
              <p className="border-t border-black pt-1">Signature &amp; Date</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
