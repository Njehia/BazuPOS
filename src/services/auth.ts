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
} from 'firebase/firestore';
import { auth, db, setActiveTenantId, getActiveTenantId, handleFirestoreError, OperationType } from '../lib/firebase';

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

export interface StarterProductSeed {
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  barcode: string;
  quickKey: boolean;
}

const DEFAULT_STARTER_PRODUCTS: StarterProductSeed[] = [
  { name: 'Tusker Lager 500ml', category: 'Beer', price: 250, costPrice: 190, stockQuantity: 72, barcode: '6161100010101', quickKey: true },
  { name: 'Guinness Foreign Extra 500ml', category: 'Beer', price: 280, costPrice: 215, stockQuantity: 48, barcode: '6161100010102', quickKey: true },
  { name: 'White Cap Crisp 500ml', category: 'Beer', price: 260, costPrice: 200, stockQuantity: 36, barcode: '6161100010103', quickKey: true },
  { name: 'Johnnie Walker Black Label 750ml', category: 'Spirits', price: 3800, costPrice: 3100, stockQuantity: 18, barcode: '5000267024203', quickKey: true },
  { name: 'Jameson Irish Whiskey 750ml', category: 'Spirits', price: 2600, costPrice: 2150, stockQuantity: 24, barcode: '5011007003004', quickKey: true },
  { name: 'Gilbeys Special Dry Gin 750ml', category: 'Spirits', price: 1450, costPrice: 1180, stockQuantity: 30, barcode: '6161100020201', quickKey: true },
  { name: 'Smirnoff Red Vodka 750ml', category: 'Spirits', price: 1550, costPrice: 1250, stockQuantity: 20, barcode: '5000281001013', quickKey: true },
  { name: 'Nederburg Cabernet Sauvignon 750ml', category: 'Wine', price: 1750, costPrice: 1350, stockQuantity: 15, barcode: '6001497400018', quickKey: false },
  { name: 'Coca-Cola 500ml PET', category: 'Soft Drinks', price: 80, costPrice: 55, stockQuantity: 60, barcode: '5449000000996', quickKey: true },
  { name: 'Keringet Still Mineral Water 500ml', category: 'Water', price: 70, costPrice: 40, stockQuantity: 50, barcode: '6161100030302', quickKey: true },
  { name: 'Schweppes Tonic Water 330ml Can', category: 'Mixers', price: 100, costPrice: 70, stockQuantity: 40, barcode: '5449000020109', quickKey: true },
];

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

      // 5. Seed starter inventory products for the new tenant
      const batch = writeBatch(db);
      DEFAULT_STARTER_PRODUCTS.forEach((prod, index) => {
        const prodId = `prod_${Date.now()}_${index + 1}`;
        const prodRef = doc(db, 'tenants', tenantId, 'products', prodId);
        batch.set(prodRef, {
          ...prod,
          id: prodId,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();

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
}
