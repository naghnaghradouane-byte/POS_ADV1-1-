import React from 'react';
import { Expense } from '../types';
import { Plus, Coins, Trash2, Check, Search, Calendar } from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (exp: Expense) => void;
  onDeleteExpense: (id: string) => void;
  currencySymbol: string;
}

export default function ExpensesView({
  expenses,
  onAddExpense,
  onDeleteExpense,
  currencySymbol,
}: ExpensesViewProps) {
  const [showModal, setShowModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Form Fields
  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState(0);
  const [category, setCategory] = React.useState('مصاريف تشغيلية');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) {
      alert('يرجى تضمين تفاصيل المصروف وتحديد القيمة المالية أكبر من الصفر.');
      return;
    }

    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
      description,
      amount: parseFloat(amount.toString()) || 0,
      category,
      date: new Date().toISOString(),
    };

    onAddExpense(newExpense);
    setShowModal(false);
    setDescription('');
    setAmount(0);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من مسح بند هذا المصرف المالي؟')) {
      onDeleteExpense(id);
    }
  };

  // Filtered
  const filteredExpenses = expenses.filter((exp) => {
    return exp.description.includes(searchQuery) || exp.category.includes(searchQuery);
  });

  // Aggregated sum
  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const categoriesOptions = ['مصاريف تشغيلية', 'رواتب وأجور', 'خدمات وفواتير', 'إيجارات', 'بضائع تالفة', 'أخرى'];

  return (
    <div className="space-y-5">
      {/* Overview sum cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between md:col-span-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">أرصدة المصاريف النقدية والتشغيلية</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              تسجيل التكاليف اليومية الإضافية (مثل الإيجارات ورواتب المساعدين وفواتير الكهرباء والمياه والإنترنت) لحساب صافي الربح بدقة.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={15} />
            <span>تسجيل مصروف جديد</span>
          </button>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-850 shadow-md flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="space-y-1 relative z-10">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">إجمالي المصروفات الحالية</p>
            <h3 className="text-2xl font-black font-mono text-amber-400">
              {totalSpent.toFixed(2)} <span className="text-xs font-normal text-slate-300">{currencySymbol}</span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Coins size={20} />
          </div>
        </div>
      </div>

      {/* Main Table logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <span className="font-bold text-slate-800 text-xs">بنود وسجلات الصرف النقدي المنفذة</span>
          
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث بوصف المصروف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-505 font-bold">
                <th className="p-3">تاريخ القيد</th>
                <th className="p-3">تفاصيل وبند الصرف</th>
                <th className="p-3">نوع التصنيف</th>
                <th className="p-3 text-left">القيمة المدفوعة</th>
                <th className="p-3 text-center">أدوات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/10">
                  <td className="p-3 text-slate-400 font-mono flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{new Date(exp.date).toLocaleDateString('fr-FR')}</span>
                  </td>
                  <td className="p-3 font-bold text-slate-800">{exp.description}</td>
                  <td className="p-3">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3 text-left font-mono font-black text-rose-600">
                    -{exp.amount.toFixed(2)} {currencySymbol}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-1 px-2 hover:bg-rose-50 text-slate-405 hover:text-rose-600 rounded-md transition text-xs font-bold"
                      title="مسح المصروف"
                    >
                      <Trash2 size={13} className="inline mr-1" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    لا توجد بنود مصاريف مسجلة توافق الفرز.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal Input overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 text-slate-800 flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs font-mono">تسجيل سند قيد صرف نقدي جديد</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
              >
                اغلاق
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">وصف المصرف والتفصيل *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: فاتورة إنترنت الألياف لشهر مايو"
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block font-mono">المبلغ المالي المخصوم ({currencySymbol}) *</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.1"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">تصنيف وبند التكلفة:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-1"
                >
                  {categoriesOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
                >
                  <Check size={14} />
                  <span>تسجيل المصروف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
