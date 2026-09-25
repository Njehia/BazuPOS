import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
  deleteDoc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import configData from '../../firebase-applet-config.json';
import { Category, Customer, CustomerPayment, Product, Requisition, Sale, SaleItem, StoreConfig, User } from '../types';

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

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the specific database with modern persistent local cache
const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    databaseId
  );
} catch (e1) {
  try {
    firestoreInstance = getFirestore(app, databaseId);
  } catch (e2) {
    try {
      firestoreInstance = getFirestore(app);
    } catch (e3) {
      console.warn('Fallback default firestore instance:', e3);
      firestoreInstance = getFirestore();
    }
  }
}

export const db = firestoreInstance;

// Test connection on boot according to skill specifications
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system_test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline: persistent cache is active.');
    }
    return false;
  }
}

// ==========================================
// ERROR HANDLING CONTRACT (FIREBASE SKILL)
// ==========================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  REQUISITIONS: 'requisitions',
  SHIFTS: 'shifts',
};

// ==========================================
// MULTI-STORE & MULTI-TENANT ISOLATION
// ==========================================
export function getActiveStoreId(): string {
  try {
    const explicit = localStorage.getItem('bazu_pos_active_store_id');
    if (explicit && explicit.trim()) {
      return explicit.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    }
    const rawConfig = localStorage.getItem('bazu_pos_store_config');
    if (rawConfig) {
      const cfg = JSON.parse(rawConfig);
      if (cfg.store_id && cfg.store_id.trim()) {
        return cfg.store_id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      }
      if (cfg.store_name && cfg.store_name.trim()) {
        const slug = cfg.store_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (slug) return slug;
      }
    }
  } catch {
    // fallback
  }
  return 'store_main';
}

export function setActiveStoreId(newStoreId: string): void {
  const clean = newStoreId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'store_main';
  localStorage.setItem('bazu_pos_active_store_id', clean);
}

// Active Tenant ID for SaaS Multi-Tenant architecture: tenants/{tenantId}
export function getActiveTenantId(): string {
  try {
    const tenant = localStorage.getItem('bazu_pos_active_tenant_id');
    if (tenant && tenant.trim()) {
      return tenant.trim();
    }
  } catch {
    // fallback
  }
  return 'tenant_bazu_hq';
}

export function setActiveTenantId(tenantId: string): void {
  localStorage.setItem('bazu_pos_active_tenant_id', tenantId.trim());
}

export function getTenantColRef(colName: string) {
  const tenantId = getActiveTenantId();
  return collection(db, 'tenants', tenantId, colName);
}

export function getTenantDocRef(colName: string, docId: string) {
  const tenantId = getActiveTenantId();
  return doc(db, 'tenants', tenantId, colName, String(docId));
}

export function getStoreColRef(colName: string) {
  const storeId = getActiveStoreId();
  return collection(db, 'stores', storeId, colName);
}

