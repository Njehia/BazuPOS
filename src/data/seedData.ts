import { Category, Customer, CustomerPayment, Product, Sale, SaleItem, StoreConfig, User } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'beer', name: 'Beer & Cider', icon: '🍺', description: 'Lagers, draught, ales, and crisp ciders' },
  { id: 'whisky', name: 'Whisky & Bourbon', icon: '🥃', description: 'Single malts, blended scotches, and bourbons' },
  { id: 'gin', name: 'Gin & Botanical', icon: '🍸', description: 'London dry, botanical, and flavoured gins' },
  { id: 'vodka', name: 'Vodka', icon: '🧊', description: 'Triple distilled spirits and premium vodkas' },
  { id: 'rum', name: 'Rum', icon: '🍹', description: 'Dark, spiced, and white rums' },
  { id: 'brandy_cognac', name: 'Brandy & Cognac', icon: '🍷', description: 'Fine brandies and VS/VSOP cognacs' },
  { id: 'tequila', name: 'Tequila', icon: '🌵', description: 'Blanco, reposado, and gold tequilas' },
  { id: 'wine', name: 'Wine & Champagne', icon: '🍾', description: 'Red, white, sparkling wines, and champagnes' },
  { id: 'liqueur', name: 'Liqueurs & Creams', icon: '☕', description: 'Irish cream, digestifs, and herbal liqueurs' },
  { id: 'soft_drinks', name: 'Soft Drinks & Sodas', icon: '🥤', description: 'Carbonated soft drinks and popular sodas' },
  { id: 'mixers', name: 'Mixers & Tonic', icon: '🫧', description: 'Tonic water, club sodas, and ginger ales' },
  { id: 'energy_drinks', name: 'Energy Drinks', icon: '⚡', description: 'Caffeinated taurine and performance boosters' },
  { id: 'water', name: 'Mineral Water', icon: '💧', description: 'Still and sparkling premium mineral waters' },
  { id: 'juices', name: 'Juices & Beverages', icon: '🧃', description: 'Pure fruit juices, nectars, and cordials' },
  { id: 'snacks', name: 'Snacks & Crisps', icon: '🍿', description: 'Potato crisps, roasted nuts, biltong, and savory snacks' },
  { id: 'confectionery', name: 'Chocolates & Sweets', icon: '🍫', description: 'Chocolates, candy bars, mints, and chewing gums' },
  { id: 'cigarettes', name: 'Cigarettes & Smoke', icon: '🚬', description: 'Premium cigarettes, lighters, and smoking accessories' },
  { id: 'groceries', name: 'Groceries & Staples', icon: '🍚', description: 'Flour, rice, cooking oil, sugar, and grains' },
  { id: 'dairy_bakery', name: 'Dairy & Bakery', icon: '🍞', description: 'Fresh milk, yoghurts, sliced bread, and baked goods' },
  { id: 'household', name: 'Household & Cleaning', icon: '🧼', description: 'Detergents, toilet paper, disinfectants, and cleaners' },
  { id: 'personal_care', name: 'Personal Care & Hygiene', icon: '🧴', description: 'Soaps, lotions, toothpaste, and sanitary items' },
  { id: 'electronics', name: 'Electronics & Accessories', icon: '🔌', description: 'Phone chargers, cables, earphones, and batteries' },
  { id: 'general', name: 'General Retail', icon: '🏷️', description: 'General merchandise and everyday essentials' },
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
  {
    id: 2,
    name: 'Main Cashier',
    username: 'cashier',
    pin: '1111',
    password: 'cashier',
    role: 'SALES_CASHIER',
    status: 'ACTIVE',
    suspended: false,
    created_at: '2025-01-01T00:00:00.000Z',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 1,
    name: 'Dennis Mwangi',
    phone: '0712345678',
    email: 'dennis@example.com',
    created_at: '2025-01-10T10:00:00.000Z',
  },
  {
    id: 2,
    name: 'Grace Wambui',
    phone: '0722998877',
    email: 'grace@example.com',
    created_at: '2025-01-12T14:30:00.000Z',
  },
];

export const INITIAL_CUSTOMER_PAYMENTS: CustomerPayment[] = [];

export function getInitialSalesAndItems(): { sales: Sale[]; items: SaleItem[] } {
  return { sales: [], items: [] };
}

export const INITIAL_STORE_CONFIG: StoreConfig = {
  id: 1,
  store_id: 'store_main',
  store_name: 'Bazu POS & Retail Store',
  branch: 'Main Branch',
  phone_number: '0712345678',
  till_number: '889900',
  receipt_footer: 'Thank you for your business! Karibu tena.',
  primary_color: 'amber',
  low_stock_threshold: 10,
  receipt_printer_width: '80mm',
  receipt_bold_mode: true,
};

