export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'ACCOUNTANT' | 'SALES_CASHIER' | 'SALES';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: number;
  name: string;
  username?: string;
  pin: string;
  password?: string;
  role: UserRole;
  created_at?: string;
  status?: UserStatus;
  suspended?: boolean;
  must_change_password?: boolean;
  has_changed_initial_password?: boolean;
}

export const ROLE_DETAILS: Record<
  UserRole,
  {
    label: string;
    description: string;
    canAddProductsAndPrices: boolean;
    canDirectlyAlterStock: boolean;
    canRestockViaReceipt: boolean;
    color: string;
  }
> = {
  ADMIN: {
    label: 'Administrator',
    description: 'Master access: Sole authority to add new products, set selling prices, directly alter stock, manage staff & configure store.',
    canAddProductsAndPrices: true,
    canDirectlyAlterStock: true,
    canRestockViaReceipt: true,
    color: 'amber',
  },
  SUPERVISOR: {
    label: 'Supervisor',
    description: 'Floor & inventory oversight, stock count audits & direct restock. Cannot add products or change prices.',
    canAddProductsAndPrices: false,
    canDirectlyAlterStock: true,
    canRestockViaReceipt: true,
    color: 'indigo',
  },
  ACCOUNTANT: {
    label: 'Accountant',
    description: 'Financial reconciliations, sales auditing, M-Pesa/Cash reporting. Cannot directly alter stock or change prices.',
    canAddProductsAndPrices: false,
    canDirectlyAlterStock: false,
    canRestockViaReceipt: false,
    color: 'sky',
  },
  SALES_CASHIER: {
    label: 'Sales Cashier',
    description: 'POS register sales, barcode scanning, cart & receipts. Cannot directly alter stock. Can scan supplier receipts to add stock, set selling prices, and confirm additions.',
    canAddProductsAndPrices: false,
    canDirectlyAlterStock: false,
    canRestockViaReceipt: true,
    color: 'emerald',
  },
  SALES: {
    label: 'Sales Cashier',
    description: 'POS register sales, barcode scanning, cart & receipts. Cannot directly alter stock. Can scan supplier receipts to add stock, set selling prices, and confirm additions.',
    canAddProductsAndPrices: false,
    canDirectlyAlterStock: false,
    canRestockViaReceipt: true,
    color: 'emerald',
  },
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_DETAILS[role]?.label || role;
}

export function isManagerRole(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SUPERVISOR' || role === 'ACCOUNTANT';
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at?: string;
}

export type ProductCategory = string;

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category: ProductCategory;
  price: number; // in KES
  stock_qty: number;
  unit: string;
  low_stock_threshold?: number; // Optional per-item defined alert threshold (defaults to store setting)
}

export type PaymentMethod = 'CASH' | 'MPESA' | 'DEBT' | 'SPLIT';
export type SalePaymentStatus = 'PAID' | 'PARTIAL' | 'DEBT';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at: string; // ISO string
  blacklisted?: boolean;
  blacklist_reason?: string;
}

export interface CustomerPayment {
  id: number;
  customer_id: number;
  customer_name: string;
  amount: number; // in KES
  payment_method: 'CASH' | 'MPESA';
  mpesa_code?: string;
  cashier_name: string;
  created_at: string; // ISO string
  notes?: string;
}

export interface CustomerSummary {
  customer: Customer;
  totalSpent: number;
  totalPaid: number;
  outstandingDebt: number;
  salesCount: number;
  lastPurchaseDate?: string;
  hasDebt: boolean;
  isBlacklisted?: boolean;
}

