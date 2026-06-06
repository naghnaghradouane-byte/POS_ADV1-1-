import React from 'react';
import { Customer } from '../types';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Users, 
  AlertTriangle, 
  Check, 
  PhoneCall, 
  MapPin, 
  Navigation, 
  Map, 
  Info, 
  Lock, 
  Shield, 
  Eye, 
  Compass, 
  Phone,
  FileText
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  activeUser?: any;
}

export default function CustomersView({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  activeUser,
}: CustomersViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showFormModal, setShowFormModal] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [selectedDetailsCustomer, setSelectedDetailsCustomer] = React.useState<Customer | null>(null);

  // Role simulation state for testing convenience inside the preview environment
  const [simulatedRole, setSimulatedRole] = React.useState<'admin' | 'seller' | 'viewer'>(() => {
    if (activeUser?.role === 'admin') return 'admin';
    if (activeUser?.role === 'manager') return 'seller';
    return 'viewer';
  });

  // Form states
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [balance, setBalance] = React.useState(0);
  const [debtLimit, setDebtLimit] = React.useState(2000);
  const [notes, setNotes] = React.useState('');
  const [latitude, setLatitude] = React.useState<number | null>(null);
  const [longitude, setLongitude] = React.useState<number | null>(null);
  
  // Geolocation capturing status messages
  const [gpsLoading, setGpsLoading] = React.useState(false);
  const [gpsError, setGpsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (editingCustomer) {
      setName(editingCustomer.name);
      setPhone(editingCustomer.phone);
      setAddress(editingCustomer.address);
      setBalance(editingCustomer.balance);
      setDebtLimit(editingCustomer.debtLimit);
      setNotes(editingCustomer.notes || '');
      setLatitude(editingCustomer.latitude || null);
      setLongitude(editingCustomer.longitude || null);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setBalance(0);
      setDebtLimit(2000);
      setNotes('');
      setLatitude(null);
      setLongitude(null);
    }
    setGpsError(null);
  }, [editingCustomer, showFormModal]);

  const openAdd = () => {
    setEditingCustomer(null);
    setShowFormModal(true);
  };

  const openEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening details modal
    setEditingCustomer(customer);
    setShowFormModal(true);
  };

  const openDetails = (customer: Customer) => {
    setSelectedDetailsCustomer(customer);
    setShowDetailsModal(true);
  };

  const captureCoordinates = () => {
    if (!navigator.geolocation) {
      setGpsError('الجيولوجكيشن من المتصفح غير مدعوم على جهازك.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGpsLoading(false);
      },
      (error) => {
        console.error('Core geolocation capture failure:', error);
        setGpsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('تم رفض الإذن للوصول للموقع GPS. يرجى تفعيله من إعدادات المتصفح.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('موقع الـ GPS غير متوفر حالياً على هذا الجهاز.');
            break;
          case error.TIMEOUT:
            setGpsError('انتهت مهلة جلب موقع الإحداثيات الجغرافية.');
            break;
          default:
            setGpsError('حدث خطأ غير معروف في التقاط الموقع.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const payload: Customer = {
      id: editingCustomer ? editingCustomer.id : 'cust_' + Date.now(),
      name,
      phone,
      address,
      balance: parseFloat(balance.toString()) || 0,
      debtLimit: parseFloat(debtLimit.toString()) || 0,
      purchaseHistory: editingCustomer ? editingCustomer.purchaseHistory : [],
      latitude: latitude !== null ? parseFloat(latitude.toString()) : undefined,
      longitude: longitude !== null ? parseFloat(longitude.toString()) : undefined,
      notes: notes || undefined,
    };

    if (editingCustomer) {
      onUpdateCustomer(payload);
    } else {
      onAddCustomer(payload);
    }
    setShowFormModal(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid details modal
    if (id === 'cust_4') {
      alert('لا يمكنك حذف الحساب العام للعملاء النقديين!');
      return;
    }
    if (confirm('هل أنت متأكد من تصفية هذا العميل وحذف موقعه الجغرافي من النظام نهائياً؟')) {
      onDeleteCustomer(id);
    }
  };

  const filteredCustomers = customers.filter((cust) => {
    return (
      cust.name.includes(searchQuery) ||
      cust.phone.includes(searchQuery) ||
      (cust.address && cust.address.includes(searchQuery))
    );
  });

  // Permissions helpers based on simulation choices
  const canAddOrEdit = simulatedRole === 'admin';
  const canNavigateOrCall = simulatedRole === 'admin' || simulatedRole === 'seller';

  return (
    <div className="space-y-6">
      
      {/* 1. Testing Control Widget for role configurations */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-md flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Shield size={20} className="animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm">حاكِم الصلاحيات للأدوار الجغرافية • Geolocation Access Panel</h4>
            <p className="text-[10px] text-slate-400 font-medium">اختر دوراً لإجراء محاكاة وفحص مستوى أمان الخرائط وملاحة الزبائن</p>
          </div>
        </div>

        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-750 shrink-0 w-full md:w-auto">
          <button
            onClick={() => setSimulatedRole('admin')}
            className={`flex-1 md:flex-initial py-1.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              simulatedRole === 'admin' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield size={12} />
            <span>مدير (Admin)</span>
          </button>
          <button
            onClick={() => setSimulatedRole('seller')}
            className={`flex-1 md:flex-initial py-1.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              simulatedRole === 'seller' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass size={12} />
            <span>بائع (Seller)</span>
          </button>
          <button
            onClick={() => setSimulatedRole('viewer')}
            className={`flex-1 md:flex-initial py-1.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              simulatedRole === 'viewer' 
                ? 'bg-slate-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={12} />
            <span>مشاهد (Viewer)</span>
          </button>
        </div>
      </div>

      {/* 2. Search and Add controls row */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/70 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute right-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث بالاسم، برقم الجوال، أو العنوان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-slate-800 dark:text-zinc-100"
          />
        </div>

        {canAddOrEdit ? (
          <button
            onClick={openAdd}
            className="w-full md:w-auto py-3 px-5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer border-none"
          >
            <Plus size={16} />
            <span>إنشاء ملف عميل وموقع جديد</span>
          </button>
        ) : (
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-3 py-2 rounded-xl">
            <Lock size={12} />
            <span>ميزة إضافة الزبائن الجدد متاحة فقط لحساب الـ Admin الرئيسي</span>
          </div>
        )}
      </div>

      {/* 3. Main CRM Customer Cards view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map((cust) => {
          const isOverDebt = cust.balance > cust.debtLimit;
          const isGeneral = cust.id === 'cust_4';
          const hasLocation = cust.latitude && cust.longitude;

          return (
            <div
              key={cust.id}
              onClick={() => openDetails(cust)}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-750 select-none ${
                isOverDebt 
                  ? 'border-rose-450 dark:border-rose-950 bg-rose-50/5' 
                  : 'border-slate-200/75 dark:border-slate-850'
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm ${
                        isGeneral 
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-805 dark:text-slate-400' 
                          : 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}
                    >
                      {cust.name.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">{cust.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono font-medium">كود العميل: {cust.id}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {cust.balance > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-250/40 px-2 py-0.5 rounded-md flex items-center gap-1 select-none">
                        <AlertTriangle size={9} />
                        مديونية
                      </span>
                    )}
                    {hasLocation ? (
                      <span className="text-[9px] sm:text-[10px] font-black bg-emerald-55/85 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-400 px-2 py-0.5 rounded-lg flex items-center gap-1 select-none font-mono">
                        <MapPin size={9} />
                        GPS
                      </span>
                    ) : (
                      <span className="text-[9px] lg:text-[10px] font-black bg-slate-100 text-slate-400 dark:bg-slate-850 dark:text-slate-600 px-2.5 py-0.5 rounded-lg select-none">
                        بلا موقع
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-semibold border-t border-slate-50 dark:border-slate-850/80 pt-3.5">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={12} className="text-slate-420" />
                    <span>الجوال: {cust.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-slate-420 font-bold" />
                    <span className="truncate">العنوان: {cust.address || '-'}</span>
                  </div>
                </div>

                {/* Financial Balance Progress bar representer */}
                {!isGeneral && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">الدين المسجل:</span>
                      <strong className="text-rose-700 dark:text-rose-400 font-mono font-black">{cust.balance.toFixed(2)} ر.س</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">سقف المديونية الأقصى:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-mono">{cust.debtLimit.toFixed(2)} ر.س</strong>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isOverDebt ? 'bg-rose-505' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(100, (cust.balance / (cust.debtLimit || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="mt-5 pt-3.5 border-t border-slate-50 dark:border-slate-850/80 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  className="text-[11px] text-indigo-650 dark:text-indigo-400 font-extrabold hover:underline"
                >
                  عرض الموقع والتحصيل التفصيلي ←
                </button>
                <div className="flex items-center gap-1.5">
                  {canAddOrEdit && !isGeneral && (
                    <button
                      onClick={(e) => openEdit(cust, e)}
                      className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition"
                      title="تعديل بيانات العميل"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                  {canAddOrEdit && !isGeneral && (
                    <button
                      onClick={(e) => handleDelete(cust.id, e)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition"
                      title="إزالة العميل"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Customer Form Modal (Admin creation & modification writes) */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-xs sm:text-sm">
                {editingCustomer ? 'تعديل السجل والنظام الجغرافي للزبون' : 'إنشاء زبون وتسجيل إحداثيات GPS جديدة'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 w-7 h-7 flex items-center justify-center cursor-pointer border-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 dark:text-slate-350 block">اسم العميل الكامل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم الأول والثاني..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-slate-800 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-35">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-350 block">رقم جوال العميل *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxx"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-slate-850 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-350 block">العنوان أو الحي وطريقة التسليم</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="الرياض - حي الملقا"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-slate-850 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-350 block">المديونية الابتدائية (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    value={balance || ''}
                    onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-slate-850 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-350 block">الحد الأقصى للديون (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    value={debtLimit || ''}
                    onChange={(e) => setDebtLimit(parseFloat(e.target.value) || 0)}
                    placeholder="2000"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-slate-850 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* CRM / GPS Location Capture Interface */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5">
                <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 leading-none">
                  <Compass size={14} className="text-emerald-500 animate-spin" style={{ animationDuration: '4s' }} />
                  تحصيل إحداثيات الموقع الجغرافي الـ GPS والدقة
                </span>
                
                {/* Lat Lng fields for display or custom override manual editing */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 uppercase">خط العرض (Latitude)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="غير محدد • null"
                      value={latitude !== null ? latitude : ''}
                      onChange={(e) => setLatitude(e.target.value !== '' ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 uppercase">خط الطول (Longitude)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="غير محدد • null"
                      value={longitude !== null ? longitude : ''}
                      onChange={(e) => setLongitude(e.target.value !== '' ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={captureCoordinates}
                  disabled={gpsLoading}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer border-none"
                >
                  {gpsLoading ? (
                    <>
                      <Compass size={14} className="animate-spin text-white" />
                      <span>جاري تشغيل الـ GPS والتقاط إحداثيات الهاتف...</span>
                    </>
                  ) : (
                    <>
                      <MapPin size={14} className="text-white" />
                      <span>التقاط موقع العميل الآن (Capture GPS Coordinates)</span>
                    </>
                  )}
                </button>

                {gpsError && (
                  <div className="text-[10px] mt-1 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-200/40 flex items-center gap-1.5">
                    <AlertTriangle size={11} className="shrink-0" />
                    <span>{gpsError}</span>
                  </div>
                )}
                
                {latitude !== null && longitude !== null && !gpsError && (
                  <div className="text-[10.5px] mt-1 text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-250/25 flex items-center gap-1.5 justify-center">
                    <Check size={11} className="shrink-0 animate-bounce" />
                    <span>تم التقاط الإحداثيات بنجاح تام! جاهزة للملاحة والتوصيل.</span>
                  </div>
                )}
              </div>

              {/* Optional Geolocation / Delivery Notes */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 dark:text-slate-350 block">ملاحظات التوجيه الجغرافي أو التوصيل</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: يرجى التوصيل من الباب الخلفي للمستودع، أو البوابة رقم 2 المقابلة للمحطة..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-slate-850 dark:text-zinc-100"
                />
              </div>

              {/* Action buttons footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4.5 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 rounded-xl transition cursor-pointer border-none"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer border-none"
                >
                  <Check size={14} />
                  <span>{editingCustomer ? 'حفظ للتعديل والمزامنة' : 'إنشاء الحساب وموقع الـ GPS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Customer Details & Embedded Maps Screen Modal (Supports multiple roles) */}
      {showDetailsModal && selectedDetailsCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col text-slate-800 max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-400" />
                <h3 className="font-extrabold text-xs sm:text-sm">تفاصيل البطاقة الجغرافية والمالية للزبون</h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 w-7 h-7 flex items-center justify-center cursor-pointer border-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-right">
              
              {/* Customer quick profile info */}
              <div className="flex gap-4 items-start items-center border-b border-slate-100 dark:border-slate-850 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-300 flex items-center justify-center font-black text-base select-none shrink-0">
                  {selectedDetailsCustomer.name.slice(0, 2)}
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-905 dark:text-white">{selectedDetailsCustomer.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">كود البطاقة: {selectedDetailsCustomer.id}</p>
                </div>
              </div>

              {/* Standard details lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150/70 dark:border-slate-850/80 space-y-1 leading-normal">
                  <span className="text-[10px] text-slate-400 block font-bold">رقم الجوال والاتصال</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{selectedDetailsCustomer.phone || '-'}</span>
                    {canNavigateOrCall && selectedDetailsCustomer.phone && (
                      <a
                        href={`tel:${selectedDetailsCustomer.phone}`}
                        className="text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 transition"
                      >
                        <Phone size={11} />
                        <span>اتصل بالعميل</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150/70 dark:border-slate-850/80 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">العنوان أو الحي المختار</span>
                  <span className="block break-words">{selectedDetailsCustomer.address || '-'}</span>
                </div>
              </div>

              {/* Balance Card Details if not dynamic general */}
              {selectedDetailsCustomer.id !== 'cust_4' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150/70 dark:border-slate-850/80 rounded-2xl grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-center border-l dark:border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-bold">إجمالي الدين المسجل الحائز</span>
                    <strong className="text-sm font-mono font-black text-rose-700 dark:text-rose-400">
                      {selectedDetailsCustomer.balance.toFixed(2)} ر.س
                    </strong>
                  </div>
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">الحد الائتماني المتوفر للديون</span>
                    <strong className="text-sm font-mono font-black text-slate-700 dark:text-slate-300">
                      {selectedDetailsCustomer.debtLimit.toFixed(2)} ر.س
                    </strong>
                  </div>
                </div>
              )}

              {/* Notes content */}
              {selectedDetailsCustomer.notes && (
                <div className="p-3.5 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 rounded-2xl space-y-1 text-xs">
                  <span className="text-[10px] text-slate-405 font-bold block">ملاحظات التحصيل اللوجستي</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{selectedDetailsCustomer.notes}</p>
                </div>
              )}

              {/* Location Module - Map Preview & Navigation trigger button */}
              <div className="space-y-3.5">
                <span className="text-xs font-black text-slate-800 dark:text-slate-205 block">
                  خريطة المعاينة وإحداثيات الموقع (GPS coordinates)
                </span>

                {selectedDetailsCustomer.latitude && selectedDetailsCustomer.longitude ? (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-150/70 dark:border-slate-850 justify-between flex items-center font-mono text-[11px] text-slate-500 dark:text-slate-400 select-all font-bold">
                      <div className="flex gap-2">
                        <span>خط العرض: {selectedDetailsCustomer.latitude.toFixed(6)}</span>
                        <span>•</span>
                        <span>خط الطول: {selectedDetailsCustomer.longitude.toFixed(6)}</span>
                      </div>
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 select-none">
                        إحداثيات حية
                      </span>
                    </div>

                    {/* Responsive Web Embedded Static/Interactive Maps inside iframe */}
                    <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 relative min-h-48 md:min-h-56">
                      <iframe
                        src={`https://maps.google.com/maps?q=${selectedDetailsCustomer.latitude},${selectedDetailsCustomer.longitude}&z=15&output=embed`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        title={`Customer map for ${selectedDetailsCustomer.name}`}
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>

                    {/* Navigation buttons according to roles */}
                    <div className="pt-2">
                      {canNavigateOrCall ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDetailsCustomer.latitude},${selectedDetailsCustomer.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md text-center border-none"
                        >
                          <Navigation size={15} />
                          <span>فتح نظام ملاحة خرائط جوجل (Open Google Maps Navigation)</span>
                        </a>
                      ) : (
                        <div className="w-full h-11 bg-slate-100 dark:bg-slate-800 text-slate-505 dark:text-slate-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200/50 select-none">
                          <Lock size={12} />
                          <span>خاصية فتح الملاحة متاحة للبائع والأدمن فقط (Viewer Lock)</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200/80 dark:border-slate-800 text-center space-y-2.5">
                    <Compass size={24} className="mx-auto text-slate-350" />
                    <p className="text-xs text-slate-400 leading-normal font-semibold">
                      لا يوجد موقع جغرافي GPS مسجّل بطاقة هذا العميل بعد. لتمكين ملاحة التوصيل والخرائط، يرجى مطالبة الأدمن بتعديل العميل واستخدام ميزة الالتقاط السريع GPS.
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="pt-4 border-t border-slate-150 dark:border-slate-850 flex items-center justify-end font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer border-none"
                >
                  إغلاق التفاصيل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
