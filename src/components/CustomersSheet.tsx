import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Edit2,
  ExternalLink,
  Filter,
  History,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Receipt,
  Search,
  Send,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Customer, CustomerPayment, CustomerSummary, Sale, StoreConfig, User as UserModel } from '../types';
import { LocalDb } from '../lib/storage';
import { WhatsAppModal } from './WhatsAppModal';
import { CustomerPaymentModal } from './CustomerPaymentModal';
import { CustomerFormModal } from './CustomerFormModal';
import { ReceiptModal } from './ReceiptModal';

interface CustomersSheetProps {
  currentUser: UserModel;
  storeConfig: StoreConfig;
  onClose: () => void;
  onSelectCustomerForSale?: (customer: Customer) => void;
}

export const CustomersSheet: React.FC<CustomersSheetProps> = ({
  currentUser,
  storeConfig,
  onClose,
  onSelectCustomerForSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'debt' | 'cleared'>('all');
  const [sortBy, setSortBy] = useState<'debt' | 'spent' | 'name' | 'recent'>('debt');

  // Customer summaries derived from LocalDb
  const [refreshKey, setRefreshKey] = useState(0);
  const reloadData = () => setRefreshKey((prev) => prev + 1);

  const customerSummaries = useMemo(() => {
    return LocalDb.getAllCustomerSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [activeWhatsAppCustomer, setActiveWhatsAppCustomer] = useState<CustomerSummary | null>(null);
  const [activePaymentCustomer, setActivePaymentCustomer] = useState<CustomerSummary | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerSummary | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{ sale: Sale; items: any[] } | null>(null);

  // Overall store customer aggregates
  const aggregates = useMemo(() => {
    let totalCustomers = customerSummaries.length;
    let totalLifetimeSpent = 0;
    let totalLifetimePaid = 0;
    let totalOutstandingDebt = 0;
    let customersWithDebt = 0;

    for (const c of customerSummaries) {
      totalLifetimeSpent += c.totalSpent;
      totalLifetimePaid += c.totalPaid;
      if (c.outstandingDebt > 0) {
        totalOutstandingDebt += c.outstandingDebt;
        customersWithDebt++;
      }
    }

    return {
      totalCustomers,
      totalLifetimeSpent,
      totalLifetimePaid,
      totalOutstandingDebt,
      customersWithDebt,
    };
  }, [customerSummaries]);

  // Filter and sort customer list
  const filteredCustomers = useMemo(() => {
    return customerSummaries
      .filter((item) => {
        const matchesSearch =
          item.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.customer.phone.includes(searchQuery) ||
          (item.customer.notes && item.customer.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (filterTab === 'debt') {
          return item.outstandingDebt > 0;
        }
        if (filterTab === 'cleared') {
          return item.outstandingDebt === 0;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'debt') {
          return b.outstandingDebt - a.outstandingDebt;
        }
        if (sortBy === 'spent') {
          return b.totalSpent - a.totalSpent;
        }
        if (sortBy === 'name') {
          return a.customer.name.localeCompare(b.customer.name);
        }
        if (sortBy === 'recent') {
          const dateA = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0;
          const dateB = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0;
          return dateB - dateA;
        }
        return 0;
      });
  }, [customerSummaries, searchQuery, filterTab, sortBy]);

  // History details for selected customer
  const customerHistoryData = useMemo(() => {
    if (!historyCustomer) return { sales: [], payments: [] };
    const sales = LocalDb.getSales().filter((s) => s.customer_id === historyCustomer.customer.id);
    const payments = LocalDb.getCustomerPayments(historyCustomer.customer.id);
    return { sales, payments };
  }, [historyCustomer, refreshKey]);

  return (
    <div
      id="customers-sheet-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="customers-sheet-container"
        className="bg-slate-100 border border-slate-300 rounded-3xl max-w-5xl w-full h-[95vh] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <header className="p-4 sm:p-5 bg-[#0F172A] text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                  Client & Account Ledger
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {customerSummaries.length} Registered
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Customers Sheet
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="py-2.5 px-3.5 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close sheet"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Aggregate KPI Ribbon */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Total Customers
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {aggregates.totalCustomers}
            </div>
            <div className="text-[10px] text-slate-500">Registered client accounts</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Total Spend Over Time
            </div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              KES {aggregates.totalLifetimeSpent.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">Cumulative purchases</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Total Amount Paid
            </div>
            <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
              KES {aggregates.totalLifetimePaid.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">Collected at POS & settlements</div>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              aggregates.totalOutstandingDebt > 0
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-rose-700 tracking-wider flex items-center justify-between">
              <span>Total Active Debt</span>
              {aggregates.customersWithDebt > 0 && (
                <span className="bg-rose-200 text-rose-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {aggregates.customersWithDebt} clients
                </span>
              )}
            </div>
            <div
              className={`text-xl font-black font-mono mt-0.5 ${
                aggregates.totalOutstandingDebt > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              KES {aggregates.totalOutstandingDebt.toLocaleString()}
            </div>
            <div className="text-[10px] text-rose-600 font-medium">
              {aggregates.customersWithDebt > 0 ? 'Outstanding client credit' : 'All accounts settled'}
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer by name, phone (07...), or notes..."
              className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter tabs & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-200/80 p-0.5 rounded-xl flex items-center text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({customerSummaries.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('debt')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'debt'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-rose-700 hover:text-rose-800'
                }`}
              >
                <span>⚠️ Has Debt</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    filterTab === 'debt' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {aggregates.customersWithDebt}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('cleared')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterTab === 'cleared'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-800'
                }`}
              >
                ✓ Cleared
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-slate-700 font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="debt">Sort: Highest Debt</option>
                <option value="spent">Sort: Highest Lifetime Spend</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="recent">Sort: Recent Purchase</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Customers Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery
                  ? `No customer matching "${searchQuery}".`
                  : filterTab === 'debt'
                  ? 'Great news! No customers currently have outstanding debts.'
                  : 'Start by registering your first customer account.'}
              </p>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="mt-4 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Add New Customer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredCustomers.map((summary) => {
                const { customer, totalSpent, totalPaid, outstandingDebt, salesCount, hasDebt } =
                  summary;

                return (
                  <div
                    key={`customer-card-${customer.id}`}
                    className={`bg-white rounded-2xl border transition-all hover:shadow-md overflow-hidden ${
                      hasDebt
                        ? 'border-rose-300 shadow-xs ring-1 ring-rose-200/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Customer Identity & Status */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                            hasDebt
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <User className="w-6 h-6" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 leading-tight">
                              {customer.name}
                            </h3>

                            {/* Debt Badge */}
                            {hasDebt ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                Outstanding Debt: KES {outstandingDebt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                All Bills Cleared
                              </span>
                            )}
                          </div>

                          {/* Contact and Notes */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                            <span className="font-mono flex items-center gap-1 text-slate-700 font-semibold">
                              <Phone className="w-3 h-3 text-slate-400" /> {customer.phone}
                            </span>
                            {customer.notes && (
                              <span className="text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                &ldquo;{customer.notes}&rdquo;
                              </span>
                            )}
                            <span className="text-slate-400 text-[11px]">
                              {salesCount} sale{salesCount !== 1 ? 's' : ''} recorded
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Financial Metrics (Spent, Paid, Balance) */}
                      <div className="flex items-center gap-4 sm:gap-6 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Spent Over Time
                          </span>
                          <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                            KES {totalSpent.toLocaleString()}
                          </span>
                        </div>

                        <div className="border-l border-slate-200 pl-4">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Total Paid
                          </span>
                          <span className="text-sm sm:text-base font-black font-mono text-emerald-700">
                            KES {totalPaid.toLocaleString()}
                          </span>
                        </div>

                        <div className="border-l border-slate-200 pl-4">
                          <span
                            className={`text-[10px] uppercase font-bold block ${
                              hasDebt ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            Current Debt
                          </span>
                          <span
                            className={`text-sm sm:text-base font-black font-mono ${
                              hasDebt ? 'text-rose-600' : 'text-slate-400'
                            }`}
                          >
                            {hasDebt ? `KES ${outstandingDebt.toLocaleString()}` : 'KES 0'}
                          </span>
                        </div>
                      </div>

                      {/* Right Actions: Sell, Payment, WhatsApp, History */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Sell to Customer (Explicit requirement: sell to customer even with outstanding debts) */}
                        {onSelectCustomerForSale && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCustomerForSale(customer);
                              onClose();
                            }}
                            className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-98"
                            title="Select this customer in POS Terminal and sell products"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Sell to Client</span>
                          </button>
                        )}

                        {/* Record Debt Payment */}
                        <button
                          type="button"
                          onClick={() => setActivePaymentCustomer(summary)}
                          className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                          title="Record debt repayment or cash payment"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>

                        {/* WhatsApp Notice */}
                        <button
                          type="button"
                          onClick={() => setActiveWhatsAppCustomer(summary)}
                          className="py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                          title="Send WhatsApp debt reminder or statement"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp Bill</span>
                        </button>

                        {/* Transaction History */}
                        <button
                          type="button"
                          onClick={() => setHistoryCustomer(summary)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                          title="View purchase history & repayments"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Edit Customer */}
                        <button
                          type="button"
                          onClick={() => setCustomerToEdit(customer)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                          title="Edit customer details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Notice if customer has debt: reassurance that you can still sell */}
                    {hasDebt && (
                      <div className="bg-rose-50/70 border-t border-rose-100 px-4 sm:px-5 py-2 flex items-center justify-between text-[11px] text-rose-800">
                        <span className="flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>
                            Has an active debt of <strong>KES {outstandingDebt.toLocaleString()}</strong>.
                            You can still sell to this client or add new items to credit.
                          </span>
                        </span>

                        <span className="text-[10px] text-rose-700 underline font-semibold cursor-pointer" onClick={() => setActivePaymentCustomer(summary)}>
                          Settle balance &rarr;
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <footer className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> of{' '}
            <strong className="text-slate-800">{customerSummaries.length}</strong> clients
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Real-time Cloud Synced
            </span>
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </footer>
      </div>

      {/* ========================================================= */}
      {/* SUB-MODALS */}
      {/* ========================================================= */}

      {/* 1. Add / Edit Customer Modal */}
      {(isAddCustomerOpen || customerToEdit) && (
        <CustomerFormModal
          customerToEdit={customerToEdit}
          onClose={() => {
            setIsAddCustomerOpen(false);
            setCustomerToEdit(null);
          }}
          onCustomerSaved={(saved) => {
            setIsAddCustomerOpen(false);
            setCustomerToEdit(null);
            reloadData();
          }}
        />
      )}

      {/* 2. Customer Debt Payment Settlement Modal */}
      {activePaymentCustomer && (
        <CustomerPaymentModal
          customerSummary={activePaymentCustomer}
          storeConfig={storeConfig}
          cashierName={currentUser.name}
          onClose={() => setActivePaymentCustomer(null)}
          onPaymentRecorded={(newDebt) => {
            reloadData();
          }}
          onOpenWhatsApp={() => {
            const fresh = LocalDb.getCustomerSummary(activePaymentCustomer.customer.id);
            if (fresh) {
              setActiveWhatsAppCustomer(fresh);
            }
          }}
        />
      )}

      {/* 3. WhatsApp Debt & Bill Messaging Modal */}
      {activeWhatsAppCustomer && (
        <WhatsAppModal
          customerSummary={activeWhatsAppCustomer}
          storeConfig={storeConfig}
          cashierName={currentUser.name}
          onClose={() => setActiveWhatsAppCustomer(null)}
        />
      )}

      {/* 4. Customer Detailed History Modal */}
      {historyCustomer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400">
                    Account Ledger
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    {historyCustomer.customer.name}&apos;s Transaction History
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryCustomer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Spent
                </span>
                <span className="text-sm font-black font-mono text-slate-900">
                  KES {historyCustomer.totalSpent.toLocaleString()}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Paid
                </span>
                <span className="text-sm font-black font-mono text-emerald-700">
                  KES {historyCustomer.totalPaid.toLocaleString()}
                </span>
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  historyCustomer.outstandingDebt > 0
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Outstanding Debt
                </span>
                <span
                  className={`text-sm font-black font-mono ${
                    historyCustomer.outstandingDebt > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  KES {historyCustomer.outstandingDebt.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Ledger List */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Sales List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
                  <span>Purchases ({customerHistoryData.sales.length})</span>
                  <span className="text-[11px] font-normal text-slate-500">Sales made to this client</span>
                </h4>

                {customerHistoryData.sales.length === 0 ? (
                  <div className="text-center p-6 bg-slate-50 rounded-2xl text-xs text-slate-500">
                    No sales recorded for this customer yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerHistoryData.sales.map((sale) => (
                      <div
                        key={`cust-sale-${sale.id}`}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>Receipt #{sale.id}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                sale.payment_status === 'DEBT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : sale.payment_status === 'PARTIAL'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {sale.payment_status || sale.payment_method}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {new Date(sale.created_at).toLocaleString('en-KE')} &bull; Cashier:{' '}
                            {sale.cashier_name}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div className="font-mono font-black text-slate-900">
                              KES {sale.total_amount.toLocaleString()}
                            </div>
                            {sale.debt_amount ? (
                              <div className="text-[10px] text-rose-600 font-medium">
                                Unpaid: KES {sale.debt_amount.toLocaleString()}
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const items = LocalDb.getSaleItems(sale.id);
                              setSelectedReceipt({ sale, items });
                            }}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                            title="View receipt"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Debt Repayments List */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
                  <span>Repayments & Settlements ({customerHistoryData.payments.length})</span>
                  <span className="text-[11px] font-normal text-slate-500">Payments toward debt</span>
                </h4>

                {customerHistoryData.payments.length === 0 ? (
                  <div className="text-center p-6 bg-slate-50 rounded-2xl text-xs text-slate-500">
                    No debt repayments recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerHistoryData.payments.map((pmt) => (
                      <div
                        key={`pmt-${pmt.id}`}
                        className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-emerald-900 flex items-center gap-2">
                            <span>Repayment via {pmt.payment_method}</span>
                            {pmt.mpesa_code && (
                              <span className="font-mono text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-md">
                                {pmt.mpesa_code}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {new Date(pmt.created_at).toLocaleString('en-KE')} &bull; Cashier:{' '}
                            {pmt.cashier_name}
                            {pmt.notes && ` &bull; "${pmt.notes}"`}
                          </div>
                        </div>

                        <div className="font-mono font-black text-emerald-700 text-sm">
                          + KES {pmt.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveWhatsAppCustomer(historyCustomer);
                  setHistoryCustomer(null);
                }}
                className="py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Send Statement via WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setHistoryCustomer(null)}
                className="py-2 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. View Full Sale Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          sale={selectedReceipt.sale}
          items={selectedReceipt.items}
          storeConfig={storeConfig}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
