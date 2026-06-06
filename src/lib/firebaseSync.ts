import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ERPState, Product, Category, Customer, Supplier, Order, Purchase, Expense, InventoryMovement, CompanySettings } from '../types';

/**
 * Uploads local offline ERPState directly to Firestore in batches
 */
export async function uploadAllToFirebase(state: ERPState): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. Products
    state.products.forEach((p) => {
      if (p.id) {
        const dRef = doc(db, 'products', p.id);
        batch.set(dRef, p);
      }
    });

    // 2. Categories
    state.categories.forEach((c) => {
      if (c.id) {
        const dRef = doc(db, 'categories', c.id);
        batch.set(dRef, c);
      }
    });

    // 3. Customers
    state.customers.forEach((c) => {
      if (c.id) {
        const dRef = doc(db, 'customers', c.id);
        batch.set(dRef, c);
      }
    });

    // 4. Suppliers
    state.suppliers.forEach((s) => {
      if (s.id) {
        const dRef = doc(db, 'suppliers', s.id);
        batch.set(dRef, s);
      }
    });

    // 5. Orders (Sales)
    state.orders.forEach((o) => {
      if (o.id) {
        const dRef = doc(db, 'orders', o.id);
        batch.set(dRef, {
          ...o,
          // Guard status validation according to firestore.rules enum enforcements
          status: o.status || 'completed'
        });
      }
    });

    // 6. Purchases
    state.purchases.forEach((p) => {
      if (p.id) {
        const dRef = doc(db, 'purchases', p.id);
        batch.set(dRef, p);
      }
    });

    // 7. Expenses
    state.expenses.forEach((e) => {
      if (e.id) {
        const dRef = doc(db, 'expenses', e.id);
        batch.set(dRef, e);
      }
    });

    // 8. InventoryMovements
    state.movements.forEach((m) => {
      if (m.id) {
        const dRef = doc(db, 'movements', m.id);
        batch.set(dRef, m);
      }
    });

    // 9. CompanySettings
    const sRef = doc(db, 'settings', 'company');
    batch.set(sRef, state.settings);

    // 10. System Users
    if (state.users) {
      state.users.forEach((u) => {
        if (u.id) {
          const uRef = doc(db, 'users_list', u.id);
          batch.set(uRef, u);
        }
      });
    }
    const aRef = doc(db, 'settings', 'active_session');
    batch.set(aRef, { activeUserId: state.activeUserId || 'usr_admin' });

    // Commit dynamic data
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bulk-upload-batch');
  }
}

/**
 * Downloads cloud Firestore records and matches state schemas
 */
export async function downloadAllFromFirebase(): Promise<Partial<ERPState>> {
  const result: Partial<ERPState> = {};
  try {
    // Products
    const prodSnap = await getDocs(collection(db, 'products'));
    result.products = prodSnap.docs.map((d) => d.data() as Product);

    // Categories
    const catSnap = await getDocs(collection(db, 'categories'));
    result.categories = catSnap.docs.map((d) => d.data() as Category);

    // Customers
    const custSnap = await getDocs(collection(db, 'customers'));
    result.customers = custSnap.docs.map((d) => d.data() as Customer);

    // Suppliers
    const supSnap = await getDocs(collection(db, 'suppliers'));
    result.suppliers = supSnap.docs.map((d) => d.data() as Supplier);

    // Orders
    const ordSnap = await getDocs(collection(db, 'orders'));
    result.orders = ordSnap.docs.map((d) => d.data() as Order);

    // Purchases
    const purSnap = await getDocs(collection(db, 'purchases'));
    result.purchases = purSnap.docs.map((d) => d.data() as Purchase);

    // Expenses
    const expSnap = await getDocs(collection(db, 'expenses'));
    result.expenses = expSnap.docs.map((d) => d.data() as Expense);

    // Movements
    const movSnap = await getDocs(collection(db, 'movements'));
    result.movements = movSnap.docs.map((d) => d.data() as InventoryMovement);

    // Settings
    const setSnap = await getDocs(collection(db, 'settings'));
    const companyDoc = setSnap.docs.find((d) => d.id === 'company');
    if (companyDoc) {
      result.settings = companyDoc.data() as CompanySettings;
    }
    const activeDoc = setSnap.docs.find((d) => d.id === 'active_session');
    if (activeDoc) {
      result.activeUserId = activeDoc.data()?.activeUserId;
    }

    // Users
    try {
      const userSnap = await getDocs(collection(db, 'users_list'));
      result.users = userSnap.docs.map((d) => d.data() as any);
    } catch (err) {
      console.warn("Could not download users list (might not have permissions or be created yet).", err);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bulk-download');
  }

  return result;
}
