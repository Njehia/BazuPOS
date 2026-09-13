import React, { useState } from 'react';
import { Check, Copy, FileCode2, FolderTree, Layers, Terminal, X } from 'lucide-react';

interface FlutterCodeModalProps {
  onClose: () => void;
}

export const FlutterCodeModal: React.FC<FlutterCodeModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'db_helper' | 'models' | 'pubspec'>('structure');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const folderStructureText = `bazu_pos/
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/AndroidManifest.xml
├── assets/
│   └── icons/
├── lib/
│   ├── main.dart
│   ├── config/
│   │   ├── app_theme.dart
│   │   └── constants.dart
│   ├── data/
│   │   ├── database_helper.dart      # <--- sqflite SQLite Manager
│   │   └── seed_data.dart            # Initial liquor catalogue & users
│   ├── models/
│   │   ├── user_model.dart
│   │   ├── product_model.dart
│   │   ├── sale_model.dart
│   │   ├── sale_item_model.dart
│   │   └── store_config_model.dart
│   ├── providers/
│   │   ├── auth_provider.dart        # PIN session & role management
│   │   ├── cart_provider.dart        # Real-time cart & stock validation
│   │   ├── inventory_provider.dart   # Product CRUD & restock ops
│   │   └── sales_provider.dart       # Shift totals & transaction records
│   ├── screens/
│   │   ├── auth/
│   │   │   └── pin_screen.dart       # 4-digit keypad authentication
│   │   ├── pos/
│   │   │   ├── pos_terminal_screen.dart
│   │   │   ├── widgets/
│   │   │   │   ├── product_grid.dart
│   │   │   │   ├── product_card.dart
│   │   │   │   ├── cart_sidebar.dart
│   │   │   │   ├── checkout_dialog.dart
│   │   │   │   └── receipt_dialog.dart
│   │   └── admin/
│   │       ├── admin_dashboard_screen.dart
│   │       ├── inventory_screen.dart
│   │       ├── daily_summary_screen.dart
│   │       └── store_settings_screen.dart
│   └── utils/
│       ├── currency_formatter.dart   # KES currency formatting
│       └── receipt_printer.dart      # ESC/POS bluetooth thermal printer
├── pubspec.yaml
└── test/
    └── database_test.dart`;

  const dbHelperText = `import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/user_model.dart';
import '../models/product_model.dart';
import '../models/sale_model.dart';
import '../models/sale_item_model.dart';
import '../models/store_config_model.dart';

/// DatabaseHelper manages local SQLite database lifecycle and CRUD operations
/// for Bazu POS using the 'sqflite' package on Android.
class DatabaseHelper {
  static const _databaseName = 'bazu_pos.db';
  static const _databaseVersion = 1;

  // Singleton instance
  DatabaseHelper._internal();
  static final DatabaseHelper instance = DatabaseHelper._internal();

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _databaseName);

    return await openDatabase(
      path,
      version: _databaseVersion,
      onCreate: _onCreate,
      onConfigure: _onConfigure,
    );
  }

  Future<void> _onConfigure(Database db) async {
    // Enable foreign key constraints for SQLite
    await db.execute('PRAGMA foreign_keys = ON');
  }

  Future<void> _onCreate(Database db, int version) async {
    // 1. Users Table
    await db.execute('''
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        pin TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK(role IN ('ADMIN', 'SALES'))
      )
    ''');

    // 2. Products Table
    await db.execute('''
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'liquor',
        price REAL NOT NULL,
        stock_qty INTEGER NOT NULL DEFAULT 0,
        unit TEXT DEFAULT 'bottle'
      )
    ''');

    // 3. Sales Header Table
    await db.execute('''
      CREATE TABLE sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cashier_name TEXT NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'MPESA')),
        mpesa_code TEXT,
        cash_tendered REAL,
        change_given REAL,
        created_at TEXT NOT NULL
      )
    ''');

    // 4. Sale Items Table
    await db.execute('''
      CREATE TABLE sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    ''');

    // 5. Store Configuration Table
    await db.execute('''
      CREATE TABLE store_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_name TEXT NOT NULL,
        branch TEXT,
        phone_number TEXT,
        till_number TEXT,
        receipt_footer TEXT,
        primary_color TEXT DEFAULT 'amber'
      )
    ''');

    // Seed default administrative & cashier accounts
    await db.rawInsert('''
      INSERT INTO users (name, pin, role) VALUES 
      ('Wanjiku (Store Owner)', '9999', 'ADMIN'),
      ('Brian Mwangi (Cashier)', '1234', 'SALES')
    ''');

    // Seed initial store config
    await db.rawInsert('''
      INSERT INTO store_config (store_name, branch, phone_number, till_number, receipt_footer, primary_color) 
      VALUES (
        'Bazu Wines & Spirits', 
        'Kilimani, Nairobi', 
        '+254 712 345 678', 
        '889922', 
        'Asante sana! Karibu tena.\\nStrictly not for sale to persons under 18 years.',
        'amber'
      )
    ''');

    // Seed popular Nairobi liquor products
    final batch = db.batch();
    final sampleProducts = [
      {'barcode': '616110001001', 'name': 'Tusker Lager 500ml', 'category': 'beer', 'price': 250.0, 'stock_qty': 48},
      {'barcode': '616110001002', 'name': 'Tusker Cider 500ml', 'category': 'beer', 'price': 280.0, 'stock_qty': 36},
      {'barcode': '616110001003', 'name': 'White Cap Crisp 500ml', 'category': 'beer', 'price': 260.0, 'stock_qty': 24},
      {'barcode': '616110001004', 'name': 'Guinness Foreign Extra 500ml', 'category': 'beer', 'price': 280.0, 'stock_qty': 30},
      {'barcode': '616110002001', 'name': 'Gilbeys Special Dry Gin 750ml', 'category': 'gin', 'price': 1450.0, 'stock_qty': 18},
      {'barcode': '616110002002', 'name': 'Chrome Vodka 750ml', 'category': 'vodka', 'price': 750.0, 'stock_qty': 25},
      {'barcode': '616110002003', 'name': 'Kenya Cane Original 750ml', 'category': 'vodka', 'price': 900.0, 'stock_qty': 20},
      {'barcode': '616110003001', 'name': 'Johnnie Walker Black Label 750ml', 'category': 'whisky', 'price': 3800.0, 'stock_qty': 8},
      {'barcode': '616110003002', 'name': 'Jameson Irish Whiskey 750ml', 'category': 'whisky', 'price': 2600.0, 'stock_qty': 12},
      {'barcode': '616110003003', 'name': 'Captain Morgan Gold 750ml', 'category': 'rum', 'price': 1300.0, 'stock_qty': 14},
    ];
    for (var prod in sampleProducts) {
      batch.insert('products', prod);
    }
    await batch.commit(noResult: true);
  }

  // ==========================================
  // USER AUTHENTICATION
  // ==========================================

  Future<UserModel?> authenticatePin(String pin) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'users',
      where: 'pin = ?',
      whereArgs: [pin],
      limit: 1,
    );

    if (maps.isNotEmpty) {
      return UserModel.fromMap(maps.first);
    }
    return null;
  }

  // ==========================================
  // PRODUCT & INVENTORY CRUD
  // ==========================================

  Future<List<ProductModel>> getAllProducts() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('products', orderBy: 'name ASC');
    return List.generate(maps.length, (i) => ProductModel.fromMap(maps[i]));
  }

  Future<ProductModel?> getProductById(int id) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'products',
      where: 'id = ?',
      whereArgs: [id],
    );
    if (maps.isNotEmpty) return ProductModel.fromMap(maps.first);
    return null;
  }

  Future<int> insertProduct(ProductModel product) async {
    final db = await database;
    return await db.insert('products', product.toMap());
  }

  /// Admin updates price and physical inventory stock count
  Future<int> updateProduct(ProductModel product) async {
    final db = await database;
    return await db.update(
      'products',
      product.toMap(),
      where: 'id = ?',
      whereArgs: [product.id],
    );
  }

  Future<int> deleteProduct(int id) async {
    final db = await database;
    return await db.delete('products', where: 'id = ?', whereArgs: [id]);
  }

  // ==========================================
  // ATOMIC SALE TRANSACTION WITH STOCK PROTECTION
  // ==========================================

  /// Records a sale and deducts inventory inside an atomic SQLite transaction.
  /// Throws an exception if any item in cart exceeds available stock.
  Future<int> executeSaleTransaction({
    required SaleModel sale,
    required List<SaleItemModel> items,
  }) async {
    final db = await database;

    return await db.transaction<int>((txn) async {
      // 1. Verify stock protection for each item
      for (final item in items) {
        final List<Map<String, dynamic>> prodRes = await txn.query(
          'products',
          columns: ['stock_qty', 'name'],
          where: 'id = ?',
          whereArgs: [item.productId],
        );

        if (prodRes.isEmpty) {
          throw Exception('Product ID \${item.productId} not found.');
        }

        final currentStock = prodRes.first['stock_qty'] as int;
        final prodName = prodRes.first['name'] as String;

        if (currentStock < item.quantity) {
          throw Exception('Stock protection alert: Not enough stock for \$prodName. Available: \$currentStock');
        }

        // Deduct inventory
        await txn.rawUpdate(
          'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?',
          [item.quantity, item.productId],
        );
      }

      // 2. Insert sale record
      final saleId = await txn.insert('sales', sale.toMap());

      // 3. Insert sale items
      final batch = txn.batch();
      for (final item in items) {
        final itemMap = item.toMap();
        itemMap['sale_id'] = saleId;
        batch.insert('sale_items', itemMap);
      }
      await batch.commit(noResult: true);

      return saleId;
    });
  }

  // ==========================================
  // DAILY TOTALS & SALES SUMMARY
  // ==========================================

  Future<Map<String, dynamic>> getDailyShiftSummary(String dateYmd) async {
    final db = await database;

    final result = await db.rawQuery('''
      SELECT 
        COUNT(id) as total_transactions,
        COALESCE(SUM(total_amount), 0) as grand_total,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'MPESA' THEN total_amount ELSE 0 END), 0) as mpesa_total
      FROM sales
      WHERE created_at LIKE ?
    ''', ['\$dateYmd%']);

    return result.first;
  }

  Future<List<SaleModel>> getSalesForDate(String dateYmd) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'sales',
      where: 'created_at LIKE ?',
      whereArgs: ['\$dateYmd%'],
      orderBy: 'id DESC',
    );
    return List.generate(maps.length, (i) => SaleModel.fromMap(maps[i]));
  }

  // ==========================================
  // STORE CONFIGURATION
  // ==========================================

  Future<StoreConfigModel> getStoreConfig() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('store_config', limit: 1);
    if (maps.isNotEmpty) {
      return StoreConfigModel.fromMap(maps.first);
    }
    return StoreConfigModel.defaultConfig();
  }

  Future<int> updateStoreConfig(StoreConfigModel config) async {
    final db = await database;
    return await db.update(
      'store_config',
      config.toMap(),
      where: 'id = ?',
      whereArgs: [config.id],
    );
  }

  Future<void> close() async {
    final db = await database;
    db.close();
  }
}`;

  const pubspecText = `name: bazu_pos
description: Offline-first Point of Sale (POS) Android application for Nairobi liquor retail.
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  
  # Local SQLite database
  sqflite: ^2.3.0
  path: ^1.9.0
  path_provider: ^2.1.2

  # State management
  provider: ^6.1.2

  # Formatting & Date manipulation
  intl: ^0.19.0

  # Icons & UI polish
  lucide_icons: ^0.257.0
  google_fonts: ^6.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/icons/`;

  const modelsText = `// lib/models/user_model.dart
class UserModel {
  final int? id;
  final String name;
  final String pin;
  final String role; // 'ADMIN' or 'SALES'

  UserModel({this.id, required this.name, required this.pin, required this.role});

  factory UserModel.fromMap(Map<String, dynamic> map) => UserModel(
    id: map['id'],
    name: map['name'],
    pin: map['pin'],
    role: map['role'],
  );

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'pin': pin,
    'role': role,
  };
}

// lib/models/product_model.dart
class ProductModel {
  final int? id;
  final String? barcode;
  final String name;
  final String category;
  final double price;
  final int stockQty;
  final String unit;

  ProductModel({
    this.id,
    this.barcode,
    required this.name,
    this.category = 'liquor',
    required this.price,
    required this.stockQty,
    this.unit = 'bottle',
  });

  factory ProductModel.fromMap(Map<String, dynamic> map) => ProductModel(
    id: map['id'],
    barcode: map['barcode'],
    name: map['name'],
    category: map['category'] ?? 'liquor',
    price: (map['price'] as num).toDouble(),
    stockQty: map['stock_qty'] as int,
    unit: map['unit'] ?? 'bottle',
  );

  Map<String, dynamic> toMap() => {
    'id': id,
    'barcode': barcode,
    'name': name,
    'category': category,
    'price': price,
    'stock_qty': stockQty,
    'unit': unit,
  };
}

// lib/models/sale_model.dart
class SaleModel {
  final int? id;
  final String cashierName;
  final double totalAmount;
  final String paymentMethod; // 'CASH' or 'MPESA'
  final String? mpesaCode;
  final double? cashTendered;
  final double? changeGiven;
  final String createdAt;

  SaleModel({
    this.id,
    required this.cashierName,
    required this.totalAmount,
    required this.paymentMethod,
    this.mpesaCode,
    this.cashTendered,
    this.changeGiven,
    required this.createdAt,
  });

  factory SaleModel.fromMap(Map<String, dynamic> map) => SaleModel(
    id: map['id'],
    cashierName: map['cashier_name'],
    totalAmount: (map['total_amount'] as num).toDouble(),
    paymentMethod: map['payment_method'],
    mpesaCode: map['mpesa_code'],
    cashTendered: map['cash_tendered'] != null ? (map['cash_tendered'] as num).toDouble() : null,
    changeGiven: map['change_given'] != null ? (map['change_given'] as num).toDouble() : null,
    createdAt: map['created_at'],
  );

  Map<String, dynamic> toMap() => {
    'id': id,
    'cashier_name': cashierName,
    'total_amount': totalAmount,
    'payment_method': paymentMethod,
    'mpesa_code': mpesaCode,
    'cash_tendered': cashTendered,
    'change_given': changeGiven,
    'created_at': createdAt,
  };
}`;

  const currentContent =
    activeTab === 'structure'
      ? folderStructureText
      : activeTab === 'db_helper'
      ? dbHelperText
      : activeTab === 'models'
      ? modelsText
      : pubspecText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-[#1E1B4B] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Flutter Android Architecture & SQLite Code
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold">
                  Ready for Production
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                100% Offline-First SQLite (`sqflite`) implementation for Bazu POS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Copy Button */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('structure')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'structure'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>1. Project Structure</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('db_helper')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'db_helper'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>2. DatabaseHelper.dart</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('models')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'models'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Data Models</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pubspec')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'pubspec'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>4. pubspec.yaml</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(currentContent)}
            className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content Container */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed selection:bg-amber-500 selection:text-white">
          <pre className="whitespace-pre">{currentContent}</pre>
        </div>

        {/* Footer info note */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>All tables are strictly mapped to the requested local SQLite schema.</span>
          <span className="text-amber-600 font-bold">100% Offline • Zero Backend Dependency</span>
        </div>
      </div>
    </div>
  );
};