export const INITIAL_PRODUCTS: Product[] = [
  // ==========================================
  // 1. BEER & CIDER (101 - 120)
  // ==========================================
  { id: 101, barcode: '6161100010101', name: 'Tusker Lager 500ml', category: 'Beer & Cider', price: 250, stock_qty: 140, unit: '500ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 102, barcode: '6161100010102', name: 'Guinness Foreign Extra 500ml', category: 'Beer & Cider', price: 280, stock_qty: 96, unit: '500ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 103, barcode: '6161100010103', name: 'White Cap Crisp 500ml', category: 'Beer & Cider', price: 260, stock_qty: 72, unit: '500ml', is_quick_key: true, low_stock_threshold: 12 },
  { id: 104, barcode: '6161100010104', name: 'White Cap Lager 500ml', category: 'Beer & Cider', price: 260, stock_qty: 80, unit: '500ml', is_quick_key: false, low_stock_threshold: 10 },
  { id: 105, barcode: '6161100010105', name: 'Tusker Malt 330ml', category: 'Beer & Cider', price: 250, stock_qty: 60, unit: '330ml', is_quick_key: true, low_stock_threshold: 10 },
  { id: 106, barcode: '6161100010106', name: 'Tusker Cider 500ml Can', category: 'Beer & Cider', price: 270, stock_qty: 120, unit: '500ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 107, barcode: '6161100010107', name: 'Balozi Lager 500ml', category: 'Beer & Cider', price: 240, stock_qty: 55, unit: '500ml', is_quick_key: false, low_stock_threshold: 10 },
  { id: 108, barcode: '8712000024085', name: 'Heineken Lager 330ml Bottle', category: 'Beer & Cider', price: 300, stock_qty: 84, unit: '330ml', is_quick_key: true, low_stock_threshold: 12 },
  { id: 109, barcode: '7501064191410', name: 'Corona Extra 355ml', category: 'Beer & Cider', price: 350, stock_qty: 48, unit: '355ml', is_quick_key: false, low_stock_threshold: 8 },
  { id: 110, barcode: '6001108000011', name: 'Savanna Dry Cider 330ml', category: 'Beer & Cider', price: 290, stock_qty: 64, unit: '330ml', is_quick_key: true, low_stock_threshold: 10 },
  { id: 111, barcode: '6161100010111', name: 'Tusker Lite 330ml', category: 'Beer & Cider', price: 250, stock_qty: 50, unit: '330ml', is_quick_key: false, low_stock_threshold: 8 },
  { id: 112, barcode: '6161100010112', name: 'Smirnoff Ice Black 330ml', category: 'Beer & Cider', price: 280, stock_qty: 70, unit: '330ml', is_quick_key: true, low_stock_threshold: 10 },
  { id: 113, barcode: '6161100010113', name: 'Guinness Smooth 500ml', category: 'Beer & Cider', price: 270, stock_qty: 65, unit: '500ml', is_quick_key: false, low_stock_threshold: 10 },
  { id: 114, barcode: '6161100010114', name: 'Snapp Apple Cider 330ml', category: 'Beer & Cider', price: 250, stock_qty: 40, unit: '330ml', is_quick_key: false, low_stock_threshold: 8 },

  // ==========================================
  // 2. WHISKY & BOURBON (201 - 225)
  // ==========================================
  { id: 201, barcode: '5000267024203', name: 'Johnnie Walker Black Label 750ml', category: 'Whisky & Bourbon', price: 3800, stock_qty: 36, unit: '750ml', is_quick_key: true, low_stock_threshold: 6 },
  { id: 202, barcode: '5000267014204', name: 'Johnnie Walker Red Label 750ml', category: 'Whisky & Bourbon', price: 2200, stock_qty: 45, unit: '750ml', is_quick_key: true, low_stock_threshold: 8 },
  { id: 203, barcode: '5000267124200', name: 'Johnnie Walker Double Black 750ml', category: 'Whisky & Bourbon', price: 5400, stock_qty: 20, unit: '750ml', is_quick_key: false, low_stock_threshold: 4 },
  { id: 204, barcode: '5011007003004', name: 'Jameson Irish Whiskey 750ml', category: 'Whisky & Bourbon', price: 2600, stock_qty: 60, unit: '750ml', is_quick_key: true, low_stock_threshold: 10 },
  { id: 205, barcode: '5011007003011', name: 'Jameson Black Barrel 750ml', category: 'Whisky & Bourbon', price: 4200, stock_qty: 24, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 206, barcode: '0821840904660', name: "Jack Daniel's Old No. 7 750ml", category: 'Whisky & Bourbon', price: 3600, stock_qty: 30, unit: '750ml', is_quick_key: true, low_stock_threshold: 6 },
  { id: 207, barcode: '5010496001004', name: 'Glenfiddich 12 Year Old 750ml', category: 'Whisky & Bourbon', price: 6200, stock_qty: 18, unit: '750ml', is_quick_key: false, low_stock_threshold: 4 },
  { id: 208, barcode: '5000299223018', name: 'Chivas Regal 12 Year Old 750ml', category: 'Whisky & Bourbon', price: 3900, stock_qty: 25, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 209, barcode: '5000267072006', name: 'Black & White Blended Scotch 750ml', category: 'Whisky & Bourbon', price: 1600, stock_qty: 50, unit: '750ml', is_quick_key: true, low_stock_threshold: 10 },
  { id: 210, barcode: '5000267082005', name: 'VAT 69 Blended Scotch 750ml', category: 'Whisky & Bourbon', price: 1550, stock_qty: 40, unit: '750ml', is_quick_key: false, low_stock_threshold: 8 },
  { id: 211, barcode: '5000267160208', name: 'Singleton of Dufftown 12YO 750ml', category: 'Whisky & Bourbon', price: 5200, stock_qty: 16, unit: '750ml', is_quick_key: false, low_stock_threshold: 3 },
  { id: 212, barcode: '5023530000018', name: "William Lawson's Finest Scotch 750ml", category: 'Whisky & Bourbon', price: 1700, stock_qty: 35, unit: '750ml', is_quick_key: false, low_stock_threshold: 6 },
  { id: 213, barcode: '5000267180206', name: 'Johnnie Walker Gold Label Reserve 750ml', category: 'Whisky & Bourbon', price: 7800, stock_qty: 12, unit: '750ml', is_quick_key: false, low_stock_threshold: 2 },
  { id: 214, barcode: '5011007003028', name: 'Jameson Irish Whiskey 1 Litre', category: 'Whisky & Bourbon', price: 3300, stock_qty: 28, unit: '1L', is_quick_key: false, low_stock_threshold: 5 },
  { id: 215, barcode: '5010496001011', name: 'Glenfiddich 15 Year Old 750ml', category: 'Whisky & Bourbon', price: 8900, stock_qty: 10, unit: '750ml', is_quick_key: false, low_stock_threshold: 2 },

  // ==========================================
  // 3. GIN & BOTANICAL (301 - 315)
  // ==========================================
  { id: 301, barcode: '6161100020201', name: 'Gilbeys Special Dry Gin 750ml', category: 'Gin & Botanical', price: 1450, stock_qty: 65, unit: '750ml', is_quick_key: true, low_stock_threshold: 12 },
  { id: 302, barcode: '6161100020202', name: 'Gilbeys Special Dry Gin 375ml', category: 'Gin & Botanical', price: 750, stock_qty: 55, unit: '375ml', is_quick_key: true, low_stock_threshold: 10 },
  { id: 303, barcode: '5000289920011', name: "Gordon's London Dry Gin 750ml", category: 'Gin & Botanical', price: 1950, stock_qty: 42, unit: '750ml', is_quick_key: true, low_stock_threshold: 8 },
  { id: 304, barcode: '5000289920028', name: "Gordon's Premium Pink Gin 750ml", category: 'Gin & Botanical', price: 2100, stock_qty: 38, unit: '750ml', is_quick_key: true, low_stock_threshold: 6 },
  { id: 305, barcode: '5000281014402', name: 'Tanqueray London Dry Gin 750ml', category: 'Gin & Botanical', price: 2800, stock_qty: 26, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 306, barcode: '5000281014419', name: 'Tanqueray No. TEN Gin 750ml', category: 'Gin & Botanical', price: 4600, stock_qty: 14, unit: '750ml', is_quick_key: false, low_stock_threshold: 3 },
  { id: 307, barcode: '5010677000109', name: 'Bombay Sapphire London Dry Gin 750ml', category: 'Gin & Botanical', price: 2750, stock_qty: 30, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 308, barcode: '5010314300005', name: "Hendrick's Handcrafted Gin 750ml", category: 'Gin & Botanical', price: 5200, stock_qty: 15, unit: '750ml', is_quick_key: false, low_stock_threshold: 3 },
  { id: 309, barcode: '6161100020300', name: 'Chrome Gin 750ml', category: 'Gin & Botanical', price: 850, stock_qty: 80, unit: '750ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 310, barcode: '5000289920035', name: "Gordon's London Dry Gin 1 Litre", category: 'Gin & Botanical', price: 2500, stock_qty: 20, unit: '1L', is_quick_key: false, low_stock_threshold: 4 },

  // ==========================================
  // 4. VODKA (401 - 415)
  // ==========================================
  { id: 401, barcode: '5000281001013', name: 'Smirnoff Red No. 21 Vodka 750ml', category: 'Vodka', price: 1550, stock_qty: 48, unit: '750ml', is_quick_key: true, low_stock_threshold: 10 },
  { id: 402, barcode: '5000281001020', name: 'Smirnoff Red No. 21 Vodka 375ml', category: 'Vodka', price: 800, stock_qty: 50, unit: '375ml', is_quick_key: true, low_stock_threshold: 10 },
  { id: 403, barcode: '7312040017034', name: 'Absolut Blue Vodka 750ml', category: 'Vodka', price: 2300, stock_qty: 30, unit: '750ml', is_quick_key: false, low_stock_threshold: 6 },
  { id: 404, barcode: '0880761618684', name: 'Ciroc Snap Frost Vodka 750ml', category: 'Vodka', price: 4600, stock_qty: 15, unit: '750ml', is_quick_key: false, low_stock_threshold: 3 },
  { id: 405, barcode: '6161100020409', name: 'Chrome Vodka 750ml', category: 'Vodka', price: 820, stock_qty: 90, unit: '750ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 406, barcode: '3800008701018', name: 'Flirt Vodka Silver Filtered 750ml', category: 'Vodka', price: 1200, stock_qty: 40, unit: '750ml', is_quick_key: false, low_stock_threshold: 8 },
  { id: 407, barcode: '7312040017041', name: 'Absolut Raspberry Vodka 750ml', category: 'Vodka', price: 2400, stock_qty: 20, unit: '750ml', is_quick_key: false, low_stock_threshold: 4 },

  // ==========================================
  // 5. RUM (501 - 510)
  // ==========================================
  { id: 501, barcode: '5000281005011', name: 'Captain Morgan Spiced Gold 750ml', category: 'Rum', price: 1650, stock_qty: 45, unit: '750ml', is_quick_key: true, low_stock_threshold: 8 },
  { id: 502, barcode: '5000281005028', name: 'Captain Morgan Black Dark Rum 750ml', category: 'Rum', price: 1850, stock_qty: 32, unit: '750ml', is_quick_key: false, low_stock_threshold: 6 },
  { id: 503, barcode: '5010677014014', name: 'Bacardi Carta Blanca Superior 750ml', category: 'Rum', price: 2100, stock_qty: 24, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 504, barcode: '5011007005008', name: 'Malibu Coconut Liqueur Rum 750ml', category: 'Rum', price: 2250, stock_qty: 20, unit: '750ml', is_quick_key: false, low_stock_threshold: 4 },
  { id: 505, barcode: '5000281005035', name: 'Captain Morgan Spiced Gold 375ml', category: 'Rum', price: 850, stock_qty: 36, unit: '375ml', is_quick_key: true, low_stock_threshold: 8 },

  // ==========================================
  // 6. BRANDY & COGNAC (601 - 610)
  // ==========================================
  { id: 601, barcode: '3245990200107', name: 'Hennessy VS Very Special Cognac 750ml', category: 'Brandy & Cognac', price: 5800, stock_qty: 22, unit: '750ml', is_quick_key: true, low_stock_threshold: 4 },
  { id: 602, barcode: '3279920000017', name: 'Martell VS Single Distillery Cognac 750ml', category: 'Brandy & Cognac', price: 5600, stock_qty: 18, unit: '750ml', is_quick_key: false, low_stock_threshold: 4 },
  { id: 603, barcode: '6001108020019', name: 'Viceroy 5 Year Old Liqueur Brandy 750ml', category: 'Brandy & Cognac', price: 1450, stock_qty: 40, unit: '750ml', is_quick_key: true, low_stock_threshold: 8 },
  { id: 604, barcode: '6161100020508', name: 'Richot Rare Old Brandy 750ml', category: 'Brandy & Cognac', price: 1600, stock_qty: 35, unit: '750ml', is_quick_key: false, low_stock_threshold: 6 },
  { id: 605, barcode: '3245990200114', name: 'Hennessy VSOP Privilège Cognac 750ml', category: 'Brandy & Cognac', price: 9800, stock_qty: 8, unit: '750ml', is_quick_key: false, low_stock_threshold: 2 },

  // ==========================================
  // 7. TEQUILA (701 - 708)
  // ==========================================
  { id: 701, barcode: '7501035010108', name: 'Jose Cuervo Especial Gold Tequila 750ml', category: 'Tequila', price: 2900, stock_qty: 26, unit: '750ml', is_quick_key: true, low_stock_threshold: 5 },
  { id: 702, barcode: '7501035010115', name: 'Jose Cuervo Especial Silver Tequila 750ml', category: 'Tequila', price: 2800, stock_qty: 22, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 703, barcode: '7501035040105', name: 'Camino Real Gold Tequila 750ml', category: 'Tequila', price: 2400, stock_qty: 30, unit: '750ml', is_quick_key: false, low_stock_threshold: 6 },
  { id: 704, barcode: '7501035010122', name: 'Don Julio Blanco Tequila 750ml', category: 'Tequila', price: 7500, stock_qty: 10, unit: '750ml', is_quick_key: false, low_stock_threshold: 2 },

  // ==========================================
  // 8. WINE & CHAMPAGNE (801 - 820)
  // ==========================================
  { id: 801, barcode: '6001497400018', name: 'Nederburg Cabernet Sauvignon 750ml', category: 'Wine & Champagne', price: 1750, stock_qty: 30, unit: '750ml', is_quick_key: true, low_stock_threshold: 6 },
  { id: 802, barcode: '6001497400025', name: 'Nederburg Sauvignon Blanc 750ml', category: 'Wine & Champagne', price: 1650, stock_qty: 26, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 803, barcode: '6001108040017', name: '4th Street Sweet Red Wine 750ml', category: 'Wine & Champagne', price: 1050, stock_qty: 60, unit: '750ml', is_quick_key: true, low_stock_threshold: 12 },
  { id: 804, barcode: '6001108040024', name: '4th Street Sweet White Wine 750ml', category: 'Wine & Champagne', price: 1050, stock_qty: 45, unit: '750ml', is_quick_key: false, low_stock_threshold: 10 },
  { id: 805, barcode: '6001108040031', name: '4th Street Sweet Red 5 Litre Cask', category: 'Wine & Champagne', price: 4200, stock_qty: 15, unit: '5L', is_quick_key: false, low_stock_threshold: 3 },
  { id: 806, barcode: '6001497410017', name: 'Drostdy-Hof Claret Select Red 750ml', category: 'Wine & Champagne', price: 1150, stock_qty: 40, unit: '750ml', is_quick_key: true, low_stock_threshold: 8 },
  { id: 807, barcode: '7804320000018', name: 'Frontera Cabernet Sauvignon 750ml', category: 'Wine & Champagne', price: 1400, stock_qty: 32, unit: '750ml', is_quick_key: false, low_stock_threshold: 6 },
  { id: 808, barcode: '7804320000025', name: 'Casillero del Diablo Cabernet 750ml', category: 'Wine & Champagne', price: 2100, stock_qty: 24, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 809, barcode: '4840001000013', name: 'Asconi Pastoral Sweet Red Wine 750ml', category: 'Wine & Champagne', price: 1350, stock_qty: 35, unit: '750ml', is_quick_key: true, low_stock_threshold: 6 },
  { id: 810, barcode: '3185370000332', name: 'Moët & Chandon Brut Impérial 750ml', category: 'Wine & Champagne', price: 10500, stock_qty: 10, unit: '750ml', is_quick_key: false, low_stock_threshold: 2 },
  { id: 811, barcode: '0811538012019', name: 'Luc Belaire Rare Rosé Sparkling 750ml', category: 'Wine & Champagne', price: 6800, stock_qty: 14, unit: '750ml', is_quick_key: false, low_stock_threshold: 3 },
  { id: 812, barcode: '6001497410024', name: 'Drostdy-Hof Premier Grand Cru White 750ml', category: 'Wine & Champagne', price: 1150, stock_qty: 30, unit: '750ml', is_quick_key: false, low_stock_threshold: 6 },

  // ==========================================
  // 9. LIQUEURS & CREAMS (901 - 908)
  // ==========================================
  { id: 901, barcode: '5011013100155', name: 'Baileys Original Irish Cream 750ml', category: 'Liqueurs & Creams', price: 2700, stock_qty: 36, unit: '750ml', is_quick_key: true, low_stock_threshold: 6 },
  { id: 902, barcode: '4067700015014', name: 'Jägermeister Herbal Liqueur 700ml', category: 'Liqueurs & Creams', price: 2850, stock_qty: 40, unit: '700ml', is_quick_key: true, low_stock_threshold: 8 },
  { id: 903, barcode: '6001108030018', name: 'Amarula Marula Fruit Cream 750ml', category: 'Liqueurs & Creams', price: 2350, stock_qty: 28, unit: '750ml', is_quick_key: false, low_stock_threshold: 5 },
  { id: 904, barcode: '8000500000012', name: 'Campari Bitter Liqueur 750ml', category: 'Liqueurs & Creams', price: 2600, stock_qty: 22, unit: '750ml', is_quick_key: false, low_stock_threshold: 4 },
  { id: 905, barcode: '5011013100162', name: 'Baileys Original Irish Cream 375ml', category: 'Liqueurs & Creams', price: 1500, stock_qty: 25, unit: '375ml', is_quick_key: false, low_stock_threshold: 5 },

  // ==========================================
  // 10. SOFT DRINKS & SODAS (1001 - 1015)
  // ==========================================
  { id: 1001, barcode: '5449000000996', name: 'Coca-Cola Regular 500ml PET', category: 'Soft Drinks & Sodas', price: 80, stock_qty: 150, unit: '500ml', is_quick_key: true, low_stock_threshold: 24 },
  { id: 1002, barcode: '5449000011527', name: 'Fanta Orange 500ml PET', category: 'Soft Drinks & Sodas', price: 80, stock_qty: 90, unit: '500ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1003, barcode: '5449000016928', name: 'Sprite 500ml PET', category: 'Soft Drinks & Sodas', price: 80, stock_qty: 90, unit: '500ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1004, barcode: '5449000012012', name: 'Coca-Cola Zero Sugar 500ml PET', category: 'Soft Drinks & Sodas', price: 80, stock_qty: 60, unit: '500ml', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1005, barcode: '5449000013019', name: 'Stoney Tangawizi Ginger 500ml PET', category: 'Soft Drinks & Sodas', price: 80, stock_qty: 85, unit: '500ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1006, barcode: '5449000014016', name: 'Fanta Blackcurrant 500ml PET', category: 'Soft Drinks & Sodas', price: 80, stock_qty: 70, unit: '500ml', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1007, barcode: '5449000000989', name: 'Coca-Cola Regular 1.25L Bottle', category: 'Soft Drinks & Sodas', price: 140, stock_qty: 50, unit: '1.25L', is_quick_key: false, low_stock_threshold: 10 },
  { id: 1008, barcode: '5449000000972', name: 'Coca-Cola Regular 2 Litre PET', category: 'Soft Drinks & Sodas', price: 200, stock_qty: 40, unit: '2L', is_quick_key: false, low_stock_threshold: 10 },

  // ==========================================
  // 11. MIXERS & TONIC (1101 - 1108)
  // ==========================================
  { id: 1101, barcode: '5449000020109', name: 'Schweppes Tonic Water 330ml Can', category: 'Mixers & Tonic', price: 100, stock_qty: 120, unit: '330ml', is_quick_key: true, low_stock_threshold: 20 },
  { id: 1102, barcode: '5449000020116', name: 'Schweppes Soda Water 330ml Can', category: 'Mixers & Tonic', price: 100, stock_qty: 80, unit: '330ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1103, barcode: '5449000020123', name: 'Schweppes Ginger Ale 330ml Can', category: 'Mixers & Tonic', price: 100, stock_qty: 60, unit: '330ml', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1104, barcode: '5449000020130', name: 'Krest Bitter Lemon 300ml Glass', category: 'Mixers & Tonic', price: 80, stock_qty: 50, unit: '300ml', is_quick_key: false, low_stock_threshold: 10 },

  // ==========================================
  // 12. ENERGY DRINKS (1201 - 1208)
  // ==========================================
  { id: 1201, barcode: '9002490100070', name: 'Red Bull Energy Drink 250ml Can', category: 'Energy Drinks', price: 200, stock_qty: 110, unit: '250ml', is_quick_key: true, low_stock_threshold: 20 },
  { id: 1202, barcode: '9002490100087', name: 'Red Bull Sugarfree 250ml Can', category: 'Energy Drinks', price: 200, stock_qty: 45, unit: '250ml', is_quick_key: false, low_stock_threshold: 10 },
  { id: 1203, barcode: '5060166690013', name: 'Monster Energy Original 500ml Can', category: 'Energy Drinks', price: 250, stock_qty: 80, unit: '500ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1204, barcode: '5060166690020', name: 'Monster Ultra Zero 500ml Can', category: 'Energy Drinks', price: 250, stock_qty: 50, unit: '500ml', is_quick_key: false, low_stock_threshold: 10 },
  { id: 1205, barcode: '5449000210012', name: 'Predator Energy Drink 400ml PET', category: 'Energy Drinks', price: 90, stock_qty: 90, unit: '400ml', is_quick_key: true, low_stock_threshold: 15 },

  // ==========================================
  // 13. MINERAL WATER (1301 - 1308)
  // ==========================================
  { id: 1301, barcode: '6161100030302', name: 'Keringet Natural Still Water 500ml', category: 'Mineral Water', price: 70, stock_qty: 140, unit: '500ml', is_quick_key: true, low_stock_threshold: 24 },
  { id: 1302, barcode: '6161100030319', name: 'Keringet Sparkling Water 500ml', category: 'Mineral Water', price: 90, stock_qty: 60, unit: '500ml', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1303, barcode: '6161100030326', name: 'Keringet Natural Still Water 1 Litre', category: 'Mineral Water', price: 120, stock_qty: 70, unit: '1L', is_quick_key: false, low_stock_threshold: 15 },
  { id: 1304, barcode: '5449000100016', name: 'Dasani Pure Water 500ml', category: 'Mineral Water', price: 60, stock_qty: 120, unit: '500ml', is_quick_key: true, low_stock_threshold: 20 },
  { id: 1305, barcode: '5449000100023', name: 'Dasani Pure Water 1 Litre', category: 'Mineral Water', price: 100, stock_qty: 60, unit: '1L', is_quick_key: false, low_stock_threshold: 12 },

  // ==========================================
  // 14. JUICES & BEVERAGES (1401 - 1410)
  // ==========================================
  { id: 1401, barcode: '5449000300010', name: 'Minute Maid Mango 400ml PET', category: 'Juices & Beverages', price: 90, stock_qty: 80, unit: '400ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1402, barcode: '5449000300027', name: 'Minute Maid Apple 400ml PET', category: 'Juices & Beverages', price: 90, stock_qty: 65, unit: '400ml', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1403, barcode: '5449000300034', name: 'Minute Maid Orange 400ml PET', category: 'Juices & Beverages', price: 90, stock_qty: 60, unit: '400ml', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1404, barcode: '6161100400019', name: 'Del Monte Pineapple Juice 1 Litre', category: 'Juices & Beverages', price: 230, stock_qty: 40, unit: '1L', is_quick_key: false, low_stock_threshold: 8 },
  { id: 1405, barcode: '6161100400026', name: 'Del Monte Mango Juice 1 Litre', category: 'Juices & Beverages', price: 230, stock_qty: 45, unit: '1L', is_quick_key: false, low_stock_threshold: 8 },
  { id: 1406, barcode: '6001240100011', name: 'Ceres 100% Fruit Juice Whispers 1L', category: 'Juices & Beverages', price: 280, stock_qty: 30, unit: '1L', is_quick_key: false, low_stock_threshold: 6 },

  // ==========================================
  // 15. SNACKS & CRISPS (1501 - 1512)
  // ==========================================
  { id: 1501, barcode: '5053990100019', name: 'Pringles Original Crisps 165g', category: 'Snacks & Crisps', price: 350, stock_qty: 45, unit: '165g', is_quick_key: true, low_stock_threshold: 8 },
  { id: 1502, barcode: '5053990100026', name: 'Pringles Sour Cream & Onion 165g', category: 'Snacks & Crisps', price: 350, stock_qty: 40, unit: '165g', is_quick_key: true, low_stock_threshold: 8 },
  { id: 1503, barcode: '6161100050102', name: 'Salted Roasted Peanuts 100g', category: 'Snacks & Crisps', price: 100, stock_qty: 80, unit: '100g', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1504, barcode: '6161100050119', name: 'Chili Spiced Peanuts 100g', category: 'Snacks & Crisps', price: 100, stock_qty: 60, unit: '100g', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1505, barcode: '6161100050201', name: 'Urban Bites Salt & Vinegar 120g', category: 'Snacks & Crisps', price: 180, stock_qty: 50, unit: '120g', is_quick_key: false, low_stock_threshold: 10 },
  { id: 1506, barcode: '6161100050218', name: 'Urban Bites Sweet Chilli 120g', category: 'Snacks & Crisps', price: 180, stock_qty: 45, unit: '120g', is_quick_key: false, low_stock_threshold: 10 },
  { id: 1507, barcode: '6161100050300', name: 'Krackles Potato Crisps Salted 50g', category: 'Snacks & Crisps', price: 80, stock_qty: 70, unit: '50g', is_quick_key: false, low_stock_threshold: 15 },
  { id: 1508, barcode: '6161100050409', name: 'Tropical Roasted Cashew Nuts 100g', category: 'Snacks & Crisps', price: 320, stock_qty: 30, unit: '100g', is_quick_key: false, low_stock_threshold: 6 },

  // ==========================================
  // 16. CHOCOLATES & SWEETS (1601 - 1612)
  // ==========================================
  { id: 1601, barcode: '7622210000015', name: 'Cadbury Dairy Milk Chocolate 80g', category: 'Chocolates & Sweets', price: 200, stock_qty: 60, unit: '80g', is_quick_key: true, low_stock_threshold: 12 },
  { id: 1602, barcode: '7622210000022', name: 'Cadbury Fruit & Nut Chocolate 80g', category: 'Chocolates & Sweets', price: 220, stock_qty: 45, unit: '80g', is_quick_key: false, low_stock_threshold: 10 },
  { id: 1603, barcode: '5000159461122', name: 'Snickers Chocolate Bar 50g', category: 'Chocolates & Sweets', price: 130, stock_qty: 75, unit: '50g', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1604, barcode: '7613035000012', name: 'KitKat 4 Finger Chocolate 41.5g', category: 'Chocolates & Sweets', price: 120, stock_qty: 80, unit: '41.5g', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1605, barcode: '8000500003785', name: 'Ferrero Rocher T3 37.5g', category: 'Chocolates & Sweets', price: 300, stock_qty: 30, unit: '3-Pack', is_quick_key: false, low_stock_threshold: 6 },
  { id: 1606, barcode: '4009900000014', name: 'Orbit Spearmint Sugarfree Gum 10s', category: 'Chocolates & Sweets', price: 60, stock_qty: 120, unit: 'Pack', is_quick_key: true, low_stock_threshold: 20 },
  { id: 1607, barcode: '8410031900018', name: 'Mentos Mint Candy Roll 37.5g', category: 'Chocolates & Sweets', price: 70, stock_qty: 90, unit: 'Roll', is_quick_key: false, low_stock_threshold: 15 },

  // ==========================================
  // 17. CIGARETTES & SMOKE (1701 - 1710)
  // ==========================================
  { id: 1701, barcode: '5000393000010', name: 'Dunhill Switch Box 20s', category: 'Cigarettes & Smoke', price: 450, stock_qty: 60, unit: 'Pack', is_quick_key: true, low_stock_threshold: 10 },
  { id: 1702, barcode: '6161100040103', name: 'Embassy Kings 20s', category: 'Cigarettes & Smoke', price: 400, stock_qty: 55, unit: 'Pack', is_quick_key: true, low_stock_threshold: 10 },
  { id: 1703, barcode: '6161100040202', name: 'Sportsman 20s', category: 'Cigarettes & Smoke', price: 320, stock_qty: 70, unit: 'Pack', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1704, barcode: '7622100000018', name: 'Marlboro Gold Box 20s', category: 'Cigarettes & Smoke', price: 460, stock_qty: 40, unit: 'Pack', is_quick_key: false, low_stock_threshold: 8 },
  { id: 1705, barcode: '7622100000025', name: 'Marlboro Red Box 20s', category: 'Cigarettes & Smoke', price: 460, stock_qty: 35, unit: 'Pack', is_quick_key: false, low_stock_threshold: 8 },
  { id: 1706, barcode: '8412000000015', name: 'Clipper Gas Refillable Lighter', category: 'Cigarettes & Smoke', price: 100, stock_qty: 80, unit: 'pcs', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1707, barcode: '6161100040301', name: 'Matchbox Household Pack 10s', category: 'Cigarettes & Smoke', price: 60, stock_qty: 100, unit: 'Pack', is_quick_key: false, low_stock_threshold: 20 },

  // ==========================================
  // 18. GROCERIES & STAPLES (1801 - 1815)
  // ==========================================
  { id: 1801, barcode: '6161101000018', name: 'Pembe Maize Flour 2kg', category: 'Groceries & Staples', price: 180, stock_qty: 80, unit: '2kg', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1802, barcode: '6161101000025', name: 'Jogoo Maize Flour 2kg', category: 'Groceries & Staples', price: 185, stock_qty: 75, unit: '2kg', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1803, barcode: '6161101000032', name: 'Ajab Home Baking Wheat Flour 2kg', category: 'Groceries & Staples', price: 210, stock_qty: 60, unit: '2kg', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1804, barcode: '6161101000049', name: 'Daawat Traditional Basmati Rice 2kg', category: 'Groceries & Staples', price: 540, stock_qty: 40, unit: '2kg', is_quick_key: false, low_stock_threshold: 8 },
  { id: 1805, barcode: '6161101000056', name: 'Santa Lucia Spaghetti 500g', category: 'Groceries & Staples', price: 140, stock_qty: 70, unit: '500g', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1806, barcode: '6161101000063', name: 'Rina Vegetable Cooking Oil 1 Litre', category: 'Groceries & Staples', price: 320, stock_qty: 50, unit: '1L', is_quick_key: true, low_stock_threshold: 10 },
  { id: 1807, barcode: '6161101000070', name: 'Rina Vegetable Cooking Oil 2 Litre', category: 'Groceries & Staples', price: 620, stock_qty: 35, unit: '2L', is_quick_key: false, low_stock_threshold: 8 },
  { id: 1808, barcode: '6161101000087', name: 'Mumias White Refined Sugar 1kg', category: 'Groceries & Staples', price: 160, stock_qty: 90, unit: '1kg', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1809, barcode: '6161101000094', name: 'Mumias White Refined Sugar 2kg', category: 'Groceries & Staples', price: 310, stock_qty: 60, unit: '2kg', is_quick_key: false, low_stock_threshold: 12 },
  { id: 1810, barcode: '6161101000100', name: 'Kensalt Iodized Table Salt 1kg', category: 'Groceries & Staples', price: 50, stock_qty: 120, unit: '1kg', is_quick_key: false, low_stock_threshold: 20 },
  { id: 1811, barcode: '6161101000117', name: 'Royco All-In-One Mchuzi Mix Beef 200g', category: 'Groceries & Staples', price: 120, stock_qty: 70, unit: '200g', is_quick_key: false, low_stock_threshold: 15 },
  { id: 1812, barcode: '6161101000124', name: 'Ketepa Pride Premium Tea Leaves 250g', category: 'Groceries & Staples', price: 160, stock_qty: 55, unit: '250g', is_quick_key: false, low_stock_threshold: 10 },
  { id: 1813, barcode: '7613030000011', name: 'Nescafé Classic Instant Coffee 50g', category: 'Groceries & Staples', price: 280, stock_qty: 40, unit: '50g', is_quick_key: false, low_stock_threshold: 8 },

  // ==========================================
  // 19. DAIRY & BAKERY (1901 - 1910)
  // ==========================================
  { id: 1901, barcode: '6161102000017', name: 'Brookside Fresh Whole Milk 500ml', category: 'Dairy & Bakery', price: 65, stock_qty: 100, unit: '500ml', is_quick_key: true, low_stock_threshold: 20 },
  { id: 1902, barcode: '6161102000024', name: 'Ilara Fresh Long Life Milk 500ml', category: 'Dairy & Bakery', price: 65, stock_qty: 80, unit: '500ml', is_quick_key: true, low_stock_threshold: 15 },
  { id: 1903, barcode: '6161102000031', name: 'Broadways Sliced White Bread 400g', category: 'Dairy & Bakery', price: 65, stock_qty: 60, unit: '400g', is_quick_key: true, low_stock_threshold: 12 },
  { id: 1904, barcode: '6161102000048', name: 'Supa Loaf Premium Sliced Bread 400g', category: 'Dairy & Bakery', price: 65, stock_qty: 60, unit: '400g', is_quick_key: true, low_stock_threshold: 12 },
  { id: 1905, barcode: '6161102000055', name: 'Bio Fruit Yoghurt Strawberry 250ml', category: 'Dairy & Bakery', price: 120, stock_qty: 40, unit: '250ml', is_quick_key: false, low_stock_threshold: 8 },
  { id: 1906, barcode: '6161102000062', name: 'Brookside Dairy Best Butter 250g', category: 'Dairy & Bakery', price: 340, stock_qty: 30, unit: '250g', is_quick_key: false, low_stock_threshold: 6 },
  { id: 1907, barcode: '6161102000079', name: "Farmer's Choice Beef Sausages 500g", category: 'Dairy & Bakery', price: 420, stock_qty: 35, unit: '500g', is_quick_key: false, low_stock_threshold: 6 },
  { id: 1908, barcode: '6161102000086', name: 'Fresh Farm Eggs Crate (30 Eggs)', category: 'Dairy & Bakery', price: 520, stock_qty: 25, unit: 'Crate', is_quick_key: false, low_stock_threshold: 5 },

  // ==========================================
  // 20. HOUSEHOLD & CLEANING (2001 - 2012)
  // ==========================================
  { id: 2001, barcode: '6161103000016', name: 'Sunlight Lemon Washing Powder 1kg', category: 'Household & Cleaning', price: 270, stock_qty: 50, unit: '1kg', is_quick_key: true, low_stock_threshold: 10 },
  { id: 2002, barcode: '6161103000023', name: 'Omo Handwashing Powder 500g', category: 'Household & Cleaning', price: 180, stock_qty: 60, unit: '500g', is_quick_key: false, low_stock_threshold: 12 },
  { id: 2003, barcode: '6161103000030', name: 'Velvex Soft Toilet Tissue 4-Pack', category: 'Household & Cleaning', price: 260, stock_qty: 45, unit: '4-Pack', is_quick_key: true, low_stock_threshold: 10 },
  { id: 2004, barcode: '6161103000047', name: 'Harpic Power Plus Toilet Cleaner 500ml', category: 'Household & Cleaning', price: 290, stock_qty: 40, unit: '500ml', is_quick_key: false, low_stock_threshold: 8 },
  { id: 2005, barcode: '6161103000054', name: 'Dettol Disinfectant Antiseptic 250ml', category: 'Household & Cleaning', price: 340, stock_qty: 35, unit: '250ml', is_quick_key: false, low_stock_threshold: 6 },
  { id: 2006, barcode: '6161103000061', name: 'Axe Brand Kitchen Steel Wool 50g', category: 'Household & Cleaning', price: 40, stock_qty: 90, unit: 'pcs', is_quick_key: false, low_stock_threshold: 15 },
  { id: 2007, barcode: '6161103000078', name: 'Baygon Multi-Insect Spray 300ml', category: 'Household & Cleaning', price: 450, stock_qty: 30, unit: '300ml', is_quick_key: false, low_stock_threshold: 6 },

  // ==========================================
  // 21. PERSONAL CARE & HYGIENE (2101 - 2112)
  // ==========================================
  { id: 2101, barcode: '6161104000015', name: 'Colgate Triple Action Toothpaste 140g', category: 'Personal Care & Hygiene', price: 180, stock_qty: 60, unit: '140g', is_quick_key: true, low_stock_threshold: 12 },
  { id: 2102, barcode: '6161104000022', name: 'Dettol Original Bathing Soap 175g', category: 'Personal Care & Hygiene', price: 150, stock_qty: 70, unit: '175g', is_quick_key: true, low_stock_threshold: 15 },
  { id: 2103, barcode: '6161104000039', name: 'Geisha Aloe Vera Bathing Soap 200g', category: 'Personal Care & Hygiene', price: 130, stock_qty: 75, unit: '200g', is_quick_key: false, low_stock_threshold: 15 },
  { id: 2104, barcode: '6161104000046', name: 'Nivea Men Deep Roll-On Deodorant 50ml', category: 'Personal Care & Hygiene', price: 380, stock_qty: 35, unit: '50ml', is_quick_key: false, low_stock_threshold: 8 },
  { id: 2105, barcode: '6161104000053', name: 'Always Platinum Ultra Thin Pads 8s', category: 'Personal Care & Hygiene', price: 160, stock_qty: 65, unit: 'Pack', is_quick_key: true, low_stock_threshold: 15 },
  { id: 2106, barcode: '6161104000060', name: 'Vaseline Petroleum Jelly Original 100ml', category: 'Personal Care & Hygiene', price: 160, stock_qty: 55, unit: '100ml', is_quick_key: false, low_stock_threshold: 10 },
  { id: 2107, barcode: '6161104000077', name: 'Gillette Blue II Plus Razors 2-Pack', category: 'Personal Care & Hygiene', price: 120, stock_qty: 50, unit: '2-Pack', is_quick_key: false, low_stock_threshold: 10 },

  // ==========================================
  // 22. ELECTRONICS & ACCESSORIES (2201 - 2208)
  // ==========================================
  { id: 2201, barcode: '6161105000014', name: 'Fast USB-C Charging Cable 1 Metre', category: 'Electronics & Accessories', price: 350, stock_qty: 40, unit: 'pcs', is_quick_key: true, low_stock_threshold: 8 },
  { id: 2202, barcode: '6161105000021', name: 'Lightning to USB iPhone Cable 1m', category: 'Electronics & Accessories', price: 350, stock_qty: 35, unit: 'pcs', is_quick_key: false, low_stock_threshold: 8 },
  { id: 2203, barcode: '6161105000038', name: 'Fast 20W USB-C Power Adapter Wall Plug', category: 'Electronics & Accessories', price: 750, stock_qty: 25, unit: 'pcs', is_quick_key: false, low_stock_threshold: 5 },
  { id: 2204, barcode: '6161105000045', name: 'Universal 3.5mm Wired In-Ear Earphones', category: 'Electronics & Accessories', price: 300, stock_qty: 40, unit: 'pcs', is_quick_key: false, low_stock_threshold: 8 },
  { id: 2205, barcode: '6161105000052', name: 'Energizer Max AA Alkaline Batteries 4-Pack', category: 'Electronics & Accessories', price: 380, stock_qty: 50, unit: '4-Pack', is_quick_key: true, low_stock_threshold: 10 },
  { id: 2206, barcode: '6161105000069', name: 'Energizer Max AAA Alkaline Batteries 4-Pack', category: 'Electronics & Accessories', price: 380, stock_qty: 45, unit: '4-Pack', is_quick_key: false, low_stock_threshold: 10 },
];
