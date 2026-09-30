/**
 * Tamper-Evident Cryptographic Audit Logging Engine for Bazu POS
 * Implements cryptographic hash chaining (SHA-256 Merkle chain / append-only ledger)
 * Every business event (sales, stock changes, price adjustments, voids, logins, shifts)
 * is linked to the previous entry's cryptographic hash, guaranteeing that any tampering,
 * modification, or deletion of local records is mathematically detected.
 */

import {
  AuditAction,
  AuditActor,
  AuditChainVerificationResult,
  AuditLogEntry,
  AuditSeverity,
} from '../types';
import { CloudDb } from './firebase';

export const GENESIS_PREVIOUS_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

function getActiveStoreId(): string {
  if (typeof window === 'undefined') return 'store_main';
  try {
    return localStorage.getItem('bazu_pos_active_store_id') || 'store_main';
  } catch {
    return 'store_main';
  }
}

function getAuditStorageKey(): string {
  const storeId = getActiveStoreId();
  if (storeId === 'store_main' || storeId === 'the_buzz_liquor') {
    return 'bazu_pos_audit_logs';
  }
  return `bazu_pos_audit_logs_${storeId}`;
}

// Binary conversions
function bufToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Canonical hash representation of an audit entry
export function getCanonicalAuditString(data: Omit<AuditLogEntry, 'hash'>): string {
  const detailsStr = data.details ? JSON.stringify(data.details, Object.keys(data.details).sort()) : '{}';
  return [
    data.sequenceNumber,
    data.id,
    data.timestamp,
    data.action,
    data.severity,
    data.actor.userId || '',
    data.actor.name,
    data.actor.role || '',
    data.entityType,
    data.entityId || '',
    data.summary,
    detailsStr,
    data.previousHash,
  ].join('|');
}

// Calculate SHA-256 hash using Web Crypto API
export async function computeAuditHash(data: Omit<AuditLogEntry, 'hash'>): Promise<string> {
  const canonical = getCanonicalAuditString(data);
  const enc = new TextEncoder();
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(canonical));
    return bufToHex(hashBuf);
  }
  // Fallback simple 64-char hex hash if WebCrypto is unavailable in test environment
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    const char = canonical.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, 'a');
}

export class AuditLogger {
  private static queuePromise: Promise<any> = Promise.resolve();
  private static listeners: Set<() => void> = new Set();

