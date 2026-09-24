import { Category, Customer, CustomerPayment, Product, Sale, SaleItem, StoreConfig, User } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'beer', name: 'Beer & Cider', icon: '🍺', description: 'Lagers, draught, ales, and ciders' },
  { id: 'whisky', name: 'Whisky', icon: '🥃', description: 'Single malts, blended scotches, and bourbons' },
  { id: 'gin', name: 'Gin', icon: '🍸', description: 'London dry, botanical, and flavoured gins' },
  { id: 'vodka', name: 'Vodka', icon: '🧊', description: 'Distilled spirits and vodkas' },
  { id: 'rum', name: 'Rum', icon: '🍹', description: 'Dark, spiced, and white rums' },
  { id: 'wine', name: 'Wine', icon: '🍷', description: 'Red, white, rosé, and sparkling wines' },
  { id: 'liqueur', name: 'Liqueurs', icon: '☕', description: 'Cream liqueurs and digestifs' },
  { id: 'soft_drinks', name: 'Soft Drinks & Mixers', icon: '🥤', description: 'Tonic water, sodas, energy drinks, and juices' },
  { id: 'snacks', name: 'Snacks & Bites', icon: '🍿', description: 'Bar snacks, nuts, and bites' },
  { id: 'general', name: 'General Retail', icon: '🏷️', description: 'General retail merchandise' },
];

export const INITIAL_USERS: User[] = [
  {
    id: 1,
    name: 'Store Administrator',
    username: 'admin',
    pin: '1234',
    password: 'admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    suspended: false,
    created_at: '2025-01-01T00:00:00.000Z',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_CUSTOMER_PAYMENTS: CustomerPayment[] = [];

export function getInitialSalesAndItems(): { sales: Sale[]; items: SaleItem[] } {
  return { sales: [], items: [] };
}

export const INITIAL_STORE_CONFIG: StoreConfig = {
  id: 1,
  store_id: 'store_main',
  store_name: '',
  branch: '',
  phone_number: '',
  till_number: '',
  receipt_footer: 'Thank you for your business! Karibu tena.',
  primary_color: 'amber',
  low_stock_threshold: 5,
  receipt_printer_width: '80mm',
  receipt_bold_mode: true,
};

export const INITIAL_PRODUCTS: Product[] = [];
