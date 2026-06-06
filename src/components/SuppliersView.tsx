import React from 'react';
import { Supplier } from '../types';
import { Plus, Edit2, Trash2, Search, Truck, Check, Phone, User, Landmark } from 'lucide-react';

interface SuppliersViewProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  currencySymbol: string;
}

export default function SuppliersView({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  currencySymbol,
}: SuppliersViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);

  // Form parameters
  const [name, setName] = React.useState('');
  const [contactPerson, setContactPerson] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [payables, setPayables] = React.useState(0);

  React.useEffect(() => {
    if (editingSupplier) {
      setName(editingSupplier.name);
      setContactPerson(editingSupplier.contactPerson);
      setPhone(editingSupplier.phone);
      setAddress(editingSupplier.address);
      setPayables(editingSupplier.payables);
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setAddress('');
      setPayables(0);
    }
  }, [editingSupplier, showModal]);

  const openAdd = () => {
    setEditingSupplier(null);
    setShowModal(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const payload: Supplier = {
      id: editingSupplier ? editingSupplier.id : 'sup_' + Date.now(),
      name,
      contactPerson,
      phone,
      address,
      payables: parseFloat(payables.toString()) || 0,
    };

    if (editingSupplier) {
      onUpdateSupplier(payload);
    } else {
      onAddSupplier(payload);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المورد؟ لن يتم حذف سجلا الشراء السابقة.')) {
      onDeleteSupplier(id);
    }
  };

  const filteredSuppliers = suppliers.filter((sup) => {
    return (
      sup.name.includes(searchQuery) ||
      sup.contactPerson.includes(searchQuery) ||
      sup.phone.includes(searchQuery)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم المورد أو مسؤول المبيعات المندوب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <button
          onClick={openAdd}
          className="w-full md:w-auto py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition shadow-sm"
        >
          <Plus size={15} />
          <span>إضافة كرت مورد جديد</span>
        </button>
      </div>

      {/* Main suppliers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((sup) => {
          return (
            <div
              key={sup.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-xs transition flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Truck size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{sup.name}</h4>
                      <p className="text-[10px] text-slate-400">كود المورد: {sup.id}</p>
                    </div>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="space-y-2 text-xs text-slate-600 font-medium pt-3.5 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-[11px]">
                    <User size={12} className="text-slate-400" />
                    <span>مندوب التواصل: <strong className="text-slate-700">{sup.contactPerson || '-'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Phone size={12} className="text-slate-400" />
                    <span>هاتف الشركة: {sup.phone || '-'}</span>
                  </div>
                </div>

                {/* Account payables */}
                <div className="p-3 bg-slate-50 border border-slate-100/70 rounded-xl flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Landmark size={12} className="text-slate-400" />
                    الرصيد المستحق لهم علينا:
                  </span>
                  <span className={`font-mono font-black text-xs ${sup.payables > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {sup.payables.toFixed(2)} {currencySymbol}
                  </span>
                </div>
              </div>

              {/* Card Footer actions */}
              <div className="mt-5 pt-3.5 border-t border-slate-50 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  onClick={() => openEdit(sup)}
                  className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-50 rounded-lg transition"
                  title="تعديل ملف التواصل"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(sup.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="مسح من لويل الموردين"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Supplier Entry Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 text-slate-800 flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs">{editingSupplier ? 'تعديل شركة التوريد' : 'تسجيل شركة توريد جديدة'}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
              >
                اغلاق
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">اسم الشركة / المورد *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: شركة العيسى للأجهزة المنزلية"
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">المندوب / المسؤول للتواصل</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="الاسم الثلاثي للمسؤول..."
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">رقم هاتفه أو الفاكس *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="011xxxxxxx"
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">مقر المخازن / عنوان التوصيل</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="الرياض - المنطقة الصناعية..."
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">رصيد الحساب المسحق المترصد لهم علينا ({currencySymbol})</label>
                <input
                  type="number"
                  min="0"
                  value={payables || ''}
                  onChange={(e) => setPayables(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  الرجوع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
                >
                  <Check size={14} />
                  <span>تأكيد الحفظ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
