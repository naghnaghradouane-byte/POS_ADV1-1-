import React from 'react';
import { User } from 'firebase/auth';
import { useTranslation } from '../context/LanguageContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Users,
  Truck,
  ClipboardList,
  FileSpreadsheet,
  Receipt,
  Coins,
  BarChart3,
  Settings,
  RefreshCcw,
  Menu,
  X,
  LogOut,
  LogIn
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  syncing: boolean;
  onTriggerSync: () => void;
  companyName: string;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  activeUser?: any;
  users?: any[];
  onSwitchUser?: (userId: string) => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  syncing,
  onTriggerSync,
  companyName,
  user,
  onLogin,
  onLogout,
  activeUser,
  users = [],
  onSwitchUser,
}: SidebarProps) {
  const { lang, t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showSwitchDropdown, setShowSwitchDropdown] = React.useState(false);
  const [selectedUserToSwitch, setSelectedUserToSwitch] = React.useState<any | null>(null);
  const [pinInput, setPinInput] = React.useState('');
  const [pinError, setPinError] = React.useState('');

  const baseMenuItems = [
    { id: 'dashboard', label: t('sidebar.menu.dashboard'), icon: LayoutDashboard, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'pos', label: t('sidebar.menu.pos'), icon: ShoppingCart, color: 'text-rose-500 bg-rose-500/10' },
    { id: 'products', label: t('sidebar.menu.products'), icon: Package, color: 'text-indigo-500 bg-indigo-500/10' },
    { id: 'categories', label: t('sidebar.menu.categories'), icon: Layers, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'customers', label: t('sidebar.menu.customers'), icon: Users, color: 'text-cyan-500 bg-cyan-500/10' },
    { id: 'suppliers', label: t('sidebar.menu.suppliers'), icon: Truck, color: 'text-amber-500 bg-amber-500/10' },
    { id: 'inventory', label: t('sidebar.menu.inventory'), icon: ClipboardList, color: 'text-purple-500 bg-purple-500/10' },
    { id: 'purchases', label: t('sidebar.menu.purchases'), icon: FileSpreadsheet, color: 'text-teal-500 bg-teal-500/10' },
    { id: 'sales', label: t('sidebar.menu.sales'), icon: Receipt, color: 'text-sky-500 bg-sky-500/10' },
    { id: 'expenses', label: t('sidebar.menu.expenses'), icon: Coins, color: 'text-orange-500 bg-orange-500/10' },
    { id: 'reports', label: t('sidebar.menu.reports'), icon: BarChart3, color: 'text-violet-500 bg-violet-500/10' },
    { id: 'users', label: t('sidebar.menu.users'), icon: Users, color: 'text-fuchsia-500 bg-fuchsia-500/10' },
    { id: 'settings', label: t('sidebar.menu.settings'), icon: Settings, color: 'text-slate-500 bg-slate-500/10' },
  ];

  const menuItems = baseMenuItems.filter(item => {
    if (!activeUser || !activeUser.permissions) return true;
    const key = item.id;
    if (key === 'users' && activeUser.role !== 'admin') return false;
    return activeUser.permissions[key] !== false;
  });

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return lang === 'ar' ? 'المالك' : 'Propriétaire';
    if (role === 'manager') return lang === 'ar' ? 'المشرف' : 'Gérant';
    return lang === 'ar' ? 'الكاشير' : 'Caissier';
  };

  const getRoleDescription = (role: string) => {
    if (role === 'admin') return lang === 'ar' ? 'المالك • كامل الصلاحيات' : 'Admin • Tous Droits';
    if (role === 'manager') return lang === 'ar' ? 'المشرف • صلاحيات تشغيلية' : 'Manager • Opérationnel';
    return lang === 'ar' ? 'كاشير مبيعات' : 'Caissier de Vente';
  };

  const isRtl = lang === 'ar';

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3 lg:hidden shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <h1 className="font-bold text-sm tracking-tight">{companyName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onTriggerSync}
            disabled={syncing}
            className={`p-1.5 rounded-full hover:bg-slate-800 text-slate-300 transition-all ${
              syncing ? 'animate-spin text-emerald-400' : ''
            }`}
            title={t('sidebar.syncNow')}
          >
            <RefreshCcw size={18} />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-40 bg-slate-900 border-slate-800 text-slate-300 w-72 flex flex-col transition-transform duration-300 transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')
        } lg:static lg:h-screen`}
      >
        {/* Header Branding */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-500/20">
              ⚡
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h1 className="font-black text-white text-lg tracking-wide shrink-0">
                {t('sidebar.brand')}
              </h1>
              <p className="text-xs text-emerald-400 font-mono">{t('sidebar.posSystem')}</p>
            </div>
          </div>
          <p className={`text-xs text-slate-400 font-medium truncate mt-2 border-t border-slate-800/60 pt-2 shrink-0 ${isRtl ? 'text-right' : 'text-left'}`}>
            {companyName}
          </p>
        </div>

        {/* Sync Info Bar */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-full ${syncing ? 'bg-amber-500 animate-pulse' : user ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            {user ? t('sidebar.cloudSyncActive') : t('sidebar.offlineMode')}
          </span>
          <button
            onClick={() => {
              onTriggerSync();
              setIsOpen(false);
            }}
            disabled={syncing}
            className={`flex items-center gap-1 font-medium text-11px transition ${
              !user ? 'text-slate-605 cursor-not-allowed hover:text-slate-605' : 'hover:text-white text-emerald-400'
            }`}
            title={user ? (lang === 'ar' ? 'رفع ونسخ احتياطي سحابي' : 'Sauvegarde dans le cloud') : (lang === 'ar' ? 'يرجى تسجيل الدخول أولاً لتفعيل حفظ السحاب' : 'Veuillez vous connecter pour activer le cloud')}
          >
            <RefreshCcw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? t('sidebar.syncing') : t('sidebar.syncNow')}
          </button>
        </div>

        {/* Active System User Session */}
        {activeUser && (
          <div className="mx-4 mt-3 relative shrink-0">
            <div
              onClick={() => setShowSwitchDropdown(!showSwitchDropdown)}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-755 border border-slate-750 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
              title={lang === 'ar' ? 'انقر لتبديل حساب الموظف / الكاشير' : 'Changer de caissier / vendeur'}
            >
              <div className={isRtl ? 'text-right' : 'text-left'}>
                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5 leading-none">
                  {t('sidebar.activeCashier')}
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </span>
                <span className="font-extrabold text-white text-[11px] mt-1 block truncate max-w-[140px]">{activeUser.name}</span>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                activeUser.role === 'admin' ? 'bg-rose-500/25 text-rose-400' :
                activeUser.role === 'manager' ? 'bg-indigo-500/25 text-indigo-300' : 'bg-emerald-500/25 text-emerald-300'
               }`}>
                {getRoleLabel(activeUser.role)}
              </span>
            </div>

            {/* Switch Dropdown Menu */}
            {showSwitchDropdown && (
              <div className={`absolute right-0 left-0 mt-1 bg-slate-950 border border-slate-800 rounded-2xl p-2.5 z-55 shadow-2xl space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                <span className="text-[9px] font-extrabold text-slate-400 border-b border-slate-850 pb-1.5 block">
                  {t('sidebar.chooseEmployee')}
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(users || []).map((u: any) => {
                    const isCurrent = u.id === activeUser.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserToSwitch(u);
                          setPinInput('');
                          setPinError('');
                        }}
                        className={`w-full p-2 rounded-xl text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                          isRtl ? 'text-right' : 'text-left'
                        } ${
                          isCurrent ? 'bg-slate-900 text-emerald-400 border border-emerald-505/20' : 'text-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-black block text-[11px]">{u.name}</span>
                          <span className="text-[8px] text-slate-500">
                            {getRoleDescription(u.role)}
                          </span>
                        </div>
                        {isCurrent && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded">{lang === 'ar' ? 'الحالي' : 'Actuel'}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PIN Code Unlock Dialog overlay modal */}
            {selectedUserToSwitch && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-55 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-[24px] p-6 shadow-2xl space-y-4 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-lg">
                    🔒
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-white text-sm">{t('sidebar.securedPin')}</h4>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'ar' ? 'يرجى إدخال رمز الأمان للتحول إلى' : 'Veuillez entrer le code PIN pour'} <strong className="text-white">({selectedUserToSwitch.name})</strong>
                    </p>
                    <p className="text-[10px] text-amber-500 bg-amber-500/5 py-1 px-2.5 rounded-lg border border-amber-500/10 inline-block mt-1 font-semibold leading-normal">
                      {t('sidebar.pinHint')}
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (pinInput === selectedUserToSwitch.pinCode) {
                        if (onSwitchUser) {
                          onSwitchUser(selectedUserToSwitch.id);
                        }
                        setSelectedUserToSwitch(null);
                        setShowSwitchDropdown(false);
                        setPinInput('');
                        setPinError('');
                        alert(t('sidebar.loginConfirm'));
                      } else {
                        setPinError(t('sidebar.pinError'));
                      }
                    }}
                    className="space-y-3"
                  >
                    <input
                      type="password"
                      maxLength={8}
                      required
                      placeholder={t('sidebar.pinPlaceholder')}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="w-full text-center tracking-widest font-mono text-lg bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />

                    {pinError && (
                      <p className="text-rose-400 text-[10px] font-bold">{pinError}</p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs border-none cursor-pointer transition-all"
                      >
                        {t('common.confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUserToSwitch(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl text-xs border-none cursor-pointer transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => {
                  onViewChange(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                  isRtl ? 'text-right' : 'text-left'
                } ${
                  isActive
                    ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/10'
                    : 'hover:bg-slate-800/70 text-slate-400 hover:text-slate-100'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    isActive ? 'bg-white/15 text-white' : item.color
                  }`}
                >
                  <IconComponent size={18} />
                </div>
                <span className="flex-1 truncate">{item.label}</span>
                {item.id === 'pos' && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500 text-white shadow-xs shrink-0 font-mono">
                    {t('sidebar.newBadge')}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {user.displayName ? user.displayName.slice(0, 2) : 'Ad'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate text-xs">{user.displayName || (lang === 'ar' ? 'مستخدم السحاب' : 'Utilisateur')}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-rose-400 transition"
                title={t('sidebar.logout')}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              <LogIn size={14} />
              <span>{t('sidebar.cloudLogin')}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
