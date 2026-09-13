import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import configData from '../../firebase-applet-config.json';
import { Category, Customer, CustomerPayment, Product, Sale, SaleItem, StoreConfig, User } from '../types';

export const firebaseConfig = {
  projectId: configData.projectId,
  appId: configData.appId,
  apiKey: configData.apiKey,
  authDomain: configData.authDomain,
  firestoreDatabaseId: configData.firestoreDatabaseId || '(default)',
  storageBucket: configData.storageBucket,
  messagingSenderId: configData.messagingSenderId,
};

// Initialize or reuse Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific database
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined
);

// Collections
export const COLLECTIONS = {
  PRODUCTS: 'products',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  USERS: 'users',
  STORE_CONFIG: 'store_config',
  CATEGORIES: 'categories',
  CUSTOMERS: 'customers',
  CUSTOMER_PAYMENTS: 'customer_payments',
};

// Live Cloud Sync state subscribers
type SyncListener = (isLive: boolean, lastSyncTime?: Date) => void;
const syncStatusListeners: Set<SyncListener> = new Set();
let isLiveSyncActive = false;
let lastLiveSyncTime: Date | null = null;

export function subscribeSyncStatus(listener: SyncListener): () => void {
  syncStatusListeners.add(listener);
  listener(isLiveSyncActive, lastLiveSyncTime || undefined);
  return () => {
    syncStatusListeners.delete(listener);
  };
}

function notifySyncStatus(isLive: boolean) {
  isLiveSyncActive = isLive;
  if (isLive) {
    lastLiveSyncTime = new Date();
  }
  syncStatusListeners.forEach((fn) => {
    try {
      fn(isLive, lastLiveSyncTime || undefined);
    } catch {
      // ignore
    }
  });
}

// ==========================================
// REAL-TIME FIRESTORE REPOSITORIES
// ==========================================