export function getStoreDocRef(colName: string, docId: string) {
  const storeId = getActiveStoreId();
  return doc(db, 'stores', storeId, colName, String(docId));
}

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
// REAL-TIME FIRESTORE REPOSITORIES (STORE ISOLATED)
// ==========================================
export class CloudDb {
  static async setProduct(product: Product): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.PRODUCTS, String(product.id));
      await setDoc(
        ref,
        {
          ...product,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setProduct fallback/error:', err);
    }
  }

  static async batchSetProducts(products: Product[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const p of products) {
        const ref = getStoreDocRef(COLLECTIONS.PRODUCTS, String(p.id));
        batch.set(
          ref,
          {
            ...p,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetProducts error:', err);
    }
  }

  static async deleteProduct(productId: number): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.PRODUCTS, String(productId));
      await deleteDoc(ref);
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.deleteProduct error:', err);
    }
  }

  static onProductsSnapshot(callback: (products: Product[]) => void): () => void {
    const colRef = getStoreColRef(COLLECTIONS.PRODUCTS);
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

  static async recordSale(sale: Sale, items: SaleItem[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      const saleRef = getStoreDocRef(COLLECTIONS.SALES, String(sale.id));
      batch.set(saleRef, {
        ...sale,
        created_at: sale.created_at || new Date().toISOString(),
      });

      for (const item of items) {
        const itemRef = getStoreDocRef(COLLECTIONS.SALE_ITEMS, String(item.id));
        batch.set(itemRef, item);
      }

      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.recordSale error:', err);
    }
  }

  static onSalesSnapshot(callback: (sales: Sale[]) => void): () => void {
    const colRef = getStoreColRef(COLLECTIONS.SALES);
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

  static onSaleItemsSnapshot(callback: (items: SaleItem[]) => void): () => void {
    const colRef = getStoreColRef(COLLECTIONS.SALE_ITEMS);
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

  static async setUser(user: User): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.USERS, String(user.id));
      await setDoc(ref, user, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setUser error:', err);
    }
  }

  static async batchSetUsers(users: User[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const u of users) {
        const ref = getStoreDocRef(COLLECTIONS.USERS, String(u.id));
        batch.set(ref, u, { merge: true });
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetUsers error:', err);
    }
  }

  static async deleteUser(userId: number): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.USERS, String(userId));
      await deleteDoc(ref);
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.deleteUser error:', err);
    }
  }

  static onUsersSnapshot(callback: (users: User[]) => void): () => void {
    const colRef = getStoreColRef(COLLECTIONS.USERS);
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

  static async setStoreConfig(config: StoreConfig): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.STORE_CONFIG, 'main_config');
      await setDoc(ref, config, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setStoreConfig error:', err);
    }
  }

  static onStoreConfigSnapshot(callback: (config: StoreConfig) => void): () => void {
    const ref = getStoreDocRef(COLLECTIONS.STORE_CONFIG, 'main_config');
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

  static async setCategory(category: Category): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.CATEGORIES, category.id);
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
        const ref = getStoreDocRef(COLLECTIONS.CATEGORIES, cat.id);
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
      const ref = getStoreDocRef(COLLECTIONS.CATEGORIES, categoryId);
      await deleteDoc(ref);
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.deleteCategory error:', err);
    }
  }

  static onCategoriesSnapshot(callback: (categories: Category[]) => void): () => void {
    const colRef = getStoreColRef(COLLECTIONS.CATEGORIES);
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

  static async setCustomer(customer: Customer): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.CUSTOMERS, String(customer.id));
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
        const ref = getStoreDocRef(COLLECTIONS.CUSTOMERS, String(c.id));
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
      const ref = getStoreDocRef(COLLECTIONS.CUSTOMERS, String(customerId));
      await deleteDoc(ref);
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.deleteCustomer error:', err);
    }
  }

  static onCustomersSnapshot(callback: (customers: Customer[]) => void): () => void {
    const colRef = getStoreColRef(COLLECTIONS.CUSTOMERS);
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

  static async recordCustomerPayment(payment: CustomerPayment): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.CUSTOMER_PAYMENTS, String(payment.id));
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
        const ref = getStoreDocRef(COLLECTIONS.CUSTOMER_PAYMENTS, String(p.id));
        batch.set(ref, p, { merge: true });
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetCustomerPayments error:', err);
    }
  }

  static onCustomerPaymentsSnapshot(callback: (payments: CustomerPayment[]) => void): () => void {
    const colRef = getStoreColRef(COLLECTIONS.CUSTOMER_PAYMENTS);
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

  static async setRequisition(req: Requisition): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.REQUISITIONS, String(req.id));
      await setDoc(ref, req, { merge: true });
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.setRequisition error:', err);
    }
  }

  static async batchSetRequisitions(requisitions: Requisition[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const r of requisitions) {
        const ref = getStoreDocRef(COLLECTIONS.REQUISITIONS, String(r.id));
        batch.set(ref, r, { merge: true });
      }
      await batch.commit();
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.batchSetRequisitions error:', err);
    }
  }

  static async deleteRequisition(reqId: string): Promise<void> {
    try {
      const ref = getStoreDocRef(COLLECTIONS.REQUISITIONS, String(reqId));
      await deleteDoc(ref);
      notifySyncStatus(true);
    } catch (err) {
      console.warn('CloudDb.deleteRequisition error:', err);
    }
  }

  static onRequisitionsSnapshot(callback: (requisitions: Requisition[]) => void): () => void {
    const colRef = getStoreColRef(COLLECTIONS.REQUISITIONS);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Requisition[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Requisition);
        });
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        notifySyncStatus(true);
        callback(list);
      },
      (error) => {
        console.warn('Live requisitions snapshot error:', error);
      }
    );
  }
}
