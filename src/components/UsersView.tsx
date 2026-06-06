import React from 'react';
import { SystemUser, UserPermissions } from '../types';
import { UserCheck, Shield, Plus, Key, Phone, Trash, Edit3, CheckCircle, AlertCircle } from 'lucide-react';

interface UsersViewProps {
  users: SystemUser[];
  activeUserId: string;
  onAddUser: (user: SystemUser) => void;
  onUpdateUser: (user: SystemUser) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser: (userId: string) => void;
}

export default function UsersView({
  users = [],
  activeUserId,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser,
}: UsersViewProps) {
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<SystemUser | null>(null);

  // Form states for Add/Edit
  const [name, setName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [pinCode, setPinCode] = React.useState('0000');
  const [role, setRole] = React.useState<'admin' | 'manager' | 'cashier'>('cashier');
  
  const defaultPermissions: UserPermissions = {
    dashboard: false,
    pos: true,
    products: false,
    categories: false,
    customers: true,
    suppliers: false,
    inventory: false,
    purchases: false,
    sales: true,
    expenses: false,
    reports: false,
    settings: false,
    editInvoices: false,
    returnItems: false,
  };

  const [permissions, setPermissions] = React.useState<UserPermissions>(defaultPermissions);

  const resetForm = () => {
    setName('');
    setUsername('');
    setPhone('');
    setPinCode('0000');
    setRole('cashier');
    setPermissions(defaultPermissions);
    setEditingUser(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: SystemUser) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPhone(user.phone);
    setPinCode(user.pinCode);
    setRole(user.role);
    setPermissions(user.permissions);
    setShowAddModal(true);
  };

  // Helper when changing role to auto-populate best-match permissions
  const handleRoleChange = (selectedRole: 'admin' | 'manager' | 'cashier') => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setPermissions({
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
      });
    } else if (selectedRole === 'manager') {
      setPermissions({
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
        settings: false,
        editInvoices: true,
        returnItems: true,
      });
    } else {
      setPermissions(defaultPermissions);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      alert('الرجاء إدخال اسم الموظف واسم المستخدم.');
      return;
    }

    if (editingUser) {
      const updated: SystemUser = {
        ...editingUser,
        name,
        username,
        phone,
        pinCode,
        role,
        permissions,
      };
      onUpdateUser(updated);
      alert('تم تحديث بيانات وصلاحيات الموظف بنجاح.');
    } else {
      const newUser: SystemUser = {
        id: 'usr_' + Date.now(),
        name,
        username,
        phone,
        pinCode,
        role,
        permissions,
      };
      onAddUser(newUser);
      alert('تمت إضافة الموظف الجديد واعتماد الصلاحيات المخصصة له.');
    }
    setShowAddModal(false);
    resetForm();
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDelete = (user: SystemUser) => {
    if (user.id === 'usr_admin') {
      alert('لا يمكن حذف الموظف المدير الرئيسي للنظام لضمان عدم الإغلاق التام.');
      return;
    }
    if (user.id === activeUserId) {
      alert('لا يمكنك حذف الحساب النشط الحالي الذي تستخدمه لتصفح النظام.');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف الموظف: ${user.name}؟`)) {
      onDeleteUser(user.id);
    }
  };

  // Human translation of permissions code names
  const permissionLabels: Record<keyof UserPermissions, { title: string; desc: string; category: string }> = {
    dashboard: { title: 'اللوحة الإحصائية الرئيسية', desc: 'عرض المبيعات الإجمالية والمخططات وربحية المحل', category: 'الشاشات الرئيسية' },
    pos: { title: 'شاشة الكاشير والبيع POS', desc: 'صلاحية البيع وإدخال السلال وطباعة الفواتير وتحصيل الأموال', category: 'الشاشات الرئيسية' },
    products: { title: 'كتالوج وضوابط المنتجات', desc: 'عمليات إضافة وتعديل وحذف أصناف المنتجات وأسعارها', category: 'إداريات المخزن' },
    categories: { title: 'تصنيفات وأقسام البضائع', desc: 'تخصيص وترتيب التصنيفات والباركود والألوان', category: 'إداريات المخزن' },
    customers: { title: 'إدارة حسابات العملاء', desc: 'تسجيل العملاء، موازين الديون والآجل ومبيعات الذمم', category: 'علاقات التجارة' },
    suppliers: { title: 'سجل الموردين والمستحقات', desc: 'إدارة فواتير وذمم مشتريات الجملة للشركات المصنعة', category: 'علاقات التجارة' },
    inventory: { title: 'أوامر جرد وحركات المستودع', desc: 'توثيق كميات التالف، تحركات التسوية والتعديلات المخزنية', category: 'إداريات المخزن' },
    purchases: { title: 'فواتير المشتريات والتموين', desc: 'إدخال فواتير الشراء الخارجية وزيادة الرصيد تلقائياً', category: 'المالية والمصروفات' },
    sales: { title: 'أرشيف المبيعات والفواتير المكتملة', desc: 'تصفية وبحث الفواتير السابقة وطباعة النسخ المطابقة', category: 'الشاشات الرئيسية' },
    expenses: { title: 'إدخال المصاريف التشغيلية', desc: 'توثيق الإيجارات، الرواتب، فواتير المياه والكهرباء والخدمات', category: 'المالية والمصروفات' },
    reports: { title: 'التقارير الحسابية وميزان المراجعة', desc: 'الحصول على الموازنات الضريبية وصافي هامش الأرباح التراكمية', category: 'المالية والمصروفات' },
    settings: { title: 'إعدادات النظام وطباعة الرأسية', desc: 'التحكم بالرقم الضريبي واسم المتجر والمزامنة وقاعدة البيانات', category: 'إعدادات متقدمة' },
    editInvoices: { title: 'تعديل الفواتير الصادرة', desc: 'صلاحية تغيير قيم وبنود فواتير المبيعات بعد حفظها وترحيلها', category: 'عمليات فائقة الأمان' },
    returnItems: { title: 'إرجاع واسترداد سلع الفاتورة', desc: 'تفعيل إمكانية استرجاع السلع التالفة أو المرتجعة وإعادة قيمتها للعميل', category: 'عمليات فائقة الأمان' },
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 p-6 rounded-3xl border border-slate-750 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="text-violet-400" size={20} />
            <h3 className="text-base font-black">إدارة مجموعات العمل والصلاحيات | Permissions</h3>
          </div>
          <p className="text-xs text-slate-300">
            يمكنك من هنا إضافة موظفي الكاشير الجدد، وتخصيص صلاحياتهم، أو تغيير الموظف النشط على الجهاز الحالي.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-violet-605 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-500/25 transition-all outline-hidden shrink-0"
        >
          <Plus size={15} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Employee Quick Selector Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserCheck className="text-emerald-500" size={18} />
            <h4 className="text-xs font-black text-slate-900">الموظف النشط للكاشير الحالي</h4>
          </div>

          <div className="space-y-2.5">
            {users.map((user) => {
              const isActive = user.id === activeUserId;
              return (
                <div
                  key={user.id}
                  onClick={() => onSwitchUser(user.id)}
                  className={`p-3.5 rounded-2xl border text-right cursor-pointer transition-all flex items-center justify-between group ${
                    isActive
                      ? 'bg-emerald-50/70 border-emerald-250 ring-1 ring-emerald-500'
                      : 'bg-slate-50 border-slate-180 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      {user.name}
                      {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                      <span className="bg-slate-200/50 px-2 py-0.5 rounded-md font-bold">
                        {user.role === 'admin' ? 'مدير نظام كامل' :
                         user.role === 'manager' ? 'مشرف فني' : 'كاشير مبيعات'}
                      </span>
                      <span>رمز الدخول: <strong className="font-mono text-slate-700">{user.pinCode}</strong></span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                    isActive ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 bg-slate-200 group-hover:bg-slate-300'
                  }`}>
                    {isActive ? 'نشط الآن' : 'تبديل إليه'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100/80 text-[10px] text-amber-800 font-medium flex gap-2">
            <AlertCircle className="shrink-0 mt-0.5" size={14} />
            <div>
              <p className="font-bold">تلميح الأمان والمبيعات:</p>
              <p className="mt-0.5 leading-relaxed">
                يتم ربط فواتير المبيعات الحالية، وطابعات الإيصالات والمؤشرات، باسم الكاشير النشط على المحطة لضمان دقة جرد الصندوق بنهاية اليوم.
              </p>
            </div>
          </div>
        </div>

        {/* Staff accounts list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 text-[10px] font-bold uppercase block">قائمة الموظفين المسجلين</span>
            <span className="text-slate-900 font-bold text-xs">عرض حسابات الطاقم وتفاصيل صلاحياتهم</span>
          </div>

          {users.map((user) => {
            const hasCount = Object.values(user.permissions).filter(Boolean).length;
            const isSelf = user.id === activeUserId;

            return (
              <div
                key={user.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      user.role === 'admin' ? 'bg-rose-500 text-white' :
                      user.role === 'manager' ? 'bg-indigo-505 text-white' : 'bg-slate-600 text-white'
                    }`}>
                      {user.name.slice(0, 2)}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                        {user.name}
                        {isSelf && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-black border border-emerald-150">أنت نشط حالياً</span>}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">اسم المستخدم (المعرف): {user.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 pt-1 text-[11px] text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Phone size={11} className="text-slate-400" />
                      <span>{user.phone || 'بدون هاتف'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Key size={11} className="text-slate-400" />
                      <span>الرمز: <strong className="font-mono text-slate-900 bg-slate-100 px-1 py-0.2 rounded font-black">{user.pinCode}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield size={11} className="text-slate-400" />
                      <span>مفعل له <strong className="text-violet-650 font-extrabold">{hasCount}</strong> صلاحية</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto justify-end border-t border-slate-100 md:border-t-0 pt-3 md:pt-0">
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black flex items-center gap-1 shrink-0"
                    title="تعديل الموظف وصلاحياته"
                  >
                    <Edit3 size={11} />
                    <span>تعديل الصلاحيات</span>
                  </button>

                  <button
                    onClick={() => handleDelete(user)}
                    disabled={user.id === 'usr_admin'}
                    className={`px-3 py-1.5 bg-rose-50 text-rose-605 border border-rose-100 hover:bg-rose-100 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                      user.id === 'usr_admin' ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                    title="حذف حساب الموظف"
                  >
                    <Trash size={11} />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Add / Edit System User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 text-slate-800 flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-bold text-xs">
                {editingUser ? `تعديل صلاحيات الموظف: ${editingUser.name}` : 'إضافة حساب موظف جديد للنظام'}
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-850"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">اسم الموظف الثلاثي:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: يوسف خالد المولد"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">اسم المستخدم (لتسجيل الدخول):</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="مثال: yousef"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">رقم الجوال الخاص به:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="مثال: 0599999999"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">رمز الدخول السريع PIN (أرقام):</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="رمز رقمي متل 1122"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 focus:outline-hidden font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 block">المسمى الوظيفي والدور التلقائي:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['admin', 'manager', 'cashier'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleChange(r)}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                          role === r
                            ? 'bg-violet-50 border-violet-300 text-violet-700 font-extrabold shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {r === 'admin' ? 'مدير نظام كامل' :
                         r === 'manager' ? 'مشرف عام' : 'كاشير مبيعات'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Set permissions */}
              <div className="space-y-3.5 border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-800">تخصيص الصلاحيات الدقيقة للمستخدم</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allOn = {} as any;
                        Object.keys(permissions).forEach(k => allOn[k] = true);
                        setPermissions(allOn);
                      }}
                      className="text-[10px] text-violet-650 hover:underline font-bold"
                    >
                      تفعيل الكل
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allOff = {} as any;
                        Object.keys(permissions).forEach(k => allOff[k] = false);
                        setPermissions(allOff);
                      }}
                      className="text-[10px] text-slate-500 hover:underline font-bold"
                    >
                      تعطيل الكل
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500">
                  قم بتمكين أو سلب ميزات محددة من الموظف الحالي. سيقوم النظام بحذف الأقسام غير المسموح بها من لوحته الجانبية فورياً.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {(Object.keys(permissionLabels) as (keyof UserPermissions)[]).map((key) => {
                    const label = permissionLabels[key];
                    const isAllowed = permissions[key] === true;

                    return (
                      <div
                        key={key}
                        onClick={() => togglePermission(key)}
                        className={`p-3 rounded-2xl border text-right cursor-pointer select-none transition-all flex items-start gap-3 ${
                          isAllowed
                            ? 'bg-violet-50/40 border-violet-180 ring-1 ring-violet-400/50'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 ${
                          isAllowed ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-320'
                        }`}>
                          {isAllowed && <CheckCircle size={11} className="text-white" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-[11px] text-slate-900 flex items-center gap-2">
                            {label.title}
                            <span className="text-[8px] bg-slate-200 text-slate-500 font-bold px-1 py-0.2 rounded">
                              {label.category}
                            </span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium leading-relaxed">{label.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 text-white font-extrabold text-xs rounded-xl hover:bg-slate-800 transition outline-hidden"
                >
                  {editingUser ? 'حفظ التغيرات والاعتماد' : 'إضافة الموظف واعتماده في النظام'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition outline-hidden"
                >
                  إلغاء الأمر
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
