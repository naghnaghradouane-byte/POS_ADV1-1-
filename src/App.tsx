import React from 'react';
import { ERPState, Product, Category, Customer, Supplier, Order, Purchase, Expense, InventoryMovement, CompanySettings, SystemUser } from './types';
import { initialERPState } from './data/initialData';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, getGoogleRedirectResult, loginWithEmail, registerWithEmail, logoutUser, db, testFirebaseConfigDirect, firebaseInitError } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { uploadAllToFirebase, downloadAllFromFirebase } from './lib/firebaseSync';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Cloud, ShieldAlert, Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon, X, Sun, Moon, Database, Settings, CheckCircle2 } from 'lucide-react';
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
  const [authIsUnauthorizedDomain, setAuthIsUnauthorizedDomain] = React.useState<boolean>(false);
  const [copiedDomain, setCopiedDomain] = React.useState<boolean>(false);

  // Custom Firebase configuration states inside the log in popup
  const [showModalCustomFirebase, setShowModalCustomFirebase] = React.useState<boolean>(false);
  const [modalRawJsonInput, setModalRawJsonInput] = React.useState<string>('');
  const [customFirebaseError, setCustomFirebaseError] = React.useState<string | null>(null);
  const [testingCustomFirebase, setTestingCustomFirebase] = React.useState<boolean>(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string; details?: string } | null>(null);
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

  // Track user login state, redirect results and sync on mount
  React.useEffect(() => {
    const handleInitialAuth = async () => {
      try {
        const redirectedUser = await getGoogleRedirectResult();
        if (redirectedUser) {
          setUser(redirectedUser);
          await syncOnLoginSuccess(redirectedUser);
        }
      } catch (error: any) {
        console.error('Failed to resolve Google redirect path:', error);
        const isUnauthorized = error?.code === 'auth/unauthorized-domain' || 
          (error?.message && error?.message.includes('unauthorized-domain'));
        if (isUnauthorized) {
          setAuthIsUnauthorizedDomain(true);
        }
        setAuthError(error.message || (lang === 'ar' ? 'فشل تسجيل الدخول عبر حساب جوجل.' : 'Échec de la connexion via Google.'));
        setShowLoginModal(true);
      }
    };

    handleInitialAuth();

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

  // Smart/Flexible custom Firebase configuration parser, validator, and connection tester
  const handleValidateCustomFirebase = async () => {
    setCustomFirebaseError(null);
    setTestResult(null);
    const val = modalRawJsonInput.trim();
    if (!val) {
      setCustomFirebaseError(lang === 'ar' ? 'يرجى لصق كود الإعداد أولاً.' : 'Veuillez d\'abord coller la configuration.');
      return;
    }

    const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
    const config: Record<string, string> = {};

    // 1. Try to extract using Regex (most robust for both Javascript style and JSON formats)
    let foundCount = 0;
    keys.forEach(key => {
      // Look for key : "value" or key = "value" with optional quotes around key, and single/double/backticks quotes around value
      const regex = new RegExp(`['"]?${key}['"]?\\s*[:=]\\s*['"\`]([^'"\`]+)['"\`]`, 'i');
      const match = val.match(regex);
      if (match && match[1]) {
        config[key] = match[1].trim();
        foundCount++;
      }
    });

    // 2. Fallback to clean JSON parsing if Regex did not find critical fields
    if (!config.apiKey || !config.projectId || !config.appId) {
      try {
        let cleaned = val;
        if (cleaned.includes('{')) {
          cleaned = cleaned.substring(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1);
        }
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === 'object') {
          keys.forEach(k => {
            if (parsed[k]) config[k] = String(parsed[k]);
          });
        }
      } catch (err) {
        // quiet ignore, we use Regex
      }
    }

    // Check if the critical configuration fields are present
    if (config.apiKey && config.projectId && config.appId) {
      try {
        setTestingCustomFirebase(true);
        const result = await testFirebaseConfigDirect(config);
        setTestResult(result);
        if (result.success) {
          localStorage.setItem('CUSTOM_FIREBASE_CONFIG', JSON.stringify(config));
          // Success feedback showing result to user before loading
          setTimeout(() => {
            alert(lang === 'ar' 
              ? '🟢 تم اختبار وربط السيرفر بنجاح! سيتم إعادة تحديث النظام تلقائياً للبدء بالعمل على خادمك الجديد...' 
              : '🟢 Serveur Firebase personnalisé connecté avec succès ! L\'application va redémarrer...');
            window.location.reload();
          }, 2000);
        } else {
          setCustomFirebaseError(lang === 'ar' 
            ? `⚠️ فشل الاتصال بقاعدة البيانات. التفاصيل: ${result.details}`
            : `⚠️ Échec de la connexion. Détails : ${result.details}`);
        }
      } catch (testErr: any) {
        setCustomFirebaseError(testErr?.message || String(testErr));
      } finally {
        setTestingCustomFirebase(false);
      }
    } else {
      setCustomFirebaseError(lang === 'ar' 
        ? '⚠️ الكود المُلصق غير صحيح أو تنقصه بعض الحقول الأساسية (مثل apiKey, projectId, appId).' 
        : '⚠️ Code de configuration non valide ou champs essentiels manquants (apiKey, projectId, appId).');
    }
  };

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
    } catch (e: any) {
      console.error('Data Sync failed: ', e);
      throw e; // re-throw so the UI showLoginModal captures block errors
    } finally {
      setSyncing(false);
    }
  };

  // Google Sign-In with automatic sync integration
  const handleLogin = async () => {
    setAuthError(null);
    setAuthIsUnauthorizedDomain(false);
    setIsRegisterMode(false);
    setAuthEmail('');
    setAuthPass('');
    setAuthName('');
    setShowLoginModal(true);
  };

  const handleGoogleSignInInline = async () => {
    try {
      setAuthWorking(true);
      setAuthIsUnauthorizedDomain(false);
      setAuthError(lang === 'ar' 
        ? 'جاري توجيهك إلى صفحة تسجيل الدخول من جوجل... يرجى الانتظار.' 
        : 'Redirection vers la page de connexion Google... Veuillez patienter.');
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        await syncOnLoginSuccess(loggedUser);
        setShowLoginModal(false);
      }
    } catch (e: any) {
      console.error('Google authorization error:', e);
      const isUnauthorized = e?.code === 'auth/unauthorized-domain' || 
        (e?.message && e?.message.includes('unauthorized-domain'));
      if (isUnauthorized) {
        setAuthIsUnauthorizedDomain(true);
      }
      setAuthError(e.message || (lang === 'ar' ? 'فشل بدء تسجيل الدخول عبر حساب جوجل.' : 'Échec de la connexion via Google.'));
      setAuthWorking(false);
    }
  };

  const handleEmailSignInInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPass) {
      setAuthError(lang === 'ar' ? 'يرجى كتابة البريد الإلكتروني وكلمة المرور.' : 'Veuillez saisir votre e-mail et votre mot de passe.');
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
        friendlyError = lang === 'ar' 
          ? 'كلمة المرور أو البريد الإلكتروني غير صحيح، يرجى إعادة التحقق.' 
          : 'E-mail ou mot de passe incorrect, veuillez vérifier.';
      } else if (e.code === 'auth/user-not-found' || friendlyError.includes('user-not-found')) {
        friendlyError = lang === 'ar' 
          ? 'هذا البريد الإلكتروني غير مرتبط بأي حساب نشط.' 
          : "Cet e-mail n'est associé à aucun compte actif.";
      }
      setAuthError(friendlyError);
    } finally {
      setAuthWorking(false);
    }
  };

  const handleEmailRegisterInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPass || !authName) {
      setAuthError(lang === 'ar' ? 'يرجى تعبئة كافة الحقول المطلوبة لإنشاء حساب سحابي.' : 'Veuillez remplir tous les champs requis pour créer un compte Cloud.');
      return;
    }
    if (authPass.length < 6) {
      setAuthError(lang === 'ar' ? 'يجب أن لا تقل قوة كلمة المرور عن 6 خانات أو حروف.' : 'Le mot de passe doit contenir au moins 6 caractères.');
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
        friendlyError = lang === 'ar' 
          ? 'البريد الإلكتروني مسجل بالفعل لصاحب منشأة أخرى.' 
          : 'Cet e-mail est déjà enregistré pour un autre établissement.';
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
        {firebaseInitError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-rose-800 text-xs font-medium max-w-7xl mx-auto">
            <div>
              <span className="font-extrabold text-rose-900 block mb-0.5">⚠️ خطأ في تشغيل السيرفر المخصص / Erreur d'initialisation</span>
              تفاصيل الخطأ: {firebaseInitError}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('CUSTOM_FIREBASE_CONFIG');
                window.location.reload();
              }}
              className="px-3.5 py-1.5 bg-rose-150 hover:bg-rose-200 text-rose-800 rounded-xl font-bold shrink-0 transition cursor-pointer"
            >
              إعادة ضبط للوضع التلقائي / Réinitialiser
            </button>
          </div>
        )}

        {localStorage.getItem('CUSTOM_FIREBASE_CONFIG') && !user && !firebaseInitError && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-150 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-indigo-805 text-xs font-medium max-w-7xl mx-auto">
            <div className="space-y-1">
              <span className="font-extrabold text-indigo-950 block">🟢 تم ربط خادمك الخاص بنجاح! السيرفر نشط حالياً</span>
              <p className="text-slate-500 font-bold leading-normal">
                لكن لم يتم مصادقتك على هذا الخادم بعد. للبدء بمزامنة الفواتير والمنتجات سحابياً، تفضل بـ <button onClick={handleLogin} className="text-indigo-600 hover:text-indigo-800 font-black underline cursor-pointer">تسجيل الدخول</button> أو إنشاء حساب جديد على خادمك الخاص.
              </p>
            </div>
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shrink-0 transition shadow-sm cursor-pointer"
            >
              تسجيل الدخول للسيرفر الخاص
            </button>
          </div>
        )}
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
              title={theme === 'dark' ? "Désactiver le Mode Sombre" : "Activer le Mode Sombre"}
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
              className="bg-white rounded-3xl w-full max-w-[340px] sm:max-w-md overflow-hidden shadow-2xl border border-slate-100 text-slate-800 flex flex-col text-left animate-scale-up"
              dir="ltr"
            >
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 text-left">
                <div className="flex items-center gap-2">
                  <Cloud size={16} className="text-emerald-400 animate-pulse" />
                  <span className="font-bold text-xs sm:text-sm text-left">
                    Portail de Synchronisation Cloud
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 w-6 h-6 flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh] text-left">
                {authError && (
                  <div className="space-y-2 font-sans animate-fade-in">
                    <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-xs text-red-700 flex items-start gap-2 leading-relaxed text-left">
                      <ShieldAlert size={16} className="shrink-0 text-red-500 mt-0.5" />
                      <span>{authError}</span>
                    </div>

                    {/* Highly supportive tips for invalid-credential or user-not-found to prevent frustration */}
                    {(authError.toLowerCase().includes('credential') || authError.toLowerCase().includes('password') || authError.toLowerCase().includes('user-not-found') || authError.toLowerCase().includes('incorrect') || authError.toLowerCase().includes('invalid')) && (
                      <div className="p-3 bg-indigo-50/75 border border-indigo-150 rounded-xl text-[11px] text-slate-700 space-y-2 leading-relaxed text-left">
                        <div className="font-bold text-indigo-750 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span>{lang === 'ar' ? 'إليك طرق الحل السريعة:' : 'Conseils pour résoudre ce problème :'}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-1 text-[10.5px] text-slate-650">
                          <li>
                            <strong className="text-indigo-850">
                              {lang === 'ar' ? 'هل تملك حساباً بالفعل؟' : 'Avez-vous déjà créé un compte ?'}
                            </strong>{' '}
                            {lang === 'ar' 
                              ? 'إذا كانت هذه أول مرة تستخدم فيها التطبيق أو قمت بتغيير مخدم السحاب، فيرجى الضغط على زر "إنشاء حساب سحابي مجاني جديد" بالأسفل لإنشاء حساب جديد أولاً.'
                              : 'S\'il s\'agit de votre première utilisation ou si vous venez de lier un nouveau serveur, veuillez cliquer sur "Créer un nouveau compte Cloud gratuit" ci-dessous pour vous enregistrer.'
                            }
                          </li>
                          <li>
                            <strong className="text-indigo-850">
                              {lang === 'ar' ? 'تفعيل ميزة تسجيل الدخول بالبريد:' : 'Activer la connexion par e-mail :'}
                            </strong>{' '}
                            {lang === 'ar'
                              ? 'إذا كنت تستخدم كونسول Firebase الخاص بك، فتأكد من تفعيل "Email/Password" تحت قائمة Authentication -> Sign-in method.'
                              : 'Si vous utilisez votre propre serveur Firebase, assurez-vous d\'activer le fournisseur "Email/Password" dans Authentication -> Sign-in method.'
                            }
                          </li>
                        </ul>
                      </div>
                    )}

                    {/* Highly supportive tips for auth/internal-error or popup-blocked */}
                    {(authError.toLowerCase().includes('internal-error') || authError.toLowerCase().includes('popup') || authError.toLowerCase().includes('blocked') || authError.toLowerCase().includes('cookie') || authError.toLowerCase().includes('network') || authError.toLowerCase().includes('auth/')) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-slate-700 space-y-2 leading-relaxed text-left">
                        <div className="font-bold text-amber-800 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>{lang === 'ar' ? 'تجاوز مشكلة الحظر أو المتصفح:' : 'Résoudre le blocage du navigateur :'}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-1 text-[10.5px] text-slate-650">
                          <li>
                            <strong className="text-amber-900">
                              {lang === 'ar' ? 'افتح التطبيق في نافذة مستقلة:' : 'Ouvrir l\'application dans un nouvel onglet :'}
                            </strong>{' '}
                            {lang === 'ar' 
                              ? 'الوضع التجريبي الحالي داخل إطار (Iframe) يمنع أحياناً ملفات تعريف الارتباط من جوجل. يرجى الضغط على زر "فتح في لسان جديد" (أعلى يمين الشاشة) لتسجيل الدخول مباشرة وبشكل طبيعي.'
                              : "L'environnement d'aperçu actuel (Iframe) bloque parfois les popups ou cookies tiers Google. Veuillez cliquer sur l'icône de flèche externe (en haut à droite de l'écran) pour ouvrir l'application dans un nouvel onglet et vous connecter de manière fluide."
                            }
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {authIsUnauthorizedDomain && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-slate-700 space-y-3 leading-relaxed text-left font-sans animate-fade-in">
                    <div className="flex items-center gap-2 text-amber-700 font-bold">
                      <ShieldAlert size={18} className="shrink-0 text-amber-500" />
                      <span>Configuration Firebase requise ! / إعداد Firebase مطلوب</span>
                    </div>
                    
                    <div className="space-y-2 text-slate-650">
                      <p className="font-semibold text-[11px] text-amber-850">
                        {lang === 'ar' 
                          ? 'هذا النطاق (Domain) غير مضاف في قائمة النطاقات المصرح بها في كونسول Firebase الخاص بك.'
                          : "Ce domaine n'est pas répertorié dans la liste des domaines autorisés de votre projet Firebase."
                        }
                      </p>
                      
                      <div className="bg-slate-50 p-2 rounded-xl text-[10px] font-mono border border-slate-150 flex items-center justify-between gap-2 overflow-x-auto">
                        <span className="font-bold text-slate-650 shrink-0">{window.location.hostname}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.hostname);
                            setCopiedDomain(true);
                            setTimeout(() => setCopiedDomain(false), 2000);
                          }}
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition shrink-0 ${
                            copiedDomain 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-indigo-50 text-indigo-750 hover:bg-indigo-100 cursor-pointer'
                          }`}
                        >
                          {copiedDomain ? (lang === 'ar' ? 'تم النسخ!' : 'Copié !') : (lang === 'ar' ? 'نسخ' : 'Copier')}
                        </button>
                      </div>

                      <div className="space-y-1 pl-1 text-[11px] text-slate-600">
                        <p className="font-black text-slate-755">
                          {lang === 'ar' ? 'خطوات الحل السهلة:' : 'Étapes simples de résolution :'}
                        </p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>
                            {lang === 'ar' 
                              ? 'اذهب إلى كونسول Firebase الخاص بك.' 
                              : 'Allez dans votre Firebase Console.'
                            }
                          </li>
                          <li>
                            {lang === 'ar' 
                              ? 'ادخل إلى Authentication -> تبويب Settings -> ثم Authorized domains.' 
                              : 'Allez dans Authentication -> onglet Settings -> Authorized domains.'
                            }
                          </li>
                          <li>
                            {lang === 'ar' 
                              ? 'اضغط على (Add domain) والصق النطاق المنسوخ أعلاه.' 
                              : 'Cliquez sur (Add domain) et collez le domaine copié ci-dessus.'
                            }
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* Login/Register Form */}
                <form onSubmit={isRegisterMode ? handleEmailRegisterInline : handleEmailSignInInline} className="space-y-4 text-left">
                  {isRegisterMode && (
                    <div className="space-y-1 text-left">
                      <label className="text-[11px] font-bold text-slate-500 block text-left">
                        Nom de l'établissement / propriétaire :
                      </label>
                      <div className="relative">
                        <UserIcon size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="w-full pl-10 pr-3 text-left py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition leading-relaxed font-bold animate-fade-in"
                          placeholder="Ex : Supermarché Éclair"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-slate-500 block text-left">
                      Adresse e-mail de connexion :
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition leading-relaxed text-left font-mono"
                        placeholder="nom@entreprise.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-slate-500 block text-left">
                      Mot de passe du compte :
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={authPass}
                        onChange={(e) => setAuthPass(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition leading-relaxed text-left font-mono"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-md"
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
                        ? 'Créer un compte et activer la synchro'
                        : 'Se connecter et synchroniser'}
                    </span>
                  </button>
                </form>

                {/* Toggle Login/Register */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(!isRegisterMode);
                      setAuthError(null);
                    }}
                    className="text-xs text-indigo-650 hover:text-indigo-800 font-bold underline transition"
                  >
                    {isRegisterMode 
                      ? 'Déjà un compte ? Connectez-vous ici'
                      : 'Créer un nouveau compte Cloud gratuit'}
                  </button>
                </div>

                {/* Or divider */}
                <div className="relative my-3 flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-150"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase font-mono">
                    OU VIA GOOGLE
                  </span>
                  <div className="flex-grow border-t border-slate-150"></div>
                </div>

                {/* Google SSO Login */}
                <button
                  onClick={handleGoogleSignInInline}
                  disabled={authWorking}
                  type="button"
                  className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-205 text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer text-left"
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
                  <span>Connexion rapide avec Google</span>
                </button>

                {/* Custom Firebase Setup Toggle inside Modal */}
                <div className="pt-2 border-t border-slate-100 flex flex-col items-center w-full">
                  <button
                    type="button"
                    onClick={() => setShowModalCustomFirebase(!showModalCustomFirebase)}
                    className="text-[11px] text-slate-500 hover:text-indigo-650 font-black underline flex items-center gap-1 transition"
                  >
                    <Settings size={12} />
                    <span>Lier un serveur Cloud Firebase personnalisé</span>
                  </button>

                  {showModalCustomFirebase && (
                    <div className="w-full mt-3 p-3 bg-slate-50 border border-slate-205 rounded-2xl text-left space-y-2.5 animate-scale-up">
                      <span className="text-[10px] font-bold text-slate-700 block text-left">
                        Collez le code de configuration (Config JS/JSON) Firebase :
                      </span>
                      <textarea
                        placeholder={`Exemple de code accepté :
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
  appId: "..."
};`}
                        value={modalRawJsonInput}
                        onChange={(e) => {
                          setModalRawJsonInput(e.target.value);
                          setCustomFirebaseError(null);
                        }}
                        dir="ltr"
                        rows={5}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/10 text-left leading-normal"
                      />
                      
                      {customFirebaseError && (
                        <div className="p-2.5 bg-red-50 border border-red-150 rounded-lg text-[10px] text-red-650 font-bold leading-normal text-left font-sans">
                          {customFirebaseError}
                        </div>
                      )}

                      {testingCustomFirebase && (
                        <div className="p-2.5 bg-blue-50/50 border border-blue-150 rounded-lg text-[10px] text-blue-650 font-bold leading-normal text-left font-sans flex items-center gap-1.5 animate-pulse">
                          <Loader2 size={13} className="animate-spin text-blue-600 shrink-0" />
                          <span>جاري اختبار الاتصال بقاعدة بيانات السحاب... / Test de connexion en cours...</span>
                        </div>
                      )}

                      {testResult && testResult.success && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-150 rounded-lg text-[10px] text-emerald-800 font-bold leading-normal text-left font-sans space-y-1">
                          <p className="flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            {lang === 'ar' 
                              ? '🟢 تم اختبار الاتصال للمخدم بنجاح!' 
                              : '🟢 Connexion au serveur testée avec succès !'}
                          </p>
                          <p className="text-[9px] text-emerald-600 font-medium">
                            {testResult.message === 'connection_ok_auth_required' 
                              ? (lang === 'ar' 
                                  ? 'التشخيص: المنفذ نشط ومستعد للمزامنة. يرجى إنشاء حساب أو تسجيل دخول جديد فور إعادة البناء للربط.' 
                                  : 'Statut : Prêt pour la synchronisation. Veuillez créer un compte ou vous connecter après le rechargement.')
                              : (lang === 'ar' 
                                  ? 'التشخيص: قاعدة البيانات مقروءة ومفتوحة بالكامل.' 
                                  : 'Statut : Base de données entièrement accessible.')}
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={testingCustomFirebase}
                        onClick={handleValidateCustomFirebase}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold rounded-xl text-[11px] shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {testingCustomFirebase ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        <span>
                          {testingCustomFirebase 
                            ? (lang === 'ar' ? 'جاري التحقق من السيرفر...' : 'Vérification...') 
                            : (lang === 'ar' ? 'اختبار وربط السيرفر السحابي' : 'Valider et connecter mon serveur')}
                        </span>
                      </button>

                      <p className="text-[9px] text-slate-400 leading-normal text-left font-sans">
                        Note : Notre décodeur intelligent prend en charge aussi bien les formats JSON bruts que les scripts JavaScript. Après la validation, l'application redémarrera pour se connecter.
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
