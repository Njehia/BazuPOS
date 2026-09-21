import React, { useState, useMemo } from 'react';
import {
  Beer,
  CheckCircle2,
  Clock,
  Plus,
  Receipt,
  Search,
  Trash2,
  Users,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Printer,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  CartItem,
  Customer,
  CustomerTab,
  PaymentMethod,
  Product,
  StoreConfig,
  User,
} from '../types';
import { LocalDb } from '../lib/storage';

interface CustomerTabsModalProps {
  isOpen?: boolean;
  currentUser?: User;
  cashierName?: string;
  storeConfig?: StoreConfig;
  cart?: CartItem[];
  currentCart?: CartItem[];
  onClose: () => void;
  onClearCart?: () => void;
  onSettleTab: (tab: CustomerTab) => void;
  onOpenBill?: (tab: CustomerTab) => void;
  onPrintTabBill?: (tab: CustomerTab) => void;
}

export const CustomerTabsModal: React.FC<CustomerTabsModalProps> = ({
  isOpen = true,
  currentUser,
  cashierName,
  storeConfig,
  cart,
  currentCart,
  onClose,
  onClearCart,
  onSettleTab,
  onOpenBill,
  onPrintTabBill,
}) => {
  // If explicitly closed, do not render
  if (isOpen === false) return null;

  const effectiveCart = currentCart || cart || [];
  const effectiveCashierName = cashierName || currentUser?.name || 'Cashier';
  const handleBillSlip = onOpenBill || onPrintTabBill;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [activeTabSubView, setActiveTabSubView] = useState<'OPEN' | 'ADD_CART' | 'HISTORY'>('OPEN');
  const [tabs, setTabs] = useState<CustomerTab[]>(() => {
    try {
      return LocalDb.getCustomerTabs() || [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTabId, setExpandedTabId] = useState<string | null>(null);

  // Open New Tab form state
  const [newTabName, setNewTabName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();
  const [customerSearch, setCustomerSearch] = useState('');
  const [newTabNotes, setNewTabNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registered customers
  const customers = useMemo(() => LocalDb.getCustomers(), []);

  const openTabs = useMemo(() => {
    return tabs.filter((t) => t.status === 'OPEN');
  }, [tabs]);

  const settledTabs = useMemo(() => {
    return tabs.filter((t) => t.status === 'SETTLED' || t.status === 'CANCELLED');
  }, [tabs]);

  const filteredOpenTabs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return openTabs;
    return openTabs.filter(
      (t) =>
        t.tab_name.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        (t.customer_phone && t.customer_phone.includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        t.id.toLowerCase().includes(q)
    );
  }, [openTabs, searchQuery]);

  const filteredSettledTabs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return settledTabs.slice(0, 30);
    return settledTabs
      .filter(
        (t) =>
          t.tab_name.toLowerCase().includes(q) ||
          (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [settledTabs, searchQuery]);

  const totalHeldAmount = useMemo(() => {
    return openTabs.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  }, [openTabs]);

  const cartTotal = useMemo(() => {
    return (effectiveCart || []).reduce((sum, ci) => sum + ((ci.product && ci.product.price) || 0) * (ci.quantity || 0), 0);
  }, [effectiveCart]);

  const cartUnits = useMemo(() => {
    return (effectiveCart || []).reduce((sum, ci) => sum + (ci.quantity || 0), 0);
  }, [effectiveCart]);

  const refreshTabs = () => {
    setTabs(LocalDb.getCustomerTabs());
  };

  // Handle Opening a new tab with current cart
  const handleCreateTab = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTabName.trim()) {
      setFormError('Please enter a Tab Name or Table identifier (e.g., Table 4 or John).');
      return;
    }

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);

    const result = LocalDb.createCustomerTab({
      tab_name: newTabName.trim(),
      customer_id: selectedCust?.id,
      customer_name: selectedCust?.name,
      customer_phone: selectedCust?.phone,
      notes: newTabNotes.trim() || undefined,
      cashier_name: effectiveCashierName,
      initialItems: effectiveCart.length > 0 ? effectiveCart : undefined,
    });

    if (!result.success) {
      setFormError(result.error || 'Failed to create customer tab.');
      return;
    }

    if (effectiveCart.length > 0 && onClearCart) {
      onClearCart();
    }

    setNewTabName('');
    setNewTabNotes('');
    setSelectedCustomerId(undefined);
    refreshTabs();
    setActiveTabSubView('OPEN');
    setSuccessMsg(
      `Tab "${result.tab?.tab_name}" created successfully! Order held without printing receipt.`
    );
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Handle adding current cart items to an existing open tab
  const handleAddCartToExistingTab = (tab: CustomerTab) => {
    if (effectiveCart.length === 0) {
      setFormError('Your POS cart is empty. Add drinks to cart first.');
      return;
    }

    const result = LocalDb.addRoundToTab(tab.id, effectiveCart, effectiveCashierName, 'Additional Round');
    if (!result.success) {
      setFormError(result.error || 'Failed to add round to tab.');
      return;
    }

    if (onClearCart) {
      onClearCart();
    }
    refreshTabs();
    setActiveTabSubView('OPEN');
    setSuccessMsg(
      `Added ${cartUnits} items to Tab "${tab.tab_name}". Total is now KES ${(result.tab?.total_amount || 0).toLocaleString()}.`
    );
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Handle cancelling / voiding tab
  const handleCancelTab = (tab: CustomerTab) => {
    const reason = window.prompt(
      `Cancel and void Tab "${tab.tab_name}"? This will restore all deducted drinks back to inventory. Enter cancellation reason:`
    );
    if (reason === null) return; // User cancelled prompt

    const res = LocalDb.cancelCustomerTab(tab.id, reason || 'Voided by cashier');
    if (res.success) {
      refreshTabs();
      setSuccessMsg(`Tab "${tab.tab_name}" voided. Stock returned to inventory.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setFormError(res.error || 'Could not cancel tab.');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Beer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Customer Bar Tabs & Held Orders</h2>
                <span className="bg-amber-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full">
                  {openTabs.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hold multiple rounds for customers without printing receipts until they clear their tab
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-view Navigation Tabs */}
        <div className="flex items-center justify-between px-5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs font-bold">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTabSubView('OPEN');
                setFormError(null);
              }}
              className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTabSubView === 'OPEN'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Beer className="w-3.5 h-3.5" />
              <span>Active Tabs ({openTabs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTabSubView('ADD_CART');
                setFormError(null);
              }}
              className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTabSubView === 'ADD_CART'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Hold Current Cart on Tab {effectiveCart.length > 0 ? `(${cartUnits})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTabSubView('HISTORY');
                setFormError(null);
              }}
              className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTabSubView === 'HISTORY'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Settled Tabs History</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Held:</span>
            <span className="font-extrabold text-slate-900 dark:text-white font-mono">
              KES {totalHeldAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Success or Error Feedback */}
        {successMsg && (
          <div className="mx-5 mt-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {formError && (
          <div className="mx-5 mt-3 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* VIEW 1: ACTIVE OPEN TABS */}
          {activeTabSubView === 'OPEN' && (
            <div className="space-y-4">
              {/* Search & Quick Actions Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tab name, table, customer..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTabSubView('ADD_CART')}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Open New Tab</span>
                  </button>
                </div>
              </div>

              {filteredOpenTabs.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Beer className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {openTabs.length === 0 ? 'No Open Customer Tabs' : 'No matching tabs found'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    {openTabs.length === 0
                      ? 'When a customer orders multiple drinks throughout their visit, you can hold their orders here until they are ready to clear their tab.'
                      : 'Try searching with a different table number or customer name.'}
                  </p>
                  {effectiveCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTabSubView('ADD_CART')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Hold Current Cart ({cartUnits} items) on a New Tab</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredOpenTabs.map((tab) => {
                    const isExpanded = expandedTabId === tab.id;
                    const openedDate = new Date(tab.opened_at || Date.now());
                    const timeAgoMinutes = Math.round(
                      (Date.now() - (isNaN(openedDate.getTime()) ? Date.now() : openedDate.getTime())) / (1000 * 60)
                    );
                    const roundsList = tab.rounds || [];

                    return (
                      <div
                        key={tab.id}
                        className="bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col transition-all hover:border-amber-400/50 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {tab.tab_name}
                              </h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                                {roundsList.length} {roundsList.length === 1 ? 'Round' : 'Rounds'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgoMinutes < 1
                                  ? 'Just opened'
                                  : `${timeAgoMinutes}m ago (${isNaN(openedDate.getTime()) ? '' : openedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                              </span>
                              <span>• By {tab.opened_by_cashier || 'Cashier'}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Tab Total
                            </span>
                            <span className="text-base font-black text-slate-950 dark:text-white font-mono">
                              KES {(tab.total_amount || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Customer / Note Meta */}
                        {(tab.customer_name || tab.notes) && (
                          <div className="mb-3 text-xs bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                            {tab.customer_name && (
                              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                                <Users className="w-3 h-3 text-amber-500" />
                                <span>{tab.customer_name}</span>
                                {tab.customer_phone && (
                                  <span className="text-slate-400 text-[10px]">({tab.customer_phone})</span>
                                )}
                              </div>
                            )}
                            {tab.notes && (
                              <div className="text-[11px] text-slate-500 italic truncate max-w-full">
                                "{tab.notes}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* Itemized Rounds Collapsible Preview */}
                        <div className="mt-auto pt-2 border-t border-slate-200 dark:border-slate-700/80">
                          <button
                            type="button"
                            onClick={() => setExpandedTabId(isExpanded ? null : tab.id)}
                            className="w-full py-1 text-left flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
                          >
                            <span>
                              {tab.total_items_count || 0} {(tab.total_items_count === 1) ? 'drink' : 'drinks'} in tab
                            </span>
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px]">
                              {isExpanded ? 'Hide Details' : 'View Rounds'}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2.5 bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs">
                              {roundsList.map((round) => (
                                <div key={round.id} className="border-b border-slate-100 dark:border-slate-800 pb-2 last:border-none last:pb-0">
                                  <div className="flex items-center justify-between font-bold text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                                    <span className="uppercase text-amber-600 dark:text-amber-400">
                                      Round #{round.round_number} ({new Date(round.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                    <span className="font-mono">KES {(round.round_total || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="space-y-1 pl-2">
                                    {(round.items || []).map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                                        <span>
                                          {item.quantity}× {item.product?.name || 'Item'}
                                        </span>
                                        <span className="font-mono">
                                          KES {(((item.product?.price || 0) * (item.quantity || 0))).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Tab Actions Footer */}
                        <div className="mt-3 pt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {/* Print interim tab check */}
                            <button
                              type="button"
                              onClick={() => handleBillSlip && handleBillSlip(tab)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Print Tab Check (Leta Bill) for customer review"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Leta Bill</span>
                            </button>

                            {/* Void / Cancel */}
                            <button
                              type="button"
                              onClick={() => handleCancelTab(tab)}
                              className="px-2 py-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 text-xs transition-colors cursor-pointer"
                              title="Void Tab and restore drinks to inventory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Add Cart to Tab if Cart has items */}
                            {effectiveCart.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleAddCartToExistingTab(tab)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title={`Add current ${cartUnits} cart items to this tab`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Cart (+{cartUnits})</span>
                              </button>
                            )}

                            {/* Settle & Clear Tab */}
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onSettleTab(tab);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Settle Tab (KES {(tab.total_amount || 0).toLocaleString()})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: ADD CART TO TAB / OPEN NEW TAB */}
          {activeTabSubView === 'ADD_CART' && (
            <div className="space-y-6 max-w-xl mx-auto">
              {/* Cart Context Banner */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs uppercase font-bold text-amber-800 dark:text-amber-300">
                    Current POS Cart Order
                  </h4>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {effectiveCart.length === 0
                      ? 'No items in cart (Opening an empty tab for later orders)'
                      : `${cartUnits} items ready to be held on tab`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Cart Value</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    KES {cartTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Choose Existing Tab Option */}
              {openTabs.length > 0 && effectiveCart.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                    Or Append to an Existing Open Tab:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {openTabs.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleAddCartToExistingTab(t)}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-left transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500">
                            {t.tab_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(t.rounds || []).length} rounds • KES {(t.total_amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-2">
                          + Add
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form to Open a New Tab */}
              <form onSubmit={handleCreateTab} className="space-y-4">
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <Beer className="w-4 h-4 text-amber-500" />
                    <span>Open a New Tab / Table</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tab Name / Table Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newTabName}
                        onChange={(e) => setNewTabName(e.target.value)}
                        placeholder="e.g., Table 4 - Kamau, Brian Mwangi, VIP Lounge, Counter 2"
                        className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Link to Registered Customer (Optional)
                      </label>
                      <select
                        value={selectedCustomerId || ''}
                        onChange={(e) =>
                          setSelectedCustomerId(e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- No linked customer (Casual Guest) --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone}) - Current Debt: KES {(c.current_debt || 0).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Notes / Table Location (Optional)
                      </label>
                      <input
                        type="text"
                        value={newTabNotes}
                        onChange={(e) => setNewTabNotes(e.target.value)}
                        placeholder="e.g., Outside gazebo, served by Kevin, will pay M-Pesa"
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTabSubView('OPEN')}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Back to Tabs
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Beer className="w-4 h-4" />
                    <span>
                      {effectiveCart.length > 0
                        ? `Confirm & Hold ${cartUnits} Drinks on Tab`
                        : 'Open Empty Tab'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 3: SETTLED TABS HISTORY */}
          {activeTabSubView === 'HISTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search settled tabs history..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {filteredSettledTabs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No settled tab records found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSettledTabs.map((tab) => (
                    <div
                      key={tab.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white uppercase">
                            {tab.tab_name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tab.status === 'SETTLED'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {tab.status}
                          </span>
                          {tab.payment_method && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                              {tab.payment_method}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {(tab.rounds || []).length} rounds • {tab.total_items_count || 0} items • Closed by {tab.closed_by_cashier || 'Cashier'}{' '}
                          {tab.closed_at ? `on ${new Date(tab.closed_at).toLocaleDateString()} ${new Date(tab.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 dark:text-white font-mono text-sm">
                          KES {(tab.total_amount || 0).toLocaleString()}
                        </span>
                        {tab.status === 'SETTLED' && handleBillSlip && (
                          <button
                            type="button"
                            onClick={() => handleBillSlip(tab)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Reprint Tab Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Tabs hold orders in record without printing single receipts per order</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
