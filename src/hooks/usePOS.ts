import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  increment,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, getActiveTenantId, handleFirestoreError, OperationType } from '../lib/firebase';
import { CartItem } from '../types';
import { LocalDb } from '../lib/storage';

export interface TenantProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  barcode: string;
  quickKey: boolean;
  unit?: string;
  lowStockThreshold?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantSaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantName?: string;
  notes?: string;
}

export interface TenantSale {
  id: string;
  items: TenantSaleItem[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'CARD' | 'SPLIT' | 'DEBT';
  splitCash?: number;
  splitMpesa?: number;
  referenceCode: string;
  cashierId: string;
  cashierName?: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  status?: 'COMPLETED' | 'REFUNDED' | 'VOIDED';
}

export interface TenantShift {
  id: string;
  cashierId: string;
  cashierName?: string;
  openTime: string;
  closeTime?: string;
  openingCash: number;
  closingCash?: number;
  totalSales: number;
  status: 'OPEN' | 'CLOSED';
}

export interface ProcessSaleParams {
  cart: CartItem[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'CARD' | 'SPLIT' | 'DEBT';
  splitCashAmount?: number;
  splitMpesaAmount?: number;
  cashierId: string;
  cashierName: string;
  referenceCode?: string;
  customerName?: string;
  customerPhone?: string;
  shiftId?: string;
}

export function usePOS(customTenantId?: string) {
  const tenantId = useMemo(() => customTenantId || getActiveTenantId(), [customTenantId]);

  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [sales, setSales] = useState<TenantSale[]>([]);
  const [shifts, setShifts] = useState<TenantShift[]>([]);
  const [activeShift, setActiveShift] = useState<TenantShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [error, setError] = useState<string | null>(null);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time listener on tenants/{tenantId}/products
  useEffect(() => {
    setIsLoading(true);
    const productsCol = collection(db, 'tenants', tenantId, 'products');

    const unsubscribeProducts = onSnapshot(
      productsCol,
      (snapshot) => {
        const list: TenantProduct[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name || '',
            category: data.category || 'General',
            price: Number(data.price) || 0,
            costPrice: Number(data.costPrice) || 0,
            stockQuantity: Number(data.stockQuantity) || 0,
            barcode: data.barcode || '',
            quickKey: !!data.quickKey,
            unit: data.unit || 'pcs',
            lowStockThreshold: data.lowStockThreshold || 10,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        // Sort products: quick-keys first, then alphabetically
        list.sort((a, b) => {
          if (a.quickKey && !b.quickKey) return -1;
          if (!a.quickKey && b.quickKey) return 1;
          return a.name.localeCompare(b.name);
        });

        if (list.length === 0) {
          try {
            const localProds = LocalDb.getProducts();
            if (localProds && localProds.length > 0) {
              const fallbackList: TenantProduct[] = localProds.map((lp) => ({
                id: String(lp.id),
                name: lp.name,
                category: lp.category,
                price: lp.price,
                costPrice: Math.round(lp.price * 0.75),
                stockQuantity: lp.stock_qty,
                barcode: lp.barcode,
                quickKey: !!lp.is_quick_key,
                unit: lp.unit || 'pcs',
                lowStockThreshold: lp.low_stock_threshold || 10,
              }));
              setProducts(fallbackList);
              setIsLoading(false);
              setError(null);
              return;
            }
          } catch {
            // ignore
          }
        }

        setProducts(list);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('Real-time products snapshot warning:', err);
        try {
          const localProds = LocalDb.getProducts();
          if (localProds && localProds.length > 0) {
            setProducts(
              localProds.map((lp) => ({
                id: String(lp.id),
                name: lp.name,
                category: lp.category,
                price: lp.price,
                costPrice: Math.round(lp.price * 0.75),
                stockQuantity: lp.stock_qty,
                barcode: lp.barcode,
                quickKey: !!lp.is_quick_key,
                unit: lp.unit || 'pcs',
                lowStockThreshold: lp.low_stock_threshold || 10,
              }))
            );
          }
        } catch {
          // ignore
        }
        setError('Working offline or sync paused.');
        setIsLoading(false);
      }
    );

    // Real-time listener on tenants/{tenantId}/sales
    const salesCol = collection(db, 'tenants', tenantId, 'sales');
    const salesQuery = query(salesCol, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeSales = onSnapshot(
      salesQuery,
      (snapshot) => {
        const list: TenantSale[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            items: data.items || [],
            totalAmount: Number(data.totalAmount) || 0,
            paymentMethod: data.paymentMethod || 'CASH',
            splitCash: data.splitCash ? Number(data.splitCash) : undefined,
            splitMpesa: data.splitMpesa ? Number(data.splitMpesa) : undefined,
            referenceCode: data.referenceCode || d.id,
            cashierId: data.cashierId || '',
            cashierName: data.cashierName || 'Cashier',
            createdAt: data.createdAt || new Date().toISOString(),
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            status: data.status || 'COMPLETED',
          });
        });
        setSales(list);
      },
      (err) => {
        console.warn('Real-time sales snapshot warning:', err);
      }
    );

    // Real-time listener on tenants/{tenantId}/shifts
    const shiftsCol = collection(db, 'tenants', tenantId, 'shifts');
    const shiftsQuery = query(shiftsCol, orderBy('openTime', 'desc'), limit(15));
    const unsubscribeShifts = onSnapshot(
      shiftsQuery,
      (snapshot) => {
        const list: TenantShift[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            cashierId: data.cashierId || '',
            cashierName: data.cashierName,
            openTime: data.openTime || new Date().toISOString(),
            closeTime: data.closeTime,
            openingCash: Number(data.openingCash) || 0,
            closingCash: data.closingCash !== undefined ? Number(data.closingCash) : undefined,
            totalSales: Number(data.totalSales) || 0,
            status: data.status || 'OPEN',
          });
        });
        setShifts(list);
        const open = list.find((s) => s.status === 'OPEN');
        setActiveShift(open || null);
      },
      (err) => {
        console.warn('Real-time shifts snapshot warning:', err);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeSales();
      unsubscribeShifts();
    };
  }, [tenantId]);

  /**
   * ATOMIC CHECKOUT FUNCTION
   * Process sales using Firestore writeBatch:
   * 1. Save the transaction object under tenants/{tenantId}/sales.
   * 2. Atomically decrement stock quantities for all purchased items using increment(-quantity).
   * 3. Fully functional offline via Firestore IndexedDB persistent cache.
   */
  const processSale = useCallback(
    async (params: ProcessSaleParams): Promise<TenantSale> => {
      const {
        cart,
        totalAmount,
        paymentMethod,
        splitCashAmount,
        splitMpesaAmount,
        cashierId,
        cashierName,
        referenceCode,
        customerName,
        customerPhone,
      } = params;

      const saleId = `sale_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      const items: TenantSaleItem[] = cart.map((ci) => {
        const unitPrice = ci.selectedVariant ? ci.selectedVariant.price : ci.product.price;
        const discountFactor = ci.discountPercent ? 1 - ci.discountPercent / 100 : 1;
        const lineTotal = Math.max(0, Math.round(unitPrice * ci.quantity * discountFactor));

        return {
          productId: String(ci.product.id),
          name: ci.product.name,
          quantity: ci.quantity,
          unitPrice,
          totalPrice: lineTotal,
          variantName: ci.selectedVariant?.name,
          notes: ci.notes,
        };
      });

      const saleRecord: TenantSale = {
        id: saleId,
        items,
        totalAmount,
        paymentMethod,
        splitCash: splitCashAmount,
        splitMpesa: splitMpesaAmount,
        referenceCode: referenceCode || `BZ-${Date.now().toString().slice(-6)}`,
        cashierId,
        cashierName,
        createdAt: now,
        customerName,
        customerPhone,
        status: 'COMPLETED',
      };

      try {
        const batch = writeBatch(db);

        // 1. Write sale document
        const saleRef = doc(db, 'tenants', tenantId, 'sales', saleId);
        batch.set(saleRef, saleRecord);

        // 2. Atomically decrement stock quantity for all purchased items
        for (const item of items) {
          const productRef = doc(db, 'tenants', tenantId, 'products', item.productId);
          batch.update(productRef, {
            stockQuantity: increment(-item.quantity),
            updatedAt: now,
          });
        }

        // Commit batch write
        await batch.commit();

        return saleRecord;
      } catch (err) {
        console.error('Batch checkout error in usePOS:', err);
        handleFirestoreError(err, OperationType.WRITE, `tenants/${tenantId}/sales`);
      }
    },
    [tenantId]
  );

  /**
   * Add a new product to tenant catalog
   */
  const addProduct = useCallback(
    async (product: Omit<TenantProduct, 'id'>): Promise<string> => {
      const prodId = `prod_${Date.now()}`;
      try {
        const ref = doc(db, 'tenants', tenantId, 'products', prodId);
        await setDoc(ref, {
          ...product,
          id: prodId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return prodId;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `tenants/${tenantId}/products`);
      }
    },
    [tenantId]
  );

  /**
   * Update product stock or details
   */
  const updateProduct = useCallback(
    async (id: string, updates: Partial<TenantProduct>): Promise<void> => {
      try {
        const ref = doc(db, 'tenants', tenantId, 'products', id);
        await updateDoc(ref, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tenants/${tenantId}/products/${id}`);
      }
    },
    [tenantId]
  );

  /**
   * Delete product
   */
  const deleteProduct = useCallback(
    async (id: string): Promise<void> => {
      try {
        const ref = doc(db, 'tenants', tenantId, 'products', id);
        await deleteDoc(ref);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tenants/${tenantId}/products/${id}`);
      }
    },
    [tenantId]
  );

  /**
   * Start a new Cashier Shift
   */
  const startShift = useCallback(
    async (openingCash: number, cashierId: string, cashierName?: string): Promise<string> => {
      const shiftId = `shift_${Date.now()}`;
      const shiftData: TenantShift = {
        id: shiftId,
        cashierId,
        cashierName: cashierName || 'Cashier',
        openTime: new Date().toISOString(),
        openingCash,
        totalSales: 0,
        status: 'OPEN',
      };
      try {
        const ref = doc(db, 'tenants', tenantId, 'shifts', shiftId);
        await setDoc(ref, shiftData);
        setActiveShift(shiftData);
        return shiftId;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `tenants/${tenantId}/shifts`);
      }
    },
    [tenantId]
  );

  /**
   * Close Cashier Shift
   */
  const closeShift = useCallback(
    async (shiftId: string, closingCash: number): Promise<void> => {
      try {
        const ref = doc(db, 'tenants', tenantId, 'shifts', shiftId);
        await updateDoc(ref, {
          closingCash,
          closeTime: new Date().toISOString(),
          status: 'CLOSED',
        });
        setActiveShift(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tenants/${tenantId}/shifts/${shiftId}`);
      }
    },
    [tenantId]
  );

  return {
    tenantId,
    products,
    sales,
    shifts,
    activeShift,
    isLoading,
    isOnline,
    error,
    processSale,
    addProduct,
    updateProduct,
    deleteProduct,
    startShift,
    closeShift,
  };
}
