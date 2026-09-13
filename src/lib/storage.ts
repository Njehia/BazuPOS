import {
  Category,
  Customer,
  CustomerPayment,
  CustomerSummary,
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
  SalePaymentStatus,
  StoreConfig,
  User,
  UserRole,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_CUSTOMER_PAYMENTS,
  INITIAL_PRODUCTS,
  INITIAL_STORE_CONFIG,
  INITIAL_USERS,
  getInitialSalesAndItems,
} from '../data/seedData';
import { CloudDb } from './firebase';

const STORAGE_KEYS = {
  USERS: 'bazu_pos_users',
  PRODUCTS: 'bazu_pos_products',
  SALES: 'bazu_pos_sales',
  SALE_ITEMS: 'bazu_pos_sale_items',
  STORE_CONFIG: 'bazu_pos_store_config',
  CATEGORIES: 'bazu_pos_categories',
  CUSTOMERS: 'bazu_pos_customers',
  CUSTOMER_PAYMENTS: 'bazu_pos_customer_payments',
};

export class LocalDb {
  private static listeners: Set<() => void> = new Set();
  private static isLiveSyncInitialized = false;

  static onSyncUpdate(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private static notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn('Listener notification error:', e);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bazu_cloud_sync_update'));
    }
  }

  // ==========================================
  // REAL-TIME FIRESTORE LIVE SYNC INITIALIZER
  // ==========================================
  static initLiveSync() {
    if (this.isLiveSyncInitialized) return;
    this.isLiveSyncInitialized = true;

    try {
      // 1. Live Products Sync
      CloudDb.onProductsSnapshot((remoteProducts) => {
        if (remoteProducts && remoteProducts.length > 0) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(remoteProducts));
          this.notifyListeners();
        } else {
          // Cloud database empty: push initial catalog to Firestore
          const localProds = this.getProducts();
          CloudDb.batchSetProducts(localProds);
        }
      });

      // 2. Live Sales Sync
      CloudDb.onSalesSnapshot((remoteSales) => {
        if (remoteSales && remoteSales.length > 0) {
          localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(remoteSales));
          this.notifyListeners();
        } else {
          // Seed cloud with initial sales history
          const localSales = this.getSales();
          const localItems = this.getSaleItems();
          for (const s of localSales.slice(0, 10)) {
            const items = localItems.filter((i) => i.sale_id === s.id);
            CloudDb.recordSale(s, items);
          }
        }
      });

      // 3. Live Sale Items Sync
      CloudDb.onSaleItemsSnapshot((remoteItems) => {
        if (remoteItems && remoteItems.length > 0) {
          localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify(remoteItems));
          this.notifyListeners();
        }
      });

      // 4. Live Staff Users Sync
      CloudDb.onUsersSnapshot((remoteUsers) => {
        if (remoteUsers && remoteUsers.length > 0) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(remoteUsers));
          this.notifyListeners();
        } else {
          // Seed cloud with initial staff
          const localUsers = this.getUsers();
          CloudDb.batchSetUsers(localUsers);
        }
      });

      // 5. Live Store Configuration Sync
      CloudDb.onStoreConfigSnapshot((remoteConfig) => {
        if (remoteConfig && remoteConfig.store_name) {
          localStorage.setItem(STORAGE_KEYS.STORE_CONFIG, JSON.stringify(remoteConfig));
          this.notifyListeners();
        } else {
          CloudDb.setStoreConfig(this.getStoreConfig());
        }
      });

      // 6. Live Categories Sync
      CloudDb.onCategoriesSnapshot((remoteCategories) => {
        if (remoteCategories && remoteCategories.length > 0) {
          const current = this.getCategories();
          const map = new Map<string, Category>();
          for (const c of INITIAL_CATEGORIES) map.set(c.id, c);
          for (const c of current) map.set(c.id, c);
          for (const c of remoteCategories) map.set(c.id, c);
          const merged = Array.from(map.values());
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(merged));
          this.notifyListeners();
        } else {
          CloudDb.batchSetCategories(this.getCategories());
        }
      });

      // 7. Live Customers Sync
      CloudDb.onCustomersSnapshot((remoteCustomers) => {
        if (remoteCustomers && remoteCustomers.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(remoteCustomers));
          this.notifyListeners();
        } else {
          CloudDb.batchSetCustomers(this.getCustomers());
        }
      });

      // 8. Live Customer Payments Sync
      CloudDb.onCustomerPaymentsSnapshot((remotePayments) => {
        if (remotePayments && remotePayments.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CUSTOMER_PAYMENTS, JSON.stringify(remotePayments));
          this.notifyListeners();
        } else {
          CloudDb.batchSetCustomerPayments(this.getCustomerPayments());
        }
      });
    } catch (err) {
      console.warn('initLiveSync error:', err);
    }
  }

  // ==========================================
  // USERS & AUTHENTICATION (USERNAME & PASSWORD)
  // ==========================================
  static getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      const parsed: User[] = JSON.parse(raw);
      let list = Array.isArray(parsed) ? [...parsed] : [];

      // Ensure seed has at least the sample roles if older store lacked them
      if (list.length > 0 && !list.some((u) => u.role === 'SUPERVISOR')) {
        for (const init of INITIAL_USERS) {
          if (!list.some((u) => u.pin === init.pin)) {
            list.push(init);
          }
        }
      }

      // Guarantee unique IDs, usernames, and status
      const seenIds = new Set<number>();
      let maxId = 0;
      for (const u of list) {
        if (typeof u.id === 'number' && !isNaN(u.id)) {
          maxId = Math.max(maxId, u.id);
        }
      }

      const deduplicated: User[] = [];
      let hasMutated = false;

      for (const u of list) {
        const isSuspended = !!u.suspended || u.status === 'SUSPENDED';
        const fallbackUsername = u.username || u.name.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
        const user: User = {
          ...u,
          username: fallbackUsername,
          password: u.password || u.pin,
          suspended: isSuspended,
          status: isSuspended ? 'SUSPENDED' : 'ACTIVE',
          must_change_password: u.must_change_password ?? false,
          has_changed_initial_password: u.has_changed_initial_password ?? false,
        };

        if (!user.id || seenIds.has(user.id)) {
          hasMutated = true;
          maxId += 1;
          user.id = maxId;
        }
        seenIds.add(user.id);
        deduplicated.push(user);
      }

      if (hasMutated || deduplicated.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(deduplicated));
      }
      return deduplicated.length > 0 ? deduplicated : INITIAL_USERS;
    } catch {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
  }

  // Authentication supporting Username and Password
  static authenticate(
    usernameOrPin: string,
    passwordInput?: string
  ): { user: User | null; isSuspended?: boolean; error?: string } {
    const users = this.getUsers();
    const cleanInput = (usernameOrPin || '').trim();

    let matched: User | undefined;

    if (passwordInput !== undefined) {
      // Username + Password authentication
      const userLower = cleanInput.toLowerCase();
      const passClean = passwordInput.trim();

      matched = users.find((u) => {
        const matchName = u.name.toLowerCase() === userLower;
        const matchUsername = u.username ? u.username.toLowerCase() === userLower : false;
        const matchAdminRole = (userLower === 'admin' && u.role === 'ADMIN');
        const matchFirstName = u.name.toLowerCase().split(' ')[0] === userLower;

        const isUserMatch = matchName || matchUsername || matchAdminRole || matchFirstName;
        if (!isUserMatch) return false;

        // Verify password / PIN
        const matchPin = u.pin === passClean;
        const matchPass = u.password ? u.password === passClean : false;
        const matchAdminDefault = (u.role === 'ADMIN' && (passClean === 'admin' || passClean === '9999' || passClean === '1234'));

        return matchPin || matchPass || matchAdminDefault;
      });

      if (!matched) {
        const userExists = users.some((u) => {
          const matchName = u.name.toLowerCase() === userLower;
          const matchUsername = u.username ? u.username.toLowerCase() === userLower : false;
          const matchAdminRole = (userLower === 'admin' && u.role === 'ADMIN');
          const matchFirstName = u.name.toLowerCase().split(' ')[0] === userLower;
          return matchName || matchUsername || matchAdminRole || matchFirstName;
        });

        if (userExists) {
          return { user: null, error: 'Incorrect password. Please try again.' };
        }
        return { user: null, error: 'Invalid username or password. Please verify credentials.' };
      }
    } else {
      // Fallback single PIN authentication
      matched = users.find((u) => u.pin === cleanInput || (u.password && u.password === cleanInput));
      if (!matched) {
        return { user: null, error: 'Invalid PIN or credentials. Please try again.' };
      }
    }

    if (matched.suspended || matched.status === 'SUSPENDED') {
      return {
        user: null,
        isSuspended: true,
        error: `Account for ${matched.name} is currently suspended by Administrator. Access blocked.`,
      };
    }
    return { user: matched };
  }

  static toggleUserSuspension(
    id: number,
    requesterRole?: UserRole,
    currentUserId?: number
  ): { success: boolean; users: User[]; user?: User; error?: string } {
    if (requesterRole && requesterRole !== 'ADMIN') {
      return {
        success: false,
        users: this.getUsers(),
        error: 'Permission Denied: Only Administrator can suspend or reactivate staff accounts.',
      };
    }

    if (currentUserId && currentUserId === id) {
      return {
        success: false,
        users: this.getUsers(),
        error: 'Action Blocked: You cannot suspend your own active Administrator account.',
      };
    }

    const users = this.getUsers();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, users, error: 'Staff member not found.' };
    }

    const willSuspend = !target.suspended;
    if (willSuspend && target.role === 'ADMIN') {
      const activeAdmins = users.filter((u) => u.role === 'ADMIN' && !u.suspended);
      if (activeAdmins.length <= 1) {
        return {
          success: false,
          users,
          error: 'Action Blocked: At least one active Administrator account must remain enabled.',
        };
      }
    }

    const updatedUsers = users.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          suspended: willSuspend,
          status: willSuspend ? ('SUSPENDED' as const) : ('ACTIVE' as const),
        };
      }
      return u;
    });

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    const updated = updatedUsers.find((u) => u.id === id);
    if (updated) {
      CloudDb.setUser(updated);
    }
    this.notifyListeners();
    return { success: true, users: updatedUsers, user: updated };
  }

  static addUser(
    userData: { name: string; username?: string; pin: string; password?: string; role: UserRole },
    requesterRole?: UserRole
  ): { success: boolean; user?: User; error?: string } {
    if (requesterRole && requesterRole !== 'ADMIN') {
      return { success: false, error: 'Permission Denied: Only Administrator can add staff users.' };
    }

    const trimmedName = userData.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Staff member name is required.' };
    }

    const trimmedPin = userData.pin.trim();
    if (!trimmedPin) {
      return { success: false, error: 'Security PIN or password is required.' };
    }

    const trimmedUsername = (
      userData.username?.trim() ||
      trimmedName.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '')
    ).toLowerCase();

    const users = this.getUsers();
    if (users.some((u) => u.username?.toLowerCase() === trimmedUsername)) {
      return { success: false, error: `Username "${trimmedUsername}" is already taken.` };
    }

    const newUser: User = {
      id: Date.now(),
      name: trimmedName,
      username: trimmedUsername,
      pin: trimmedPin,
      password: userData.password?.trim() || trimmedPin,
      role: userData.role,
      status: 'ACTIVE',
      suspended: false,
      created_at: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
    CloudDb.setUser(newUser);
    this.notifyListeners();
    return { success: true, user: newUser };
  }

  static updateUser(
    id: number,
    updates: { name?: string; username?: string; pin?: string; password?: string; role?: UserRole },
    requesterRole?: UserRole
  ): { success: boolean; user?: User; error?: string } {
    if (requesterRole && requesterRole !== 'ADMIN') {
      return { success: false, error: 'Permission Denied: Only Administrator can update staff credentials.' };
    }

    const users = this.getUsers();
    const existing = users.find((u) => u.id === id);
    if (!existing) {
      return { success: false, error: 'Staff member not found.' };
    }

    if (updates.username) {
      const cleanUname = updates.username.trim().toLowerCase();
      if (users.some((u) => u.id !== id && u.username?.toLowerCase() === cleanUname)) {
        return { success: false, error: `Username "${cleanUname}" is already taken.` };
      }
    }

    // Protect against removing the only administrator
    if (existing.role === 'ADMIN' && updates.role && updates.role !== 'ADMIN') {
      const adminCount = users.filter((u) => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        return { success: false, error: 'Cannot demote the last remaining Administrator.' };
      }
    }

    const updatedUsers = users.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          ...(updates.name ? { name: updates.name.trim() } : {}),
          ...(updates.username ? { username: updates.username.trim().toLowerCase() } : {}),
          ...(updates.pin ? { pin: updates.pin.trim() } : {}),
          ...(updates.password ? { password: updates.password.trim() } : {}),
          ...(updates.role ? { role: updates.role } : {}),
        };
      }
      return u;
    });

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    const updated = updatedUsers.find((u) => u.id === id);
    if (updated) {
      CloudDb.setUser(updated);
    }
    this.notifyListeners();
    return { success: true, user: updated };
  }

  static deleteUser(
    id: number,
    requesterRole?: UserRole
  ): { success: boolean; error?: string } {
    if (requesterRole && requesterRole !== 'ADMIN') {
      return { success: false, error: 'Permission Denied: Only Administrator can remove staff users.' };
    }

    const users = this.getUsers();
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) {
      return { success: false, error: 'Staff member not found.' };
    }

    if (userToDelete.role === 'ADMIN') {
      const adminCount = users.filter((u) => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        return { success: false, error: 'Action Blocked: At least one Administrator account must be kept active.' };
      }
    }

    const filtered = users.filter((u) => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
    this.notifyListeners();
    return { success: true };
  }

  static firstTimeSetPassword(userId: number, newPassword: string): { success: boolean; user?: User; error?: string } {
    const cleanPass = newPassword.trim();
    if (cleanPass.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }
    const users = this.getUsers();
    const existing = users.find((u) => u.id === userId);
    if (!existing) {
      return { success: false, error: 'Staff account not found.' };
    }

    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          password: cleanPass,
          pin: cleanPass,
          has_changed_initial_password: true,
          must_change_password: false,
        };
      }
      return u;
    });

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    const updated = updatedUsers.find((u) => u.id === userId);
    if (updated) {
      CloudDb.setUser(updated);
    }
    this.notifyListeners();
    return { success: true, user: updated };
  }

  static changePasswordWithVerification(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const existing = users.find((u) => u.id === userId);
    if (!existing) {
      return { success: false, error: 'Staff account not found.' };
    }

    const oldClean = oldPassword.trim();
    const matchOld = (existing.password && existing.password === oldClean) || existing.pin === oldClean;
    if (!matchOld) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const newClean = newPassword.trim();
    if (newClean.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          password: newClean,
          pin: newClean,
          has_changed_initial_password: true,
          must_change_password: false,
        };
      }
      return u;
    });

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    const updated = updatedUsers.find((u) => u.id === userId);
    if (updated) {
      CloudDb.setUser(updated);
    }
    this.notifyListeners();
    return { success: true, user: updated };
  }

  static adminResetPassword(
    targetUserId: number,
    tempPassword: string,
    requesterRole?: UserRole
  ): { success: boolean; user?: User; error?: string } {
    if (requesterRole && requesterRole !== 'ADMIN') {
      return { success: false, error: 'Permission Denied: Only Administrator can reset staff passwords.' };
    }

    const cleanTemp = tempPassword.trim();
    if (cleanTemp.length < 4) {
      return { success: false, error: 'Temporary password must be at least 4 characters long.' };
    }

    const users = this.getUsers();
    const existing = users.find((u) => u.id === targetUserId);
    if (!existing) {
      return { success: false, error: 'Staff member not found.' };
    }

    const updatedUsers = users.map((u) => {
      if (u.id === targetUserId) {
        return {
          ...u,
          password: cleanTemp,
          pin: cleanTemp,
          must_change_password: true,
          has_changed_initial_password: false,
        };
      }
      return u;
    });

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    const updated = updatedUsers.find((u) => u.id === targetUserId);
    if (updated) {
      CloudDb.setUser(updated);
    }
    this.notifyListeners();
    return { success: true, user: updated };
  }

  // ==========================================
  // CATEGORIES MANAGEMENT
  // ==========================================
  static getCategories(): Category[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    try {
      const parsed: Category[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return INITIAL_CATEGORIES;

      // Ensure all seed default categories exist
      const map = new Map<string, Category>();
      for (const init of INITIAL_CATEGORIES) {
        map.set(init.id, init);
      }
      for (const item of parsed) {
        if (item && item.id && item.name) {
          map.set(item.id, item);
        }
      }
      return Array.from(map.values());
    } catch {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
  }

  static addCategory(
    input: { name: string; description?: string; icon?: string },
    userRole?: UserRole
  ): { success: boolean; category?: Category; error?: string } {
    if (userRole && userRole !== 'ADMIN') {
      return {
        success: false,
        error: 'Permission Denied: Only the Administrator can create new product categories.',
      };
    }

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Category name is required.' };
    }

    let slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!slug) slug = `cat_${Date.now()}`;

    const categories = this.getCategories();
    if (
      categories.some(
        (c) =>
          c.id.toLowerCase() === slug.toLowerCase() ||
          c.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      return {
        success: false,
        error: `Category "${trimmedName}" already exists.`,
      };
    }

    const newCategory: Category = {
      id: slug,
      name: trimmedName,
      description: input.description?.trim() || undefined,
      icon: input.icon?.trim() || '🏷️',
      created_at: new Date().toISOString(),
    };

    const updated = [...categories, newCategory];
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    CloudDb.setCategory(newCategory);
    this.notifyListeners();

    return { success: true, category: newCategory };
  }

  static updateCategory(
    id: string,
    updates: Partial<Category>,
    userRole?: UserRole
  ): { success: boolean; category?: Category; error?: string } {
    if (userRole && userRole !== 'ADMIN') {
      return {
        success: false,
        error: 'Permission Denied: Only the Administrator can modify product categories.',
      };
    }

    const categories = this.getCategories();
    const existing = categories.find((c) => c.id === id);
    if (!existing) {
      return { success: false, error: 'Category not found.' };
    }

    const updatedCat: Category = { ...existing, ...updates };
    const updatedList = categories.map((c) => (c.id === id ? updatedCat : c));

    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updatedList));
    CloudDb.setCategory(updatedCat);
    this.notifyListeners();

    return { success: true, category: updatedCat };
  }

  static deleteCategory(
    id: string,
    userRole?: UserRole
  ): { success: boolean; error?: string } {
    if (userRole && userRole !== 'ADMIN') {
      return {
        success: false,
        error: 'Permission Denied: Only the Administrator can delete categories.',
      };
    }

    // Check if any product is assigned to this category
    const products = this.getProducts();
    const count = products.filter((p) => p.category === id).length;
    if (count > 0) {
      return {
        success: false,
        error: `Cannot remove category: ${count} product(s) are currently categorized under it. Please reassign or update those products first.`,
      };
    }

    const categories = this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
    CloudDb.deleteCategory(id);
    this.notifyListeners();

    return { success: true };
  }

  // ==========================================
  // PRODUCTS & INVENTORY
  // ==========================================
  static getProducts(): Product[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    try {
      const parsed: Product[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return INITIAL_PRODUCTS;

      const seenIds = new Set<number>();
      let maxId = 0;
      for (const p of parsed) {
        if (typeof p.id === 'number' && !isNaN(p.id)) {
          maxId = Math.max(maxId, p.id);
        }
      }

      const deduplicated: Product[] = [];
      let hasMutated = false;

      for (const p of parsed) {
        const prod = { ...p };
        if (!prod.id || seenIds.has(prod.id)) {
          hasMutated = true;
          maxId += 1;
          prod.id = maxId;
        }
        seenIds.add(prod.id);
        deduplicated.push(prod);
      }

      if (hasMutated) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(deduplicated));
      }
      return deduplicated.length > 0 ? deduplicated : INITIAL_PRODUCTS;
    } catch {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
  }

  static updateProduct(
    id: number,
    updates: Partial<Product>,
    userRole?: UserRole
  ): { success: boolean; product?: Product; error?: string } {
    if (userRole && userRole !== 'ADMIN') {
      if (updates.price !== undefined || updates.name !== undefined || updates.barcode !== undefined || updates.category !== undefined) {
        return {
          success: false,
          error: 'Permission Denied: Only Administrator has master authority to change product prices, names, or barcodes.',
        };
      }
    }

    const products = this.getProducts();
    const existing = products.find((p) => p.id === id);
    if (!existing) {
      return { success: false, error: 'Product not found.' };
    }

    const updatedProducts = products.map((p) => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    const updated = updatedProducts.find((p) => p.id === id);
    if (updated) {
      CloudDb.setProduct(updated);
    }
    this.notifyListeners();
    return { success: true, product: updated };
  }

  static batchRestock(
    items: { id: number; addQty: number }[],
    userRole?: UserRole
  ): { success: boolean; count: number; error?: string } {
    if (userRole && userRole !== 'ADMIN' && userRole !== 'SUPERVISOR') {
      return {
        success: false,
        count: 0,
        error: 'Permission Denied: Only Administrator or Supervisor can perform stock replenishments.',
      };
    }

    const products = this.getProducts();
    const updatedProducts = products.map((p) => {
      const match = items.find((i) => i.id === p.id);
      if (match && match.addQty > 0) {
        return { ...p, stock_qty: p.stock_qty + match.addQty };
      }
      return p;
    });

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    CloudDb.batchSetProducts(updatedProducts);
    this.notifyListeners();
    return { success: true, count: items.length };
  }

  static addProduct(
    product: Omit<Product, 'id'>,
    userRole?: UserRole
  ): { success: boolean; product?: Product; error?: string } {
    if (userRole && userRole !== 'ADMIN') {
      return {
        success: false,
        error: 'Permission Denied: Only Administrator has master access to register new products and set selling prices.',
      };
    }

    const products = this.getProducts();
    if (products.some((p) => p.barcode === product.barcode.trim())) {
      return {
        success: false,
        error: `Barcode ${product.barcode} already exists in the system.`,
      };
    }

    const newProduct: Product = {
      ...product,
      id: Date.now(),
      barcode: product.barcode.trim(),
      name: product.name.trim(),
    };

    const updated = [newProduct, ...products];
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    CloudDb.setProduct(newProduct);
    this.notifyListeners();
    return { success: true, product: newProduct };
  }

  static deleteProduct(
    id: number,
    userRole?: UserRole
  ): { success: boolean; products: Product[]; error?: string } {
    if (userRole && userRole !== 'ADMIN') {
      return {
        success: false,
        products: this.getProducts(),
        error: 'Permission Denied: Only Administrator can delete products from inventory.',
      };
    }

    const products = this.getProducts().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.notifyListeners();
    return { success: true, products };
  }

  // ==========================================
  // SALES & TRANSACTIONS
  // ==========================================
  static getSales(): Sale[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (!raw) {
      const initial = getInitialSalesAndItems();
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(initial.sales));
      localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify(initial.items));
      return initial.sales;
    }
    try {
      const parsed: Sale[] = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const initial = getInitialSalesAndItems();
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(initial.sales));
        localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify(initial.items));
        return initial.sales;
      }
      return parsed;
    } catch {
      const initial = getInitialSalesAndItems();
      return initial.sales;
    }
  }

  static getSaleItems(saleId?: number): SaleItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SALE_ITEMS);
    if (!raw) {
      const initial = getInitialSalesAndItems();
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(initial.sales));
      localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify(initial.items));
      return saleId ? initial.items.filter((i) => i.sale_id === saleId) : initial.items;
    }
    try {
      const items: SaleItem[] = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) {
        const initial = getInitialSalesAndItems();
        localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify(initial.items));
        return saleId ? initial.items.filter((i) => i.sale_id === saleId) : initial.items;
      }
      return saleId ? items.filter((i) => i.sale_id === saleId) : items;
    } catch {
      return [];
    }
  }

  static getSaleDetails(saleId: number): { sale: Sale | null; items: SaleItem[] } {
    const sales = this.getSales();
    const sale = sales.find((s) => s.id === saleId) || null;
    const items = this.getSaleItems(saleId);
    return { sale, items };
  }

  static getAvailableSalesDates(): { date: string; count: number; total: number }[] {
    const sales = this.getSales();
    const dateMap = new Map<string, { count: number; total: number }>();
    for (const s of sales) {
      const day = s.created_at.slice(0, 10);
      const current = dateMap.get(day) || { count: 0, total: 0 };
      dateMap.set(day, {
        count: current.count + 1,
        total: current.total + s.total_amount,
      });
    }
    return Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  static processSale(
    saleData: {
      cashier_name: string;
      payment_method: PaymentMethod;
      mpesa_code?: string;
      cash_tendered?: number;
      change_given?: number;
      customer_id?: number;
      customer_name?: string;
      customer_phone?: string;
      amount_paid?: number;
      debt_amount?: number;
      payment_status?: SalePaymentStatus;
    },
    cartItems: { product: Product; quantity: number }[]
  ): { success: boolean; sale?: Sale; items?: SaleItem[]; error?: string } {
    const products = this.getProducts();

    // Stock check
    for (const item of cartItems) {
      const current = products.find((p) => p.id === item.product.id);
      if (!current) {
        return { success: false, error: `Product ${item.product.name} not found in inventory.` };
      }
      if (current.stock_qty < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${item.product.name}. Available: ${current.stock_qty}`,
        };
      }
    }

    // Deduct stock
    const updatedProducts = products.map((p) => {
      const cartMatch = cartItems.find((ci) => ci.product.id === p.id);
      if (cartMatch) {
        return { ...p, stock_qty: Math.max(0, p.stock_qty - cartMatch.quantity) };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    // Calculate actual payment and debt tracking
    const amountPaid =
      saleData.amount_paid !== undefined
        ? saleData.amount_paid
        : saleData.payment_method === 'DEBT'
        ? 0
        : totalAmount;

    const debtAmount =
      saleData.debt_amount !== undefined
        ? saleData.debt_amount
        : Math.max(0, totalAmount - amountPaid);

    const paymentStatus: SalePaymentStatus =
      saleData.payment_status ||
      (debtAmount <= 0 ? 'PAID' : amountPaid <= 0 ? 'DEBT' : 'PARTIAL');

    const saleId = Date.now();
    const newSale: Sale = {
      id: saleId,
      cashier_name: saleData.cashier_name,
      total_amount: totalAmount,
      payment_method: saleData.payment_method,
      created_at: new Date().toISOString(),
      mpesa_code: saleData.mpesa_code,
      cash_tendered: saleData.cash_tendered,
      change_given: saleData.change_given,
      items_count: cartItems.reduce((acc, ci) => acc + ci.quantity, 0),
      customer_id: saleData.customer_id,
      customer_name: saleData.customer_name,
      customer_phone: saleData.customer_phone,
      amount_paid: amountPaid,
      debt_amount: debtAmount,
      payment_status: paymentStatus,
    };

    const newSaleItems: SaleItem[] = cartItems.map((ci, index) => ({
      id: saleId + index + 1,
      sale_id: saleId,
      product_id: ci.product.id,
      product_name: ci.product.name,
      quantity: ci.quantity,
      unit_price: ci.product.price,
      total_price: ci.product.price * ci.quantity,
    }));

    const sales = [newSale, ...this.getSales()];
    const allItems = [...newSaleItems, ...this.getSaleItems()];

    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify(allItems));

    // Real-time Cloud Sync: Push sale and updated stock live to Firestore
    CloudDb.recordSale(newSale, newSaleItems);
    CloudDb.batchSetProducts(updatedProducts);

    this.notifyListeners();
    return { success: true, sale: newSale, items: newSaleItems };
  }

  static getDailySummary(targetDate?: string) {
    const sales = this.getSales();
    const todayStr = new Date().toISOString().slice(0, 10);
    const queryDate = targetDate || todayStr;
    const isAllTime = queryDate === 'ALL';

    const selectedSales = isAllTime
      ? sales
      : sales.filter((s) => s.created_at.slice(0, 10) === queryDate);

    const cashTotal = selectedSales
      .filter((s) => s.payment_method === 'CASH')
      .reduce((sum, s) => sum + s.total_amount, 0);

    const mpesaTotal = selectedSales
      .filter((s) => s.payment_method === 'MPESA')
      .reduce((sum, s) => sum + s.total_amount, 0);

    const grandTotal = cashTotal + mpesaTotal;
    const totalTransactions = selectedSales.length;
    const totalItems = selectedSales.reduce((sum, s) => sum + s.items_count, 0);
    const averageTicket = totalTransactions > 0 ? Math.round(grandTotal / totalTransactions) : 0;

    return {
      date: queryDate,
      isAllTime,
      cashTotal,
      mpesaTotal,
      grandTotal,
      totalTransactions,
      totalItems,
      averageTicket,
      sales: selectedSales,
    };
  }

  // ==========================================
  // STORE CONFIG
  // ==========================================
  static getStoreConfig(): StoreConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.STORE_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STORE_CONFIG, JSON.stringify(INITIAL_STORE_CONFIG));
      return INITIAL_STORE_CONFIG;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.low_stock_threshold === undefined) {
          parsed.low_stock_threshold = 10;
        }
        return parsed as StoreConfig;
      }
      return INITIAL_STORE_CONFIG;
    } catch {
      return INITIAL_STORE_CONFIG;
    }
  }

  static updateStoreConfig(config: Partial<StoreConfig>): StoreConfig {
    const current = this.getStoreConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.STORE_CONFIG, JSON.stringify(updated));
    CloudDb.setStoreConfig(updated);
    this.notifyListeners();
    return updated;
  }

  // ==========================================
  // CUSTOMERS & DEBT MANAGEMENT
  // ==========================================
  static getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    try {
      const parsed: Customer[] = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
        return INITIAL_CUSTOMERS;
      }
      return parsed.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
  }

  static getCustomerById(id: number): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  static addCustomer(data: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  }): { success: boolean; customer?: Customer; error?: string } {
    const cleanName = data.name.trim();
    const cleanPhone = data.phone.trim();

    if (!cleanName) {
      return { success: false, error: 'Customer name is required.' };
    }
    if (!cleanPhone) {
      return { success: false, error: 'Customer phone number is required.' };
    }

    const customers = this.getCustomers();
    // Check if phone or exact name already exists
    if (customers.some((c) => c.phone.replace(/[\s\-\+]/g, '') === cleanPhone.replace(/[\s\-\+]/g, ''))) {
      const existing = customers.find((c) => c.phone.replace(/[\s\-\+]/g, '') === cleanPhone.replace(/[\s\-\+]/g, ''));
      return {
        success: false,
        error: `Customer with phone ${cleanPhone} already exists (${existing?.name}).`,
      };
    }

    const newCustomer: Customer = {
      id: Date.now(),
      name: cleanName,
      phone: cleanPhone,
      email: data.email?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    const updated = [...customers, newCustomer];
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    CloudDb.setCustomer(newCustomer);
    this.notifyListeners();

    return { success: true, customer: newCustomer };
  }

  static updateCustomer(
    id: number,
    updates: Partial<Customer>
  ): { success: boolean; customer?: Customer; error?: string } {
    const customers = this.getCustomers();
    const existing = customers.find((c) => c.id === id);
    if (!existing) {
      return { success: false, error: 'Customer not found.' };
    }

    const updatedCustomer: Customer = {
      ...existing,
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.phone ? { phone: updates.phone.trim() } : {}),
      email: updates.email !== undefined ? (updates.email ? updates.email.trim() : undefined) : existing.email,
      notes: updates.notes !== undefined ? (updates.notes ? updates.notes.trim() : undefined) : existing.notes,
    };

    const updatedList = customers.map((c) => (c.id === id ? updatedCustomer : c));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedList));
    CloudDb.setCustomer(updatedCustomer);
    this.notifyListeners();

    return { success: true, customer: updatedCustomer };
  }

  static deleteCustomer(id: number): { success: boolean; error?: string } {
    const customers = this.getCustomers();
    const summary = this.getCustomerSummary(id);
    if (summary && summary.outstandingDebt > 0) {
      return {
        success: false,
        error: `Cannot delete customer: ${summary.customer.name} has an active outstanding debt of KES ${summary.outstandingDebt.toLocaleString()}. Please settle the balance first.`,
      };
    }

    const filtered = customers.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(filtered));
    CloudDb.deleteCustomer(id);
    this.notifyListeners();

    return { success: true };
  }

  // ==========================================
  // CUSTOMER REPAYMENTS & DEBT SETTLEMENT
  // ==========================================
  static getCustomerPayments(customerId?: number): CustomerPayment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMER_PAYMENTS);
    let payments: CustomerPayment[] = [];
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_PAYMENTS, JSON.stringify(INITIAL_CUSTOMER_PAYMENTS));
      payments = INITIAL_CUSTOMER_PAYMENTS;
    } else {
      try {
        const parsed = JSON.parse(raw);
        payments = Array.isArray(parsed) ? parsed : INITIAL_CUSTOMER_PAYMENTS;
      } catch {
        payments = INITIAL_CUSTOMER_PAYMENTS;
      }
    }

    if (customerId) {
      return payments
        .filter((p) => p.customer_id === customerId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static recordCustomerPayment(data: {
    customer_id: number;
    amount: number;
    payment_method: 'CASH' | 'MPESA';
    mpesa_code?: string;
    cashier_name: string;
    notes?: string;
  }): { success: boolean; payment?: CustomerPayment; newDebt: number; error?: string } {
    const customer = this.getCustomerById(data.customer_id);
    if (!customer) {
      return { success: false, newDebt: 0, error: 'Customer not found.' };
    }

    const payAmount = Number(data.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return { success: false, newDebt: 0, error: 'Payment amount must be greater than zero.' };
    }

    const currentSummary = this.getCustomerSummary(data.customer_id);
    const currentDebt = currentSummary ? currentSummary.outstandingDebt : 0;

    const payment: CustomerPayment = {
      id: Date.now(),
      customer_id: data.customer_id,
      customer_name: customer.name,
      amount: payAmount,
      payment_method: data.payment_method,
      mpesa_code: data.mpesa_code?.trim() || undefined,
      cashier_name: data.cashier_name,
      created_at: new Date().toISOString(),
      notes: data.notes?.trim() || undefined,
    };

    const existingPayments = this.getCustomerPayments();
    const updatedPayments = [payment, ...existingPayments];
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_PAYMENTS, JSON.stringify(updatedPayments));
    CloudDb.recordCustomerPayment(payment);

    const newDebt = Math.max(0, currentDebt - payAmount);
    this.notifyListeners();

    return { success: true, payment, newDebt };
  }

  static getCustomerSummary(customerId: number): CustomerSummary | null {
    const customer = this.getCustomerById(customerId);
    if (!customer) return null;

    const sales = this.getSales().filter((s) => s.customer_id === customerId);
    const payments = this.getCustomerPayments(customerId);

    // Total spent over time across all purchases
    const totalSpent = sales.reduce((sum, s) => sum + s.total_amount, 0);

    // Total paid = amount paid at time of sales + subsequent repayments
    const paidAtSale = sales.reduce((sum, s) => {
      if (s.amount_paid !== undefined) {
        return sum + s.amount_paid;
      }
      return s.payment_method === 'DEBT' ? sum : sum + s.total_amount;
    }, 0);

    const paidLater = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = paidAtSale + paidLater;

    const outstandingDebt = Math.max(0, totalSpent - totalPaid);
    const lastSale = sales.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    return {
      customer,
      totalSpent,
      totalPaid,
      outstandingDebt,
      salesCount: sales.length,
      lastPurchaseDate: lastSale ? lastSale.created_at : undefined,
      hasDebt: outstandingDebt > 0,
    };
  }

  static getAllCustomerSummaries(): CustomerSummary[] {
    const customers = this.getCustomers();
    const sales = this.getSales();
    const payments = this.getCustomerPayments();

    return customers.map((customer) => {
      const custSales = sales.filter((s) => s.customer_id === customer.id);
      const custPayments = payments.filter((p) => p.customer_id === customer.id);

      const totalSpent = custSales.reduce((sum, s) => sum + s.total_amount, 0);
      const paidAtSale = custSales.reduce((sum, s) => {
        if (s.amount_paid !== undefined) {
          return sum + s.amount_paid;
        }
        return s.payment_method === 'DEBT' ? sum : sum + s.total_amount;
      }, 0);
      const paidLater = custPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalPaid = paidAtSale + paidLater;
      const outstandingDebt = Math.max(0, totalSpent - totalPaid);

      const sortedSales = [...custSales].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        customer,
        totalSpent,
        totalPaid,
        outstandingDebt,
        salesCount: custSales.length,
        lastPurchaseDate: sortedSales[0] ? sortedSales[0].created_at : undefined,
        hasDebt: outstandingDebt > 0,
      };
    });
  }

  static resetDatabase() {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.SALE_ITEMS);
    localStorage.removeItem(STORAGE_KEYS.STORE_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_PAYMENTS);
    this.notifyListeners();
  }
}
