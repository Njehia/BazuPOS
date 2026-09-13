import { Category, Customer, CustomerPayment, Product, Sale, SaleItem, StoreConfig, User } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'beer', name: 'Beer & Cider', icon: '🍺', description: 'Local and imported lagers, draught, and ciders' },
  { id: 'whisky', name: 'Whisky', icon: '🥃', description: 'Single malts, blended scotches, and bourbons' },
  { id: 'gin', name: 'Gin', icon: '🍸', description: 'London dry, botanical, and flavoured gins' },
  { id: 'vodka', name: 'Vodka', icon: '🧊', description: 'Distilled grain vodkas and spirits' },
  { id: 'rum', name: 'Rum', icon: '🍹', description: 'Dark, spiced, and white rums' },
  { id: 'wine', name: 'Wine', icon: '🍷', description: 'Red, white, rosé, and sparkling wines' },
  { id: 'tequila', name: 'Tequila & Mezcal', icon: '🌵', description: 'Blue agave tequilas and artisanal mezcals' },
  { id: 'liqueur', name: 'Liqueurs', icon: '☕', description: 'Cream liqueurs, herbal bitters, and digestifs' },
  { id: 'soft_drinks', name: 'Soft Drinks & Mixers', icon: '🥤', description: 'Tonic water, sodas, and juices' },
];

export const INITIAL_USERS: User[] = [
  { id: 1, name: 'Wanjiku Proprietor', username: 'admin', pin: '9999', password: 'admin', role: 'ADMIN', status: 'ACTIVE', suspended: false, created_at: '2025-01-10T08:00:00.000Z' },
  { id: 2, name: 'Brian Mwangi', username: 'brian', pin: '1234', password: '1234', role: 'SALES_CASHIER', status: 'ACTIVE', suspended: false, created_at: '2025-01-15T09:30:00.000Z' },
  { id: 3, name: 'Grace Mutua', username: 'grace', pin: '5566', password: '5566', role: 'SUPERVISOR', status: 'ACTIVE', suspended: false, created_at: '2025-02-01T10:00:00.000Z' },
  { id: 4, name: 'Kevin Omondi', username: 'kevin', pin: '7788', password: '7788', role: 'ACCOUNTANT', status: 'ACTIVE', suspended: false, created_at: '2025-02-15T11:15:00.000Z' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 101,
    name: 'Mzee Juma Odhiambo',
    phone: '0722112233',
    email: 'juma.odhiambo@gmail.com',
    notes: 'Regular patron. Settles his tab weekly via Till.',
    created_at: '2025-01-12T10:00:00.000Z',
  },
  {
    id: 102,
    name: 'Winnie Chebet',
    phone: '0711998877',
    notes: 'Prefers dry cider and red wine. Partial bill payments allowed.',
    created_at: '2025-01-20T14:30:00.000Z',
  },
  {
    id: 103,
    name: 'Captain Dennis Mwangi',
    phone: '0733445566',
    notes: 'Single malt scotch connoisseur. Always pays promptly.',
    created_at: '2025-02-01T09:00:00.000Z',
  },
  {
    id: 104,
    name: 'Mercy Achieng',
    phone: '0799887766',
    notes: 'Wines and sparkling beverages. Account in good standing.',
    created_at: '2025-02-10T16:20:00.000Z',
  },
  {
    id: 105,
    name: 'Patrick Kipkorir',
    phone: '0700123456',
    notes: 'Club sports secretary. Carries weekend drinks bill.',
    created_at: '2025-02-18T11:45:00.000Z',
  },
];

export const INITIAL_CUSTOMER_PAYMENTS: CustomerPayment[] = [
  {
    id: 901,
    customer_id: 101,
    customer_name: 'Mzee Juma Odhiambo',
    amount: 1000,
    payment_method: 'MPESA',
    mpesa_code: 'SH88123PA',
    cashier_name: 'Brian Mwangi',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    notes: 'Partial settlement towards past weekend bar bill',
  },
];