export class CloudDb {
  // Save or update a single product
  static async setProduct(product: Product): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.PRODUCTS, String(product.id));
      await setDoc(ref, {
        ...product,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setProduct fallback/error:', err);
    }
  }

  // Batch save products (e.g. after restock or initial seed)
  static async batchSetProducts(products: Product[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const p of products) {
        const ref = doc(db, COLLECTIONS.PRODUCTS, String(p.id));
        batch.set(ref, {
          ...p,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetProducts error:', err);
    }
  }

  // Subscribe to live products collection across all devices
  static onProductsSnapshot(callback: (products: Product[]) => void): () => void {
    const colRef = collection(db, COLLECTIONS.PRODUCTS);
    const q = query(colRef);
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Product;
            list.push({
              ...data,
              id: Number(data.id),
              price: Number(data.price),
              stock_qty: Number(data.stock_qty),
            });
          });
          // Sort by name
          list.sort((a, b) => a.name.localeCompare(b.name));
          notifySyncStatus(true);
          callback(list);
        } else {
          notifySyncStatus(true);
          callback([]);
        }
      },
      (error) => {
        console.warn('Live products snapshot error:', error);
        notifySyncStatus(false);
      }
    );
  }

  // Save new Sale + SaleItems to cloud
  static async recordSale(sale: Sale, items: SaleItem[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Save sale document
      const saleRef = doc(db, COLLECTIONS.SALES, String(sale.id));
      batch.set(saleRef, {
        ...sale,
        created_at: sale.created_at || new Date().toISOString(),
      });

      // Save sale items
      for (const item of items) {
        const itemRef = doc(db, COLLECTIONS.SALE_ITEMS, String(item.id));
        batch.set(itemRef, item);
      }

      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.recordSale error:', err);
    }
  }

  // Subscribe to live sales across all terminals
  static onSalesSnapshot(callback: (sales: Sale[]) => void): () => void {
    const colRef = collection(db, COLLECTIONS.SALES);
    const q = query(colRef);
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Sale[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Sale;
          list.push({
            ...data,
            id: Number(data.id),
            total_amount: Number(data.total_amount),
            items_count: Number(data.items_count),
          });
        });
        // Sort descending by timestamp
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        notifySyncStatus(true);
        callback(list);
      },
      (error) => {
        console.warn('Live sales snapshot error:', error);
        notifySyncStatus(false);
      }
    );
  }

  // Subscribe to live sale items
  static onSaleItemsSnapshot(callback: (items: SaleItem[]) => void): () => void {
    const colRef = collection(db, COLLECTIONS.SALE_ITEMS);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: SaleItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SaleItem;
          list.push({
            ...data,
            id: Number(data.id),
            sale_id: Number(data.sale_id),
            product_id: Number(data.product_id),
            quantity: Number(data.quantity),
            unit_price: Number(data.unit_price),
            total_price: Number(data.total_price),
          });
        });
        notifySyncStatus(true);
        callback(list);
      },
      (error) => {
        console.warn('Live sale items snapshot error:', error);
      }
    );
  }

  // Set / Update User
  static async setUser(user: User): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.USERS, String(user.id));
      await setDoc(ref, user, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setUser error:', err);
    }
  }

  // Batch seed users
  static async batchSetUsers(users: User[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const u of users) {
        const ref = doc(db, COLLECTIONS.USERS, String(u.id));
        batch.set(ref, u, { merge: true });
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetUsers error:', err);
    }
  }

  // Subscribe to live users
  static onUsersSnapshot(callback: (users: User[]) => void): () => void {
    const colRef = collection(db, COLLECTIONS.USERS);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: User[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as User;
          list.push({
            ...data,
            id: Number(data.id),
            suspended: !!data.suspended || data.status === 'SUSPENDED',
            status: data.suspended || data.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
          });
        });
        list.sort((a, b) => a.id - b.id);
        notifySyncStatus(true);
        callback(list);
      },
      (error) => {
        console.warn('Live users snapshot error:', error);
      }
    );
  }

  // Store config
  static async setStoreConfig(config: StoreConfig): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.STORE_CONFIG, 'main_config');
      await setDoc(ref, config, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setStoreConfig error:', err);
    }
  }

  // Subscribe to store config
  static onStoreConfigSnapshot(callback: (config: StoreConfig) => void): () => void {
    const ref = doc(db, COLLECTIONS.STORE_CONFIG, 'main_config');
    return onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as StoreConfig;
          notifySyncStatus(true);
          callback(data);
        }
      },
      (error) => {
        console.warn('Live store config error:', error);
      }
    );
  }

  // Categories
  static async setCategory(category: Category): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.CATEGORIES, category.id);
      await setDoc(ref, category, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setCategory error:', err);
    }
  }

  static async batchSetCategories(categories: Category[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const cat of categories) {
        const ref = doc(db, COLLECTIONS.CATEGORIES, cat.id);
        batch.set(ref, cat, { merge: true });
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetCategories error:', err);
    }
  }

  static async deleteCategory(categoryId: string): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.CATEGORIES, categoryId);
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(ref);
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.deleteCategory error:', err);
    }
  }

  static onCategoriesSnapshot(callback: (categories: Category[]) => void): () => void {
    const colRef = collection(db, COLLECTIONS.CATEGORIES);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Category[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Category);
        });
        notifySyncStatus(true);
        callback(list);
      },
      (error) => {
        console.warn('Live categories snapshot error:', error);
      }
    );
  }

  // ==========================================
  // CUSTOMERS & DEBTS REAL-TIME SYNC
  // ==========================================
  static async setCustomer(customer: Customer): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.CUSTOMERS, String(customer.id));
      await setDoc(ref, customer, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setCustomer error:', err);
    }
  }

  static async batchSetCustomers(customers: Customer[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const c of customers) {
        const ref = doc(db, COLLECTIONS.CUSTOMERS, String(c.id));
        batch.set(ref, c, { merge: true });
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetCustomers error:', err);
    }
  }

  static async deleteCustomer(customerId: number): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.CUSTOMERS, String(customerId));
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(ref);
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.deleteCustomer error:', err);
    }
  }

  static onCustomersSnapshot(callback: (customers: Customer[]) => void): () => void {
    const colRef = collection(db, COLLECTIONS.CUSTOMERS);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Customer[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Customer;
          list.push({
            ...data,
            id: Number(data.id),
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        notifySyncStatus(true);
        callback(list);
      },
      (error) => {
        console.warn('Live customers snapshot error:', error);
      }
    );
  }

  // Customer debt repayments
  static async recordCustomerPayment(payment: CustomerPayment): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.CUSTOMER_PAYMENTS, String(payment.id));
      await setDoc(ref, payment, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.recordCustomerPayment error:', err);
    }
  }

  static async batchSetCustomerPayments(payments: CustomerPayment[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const p of payments) {
        const ref = doc(db, COLLECTIONS.CUSTOMER_PAYMENTS, String(p.id));
        batch.set(ref, p, { merge: true });
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetCustomerPayments error:', err);
    }
  }

  static onCustomerPaymentsSnapshot(callback: (payments: CustomerPayment[]) => void): () => void {
    const colRef = collection(db, COLLECTIONS.CUSTOMER_PAYMENTS);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: CustomerPayment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CustomerPayment;
          list.push({
            ...data,
            id: Number(data.id),
            customer_id: Number(data.customer_id),
            amount: Number(data.amount),
          });
        });
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        notifySyncStatus(true);
        callback(list);
      },
      (error) => {
        console.warn('Live customer payments snapshot error:', error);
      }
    );
  }
}