export interface Sale {
  id: number;
  cashier_name: string;
  total_amount: number;
  payment_method: PaymentMethod;
  created_at: string; // ISO string
  mpesa_code?: string;
  cash_tendered?: number;
  change_given?: number;
  items_count: number;
  // Customer & Credit / Debt tracking
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  amount_paid?: number; // Actual KES paid at time of sale
  debt_amount?: number; // Outstanding unpaid balance from this sale
  payment_status?: SalePaymentStatus;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface StoreConfig {
  id: number;
  store_id?: string; // Unique multi-store tenant identifier (e.g. 'buzz_liquor_main', 'early_kick_off')
  store_name: string;
  branch: string;
  phone_number: string;
  admin_phone?: string;
  admin_email?: string;
  admin_whatsapp?: string;
  till_number: string;
  receipt_footer: string;
  primary_color: string; // 'amber' | 'emerald' | 'indigo' | 'rose' | 'blue' | 'teal' | 'purple' | 'slate' | 'custom'
  primary_color_hex?: string; // Hex color override e.g. '#D97706'
  low_stock_threshold?: number; // Store-wide default low stock alert threshold (defaults to 10)
  receipt_printer_width?: '80mm' | '58mm'; // Hardware thermal paper roll setting
  receipt_bold_mode?: boolean; // Ultra-bold deep thermal print head mode
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type RequisitionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ORDERED'
  | 'PARTIALLY_FULFILLED'
  | 'RECEIVED'
  | 'FULFILLED'
  | 'REJECTED';
export type RequisitionUrgency = 'NORMAL' | 'HIGH' | 'CRITICAL' | 'URGENT';

export interface RequisitionItem {
  id?: string | number;
  product_id: number;
  product_name: string;
  category?: string;
  current_stock: number;
  requested_qty: number;
  fulfilled_qty?: number;
  stock_added?: boolean;
  is_delivered?: boolean;
  delivered_at?: string;
  delivered_by_name?: string;
  unit: string;
  estimated_cost?: number;
  notes?: string;
}

export interface Requisition {
  id: string;
  requisition_no: string;
  requested_by_id?: number;
  requested_by_name: string;
  requested_by_role: UserRole;
  created_at: string;
  status: RequisitionStatus;
  urgency: RequisitionUrgency;
  items: RequisitionItem[];
  total_items: number;
  total_units?: number;
  total_estimated_cost?: number;
  notes?: string;
  admin_notes?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  updated_at?: string;
  // Fulfillment & auto stock restock tracking
  stock_added?: boolean;
  fulfilled_by_name?: string;
  fulfilled_by_id?: number;
  fulfilled_by_role?: UserRole;
  fulfilled_at?: string;
  fulfillment_notes?: string;
}

// =========================================================================
// CUSTOMER TABS (BAR TABS / HOLD MULTIPLE ORDERS)
// =========================================================================
export type CustomerTabStatus = 'OPEN' | 'SETTLED' | 'CANCELLED';

export interface TabOrderRound {
  id: string;
  round_number: number;
  created_at: string; // ISO string
  cashier_name: string;
  items: CartItem[];
  round_total: number;
  notes?: string;
}

export interface CustomerTab {
  id: string; // e.g. "TAB-2026-001"
  tab_name: string; // e.g. "John Mwangi" or "Table 4 - Kamau"
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  status: CustomerTabStatus;
  opened_at: string;
  opened_by_cashier: string;
  closed_at?: string;
  closed_by_cashier?: string;
  notes?: string;
  rounds: TabOrderRound[];
  total_amount: number;
  total_items_count: number;
  settled_sale_id?: number;
  payment_method?: PaymentMethod;
}

// =========================================================================
// SMART STOCK UPLOAD (PICTURE / EXCEL / PDF RESTOCK)
// =========================================================================
export interface ParsedStockItem {
  id: string;
  name: string;
  category: string;
  quantity: number; // Units to add
  cost_price?: number;
  selling_price?: number;
  barcode?: string;
  unit: string;
  matched_product_id?: number;
  matched_product_name?: string;
  current_stock?: number;
  new_stock_after?: number;
  is_new_product?: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'IGNORED';
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StockUploadBatch {
  id: string;
  source_type: 'PICTURE' | 'EXCEL' | 'PDF' | 'CSV';
  source_filename?: string;
  uploaded_at: string;
  uploaded_by_name: string;
  total_items: number;
  total_units: number;
  items: ParsedStockItem[];
}

// =========================================================================
// LOCAL BACKUP & RESTORE DATA CONTRACT
// =========================================================================
export interface LocalBackupData {
  version: string;
  backup_id: string;
  created_at: string;
  store_id: string;
  store_name: string;
  products: Product[];
  categories: Category[];
  sales: Sale[];
  sale_items: SaleItem[];
  customers: Customer[];
  customer_payments: CustomerPayment[];
  customer_tabs?: CustomerTab[];
  requisitions?: Requisition[];
  store_config: StoreConfig;
  metadata: {
    products_count: number;
    sales_count: number;
    customers_count: number;
    tabs_count: number;
    requisitions_count: number;
    backup_tool: string;
  };
}

// =========================================================================
// SHIFTS & CASH ADJUSTMENTS (SHIFT AUDIT & CASH DRAWER MANAGEMENT)
// =========================================================================
export type ShiftStatus = 'OPEN' | 'CLOSED';

export type CashAdjustmentType = 'CASH_IN' | 'CASH_OUT';

export type CashAdjustmentCategory =
  | 'FLOAT_ADDITION' // Cash float added into drawer
  | 'SAFE_DROP' // Mid-shift cash drop to safe
  | 'SUPPLIER_PAYOUT' // Payment to supplier/vendor in cash
  | 'PETTY_EXPENSE' // Shop supplies, staff meal, minor expense
  | 'BANKING' // Cash taken to bank
  | 'DRAWER_CORRECTION' // Over/short balance correction
  | 'OTHER'; // General adjustment

export interface CashAdjustment {
  id: string; // e.g. "ADJ-1718928123"
  shift_id: string;
  type: CashAdjustmentType;
  category: CashAdjustmentCategory;
  amount: number; // in KES
  reason: string;
  created_at: string; // ISO string
  created_by_user_id?: number;
  created_by_name: string;
  created_by_role: UserRole;
  authorized_by_manager?: string;
}

export interface Shift {
  id: string; // e.g. "SHIFT-20260921-001"
  shift_number?: number;
  store_id: string;
  cashier_id: number;
  cashier_name: string;
  manager_id?: number;
  manager_name?: string;
  opened_at: string; // ISO string
  closed_at?: string; // ISO string if closed
  status: ShiftStatus;
  opening_float: number; // Opening cash in drawer (e.g. 5,000 KES)
  closing_cash_actual?: number; // Counted cash at close
  closing_cash_expected?: number; // Expected cash calculated
  variance?: number; // actual - expected
  closing_notes?: string;
  closed_by_manager?: string;
}

export interface ShiftMpesaTransaction {
  sale_id: number;
  created_at: string;
  amount: number;
  mpesa_code?: string;
  customer_name?: string;
  customer_phone?: string;
  cashier_name: string;
  items_count: number;
}

export interface ShiftSummaryReport {
  shift: Shift;
  period: {
    start: string;
    end: string;
    duration_minutes: number;
    is_active: boolean;
  };
  // Total Sales breakdown
  sales: {
    total_amount: number;
    total_count: number;
    total_items_sold: number;
    average_ticket: number;
    cash_sales_amount: number;
    cash_sales_count: number;
    mpesa_sales_amount: number;
    mpesa_sales_count: number;
    debt_sales_amount: number;
    debt_sales_count: number;
    split_sales_amount: number;
    split_sales_count: number;
  };
  // M-Pesa transactions detail
  mpesa_transactions: {
    total_amount: number;
    count: number;
    transactions: ShiftMpesaTransaction[];
  };
  // Cash adjustments detail
  cash_adjustments: {
    total_in: number;
    total_out: number;
    net_adjustment: number; // total_in - total_out
    count: number;
    items: CashAdjustment[];
  };
  // Customer Debt Repayments in cash during this shift
  debt_repayments: {
    total_cash: number;
    total_mpesa: number;
    count: number;
  };
  // Cash Drawer Reconciliation
  drawer_reconciliation: {
    opening_float: number;
    cash_sales: number;
    cash_debt_collections: number;
    cash_additions: number;
    cash_drops_payouts: number;
    expected_cash_in_drawer: number;
    actual_counted_cash?: number;
    variance?: number;
  };
}


