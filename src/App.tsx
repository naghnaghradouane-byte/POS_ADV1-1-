import React from 'react';
import { ERPState, Product, Category, Customer, Supplier, Order, Purchase, Expense, InventoryMovement, CompanySettings, SystemUser } from './types';
import { initialERPState } from './data/initialData';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, loginWithEmail, registerWithEmail, logoutUser, db } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { uploadAllToFirebase, downloadAllFromFirebase } from './lib/firebaseSync';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Cloud, ShieldAlert, Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon, X, Sun, Moon, Database, Settings } from 'lucide-react';
import { useTranslation } from './context/LanguageContext';

// import view modules
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import POSView from './components/POSView';
import ProductsView from './components/ProductsView';
import CategoriesView from './components/CategoriesView';
import CustomersView from './components/CustomersView';
import SuppliersView from './components/SuppliersView';
import InventoryView from './components/InventoryView';
import PurchasesView from './components/PurchasesView';
import SalesView from './components/SalesView';
import ExpensesView from './components/ExpensesView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import UsersView from './components/UsersView';

const STORAGE_KEY = 'SMART_POS_ERP_STATE_V1';

export default function App() {
  const { lang, setLang, t } = useTranslation();
  const [currentView, setCurrentView] = React.useState<string>('dashboard');
  const [syncing, setSyncing] = React.useState<boolean>(false);
  const [user, setUser] = React.useState<User | null>(null);

  // Load and apply persistent light/dark mode preference
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('POS_THEME');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('POS_THEME', theme);
  }, [theme]);

  // Native Cloud Auth Modal states (for phone compatibility where popups fail)
  const [showLoginModal, setShowLoginModal] = React.useState<boolean>(false);
  const [authEmail, setAuthEmail] = React.useState<string>('');
  const [authPass, setAuthPass] = React.useState<string>('');
  const [authName, setAuthName] = React.useState<string>('');
  const [isRegisterMode, setIsRegisterMode] = React.useState<boolean>(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [authWorking, setAuthWorking] = React.useState<boolean>(false);

  // Custom Firebase configuration states inside the log in popup
  const [showModalCustomFirebase, setShowModalCustomFirebase] = React.useState<boolean>(false);
  const [modalRawJsonInput, setModalRawJsonInput] = React.useState<string>('');
  const [state, setState] = React.useState<ERPState>(() => {
    // Attempt local storage loading for durable offline preservation
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Seamlessly upgrade from the truncated/old food and disinfectant catalog to the premium 20+ cosmetics catalog!
        const hasOldData = parsed.products && parsed.products.some((p: any) => 
          p.name.includes('أرز') || p.name.includes('دقيق') || p.name.includes('كلوركس') || p.name.includes('حليب')
        );
        if (hasOldData) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initialERPState));
          return initialERPState;
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse offline state, loading defaults.', e);
      }
    }
    return initialERPState;
  });

  // Track user login state changes
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });
    return unsubscribe;
  }, []);

  // Real-time synchronization of customers with Firebase Firestore when logged in
  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        const customersList: Customer[] = [];
        snapshot.forEach((docSnap) => {
          customersList.push(docSnap.data() as Customer);
        });
        if (customersList.length > 0) {
          setState((prev) => {
            // Merge matching documents, prioritizing the latest updated or newly registered ones
            const merged = [...prev.customers];
            customersList.forEach((c) => {
              const idx = merged.findIndex((m) => m.id === c.id);
              if (idx > -1) {
                const existingUpdated = merged[idx].updatedAt || '';
                const incomingUpdated = c.updatedAt || '';
                if (incomingUpdated >= existingUpdated) {
                  merged[idx] = c;
                }
              } else {
                merged.push(c);
              }
            });
            return { ...prev, customers: merged };
          });
        }
      },
      (error) => {
        console.error('Real-time customers sync onSnapshot error:', error);
      }
    );
    return unsubscribe;
  }, [user]);

  // Keep localStorage updated with every state change automatically
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const users = state.users || [];
  const activeUserId = state.activeUserId || 'usr_admin';
  const activeUser = users.find(u => u.id === activeUserId) || users[0] || {
    id: 'usr_admin',
    name: 'عبدالرحمن العتيبي (المالك)',
    username: 'admin',
    phone: '0555555555',
    pinCode: '1234',
    role: 'admin',
    permissions: {
      dashboard: true,
      pos: true,
      products: true,
      categories: true,
      customers: true,
      suppliers: true,
      inventory: true,
      purchases: true,
      sales: true,
      expenses: true,
      reports: true,
      settings: true,
      editInvoices: true,
      returnItems: true,
    }
  };

  // Redirect if currentView has no permission
  React.useEffect(() => {
    if (activeUser && activeUser.permissions) {
      const viewKey = currentView as keyof typeof activeUser.permissions;
      if (activeUser.permissions[viewKey] === false) {
        // Find first allowed view, fallback to 'pos'
        const allowedViews = (Object.keys(activeUser.permissions) as (keyof typeof activeUser.permissions)[])
          .filter(k => activeUser.permissions[k] === true);
        if (allowedViews.length > 0) {
          setCurrentView(allowedViews[0]);
        } else {
          setCurrentView('pos');
        }
      }
    }
  }, [state.activeUserId, currentView, activeUser]);

  // Synchronise system data package on login success
  const syncOnLoginSuccess = async (usr: any) => {
    try {
      setSyncing(true);
      const cloudData = await downloadAllFromFirebase();
      if (cloudData.products && cloudData.products.length > 0) {
        setState({
          products: cloudData.products || [],
          categories: cloudData.categories || [],
          customers: cloudData.customers || [],
          suppliers: cloudData.suppliers || [],
          orders: cloudData.orders || [],
          purchases: cloudData.purchases || [],
          expenses: cloudData.expenses || [],
          movements: cloudData.movements || [],
          settings: cloudData.settings || state.settings,
          users: cloudData.users || state.users || [],
          activeUserId: cloudData.activeUserId || state.activeUserId || 'usr_admin',
        });
      } else {
        // Upload local data to provision brand-new account storage
        await uploadAllToFirebase(state);
      }
    } catch (e) {
      console.error('Data Sync failed: ', e);
    } finally {
      setSyncing(false);
    }
  };

  // Google Sign-In with automatic sync integration
  const handleLogin = async () => {
    setAuthError(null);
    setIsRegisterMode(false);
    setAuthEmail('');
    setAuthPass('');
    setAuthName('');
    setShowLoginModal(true);
  };

  const handleGoogleSignInInline = async () => {
    try {
      setAuthWorking(true);
      setAuthError(null);
      const usr = await loginWithGoogle();
      if (usr) {
        await syncOnLoginSuccess(usr);
        setShowLoginModal(false);
      }
    } catch (e: any) {
      setAuthError(e.message || 'فشل تسجيل الدخول عبر حساب جوجل.');
    } finally {
      setAuthWorking(false);
    }
  };

  const handleEmailSignInInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPass) {
      setAuthError('يرجى كتابة البريد الإلكتروني وكلمة المرور.');
      return;
    }
    try {
      setAuthWorking(true);
      setAuthError(null);
      const usr = await loginWithEmail(authEmail, authPass);
      if (usr) {
        await syncOnLoginSuccess(usr);
        setShowLoginModal(false);
      }
    } catch (e: any) {
      let friendlyError = e.message;
      if (e.code === 'auth/wrong-password' || friendlyError.includes('password') || friendlyError.includes('credential')) {
        friendlyError = 'كلمة المرور أو البريد الإلكتروني غير صحيح، يرجى إعادة التحقق.';
      } else if (e.code === 'auth/user-not-found' || friendlyError.includes('user-not-found')) {
        friendlyError = 'هذا البريد الإلكتروني غير مرتبط بأي حساب نشط.';
      }
      setAuthError(friendlyError);
    } finally {
      setAuthWorking(false);
    }
  };

  const handleEmailRegisterInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPass || !authName) {
      setAuthError('يرجى تعبئة كافة الحقول المطلوبة لإنشاء حساب سحابي.');
      return;
    }
    if (authPass.length < 6) {
      setAuthError('يجب أن لا تقل قوة كلمة المرور عن 6 خانات أو حروف.');
      return;
    }
    try {
      setAuthWorking(true);
      setAuthError(null);
      const usr = await registerWithEmail(authEmail, authPass, authName);
      if (usr) {
        await syncOnLoginSuccess(usr);
        setShowLoginModal(false);
      }
    } catch (e: any) {
      let friendlyError = e.message;
      if (e.code === 'auth/email-already-in-use' || friendlyError.includes('email-already-in-use')) {
        friendlyError = 'البريد الإلكتروني مسجل بالفعل لصاحب منشأة أخرى.';
      }
      setAuthError(friendlyError);
    } finally {
      setAuthWorking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
    } catch (e) {
      console.error('Logout error: ', e);
    }
  };

  // True Multi-directional Sync (Backup / Restore)
  const handleTriggerSync = async () => {
    if (!auth.currentUser) return;
    setSyncing(true);
    try {
      const cloudData = await downloadAllFromFirebase();
      if (cloudData.products && cloudData.products.length > 0) {
        const syncedState: ERPState = {
          products: cloudData.products,
          categories: cloudData.categories || [],
          customers: cloudData.customers || [],
          suppliers: cloudData.suppliers || [],
          orders: cloudData.orders || [],
          purchases: cloudData.purchases || [],
          expenses: cloudData.expenses || [],
          movements: cloudData.movements || [],
          settings: cloudData.settings || state.settings,
          users: cloudData.users || state.users || [],
          activeUserId: cloudData.activeUserId || state.activeUserId || 'usr_admin',
        };
        setState(syncedState);
        await uploadAllToFirebase(syncedState);
      } else {
        // Empty cloud database, backup current local state
        await uploadAllToFirebase(state);
      }
    } catch (e) {
      console.error('Cloud Sync error: ', e);
    } finally {
      setSyncing(false);
    }
  };

  // Factory reset trigger
  const handleResetDatabase = () => {
    setState(initialERPState);
    setCurrentView('dashboard');
  };

  // --- CRUD State Handlers ---

  // Products
  const handleAddProduct = (prod: Product) => {
    setState((prev) => ({
      ...prev,
      products: [prod, ...prev.products],
    }));
  };

  const handleUpdateProduct = (prod: Product) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === prod.id ? prod : p)),
    }));
  };

  const handleDeleteProduct = (id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  // Categories
  const handleAddCategory = (cat: Category) => {
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, cat],
    }));
  };

  const handleUpdateCategory = (cat: Category) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === cat.id ? cat : c)),
    }));
  };

  const handleDeleteCategory = (id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
  };

  // Customers (CRM)
  const handleAddCustomer = async (cust: Customer) => {
    const now = new Date().toISOString();
    const enrichedCust = {
      ...cust,
      createdAt: cust.createdAt || now,
      updatedAt: now,
    };
    setState((prev) => ({
      ...prev,
      customers: [...prev.customers, enrichedCust],
    }));

    if (user) {
      try {
        await setDoc(doc(db, 'customers', enrichedCust.id), enrichedCust);
      } catch (err) {
        console.error('Firestore real-time write failed:', err);
      }
    }
  };

  const handleUpdateCustomer = async (cust: Customer) => {
    const now = new Date().toISOString();
    const enrichedCust = {
      ...cust,
      updatedAt: now,
    };
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === cust.id ? enrichedCust : c)),
    }));

    if (user) {
      try {
        await setDoc(doc(db, 'customers', enrichedCust.id), enrichedCust);
      } catch (err) {
        console.error('Firestore real-time update failed:', err);
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));

    if (user) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        console.error('Firestore real-time delete failed:', err);
      }
    }
  };

  // Update customer balance (Debt modifications)
  const handleUpdateCustomerBalance = (customerId: string, balanceChange: number) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId ? { ...c, balance: c.balance + balanceChange } : c
      ),
    }));
  };

  // Suppliers
  const handleAddSupplier = (sup: Supplier) => {
    setState((prev) => ({
      ...prev,
      suppliers: [...prev.suppliers, sup],
    }));
  };

  const handleUpdateSupplier = (sup: Supplier) => {
    setState((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => (s.id === sup.id ? sup : s)),
    }));
  };

  const handleDeleteSupplier = (id: string) => {
    setState((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
    }));
  };

  // Update supplier payable balance value
  const handleUpdateSupplierPayables = (supplierId: string, balanceChange: number) => {
    setState((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) =>
        s.id === supplierId ? { ...s, payables: s.payables + balanceChange } : s
      ),
    }));
  };

  // Invoices (Sales Orders)
  const handleAddOrder = (order: Order) => {
    setState((prev) => ({
      ...prev,
      orders: [order, ...prev.orders],
    }));
  };

  const handleRefundOrder = (orderId: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'refunded' as const } : o
      ),
    }));
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
    }));
  };

  // Procurement purchases
  const handleAddPurchase = (purchase: Purchase) => {
    setState((prev) => ({
      ...prev,
      purchases: [purchase, ...prev.purchases],
    }));
  };

  // Expenses logs
  const handleAddExpense = (exp: Expense) => {
    setState((prev) => ({
      ...prev,
      expenses: [exp, ...prev.expenses],
    }));
  };

  const handleDeleteExpense = (id: string) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  // Inventory movements
  const handleAddMovement = (m: InventoryMovement) => {
    setState((prev) => ({
      ...prev,
      movements: [m, ...prev.movements],
    }));
  };

  // Custom bulk stock addition/subtraction
  const handleAdjustProductStock = (productId: string, val: number) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, stockQuantity: Math.max(0, p.stockQuantity + val) } : p
      ),
    }));
  };

  // Settings
  const handleUpdateSettings = (updated: CompanySettings) => {
    setState((prev) => ({
      ...prev,
      settings: updated,
    }));
  };

  // --- Staff & Permissions Handlers ---
  const handleAddUser = (newUser: SystemUser) => {
    setState((prev) => ({
      ...prev,
      users: [...(prev.users || []), newUser],
    }));
  };

  const handleUpdateUser = (updatedUser: SystemUser) => {
    setState((prev) => ({
      ...prev,
      users: (prev.users || []).map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    }));
  };

  const handleDeleteUser = (userId: string) => {
    setState((prev) => ({
      ...prev,
      users: (prev.users || []).filter((u) => u.id !== userId),
    }));
  };

  const handleSwitchUser = (userId: string) => {
    setState((prev) => ({
      ...prev,
      activeUserId: userId,
    }));
  };

  // --- Render Router ---
  const renderViewContent = () => {
    const sym = state.settings.currencySymbol;

    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            products={state.products}
            orders={state.orders}
            expenses={state.expenses}
            onNavigate={setCurrentView}
            currencySymbol={sym}
          />
        );

      case 'pos':
        return (
          <POSView
            products={state.products}
            categories={state.categories}
            customers={state.customers}
            orders={state.orders}
            onAddOrder={handleAddOrder}
            onUpdateInventory={(prodId, qty) => handleAdjustProductStock(prodId, -qty)}
            onUpdateCustomerBalance={handleUpdateCustomerBalance}
            currencySymbol={sym}
            defaultTaxRate={state.settings.taxRate}
            settings={state.settings}
          />
        );

      case 'products':
        return (
          <ProductsView
            products={state.products}
            categories={state.categories}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            currencySymbol={sym}
          />
        );

      case 'categories':
        return (
          <CategoriesView
            categories={state.categories}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );

      case 'customers':
        return (
          <CustomersView
            customers={state.customers}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            activeUser={activeUser}
          />
        );

      case 'suppliers':
        return (
          <SuppliersView
            suppliers={state.suppliers}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            currencySymbol={sym}
          />
        );

      case 'inventory':
        return (
          <InventoryView
            products={state.products}
            movements={state.movements}
            onAddMovement={handleAddMovement}
            onAdjustProductStock={handleAdjustProductStock}
            currencySymbol={sym}
          />
        );

      case 'purchases':
        return (
          <PurchasesView
            products={state.products}
            suppliers={state.suppliers}
            purchases={state.purchases}
            onAddPurchase={handleAddPurchase}
            onAdjustProductStock={handleAdjustProductStock}
            onUpdateSupplierPayables={handleUpdateSupplierPayables}
            currencySymbol={sym}
          />
        );

      case 'sales':
        return (
          <SalesView
            orders={state.orders}
            products={state.products}
            customers={state.customers}
            onRefundOrder={handleRefundOrder}
            onUpdateOrder={handleUpdateOrder}
            onRestockProduct={handleAdjustProductStock}
            onUpdateCustomerBalance={handleUpdateCustomerBalance}
            currencySymbol={sym}
            activeUser={activeUser}
            settings={state.settings}
          />
        );

      case 'expenses':
        return (
          <ExpensesView
            expenses={state.expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            currencySymbol={sym}
          />
        );

      case 'reports':
        return (
          <ReportsView
            products={state.products}
            orders={state.orders}
            purchases={state.purchases}
            expenses={state.expenses}
            customers={state.customers}
            suppliers={state.suppliers}
            currencySymbol={sym}
          />
        );

      case 'settings':
        return (
          <SettingsView
            settings={state.settings}
            onUpdateSettings={handleUpdateSettings}
            onTriggerSync={handleCloudSyncSimulator}
            syncing={syncing}
            onResetDatabase={handleResetDatabase}
          />
        );

      case 'users':
        return (
          <UsersView
            users={state.users || []}
            activeUserId={activeUserId}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onSwitchUser={handleSwitchUser}
          />
        );

      default:
        return (
          <div className="py-20 text-center text-slate-400 font-bold">
            هذا القسم قيد التجهيز الفني...
          </div>
        );
    }
  };

  // Background Cloud synchronization logs generator helper
  const handleCloudSyncSimulator = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 2000);
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row font-sans overflow-x-hidden antialiased transition-colors duration-200"
    >
      {/* Sidebar for navigations */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        syncing={syncing}
        onTriggerSync={handleTriggerSync}
        companyName={state.settings.name}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        activeUser={activeUser}
        users={state.users || []}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main viewport area layout */}
      <main className="flex-1 overflow-y-auto h-screen p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumb row header */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none shrink-0 transition-colors duration-200">
          <div className="space-y-0.5">
            {user ? (
              <span className="text-[10px] bg-emerald-100/80 dark:bg-emerald-950/45 text-emerald-805 dark:text-emerald-350 px-2.5 py-0.5 rounded-full font-bold">
                {t('header.cloudConnected')}
              </span>
            ) : (
              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                {t('header.offlineMode')}
              </span>
            )}
            <h2 className="font-extrabold text-slate-905 dark:text-white tracking-wide text-sm sm:text-base">
              {currentView === 'dashboard' ? t('dashboard.title') :
               currentView === 'pos' ? t('pos.title') :
               currentView === 'products' ? t('products.title') :
               currentView === 'categories' ? t('categories.title') :
               currentView === 'customers' ? t('customers.title') :
               currentView === 'suppliers' ? t('suppliers.title') :
               currentView === 'inventory' ? t('inventory.title') :
               currentView === 'purchases' ? t('purchases.title') :
               currentView === 'sales' ? t('sales.title') :
               currentView === 'expenses' ? t('expenses.title') :
               currentView === 'reports' ? t('reports.title') :
               t('settings.title')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Toggle Button */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              title={lang === 'ar' ? 'Passer en Français' : 'تغيير إلى العربية'}
              id="language-toggle-btn"
            >
              <span className="text-sm">🌐</span>
              <span className="hidden sm:inline font-bold text-xs">{lang === 'ar' ? 'Français' : 'العربية'}</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-605 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              title={theme === 'dark' ? 'تفعيل الوضع المضيء' : 'تفعيل الوضع الداكن'}
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} className="text-amber-400" />
                  <span className="hidden sm:inline font-bold text-xs">{t('header.lightMode')}</span>
                </>
              ) : (
                <>
                  <Moon size={15} className="text-slate-650" />
                  <span className="hidden sm:inline font-bold text-xs">{t('header.darkMode')}</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-3 font-medium text-xs text-slate-500 dark:text-slate-400">
              <span>{t('header.section')}:</span>
              <span className="font-bold text-indigo-650 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg">
                {currentView.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic component layout container */}
        <div className="animate-fade-in relative">
          {renderViewContent()}
        </div>
      </main>

      {/* --- Responsive Cloud Login Modal overlay --- */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-[340px] sm:max-w-md overflow-hidden shadow-2xl border border-slate-100 text-slate-800 flex flex-col text-right animate-scale-up"
            >
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Cloud size={16} className="text-emerald-400 animate-pulse" />
                  <span className="font-bold text-xs sm:text-sm">بوابة المزامنة السحابية • Sync Portal</span>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 w-6 h-6 flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-xs text-red-700 flex items-start gap-2 leading-relaxed">
                    <ShieldAlert size={16} className="shrink-0 text-red-500 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Login/Register Form */}
                <form onSubmit={isRegisterMode ? handleEmailRegisterInline : handleEmailSignInInline} className="space-y-4">
                  {isRegisterMode && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">اسم المتجر أو المالك:</label>
                      <div className="relative">
                        <UserIcon size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition leading-relaxed text-right font-bold"
                          placeholder="مثال: سوبرماركت البرق"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">البريد الإلكتروني للقرص السحابي:</label>
                    <div className="relative">
                      <Mail size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition leading-relaxed text-left font-mono"
                        placeholder="name@owner.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">كلمة المرور السحابية:</label>
                    <div className="relative">
                      <Lock size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={authPass}
                        onChange={(e) => setAuthPass(e.target.value)}
                        className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition leading-relaxed text-left font-mono"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authWorking}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                  >
                    {authWorking ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <LogIn size={14} />
                    )}
                    <span>
                      {isRegisterMode 
                        ? 'إنشاء حساب جديد وتفعيل المزامنة' 
                        : 'تسجيل الدخول ومزامنة النظام'}
                    </span>
                  </button>
                </form>

                {/* Toggle Login/Register */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode);
                      setAuthError(null);
                    }}
                    className="text-xs text-indigo-650 hover:text-indigo-800 font-bold underline transition"
                  >
                    {isRegisterMode 
                      ? 'لديك حساب بالفعل؟ سجل دخولك من هنا' 
                      : 'ليس لديك حساب سحابي؟ سجل منشأتك مجاناً الآن'}
                  </button>
                </div>

                {/* Or divider */}
                <div className="relative my-3 flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-150"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase font-mono">أو عن طريق جوجل</span>
                  <div className="flex-grow border-t border-slate-150"></div>
                </div>

                {/* Google Google SSO Login */}
                <button
                  onClick={handleGoogleSignInInline}
                  disabled={authWorking}
                  type="button"
                  className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-205 text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {authWorking ? (
                    <Loader2 size={13} className="animate-spin text-slate-500" />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6a5.64 5.64 0 0 1-2.44 3.7l3.8 2.93c2.23-2.05 3.78-5.07 3.78-8.46Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.8-2.93c-1.05.7-2.4 1.13-4.13 1.13-3.18 0-5.86-2.15-6.82-5.05L1.31 17.3c2.01 4 6.13 6.7 10.69 6.7Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.18 14.19A7.16 7.16 0 0 1 4.8 12c0-.76.13-1.5.38-2.19L1.31 6.88A11.94 11.94 0 0 0 0 12c0 1.87.43 3.64 1.19 5.23l3.99-3.04Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.44 0 3.32 2.7 1.31 6.88l3.87 3.03c.96-2.9 3.64-5.16 6.82-5.16Z"
                      />
                    </svg>
                  )}
                  <span>الدخول السريع بحساب Google</span>
                </button>

                {/* Custom Firebase Setup Toggle inside Modal */}
                <div className="pt-2 border-t border-slate-100 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setShowModalCustomFirebase(!showModalCustomFirebase)}
                    className="text-[11px] text-slate-500 hover:text-indigo-650 font-black underline flex items-center gap-1 transition"
                  >
                    <Settings size={12} />
                    <span>أو ربط خادم سحابي مخصص لقاعدة بياناتك الخاصّة</span>
                  </button>

                  {showModalCustomFirebase && (
                    <div className="w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-right space-y-2 animate-scale-up">
                      <span className="text-[10px] font-black text-slate-700 block">ألصق كود الـ Config المُستخرج من لوحة تحكم Firebase:</span>
                      <textarea
                        placeholder='ألصق كود الـ Config هنا، مثال:
{
  "apiKey": "AIzaSy...",
  "projectId": "my-project",
  "appId": "..."
}'
                        value={modalRawJsonInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setModalRawJsonInput(val);
                          try {
                            let cleaned = val.trim();
                            if (cleaned.includes('{')) {
                              cleaned = cleaned.substring(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1);
                            }
                            const parsed = JSON.parse(cleaned);
                            if (parsed.apiKey && parsed.projectId && parsed.appId) {
                              localStorage.setItem('CUSTOM_FIREBASE_CONFIG', JSON.stringify(parsed));
                              alert('🟢 تم ربط خادمك الخاص بنجاح! سيتم إعادة تحديث النظام تلقائياً للبدء بالعمل على سحابتك مبيّتاً...');
                              window.location.reload();
                            }
                          } catch (err) {
                            // wait for complete JSON input
                          }
                        }}
                        rows={3}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <p className="text-[9px] text-slate-400 leading-normal">
                        ملاحظة: بمجرد لصق الـ Config بشكل صحيح، يعاد تشغيل السيستم فوراً للاتصال بسيرفرك. يمكنك إلغاء الربط في أي وقت من شاشة الإعدادات.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
