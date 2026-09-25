import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, setActiveTenantId, getActiveTenantId, handleFirestoreError, OperationType } from '../lib/firebase';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../data/seedData';

export interface TenantMetadata {
  id: string;
  businessName: string;
  ownerUid: string;
  subscriptionStatus: 'active' | 'trial' | 'past_due' | 'cancelled';
  plan: 'starter' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt?: string;
}

export interface TenantUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'cashier';
  name: string;
  pinHash: string;
  createdAt: string;
}

export interface TenantCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  createdAt?: string;
}

export class AuthService {
  /**
   * Merchant Self-Service Signup Flow & Auto-Provisioning
   */
  static async signupMerchant(
    businessName: string,
    email: string,
    password: string,
    ownerName: string
  ): Promise<{ user: FirebaseUser; tenantId: string }> {
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Generate unique tenantId (e.g. tenant_[uid_prefix])
      const cleanPrefix = user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
      const tenantId = `tenant_${cleanPrefix || Date.now().toString(36)}`;

      // 3. Create tenants/{tenantId} metadata document
      const tenantRef = doc(db, 'tenants', tenantId);
      const tenantData: TenantMetadata = {
        id: tenantId,
        businessName: businessName.trim(),
        ownerUid: user.uid,
        subscriptionStatus: 'active', // Active trial status
        plan: 'starter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(tenantRef, tenantData);

      // 4. Create root user record in tenants/{tenantId}/users/{userId}
      const userDocRef = doc(db, 'tenants', tenantId, 'users', user.uid);
      const tenantUserData: TenantUser = {
        id: user.uid,
        email: email.trim().toLowerCase(),
        role: 'admin',
        name: ownerName.trim() || 'Store Owner',
        pinHash: '1234', // default cashier/admin PIN for terminal unlocking
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, tenantUserData);

      // 5. Seed full catalog of categories & products for the new tenant
      await this.seedTenantCatalog(tenantId);

      // 6. Save active tenant in storage
      setActiveTenantId(tenantId);
      localStorage.setItem('bazu_pos_merchant_biz_name', businessName);
      localStorage.setItem('bazu_pos_merchant_owner_name', ownerName);

      return { user, tenantId };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tenants');
    }
  }

  /**
   * Seed complete catalog of categories and products to tenant
   */
  static async seedTenantCatalog(tenantId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Seed categories
      for (const cat of INITIAL_CATEGORIES) {
        const catRef = doc(db, 'tenants', tenantId, 'categories', cat.id);
        batch.set(catRef, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon || '🏷️',
          description: cat.description || '',
          createdAt: new Date().toISOString(),
        });
      }

      // Seed extensive products list
      for (const prod of INITIAL_PRODUCTS) {
        const prodId = `prod_${prod.id}`;
        const prodRef = doc(db, 'tenants', tenantId, 'products', prodId);
        batch.set(prodRef, {
          id: prodId,
          name: prod.name,
          category: prod.category,
          price: prod.price,
          costPrice: Math.round(prod.price * 0.75),
          stockQuantity: prod.stock_qty,
          barcode: prod.barcode,
          quickKey: !!prod.is_quick_key,
          unit: prod.unit || 'pcs',
          lowStockThreshold: prod.low_stock_threshold || 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
    } catch (err) {
      console.warn('Error seeding tenant catalog:', err);
    }
  }

  /**
   * Merchant Login Flow
   */
  static async loginMerchant(
    email: string,
    password: string
  ): Promise<{ user: FirebaseUser; tenantId: string; metadata: TenantMetadata | null }> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // Look up tenant owned by this user
      let foundTenantId = getActiveTenantId();
      let tenantMetadata: TenantMetadata | null = null;

      try {
        const tenantsRef = collection(db, 'tenants');
        const q = query(tenantsRef, where('ownerUid', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          foundTenantId = docSnap.id;
          tenantMetadata = docSnap.data() as TenantMetadata;
        } else {
          // Check if active tenant document exists
          const directRef = doc(db, 'tenants', foundTenantId);
          const directSnap = await getDoc(directRef);
          if (directSnap.exists()) {
            tenantMetadata = directSnap.data() as TenantMetadata;
          }
        }
      } catch (err) {
        console.warn('Could not query tenants by ownerUid, falling back to local tenant:', err);
      }

      setActiveTenantId(foundTenantId);
      return { user, tenantId: foundTenantId, metadata: tenantMetadata };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'tenants');
    }
  }

  /**
   * Sign out current user
   */
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Signout warning:', err);
    }
  }

  /**
   * Fetch active tenant metadata
   */
  static async getActiveTenantMetadata(tenantId?: string): Promise<TenantMetadata | null> {
    const tid = tenantId || getActiveTenantId();
    try {
      const snap = await getDoc(doc(db, 'tenants', tid));
      if (snap.exists()) {
        return snap.data() as TenantMetadata;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch staff users for a tenant
   */
  static async getTenantUsers(tenantId?: string): Promise<TenantUser[]> {
    const tid = tenantId || getActiveTenantId();
    try {
      const usersCol = collection(db, 'tenants', tid, 'users');
      const snap = await getDocs(usersCol);
      const users: TenantUser[] = [];
      snap.forEach((d) => {
        users.push({ ...d.data(), id: d.id } as TenantUser);
      });
      return users;
    } catch {
      return [];
    }
  }

  /**
   * Add a new staff member to the tenant
   */
  static async addTenantStaff(
    tenantId: string,
    staff: { name: string; email: string; role: 'admin' | 'manager' | 'cashier'; pinHash: string }
  ): Promise<void> {
    try {
      const staffDocId = `staff_${Date.now()}`;
      const staffRef = doc(db, 'tenants', tenantId, 'users', staffDocId);
      await setDoc(staffRef, {
        ...staff,
        id: staffDocId,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenantId}/users`);
    }
  }

  /**
   * Fetch categories for a tenant
   */
  static async getTenantCategories(tenantId?: string): Promise<TenantCategory[]> {
    const tid = tenantId || getActiveTenantId();
    try {
      const catsCol = collection(db, 'tenants', tid, 'categories');
      const snap = await getDocs(catsCol);
      const list: TenantCategory[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as TenantCategory);
      });
      if (list.length > 0) return list;
    } catch {
      // ignore
    }
    return INITIAL_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      description: c.description,
    }));
  }

  /**
   * Add a new category for a tenant
   */
  static async addTenantCategory(
    tenantId: string,
    category: { name: string; icon?: string; description?: string }
  ): Promise<TenantCategory> {
    const cleanId = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `cat_${Date.now()}`;
    const newCat: TenantCategory = {
      id: cleanId,
      name: category.name.trim(),
      icon: category.icon?.trim() || '🏷️',
      description: category.description?.trim() || '',
      createdAt: new Date().toISOString(),
    };
    try {
      const catRef = doc(db, 'tenants', tenantId, 'categories', cleanId);
      await setDoc(catRef, newCat);
      return newCat;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenantId}/categories/${cleanId}`);
    }
  }

  /**
   * Delete category from tenant
   */
  static async deleteTenantCategory(tenantId: string, categoryId: string): Promise<void> {
    try {
      const catRef = doc(db, 'tenants', tenantId, 'categories', categoryId);
      await deleteDoc(catRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tenants/${tenantId}/categories/${categoryId}`);
    }
  }
}
