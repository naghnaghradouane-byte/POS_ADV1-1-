import React from 'react';
import { Product, InventoryMovement } from '../types';
import { Plus, ListCollapse, ArrowUpCircle, ArrowDownCircle, AlertOctagon, Check } from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  movements: InventoryMovement[];
  onAddMovement: (m: InventoryMovement) => void;
  onAdjustProductStock: (productId: string, val: number) => void;
  currencySymbol: string;
}

export default function InventoryView({
  products,
  movements,
  onAddMovement,
  onAdjustProductStock,
  currencySymbol,
}: InventoryViewProps) {
  const [showModal, setShowModal] = React.useState(false);
  
  // Adjust Form Parameters
  const [selectedProductId, setSelectedProductId] = React.useState('');
  const [moveType, setMoveType] = React.useState<'in' | 'out' | 'adjust'>('in');
  const [quantity, setQuantity] = React.useState(0);
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, showModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) {
      alert('يرجى تحديد المنتج والحرص على تعيين كمية معدلة أكبر من الصفر.');
      return;
    }

    const matchedProd = products.find((p) => p.id === selectedProductId);
    if (!matchedProd) return;

    // Determine absolute delta change
    let delta = quantity;
    if (moveType === 'out') {
      if (matchedProd.stockQuantity < quantity) {
        alert(`عذراً! الكمية المتوفرة حالياً بالرف لا تكفي للحبوب المراد صفعها. الرصيد المتاح: ${matchedProd.stockQuantity}`);
        return;
      }
      delta = -quantity;
    } else if (moveType === 'adjust') {
      // In this system, "adjust" overrides the current catalog value
      // delta = target_quantity - current_quantity
      delta = quantity - matchedProd.stockQuantity;
    }

    const newMovement: InventoryMovement = {
      id: 'mov_' + Date.now(),
      productId: selectedProductId,
      productName: matchedProd.name,
      type: moveType,
      quantity, // represents target or input qty depending on operation description
      notes: notes || (moveType === 'in' ? 'توريد يدوي للمستودع' : moveType === 'out' ? 'صرف مخزني يدوي' : 'جرد وتعديل مخزني'),
      date: new Date().toISOString(),
    };

    onAddMovement(newMovement);
    onAdjustProductStock(selectedProductId, delta);
    setShowModal(false);
    setQuantity(0);
    setNotes('');
  };

  return (
    <div className="space-y-5">
      {/* Upper overview section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">إدارة المخازن وحركات الجرد</h3>
          <p className="text-xs text-slate-500">تسجيل ومتابعة تدفق البضائع، حركات الإدخال، الصرف، والتسويات اليدوية.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition shadow-sm cursor-pointer"
        >
          <Plus size={15} />
          <span>تعديل مخزون / حركة جرد</span>
        </button>
      </div>

      {/* Main movements history list scroll list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs">سجل الحركات المخزنية الأخيرة</span>
          <span className="text-[10px] font-bold text-slate-500 font-mono">الإجمالي: {movements.length} عملية</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                <th className="p-3">تاريخ الحركة</th>
                <th className="p-3">المنتج المعني</th>
                <th className="p-3 text-center">نوع الحركة</th>
                <th className="p-3 text-center">الكمية المسجلة</th>
                <th className="p-3">ملاحظات وسبب التعديل</th>
                <th className="p-3 text-center">المسؤول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {movements.map((mov) => {
                return (
                  <tr key={mov.id} className="hover:bg-slate-50/20">
                    <td className="p-3 text-slate-400 font-mono">
                      {new Date(mov.date).toLocaleString('fr-FR', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{mov.productName}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 ${
                        mov.type === 'in' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        mov.type === 'out' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {mov.type === 'in' ? <ArrowUpCircle size={11} /> : mov.type === 'out' ? <ArrowDownCircle size={11} /> : <AlertOctagon size={11} />}
                        {mov.type === 'in' ? 'إدخال مخزني' : mov.type === 'out' ? 'صرف بضاعة' : 'تسوية جردية'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-mono font-black ${
                        mov.type === 'in' ? 'text-emerald-600' :
                        mov.type === 'out' ? 'text-rose-600' :
                        'text-blue-600'
                      }`}>
                        {mov.type === 'in' ? '+' : mov.type === 'out' ? '-' : '• '} 
                        {mov.quantity} كمية
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 leading-relaxed max-w-xs truncate" title={mov.notes}>
                      {mov.notes}
                    </td>
                    <td className="p-3 text-slate-400 text-center text-[10px] font-mono">admin</td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    لا حركات تعديل مسجلة حالياً باللوحة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Movement Form Modal Container */}
      {showModal && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 text-slate-800 flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs">حركة تسوية جردية يدوي</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
              >
                اغلاق
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Product Select List */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 block">اختر المنتج المعني: *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (المخزون الحالي: {p.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type select select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650 block">نوع العملية المالية:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMoveType('in')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[10px] transition ${
                      moveType === 'in' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    إدخال (+ توريد)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveType('out')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[10px] transition ${
                      moveType === 'out' ? 'bg-rose-50 border-rose-500 text-rose-800' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    صرف (- تخفيض)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveType('adjust')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[10px] transition ${
                      moveType === 'adjust' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    تسوية (تعديل كامل)
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 block">
                  {moveType === 'adjust' ? 'الكمية الفعلية بالرف بعد التعديل الجديد *' : 'كمية الحبوب المدخلة / المصروفة لخط السير *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  placeholder="مثال: 15"
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 block">توضيح أسباب وطاقم الجرد / التعديل</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: تلف عينة الشحن، أو جرد مايو"
                  className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-205 rounded-xl"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
                >
                  <Check size={14} />
                  <span>تطبيق الحركة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
