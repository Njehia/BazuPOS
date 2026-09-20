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

export const ROLE_DETAILS: Record<UserRole, { label: string; description: string; canAddProductsAndPrices: boolean; color: string }> = {
  ADMIN: {
    label: 'Administrator',
    description: 'Master access: Sole authority to add new products, set selling prices, manage staff & configure store.',
    canAddProductsAndPrices: true,
    color: 'amber',
  },
  SUPERVISOR: {
    label: 'Supervisor',
    description: 'Floor & inventory oversight, stock count audits & restock. Cannot add products or change prices.',
    canAddProductsAndPrices: false,
    color: 'indigo',
  },
  ACCOUNTANT: {
    label: 'Accountant',
    description: 'Financial reconciliations, sales auditing, M-Pesa/Cash reporting. Cannot add products or change prices.',
    canAddProductsAndPrices: false,
    color: 'sky',
  },
  SALES_CASHIER: {
    label: 'Sales Cashier',
    description: 'Fast POS terminal sales, barcode scanning, cart & receipts. Cannot add products or change prices.',
    canAddProductsAndPrices: false,
    color: 'emerald',
  },
  SALES: {
    label: 'Sales Cashier',
    description: 'Fast POS terminal sales, barcode scanning, cart & receipts. Cannot add products or change prices.',
    canAddProductsAndPrices: false,
    color: 'emerald',
  },
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_DETAILS[role]?.label || role;
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

export type RequisitionStatus = 'PENDING' | 'APPROVED' | 'ORDERED' | 'RECEIVED' | 'REJECTED';
export type RequisitionUrgency = 'NORMAL' | 'HIGH' | 'CRITICAL' | 'URGENT';

export interface RequisitionItem {
  id?: string | number;
  product_id: number;
  product_name: string;
  category?: string;
  current_stock: number;
  requested_qty: number;
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

