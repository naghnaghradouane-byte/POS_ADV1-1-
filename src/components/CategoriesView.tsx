import React from 'react';
import { Category } from '../types';
import { Plus, Edit2, Trash2, Check, Layers } from 'lucide-react';

interface CategoriesViewProps {
  categories: Category[];
  onAddCategory: (cat: Category) => void;
  onUpdateCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
}

export default function CategoriesView({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoriesViewProps) {
  const [showModal, setShowModal] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState('emerald');

  React.useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setDescription(editingCategory.description || '');
      setColor(editingCategory.color || 'emerald');
    } else {
      setName('');
      setDescription('');
      setColor('emerald');
    }
  }, [editingCategory, showModal]);

  const openAdd = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const payload: Category = {
      id: editingCategory ? editingCategory.id : 'cat_' + Date.now(),
      name,
      description,
      color,
    };

    if (editingCategory) {
      onUpdateCategory(payload);
    } else {
      onAddCategory(payload);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا التصنيف؟ لن يتم حذف المنتجات المدرجة تحته بل ستصبح غير مصنفة.')) {
      onDeleteCategory(id);
    }
  };

  const colorOptions = [
    { value: 'emerald', label: 'أخضر زمردي', border: 'border-emerald-500', dot: 'bg-emerald-500' },
    { value: 'blue', label: 'أزرق سماوي', border: 'border-blue-500', dot: 'bg-blue-500' },
    { value: 'indigo', label: 'نيلي غامق', border: 'border-indigo-500', dot: 'bg-indigo-500' },
    { value: 'amber', label: 'ذهبي كهرماني', border: 'border-amber-500', dot: 'bg-amber-500' },
    { value: 'cyan', label: 'سيان تركوازي', border: 'border-cyan-500', dot: 'bg-cyan-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">تصنيفات المنتجات والأقسام</h3>
          <p className="text-xs text-slate-500">تقسيم المستودعات لفرز وتصفية شاشة البيع وحساب الإيرادات بسهولة.</p>
        </div>
        <button
          onClick={openAdd}
          className="py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
        >
          <Plus size={15} />
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const colorObj = colorOptions.find((c) => c.value === cat.color) || colorOptions[0];
          return (
            <div
              key={cat.id}
              className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-xs transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${colorObj.dot}`} />
                    <h4 className="font-bold text-slate-800 text-sm">{cat.name}</h4>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">
                    ID: {cat.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed min-h-[40px]">
                  {cat.description || 'لا يوجد أي وصف مضاف لهذا القسم.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  title="تعديل اسم القسم"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="حذف القسم"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Modal Dialog Form Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 text-slate-850 flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-xs">
                {editingCategory ? 'تعديل الصنف' : 'إضافة قسم / صنف جديد'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
              >
                اغلاق
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">اسم التصنيف الجديد *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: لوازم مكتبية ورسم"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">وصف توضيحي للقسم</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ملاحظات لتصنيف المستودعات..."
                  rows={3}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Color visual pick */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">اللون التعريفي للأزرار:</label>
                <div className="grid grid-cols-2 gap-2">
                  {colorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setColor(opt.value)}
                      className={`p-2.5 rounded-xl border text-right text-xs font-bold flex items-center gap-2 transition ${
                        color === opt.value
                          ? 'bg-slate-50 border-slate-900 text-slate-900 shadow-xs'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${opt.dot} shrink-0`} />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-205 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editingCategory ? 'حفظ التغييرات' : 'إضافة الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