export function getInitialSalesAndItems(): { sales: Sale[]; items: SaleItem[] } {
  const sales: Sale[] = [];
  const items: SaleItem[] = [];
  const now = new Date();

  const templates = [
    // Today
    {
      daysAgo: 0,
      hour: 10,
      minute: 20,
      cashier: 'Brian Mwangi',
      method: 'MPESA' as const,
      mpesaCode: 'SH7189KJ2',
      customerId: 103,
      customerName: 'Captain Dennis Mwangi',
      customerPhone: '0733445566',
      amountPaid: 780,
      debtAmount: 0,
      paymentStatus: 'PAID' as const,
      cart: [
        { prodId: 1, name: 'Tusker Lager', price: 250, qty: 2 },
        { prodId: 4, name: 'Guinness Foreign Extra', price: 280, qty: 1 },
      ],
    },
    {
      daysAgo: 0,
      hour: 13,
      minute: 45,
      cashier: 'Brian Mwangi',
      method: 'DEBT' as const,
      customerId: 101,
      customerName: 'Mzee Juma Odhiambo',
      customerPhone: '0722112233',
      amountPaid: 1000,
      debtAmount: 1600,
      paymentStatus: 'PARTIAL' as const,
      cart: [{ prodId: 9, name: 'Jameson Irish Whiskey', price: 2600, qty: 1 }],
    },
    {
      daysAgo: 0,
      hour: 16,
      minute: 10,
      cashier: 'Grace Mutua',
      method: 'DEBT' as const,
      customerId: 102,
      customerName: 'Winnie Chebet',
      customerPhone: '0711998877',
      amountPaid: 1000,
      debtAmount: 1010,
      paymentStatus: 'PARTIAL' as const,
      cart: [
        { prodId: 5, name: 'Gilbeys Special Dry Gin', price: 1450, qty: 1 },
        { prodId: 2, name: 'Tusker Cider', price: 280, qty: 2 },
      ],
    },
    // Yesterday
    {
      daysAgo: 1,
      hour: 11,
      minute: 15,
      cashier: 'Brian Mwangi',
      method: 'MPESA' as const,
      mpesaCode: 'SH3342MN1',
      customerId: 104,
      customerName: 'Mercy Achieng',
      customerPhone: '0799887766',
      amountPaid: 2800,
      debtAmount: 0,
      paymentStatus: 'PAID' as const,
      cart: [{ prodId: 10, name: 'Black & White Scotch', price: 1400, qty: 2 }],
    },
    {
      daysAgo: 1,
      hour: 15,
      minute: 30,
      cashier: 'Grace Mutua',
      method: 'DEBT' as const,
      customerId: 105,
      customerName: 'Patrick Kipkorir',
      customerPhone: '0700123456',
      amountPaid: 0,
      debtAmount: 4840,
      paymentStatus: 'DEBT' as const,
      cart: [
        { prodId: 8, name: 'Johnnie Walker Black Label', price: 3800, qty: 1 },
        { prodId: 3, name: 'White Cap Crisp', price: 260, qty: 4 },
      ],
    },
    {
      daysAgo: 1,
      hour: 19,
      minute: 40,
      cashier: 'Brian Mwangi',
      method: 'MPESA' as const,
      mpesaCode: 'SH6712OP8',
      cart: [
        { prodId: 11, name: 'Captain Morgan Gold', price: 1300, qty: 1 },
        { prodId: 1, name: 'Tusker Lager', price: 250, qty: 6 },
      ],
    },
    // 2 Days Ago
    {
      daysAgo: 2,
      hour: 12,
      minute: 50,
      cashier: 'Grace Mutua',
      method: 'CASH' as const,
      cashTendered: 2000,
      cart: [{ prodId: 12, name: 'Nederburg Cabernet Sauvignon', price: 1650, qty: 1 }],
    },
    {
      daysAgo: 2,
      hour: 17,
      minute: 25,
      cashier: 'Brian Mwangi',
      method: 'MPESA' as const,
      mpesaCode: 'SH8841QR5',
      cart: [
        { prodId: 6, name: 'Chrome Vodka', price: 750, qty: 2 },
        { prodId: 7, name: 'Kenya Cane Original', price: 900, qty: 1 },
      ],
    },
    // 3 Days Ago
    {
      daysAgo: 3,
      hour: 14,
      minute: 10,
      cashier: 'Wanjiku Proprietor',
      method: 'MPESA' as const,
      mpesaCode: 'SH4412TV9',
      cart: [
        { prodId: 14, name: "Jack Daniel's Old No.7", price: 4200, qty: 1 },
        { prodId: 4, name: 'Guinness Foreign Extra', price: 280, qty: 2 },
      ],
    },
    // 5 Days Ago
    {
      daysAgo: 5,
      hour: 18,
      minute: 0,
      cashier: 'Brian Mwangi',
      method: 'CASH' as const,
      cashTendered: 1000,
      cart: [{ prodId: 1, name: 'Tusker Lager', price: 250, qty: 3 }],
    },
  ];

  const baseId = Date.now() - 600000000;
  templates.forEach((tmpl, tIdx) => {
    const d = new Date(now);
    d.setDate(d.getDate() - tmpl.daysAgo);
    d.setHours(tmpl.hour, tmpl.minute, 0, 0);

    const total = tmpl.cart.reduce((s, c) => s + c.price * c.qty, 0);
    const saleId = baseId + tIdx * 1000;

    const sale: Sale = {
      id: saleId,
      cashier_name: tmpl.cashier,
      total_amount: total,
      payment_method: tmpl.method,
      created_at: d.toISOString(),
      mpesa_code: tmpl.mpesaCode,
      cash_tendered: (tmpl as any).cashTendered || (tmpl.method === 'CASH' ? total : undefined),
      change_given: (tmpl as any).cashTendered ? Math.max(0, (tmpl as any).cashTendered - total) : (tmpl.method === 'CASH' ? 0 : undefined),
      items_count: tmpl.cart.reduce((s, c) => s + c.qty, 0),
      customer_id: (tmpl as any).customerId,
      customer_name: (tmpl as any).customerName,
      customer_phone: (tmpl as any).customerPhone,
      amount_paid: (tmpl as any).amountPaid !== undefined ? (tmpl as any).amountPaid : total,
      debt_amount: (tmpl as any).debtAmount !== undefined ? (tmpl as any).debtAmount : 0,
      payment_status: (tmpl as any).paymentStatus || 'PAID',
    };
    sales.push(sale);

    tmpl.cart.forEach((c, cIdx) => {
      items.push({
        id: saleId + cIdx + 1,
        sale_id: saleId,
        product_id: c.prodId,
        product_name: c.name,
        quantity: c.qty,
        unit_price: c.price,
        total_price: c.price * c.qty,
      });
    });
  });

  return { sales, items };
}