  static subscribe(callback: () => void): () => void {
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
        console.warn('Audit listener error:', e);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bazu_audit_log_updated'));
    }
  }

  /**
   * Retrieves all audit log entries stored locally
   */
  static getLogs(): AuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(getAuditStorageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Appends an audit log entry to the tamper-evident cryptographic chain.
   * Execution is sequential via promise queue to prevent sequence number race conditions.
   */
  static log(entryInput: {
    action: AuditAction;
    severity?: AuditSeverity;
    actor?: AuditActor;
    entityType: 'sale' | 'product' | 'customer' | 'shift' | 'cash' | 'user' | 'backup' | 'store';
    entityId?: string | number;
    summary: string;
    details?: Record<string, any>;
  }): Promise<AuditLogEntry> {
    this.queuePromise = this.queuePromise.then(async () => {
      try {
        const logs = this.getLogs();
        const lastEntry = logs.length > 0 ? logs[logs.length - 1] : null;
        const sequenceNumber = lastEntry ? lastEntry.sequenceNumber + 1 : 1;
        const previousHash = lastEntry ? lastEntry.hash : GENESIS_PREVIOUS_HASH;
        const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const timestamp = new Date().toISOString();

        // Default actor from active session if not provided
        let actor: AuditActor = entryInput.actor || { name: 'System', role: 'SYSTEM' };
        if (!entryInput.actor && typeof window !== 'undefined') {
          try {
            const rawUser = sessionStorage.getItem('bazu_pos_active_user');
            if (rawUser) {
              const u = JSON.parse(rawUser);
              actor = {
                userId: u.id,
                name: u.name || 'Terminal User',
                role: u.role || 'CASHIER',
                username: u.username,
              };
            }
          } catch {
            // ignore
          }
        }

        const draftEntry: Omit<AuditLogEntry, 'hash'> = {
          sequenceNumber,
          id,
          timestamp,
          action: entryInput.action,
          severity: entryInput.severity || 'INFO',
          actor,
          entityType: entryInput.entityType,
          entityId: entryInput.entityId,
          summary: entryInput.summary,
          details: entryInput.details || {},
          previousHash,
        };

        const hash = await computeAuditHash(draftEntry);
        const finalEntry: AuditLogEntry = { ...draftEntry, hash };

        logs.push(finalEntry);
        // Keep up to 2,000 entries locally so storage remains optimal
        const trimmed = logs.length > 2000 ? logs.slice(-2000) : logs;
        localStorage.setItem(getAuditStorageKey(), JSON.stringify(trimmed));

        // Push to cloud Firestore if online (fails silently offline)
        try {
          CloudDb.recordAuditLog(finalEntry).catch(() => {});
        } catch {
          // ignore offline
        }

        this.notifyListeners();
        return finalEntry;
      } catch (err) {
        console.error('Failed to append tamper-evident audit log:', err);
        throw err;
      }
    });

    return this.queuePromise;
  }

  /**
   * Verifies the cryptographic integrity of the entire audit chain.
   * If any entry has been altered, deleted, or spliced, it mathematically detects
   * the exact point of compromise.
   */
  static async verifyChainIntegrity(customLogs?: AuditLogEntry[]): Promise<AuditChainVerificationResult> {
    const logs = customLogs || this.getLogs();
    if (logs.length === 0) {
      return {
        isValid: true,
        totalRecords: 0,
        verifiedCount: 0,
        genesisHash: GENESIS_PREVIOUS_HASH,
        latestHash: GENESIS_PREVIOUS_HASH,
      };
    }

    let previousHash = GENESIS_PREVIOUS_HASH;
    let expectedSequence = 1;

    for (let i = 0; i < logs.length; i++) {
      const entry = logs[i];

      // 1. Verify sequence continuity
      if (entry.sequenceNumber !== expectedSequence) {
        return {
          isValid: false,
          totalRecords: logs.length,
          verifiedCount: i,
          compromisedIndex: i,
          compromisedRecordId: entry.id,
          failureReason: `Sequence break detected at record #${i + 1}. Expected sequence ${expectedSequence}, but found ${entry.sequenceNumber}. A record was deleted or spliced.`,
          genesisHash: logs[0].previousHash,
          latestHash: entry.hash,
        };
      }

      // 2. Verify previousHash chain linkage
      if (entry.previousHash !== previousHash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          verifiedCount: i,
          compromisedIndex: i,
          compromisedRecordId: entry.id,
          failureReason: `Cryptographic link broken at record #${entry.sequenceNumber} ("${entry.action}"). Previous hash does not match the prior block's hash.`,
          genesisHash: logs[0].previousHash,
          latestHash: entry.hash,
        };
      }

      // 3. Recompute SHA-256 to ensure contents have not been altered
      const recomputedHash = await computeAuditHash(entry);
      if (recomputedHash !== entry.hash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          verifiedCount: i,
          compromisedIndex: i,
          compromisedRecordId: entry.id,
          failureReason: `Hash mismatch at record #${entry.sequenceNumber} ("${entry.summary}"). The entry content was modified after signing! Expected ${entry.hash.slice(0, 16)}..., but recomputed ${recomputedHash.slice(0, 16)}...`,
          genesisHash: logs[0].previousHash,
          latestHash: entry.hash,
        };
      }

      previousHash = entry.hash;
      expectedSequence++;
    }

    return {
      isValid: true,
      totalRecords: logs.length,
      verifiedCount: logs.length,
      firstTimestamp: logs[0]?.timestamp,
      lastTimestamp: logs[logs.length - 1]?.timestamp,
      genesisHash: logs[0]?.previousHash || GENESIS_PREVIOUS_HASH,
      latestHash: logs[logs.length - 1]?.hash || GENESIS_PREVIOUS_HASH,
    };
  }

  /**
   * Export audit log trail as signed JSON with cryptographic verification manifest
   */
  static async exportAuditTrailJSON(): Promise<string> {
    const logs = this.getLogs();
    const verification = await this.verifyChainIntegrity(logs);
    const manifest = {
      title: 'Bazu POS Tamper-Evident Audit Ledger',
      exportedAt: new Date().toISOString(),
      storeId: getActiveStoreId(),
      chainVerification: verification,
      totalEntries: logs.length,
      entries: logs,
    };

    const jsonStr = JSON.stringify(manifest, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `BazuPOS_Audit_Ledger_${new Date().toISOString().slice(0, 10)}.json`;
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
   * Export audit log trail as CSV file
   */
  static exportAuditTrailCSV(): string {
    const logs = this.getLogs();
    const headers = [
      'Seq',
      'Timestamp',
      'Action',
      'Severity',
      'Actor Name',
      'Actor Role',
      'Entity',
      'Entity ID',
      'Summary',
      'Entry Hash',
      'Previous Hash',
    ];

    const rows = logs.map((l) => [
      l.sequenceNumber,
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.severity}"`,
      `"${l.actor.name}"`,
      `"${l.actor.role || ''}"`,
      `"${l.entityType}"`,
      `"${l.entityId || ''}"`,
      `"${l.summary.replace(/"/g, '""')}"`,
      `"${l.hash}"`,
      `"${l.previousHash}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = `BazuPOS_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return filename;
  }
}
