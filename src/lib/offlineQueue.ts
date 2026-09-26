/**
 * Bazu POS Offline-First Data Layer & Asynchronous Sync Queue
 * Uses IndexedDB for reliable offline persistence with automatic online sync worker.
 */

import { Sale, SaleItem, DraftOrder } from '../types';
import { CloudDb } from './firebase';

export interface SyncQueueItem {
  id: string;
  type: 'SALE' | 'PRODUCT_RESTOCK' | 'CASH_ADJUSTMENT' | 'SHIFT_UPDATE' | 'CUSTOMER_PAYMENT';
  payload: any;
  timestamp: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED';
  retryCount: number;
  lastError?: string;
}

export interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime?: Date;
}

const DB_NAME = 'bazu_pos_offline_db';
const DB_VERSION = 2;
const QUEUE_STORE = 'sync_queue';
const DRAFT_STORE = 'draft_orders';
const BACKUP_STORE = 'system_backups';

class OfflineQueueManager {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncTime: Date | null = null;
  private listeners: Set<(status: OfflineStatus) => void> = new Set();
  private dbInitPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
        this.processQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify();
      });

      // Initialize DB and kick off initial check
      this.initDB().then(() => {
        this.checkQueueCount();
        if (this.isOnline) {
          this.processQueue();
        }
      });
    }
  }

  private async initDB(): Promise<IDBDatabase | null> {
    if (this.db) return this.db;
    if (this.dbInitPromise) return this.dbInitPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    this.dbInitPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(QUEUE_STORE)) {
            const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
            queueStore.createIndex('status', 'status', { unique: false });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          if (!db.objectStoreNames.contains(DRAFT_STORE)) {
            db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(BACKUP_STORE)) {
            db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
          }
        };

        req.onsuccess = (e) => {
          this.db = (e.target as IDBOpenDBRequest).result;
          resolve(this.db);
        };

        req.onerror = (e) => {
          console.warn('IndexedDB open error, falling back to local memory:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed:', err);
        resolve(null);
      }
    });

    return this.dbInitPromise;
  }

  // Fallback memory/localStorage queue if IndexedDB is restricted
  private getLocalFallbackQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem('bazu_pos_fallback_sync_queue');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalFallbackQueue(queue: SyncQueueItem[]): void {
    try {
      localStorage.setItem('bazu_pos_fallback_sync_queue', JSON.stringify(queue));
    } catch {
      // ignore
    }
  }

  async enqueue(type: SyncQueueItem['type'], payload: any): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
    };

    const db = await this.initDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction([QUEUE_STORE], 'readwrite');
          const store = tx.objectStore(QUEUE_STORE);
          store.put(item);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        } catch (err) {
          reject(err);
        }
      }).catch((err) => {
        console.warn('Queue put error:', err);
        const fb = this.getLocalFallbackQueue();
        fb.push(item);
        this.saveLocalFallbackQueue(fb);
      });
    } else {
      const fb = this.getLocalFallbackQueue();
      fb.push(item);
      this.saveLocalFallbackQueue(fb);
    }

    this.checkQueueCount();

    // If online, immediately try to sync
    if (this.isOnline) {
      this.processQueue();
    }

    return item;
  }

  async getPendingCount(): Promise<number> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction([QUEUE_STORE], 'readonly');
          const store = tx.objectStore(QUEUE_STORE);
          const req = store.getAll();
          req.onsuccess = () => {
            const items = (req.result as SyncQueueItem[]) || [];
            const count = items.filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length;
            resolve(count);
          };
          req.onerror = () => resolve(this.getLocalFallbackQueue().length);
        } catch {
          resolve(this.getLocalFallbackQueue().length);
        }
      });
    }
    return this.getLocalFallbackQueue().filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length;
  }

  private async checkQueueCount(): Promise<void> {
    const count = await this.getPendingCount();
    this.notify(count);
  }

  async processQueue(): Promise<{ processed: number; errors: number }> {
    if (this.isSyncing) return { processed: 0, errors: 0 };
    if (!this.isOnline) return { processed: 0, errors: 0 };

    this.isSyncing = true;
    this.notify();

    let processedCount = 0;
    let errorCount = 0;

    try {
      const db = await this.initDB();
      let pendingItems: SyncQueueItem[] = [];

      if (db) {
        pendingItems = await new Promise((resolve) => {
          try {
            const tx = db.transaction([QUEUE_STORE], 'readonly');
            const store = tx.objectStore(QUEUE_STORE);
            const req = store.getAll();
            req.onsuccess = () => {
              const all = (req.result as SyncQueueItem[]) || [];
              resolve(
                all
                  .filter((i) => i.status === 'PENDING' || i.status === 'FAILED')
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              );
            };
            req.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        });
      }

      // Merge with fallback queue if any
      const fbItems = this.getLocalFallbackQueue();
      if (fbItems.length > 0) {
        pendingItems = [...pendingItems, ...fbItems];
      }

      for (const item of pendingItems) {
        try {
          item.status = 'SYNCING';

          if (item.type === 'SALE') {
            const { sale, items } = item.payload;
            if (sale && items) {
              await CloudDb.recordSale(sale, items);
            }
          } else if (item.type === 'CUSTOMER_PAYMENT') {
            await CloudDb.recordCustomerPayment(item.payload);
          } else if (item.type === 'PRODUCT_RESTOCK') {
            if (Array.isArray(item.payload)) {
              await CloudDb.batchSetProducts(item.payload);
            }
          }

          item.status = 'SYNCED';
          processedCount++;

          // Remove synced item from DB
          if (db) {
            const tx = db.transaction([QUEUE_STORE], 'readwrite');
            tx.objectStore(QUEUE_STORE).delete(item.id);
          }
        } catch (err: any) {
          console.warn('Sync failed for item:', item.id, err);
          item.status = 'FAILED';
          item.retryCount += 1;
          item.lastError = err?.message || 'Network sync error';
          errorCount++;

          if (db) {
            const tx = db.transaction([QUEUE_STORE], 'readwrite');
            tx.objectStore(QUEUE_STORE).put(item);
          }
        }
      }

      // Clear fallback items that processed
      if (fbItems.length > 0) {
        this.saveLocalFallbackQueue(fbItems.filter((i) => i.status !== 'SYNCED'));
      }

      this.lastSyncTime = new Date();
    } catch (err) {
      console.warn('Sync queue error:', err);
    } finally {
      this.isSyncing = false;
      this.checkQueueCount();
    }

    return { processed: processedCount, errors: errorCount };
  }

  subscribe(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.add(listener);
    this.getPendingCount().then((count) => {
      listener({
        isOnline: this.isOnline,
        pendingCount: count,
        isSyncing: this.isSyncing,
        lastSyncTime: this.lastSyncTime || undefined,
      });
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(overrideCount?: number): void {
    const notifyListeners = (count: number) => {
      const status: OfflineStatus = {
        isOnline: this.isOnline,
        pendingCount: count,
        isSyncing: this.isSyncing,
        lastSyncTime: this.lastSyncTime || undefined,
      };
      this.listeners.forEach((fn) => {
        try {
          fn(status);
        } catch (e) {
          // ignore
        }
      });
    };

    if (overrideCount !== undefined) {
      notifyListeners(overrideCount);
    } else {
      this.getPendingCount().then(notifyListeners);
    }
  }

  // Draft orders persistence in IndexedDB
  async saveDraftOrder(draft: DraftOrder): Promise<void> {
    const db = await this.initDB();
    if (db) {
      const tx = db.transaction([DRAFT_STORE], 'readwrite');
      tx.objectStore(DRAFT_STORE).put(draft);
    } else {
      localStorage.setItem(`bazu_pos_draft_${draft.id}`, JSON.stringify(draft));
    }
  }

  async getDraftOrders(): Promise<DraftOrder[]> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction([DRAFT_STORE], 'readonly');
        const req = tx.objectStore(DRAFT_STORE).getAll();
        req.onsuccess = () => resolve((req.result as DraftOrder[]) || []);
        req.onerror = () => resolve([]);
      });
    }
    try {
      const drafts: DraftOrder[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bazu_pos_draft_')) {
          const val = localStorage.getItem(key);
          if (val) drafts.push(JSON.parse(val));
        }
      }
      return drafts;
    } catch {
      return [];
    }
  }

  async deleteDraftOrder(draftId: string): Promise<void> {
    const db = await this.initDB();
    if (db) {
      const tx = db.transaction([DRAFT_STORE], 'readwrite');
      tx.objectStore(DRAFT_STORE).delete(draftId);
    } else {
      localStorage.removeItem(`bazu_pos_draft_${draftId}`);
    }
  }

  async saveBackupSnapshot(snapshot: any): Promise<void> {
    const db = await this.initDB();
    if (!db || !db.objectStoreNames.contains(BACKUP_STORE)) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([BACKUP_STORE], 'readwrite');
        const store = tx.objectStore(BACKUP_STORE);
        store.put({ id: `snapshot_${Date.now()}`, timestamp: new Date().toISOString(), data: snapshot });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getLatestBackupSnapshot(): Promise<any | null> {
    const db = await this.initDB();
    if (!db || !db.objectStoreNames.contains(BACKUP_STORE)) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([BACKUP_STORE], 'readonly');
        const store = tx.objectStore(BACKUP_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          if (list.length === 0) return resolve(null);
          list.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          resolve(list[0]?.data || null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
}

export const offlineQueue = new OfflineQueueManager();