export const INITIAL_STORE_CONFIG: StoreConfig = {
  id: 1,
  store_name: 'Bazu Wines & Spirits',
  branch: 'Kilimani, Nairobi',
  phone_number: '+254 712 345 678',
  till_number: '889922',
  receipt_footer: 'Asante sana! Karibu tena!\nExcessive consumption of alcohol is harmful to health.\nStrictly not for sale to under 18s.',
  primary_color: 'amber',
  low_stock_threshold: 10,
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    barcode: '616110001001',
    name: 'Tusker Lager',
    category: 'beer',
    price: 250,
    stock_qty: 48,
    unit: '500ml',
  },
  {
    id: 2,
    barcode: '616110001002',
    name: 'Tusker Cider',
    category: 'beer',
    price: 280,
    stock_qty: 36,
    unit: '500ml',
  },
  {
    id: 3,
    barcode: '616110001003',
    name: 'White Cap Crisp',
    category: 'beer',
    price: 260,
    stock_qty: 24,
    unit: '500ml',
  },
  {
    id: 4,
    barcode: '616110001004',
    name: 'Guinness Foreign Extra',
    category: 'beer',
    price: 280,
    stock_qty: 30,
    unit: '500ml',
  },
  {
    id: 5,
    barcode: '616110002001',
    name: 'Gilbeys Special Dry Gin',
    category: 'gin',
    price: 1450,
    stock_qty: 18,
    unit: '750ml',
  },
  {
    id: 6,
    barcode: '616110002002',
    name: 'Chrome Vodka',
    category: 'vodka',
    price: 750,
    stock_qty: 25,
    unit: '750ml',
  },
  {
    id: 7,
    barcode: '616110002003',
    name: 'Kenya Cane Original',
    category: 'vodka',
    price: 900,
    stock_qty: 20,
    unit: '750ml',
  },
  {
    id: 8,
    barcode: '616110003001',
    name: 'Johnnie Walker Black Label',
    category: 'whisky',
    price: 3800,
    stock_qty: 8,
    unit: '750ml',
  },
  {
    id: 9,
    barcode: '616110003002',
    name: 'Jameson Irish Whiskey',
    category: 'whisky',
    price: 2600,
    stock_qty: 12,
    unit: '750ml',
  },
  {
    id: 10,
    barcode: '616110003003',
    name: 'Black & White Scotch',
    category: 'whisky',
    price: 1400,
    stock_qty: 15,
    unit: '750ml',
  },
  {
    id: 11,
    barcode: '616110004001',
    name: 'Captain Morgan Gold',
    category: 'rum',
    price: 1300,
    stock_qty: 14,
    unit: '750ml',
  },
  {
    id: 12,
    barcode: '616110005001',
    name: 'Nederburg Cabernet Sauvignon',
    category: 'wine',
    price: 1650,
    stock_qty: 9,
    unit: '750ml',
  },
  {
    id: 13,
    barcode: '616110001005',
    name: 'Heineken Lager',
    category: 'beer',
    price: 300,
    stock_qty: 0, // out of stock demo
    unit: '500ml',
  },
  {
    id: 14,
    barcode: '616110003004',
    name: "Jack Daniel's Old No.7",
    category: 'whisky',
    price: 4200,
    stock_qty: 5,
    unit: '750ml',
  },
];
