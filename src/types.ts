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
  store_name: string;
  branch: string;
  phone_number: string;
  till_number: string;
  receipt_footer: string;
  primary_color: string; // 'amber' | 'emerald' | 'indigo' | 'rose'
  low_stock_threshold?: number; // Store-wide default low stock alert threshold (defaults to 10)
}

export interface CartItem {
  product: Product;
  quantity: number;
}
