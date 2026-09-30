/**
 * Bazu POS Encrypted Local Backup & One-Click Restore Engine
 * Uses Web Crypto API (AES-GCM 256-bit + PBKDF2-SHA256)
 * Provides automatic background snapshots, pre-upgrade safety snapshots,
 * and seamless one-click restores to protect stocks, sales, and settings.
 */

import { LocalBackupData } from '../types';
import { LocalDb } from './storage';
import { offlineQueue } from './offlineQueue';

export type BackupType = 'PRE_UPGRADE' | 'AUTO_HOURLY' | 'SHIFT_CLOSE' | 'MANUAL';

export interface EncryptedBackupEnvelope {
  id: string;
  version: string;
  cipher: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  saltHex: string;
  ivHex: string;
  dataBase64: string;
  checksum: string;
  timestamp: string;
  type: BackupType;
  metadata: {
    store_name: string;
    branch: string;
    products_count: number;
    sales_count: number;
    customers_count: number;
    tabs_count: number;
    shifts_count: number;
    requisitions_count: number;
    device_info?: string;
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredCounts?: {
    products: number;
    sales: number;
    customers: number;
    tabs: number;
    shifts: number;
  };
  error?: string;
}

// Helpers for binary conversions
function bufToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bufToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const STORE_CIPHER_STORAGE_KEY = 'bazu_pos_device_master_salt_v1';

export class CryptoBackupService {
  private static autoBackupTimer: any = null;

  /**
   * Retrieves or initializes the persistent device encryption secret.
   * This allows silent background automated backups to be encrypted and decrypted
   * seamlessly on the device without prompting the cashier every time.
   */
  private static getDeviceMasterSecret(): string {
    if (typeof window === 'undefined') return 'bazu_pos_fallback_key_2026';
    let key = localStorage.getItem(STORE_CIPHER_STORAGE_KEY);
    if (!key) {
      const randBytes = new Uint8Array(32);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(randBytes);
      } else {
        for (let i = 0; i < 32; i++) randBytes[i] = Math.floor(Math.random() * 256);
      }
      key = bufToHex(randBytes);
      try {
        localStorage.setItem(STORE_CIPHER_STORAGE_KEY, key);
      } catch {
        // ignore
      }
    }
    return key;
  }

  /**
   * Derives an AES-GCM 256-bit CryptoKey using PBKDF2
   */
  private static async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Calculates a SHA-256 checksum string for data verification
   */
  private static async computeChecksum(dataStr: string): Promise<string> {
    const enc = new TextEncoder();
    const hashBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(dataStr));
    return bufToHex(hashBuf);
  }

  /**
   * Collects current database state from LocalDb
   */
  public static collectCurrentDatabaseState(): LocalBackupData {
    const storeConfig = LocalDb.getStoreConfig();
    const products = LocalDb.getProducts();
    const sales = LocalDb.getSales();
    const sale_items = LocalDb.getSaleItems();
    const customers = LocalDb.getCustomers();
    const customer_payments = LocalDb.getCustomerPayments();
    const customer_tabs = LocalDb.getCustomerTabs();
    const requisitions = LocalDb.getRequisitions();
    const shifts = LocalDb.getShifts();
    const cash_adjustments = LocalDb.getCashAdjustments();
    const categories = LocalDb.getCategories();

    return {
      version: '1.2.0',
      backup_id: `BAZU-${Date.now()}`,
      created_at: new Date().toISOString(),
      store_id: storeConfig.store_id || 'store_main',
      store_name: storeConfig.store_name || 'Bazu Retail',
      products,
      categories,
      sales,
      sale_items,
      customers,
      customer_payments,
      customer_tabs,
      requisitions,
      store_config: storeConfig,
      metadata: {
        products_count: products.length,
        sales_count: sales.length,
        customers_count: customers.length,
        tabs_count: customer_tabs.length,
        requisitions_count: requisitions.length,
        backup_tool: 'BazuPOS Encrypted Core',
        exported_by_user: 'System Automated Guard',
        exported_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Encrypts a payload into an EncryptedBackupEnvelope
   */
  public static async encryptDatabase(
    data: LocalBackupData,
    type: BackupType = 'AUTO_HOURLY',
    customPassphrase?: string
  ): Promise<EncryptedBackupEnvelope> {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Cryptography API is not supported on this browser or platform.');
    }
    const passphrase = customPassphrase || this.getDeviceMasterSecret();
    const jsonStr = JSON.stringify(data);
    const checksum = await this.computeChecksum(jsonStr);

    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);

    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    const key = await this.deriveKey(passphrase, salt);
    const enc = new TextEncoder();
    const encryptedBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(jsonStr)
    );

    const envelopeId = `enc_bak_${type.toLowerCase()}_${Date.now()}`;

    return {
      id: envelopeId,
      version: '1.2.0',
      cipher: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA256',
      iterations: 100000,
      saltHex: bufToHex(salt),
      ivHex: bufToHex(iv),
      dataBase64: bufToBase64(encryptedBuf),
      checksum,
      timestamp: new Date().toISOString(),
      type,
      metadata: {
        store_name: data.store_name,
        branch: data.store_config?.branch || 'Main Branch',
        products_count: data.products.length,
        sales_count: data.sales.length,
        customers_count: data.customers.length,
        tabs_count: data.customer_tabs?.length || 0,
        shifts_count: LocalDb.getShifts().length,
        requisitions_count: data.requisitions?.length || 0,
        device_info: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : undefined,
      },
    };
  }

  /**
   * Decrypts an EncryptedBackupEnvelope into LocalBackupData
   */
  public static async decryptDatabase(
    envelope: EncryptedBackupEnvelope,
    customPassphrase?: string
  ): Promise<LocalBackupData> {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Cryptography API is not supported on this browser or platform.');
    }

    // Try custom passphrase first if given, otherwise device master secret
    const attempts = customPassphrase ? [customPassphrase] : [this.getDeviceMasterSecret(), 'bazu_pos_fallback_key_2026'];
    let lastError: any = null;

    for (const pass of attempts) {
      try {
        const salt = hexToBuf(envelope.saltHex);
        const iv = hexToBuf(envelope.ivHex);
        const key = await this.deriveKey(pass, salt);

        const cipherBytes = base64ToBuf(envelope.dataBase64);
        const decryptedBuf = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          cipherBytes
        );

        const dec = new TextDecoder();
        const jsonStr = dec.decode(decryptedBuf);

        // Verify checksum
        const verifiedChecksum = await this.computeChecksum(jsonStr);
        if (envelope.checksum && envelope.checksum !== verifiedChecksum) {
          throw new Error('Data integrity check failed: Checksum mismatch. The backup file may be corrupted.');
        }

        const parsed = JSON.parse(jsonStr) as LocalBackupData;
        return parsed;
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      lastError?.message || 'Failed to decrypt backup. Incorrect passphrase or key.'
    );
  }

  /**
   * Creates and stores an encrypted pre-upgrade snapshot
   */
  public static async createPreUpgradeSnapshot(): Promise<EncryptedBackupEnvelope> {
    const data = this.collectCurrentDatabaseState();
    const envelope = await this.encryptDatabase(data, 'PRE_UPGRADE');

    // Save to IndexedDB
    await offlineQueue.saveBackupSnapshot(envelope);

    // Save metadata and latest snapshot to localStorage for immediate availability
    try {
      localStorage.setItem('bazu_pos_latest_encrypted_snapshot', JSON.stringify(envelope));
      localStorage.setItem('bazu_pos_pre_upgrade_backup', JSON.stringify(data));
    } catch {
      // storage quota or ignore
    }

    return envelope;
  }

  /**
   * Creates an automated background snapshot (e.g. daily/hourly or before critical operations)
   */
  public static async createAutoSnapshot(type: BackupType = 'AUTO_HOURLY'): Promise<EncryptedBackupEnvelope> {
    const data = this.collectCurrentDatabaseState();
    const envelope = await this.encryptDatabase(data, type);

    // Persist in IndexedDB system_backups store
    await offlineQueue.saveBackupSnapshot(envelope);

    try {
      localStorage.setItem('bazu_pos_latest_encrypted_snapshot', JSON.stringify(envelope));
    } catch {
      // ignore
    }

    return envelope;
  }

  /**
   * Retrieves all available encrypted snapshots stored in IndexedDB and localStorage
   */
  public static async getAvailableSnapshots(): Promise<EncryptedBackupEnvelope[]> {
    const results: EncryptedBackupEnvelope[] = [];

    // 1. From localStorage latest snapshot
    try {
      const raw = localStorage.getItem('bazu_pos_latest_encrypted_snapshot');
      if (raw) {
        const env = JSON.parse(raw);
        if (env && env.cipher === 'AES-GCM-256') {
          results.push(env);
        }
      }
    } catch {
      // ignore
    }

    // 2. From IndexedDB system_backups
    try {
      const idbLatest = await offlineQueue.getLatestBackupSnapshot();
      if (idbLatest && idbLatest.cipher === 'AES-GCM-256') {
        if (!results.some((r) => r.id === idbLatest.id)) {
          results.push(idbLatest);
        }
      }
    } catch {
      // ignore
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return results;
  }

  /**
   * Executes a One-Click Restore from an EncryptedBackupEnvelope
   */
  public static async restoreFromSnapshot(
    envelope: EncryptedBackupEnvelope,
    customPassphrase?: string
  ): Promise<RestoreResult> {
    try {
      const data = await this.decryptDatabase(envelope, customPassphrase);
      if (!data || !Array.isArray(data.products)) {
        return {
          success: false,
          message: 'Decrypted backup is invalid or missing required product records.',
        };
      }

      // Execute atomic restore into LocalDb
      const restoreRes = LocalDb.restoreFromLocalBackup(data, 'REPLACE');
      if (!restoreRes.success) {
        return {
          success: false,
          message: restoreRes.error || 'Failed to apply decrypted records into local database.',
        };
      }

      return {
        success: true,
        message: `Snapshot successfully restored! Restored ${data.products.length} products, ${data.sales.length} sales, and ${data.customers.length} customers.`,
        restoredCounts: {
          products: data.products.length,
          sales: data.sales.length,
          customers: data.customers.length,
          tabs: data.customer_tabs?.length || 0,
          shifts: LocalDb.getShifts().length,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Restore failed: ${err.message || 'Decryption error'}`,
        error: err.message,
      };
    }
  }

  /**
   * Downloads an encrypted backup file (.bazubak) to user's computer
   */
  public static async downloadEncryptedBackupFile(customPassphrase?: string): Promise<string> {
    const data = this.collectCurrentDatabaseState();
    const envelope = await this.encryptDatabase(data, 'MANUAL', customPassphrase);
    const jsonStr = JSON.stringify(envelope, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const cleanStore = (data.store_name || 'Store').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `BazuPOS_Encrypted_Backup_${cleanStore}_${dateStr}.bazubak`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return filename;
  }

  /**
   * Initializes automatic periodic background snapshots (every 30 mins)
   */
  public static initAutoBackupScheduler(): void {
    if (typeof window === 'undefined' || this.autoBackupTimer) return;

    // Run first auto snapshot after 30 seconds if products or sales exist
    setTimeout(() => {
      try {
        if (LocalDb.getProducts().length > 0 || LocalDb.getSales().length > 0) {
          this.createAutoSnapshot('AUTO_HOURLY').catch(() => {});
        }
      } catch {
        // ignore
      }
    }, 30000);

    // Then schedule recurring snapshot every 30 minutes
    this.autoBackupTimer = setInterval(() => {
      try {
        if (LocalDb.getProducts().length > 0 || LocalDb.getSales().length > 0) {
          this.createAutoSnapshot('AUTO_HOURLY').catch(() => {});
        }
      } catch {
        // ignore
      }
    }, 30 * 60 * 1000);
  }
}
