import React from 'react';
import { Product, Supplier, Purchase } from '../types';
import { Plus, Trash2, FileSpreadsheet, Check, ShoppingBag, Landmark } from 'lucide-react';

interface PurchasesViewProps {
  products: Product[];
  suppliers: Supplier[];
  purchases: Purchase[];
  onAddPurchase: (p: Purchase) => void;
  onAdjustProductStock: (productId: string, val: number) => void;
  onUpdateSupplierPayables: (supplierId: string, balanceChange: number) => void;
  currencySymbol: string;
}

interface PurchaseCartItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
}

export default function PurchasesView({
  products,
  suppliers,
  purchases,
  onAddPurchase,
  onAdjustProductStock,
  onUpdateSupplierPayables,
  currencySymbol,
}: PurchasesViewProps) {
  const [showForm, setShowForm] = React.useState(false);

  // Form Fields
  const [selectedSupplierId, setSelectedSupplierId] = React.useState('');
  const [paymentStatus, setPaymentStatus] = React.useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [amountPaidInput, setAmountPaidInput] = React.useState('');

  // Items Cart for active Purchase Invoice creation
  const [itemsCart, setItemsCart] = React.useState<PurchaseCartItem[]>([]);
  const [tempProductId, setTempProductId] = React.useState('');
  const [tempQty, setTempQty] = React.useState(1);
  const [tempCostPrice, setTempCostPrice] = React.useState(0);

  React.useEffect(() => {
    if (suppliers.length > 0) setSelectedSupplierId(suppliers[0].id);
    if (products.length > 0) {
      setTempProductId(products[0].id);
      setTempCostPrice(products[0].costPrice);
    }
  }, [suppliers, products]);

  const handleProductChange = (id: string) => {
    setTempProductId(id);
    const matched = products.find((p) => p.id === id);
    if (matched) {
      setTempCostPrice(matched.costPrice);
    }
  };

  const addItemToPurchaseCart = () => {
    if (!tempProductId || tempQty <= 0) return;

    const matchedProd = products.find((p) => p.id === tempProductId);
    if (!matchedProd) return;

    // Check if duplicate
    const existingIndex = itemsCart.findIndex((i) => i.productId === tempProductId);
    if (existingIndex > -1) {
      const copy = [...itemsCart];
      copy[existingIndex].quantity += tempQty;
      setItemsCart(copy);
    } else {
      setItemsCart([
        ...itemsCart,
        {
          productId: tempProductId,
          productName: matchedProd.name,
          quantity: tempQty,
          costPrice: tempCostPrice || matchedProd.costPrice,
        },
      ]);
    }
    setTempQty(1);
  };

  const removeItemFromPurchaseCart = (idx: number) => {
    setItemsCart(itemsCart.filter((_, i) => i !== idx));
  };

  const invoiceTotal = itemsCart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsCart.length === 0) {
      alert('الرجاء إضافة صنف واحد على الأقل لفاتورة التوريد.');
      return;
    }

    const paidVal = paymentStatus === 'paid' ? invoiceTotal : paymentStatus === 'unpaid' ? 0 : parseFloat(amountPaidInput) || 0;
    const unpaidBalance = invoiceTotal - paidVal;

    const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

    const purchaseNum = 'PUR-226-0' + Math.floor(1000 + Math.random() * 9000);

    const newPurchase: Purchase = {
      id: 'pur_' + Date.now(),
      invoiceNumber: purchaseNum,
      supplierId: selectedSupplierId,
      supplierName: selectedSupplier ? selectedSupplier.name : 'مورد عام',
      items: [...itemsCart],
      total: invoiceTotal,
      date: new Date().toISOString(),
      paymentStatus,
      amountPaid: paidVal,
    };

    // 1. Save purchase logs
    onAddPurchase(newPurchase);

    // 2. Adjust products stock count upwards!
    itemsCart.forEach((item) => {
      onAdjustProductStock(item.productId, item.quantity);
    });

    // 3. Increment supplier payable credit debt balance if unpaid exists
    if (unpaidBalance > 0) {
      onUpdateSupplierPayables(selectedSupplierId, unpaidBalance);
    }

    alert(`تم تأكيد استلام فاتورة رقم ${purchaseNum} وتخزين المنتجات بالمستودعات بنجاح.`);
    setItemsCart([]);
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">مشتريات وتوريدات المستودعات</h3>
          <p className="text-xs text-slate-500">تسجيل فواتير الشراء المستلمة من الموردين، وإدخال كميات البضائع بالجملة.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full md:w-auto py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>تسجيل فاتورة توريد جديدة</span>
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-sm space-y-5 antialiased">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <ShoppingBag className="text-emerald-500" size={16} />
              نموذج تسجيل فاتورة توريد من مورد
            </h4>
            <button
              onClick={() => {
                setShowForm(false);
                setItemsCart([]);
              }}
              className="text-xs text-slate-400 hover:text-rose-600 font-bold"
            >
              إلغاء التوريد ✕
            </button>
          </div>

          <form onSubmit={handleSubmitInvoice} className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Header Form fields */}
            <div className="md:col-span-4 space-y-4">
              {/* Supplier Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 block">اسم المورد المصدر: *</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (الدين المالي: {s.payables.toFixed(0)} ر.س)
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Payment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-650 block">حالة سداد الفاتورة:</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  <option value="paid">مدفوعة بالكامل (نقداً/بنكي)</option>
                  <option value="partial">مدفوعة جزئياً (آجل متبقي)</option>
                  <option value="unpaid">غير مدفوعة (آجل بالكامل على الحساب)</option>
                </select>
              </div>

              {/* Partial amount paid */}
              {paymentStatus === 'partial' && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-xs font-bold text-slate-650 block">المبلغ المدفوع حالياً:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Display Total summary */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                <div className="flex justify-between items-center text-xs font-medium text-emerald-800">
                  <span>إجمالي تكلفة المشتريات:</span>
                  <span className="text-base font-black font-mono">
                    {invoiceTotal.toFixed(2)} {currencySymbol}
                  </span>
                </div>
                {paymentStatus !== 'paid' && (
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium border-t border-dashed border-emerald-200/50 pt-2">
                    <span>سيضاف كمستحقات دين للمورد:</span>
                    <span className="font-mono font-bold text-rose-700">
                      {paymentStatus === 'unpaid'
                        ? invoiceTotal.toFixed(2)
                        : (invoiceTotal - (parseFloat(amountPaidInput) || 0)).toFixed(2)}{' '}
                      {currencySymbol}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition cursor-pointer"
              >
                <Check size={15} />
                <span>ترحيل وحفظ فاتورة التوريد ✓</span>
              </button>
            </div>

            {/* Shopping Cart elements creator for invoice */}
            <div className="md:col-span-8 bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
              <span className="font-bold text-slate-700 text-xs block">خطوة 2: إضافة الأصناف المستوردة</span>

              {/* Single item input row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-white p-3.5 rounded-xl border border-slate-200/50">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">حدد الصنف لتوريده:</label>
                  <select
                    value={tempProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-11px bg-white focus:outline-hidden"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">صنف تكلفة الشراء (جملة):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tempCostPrice || ''}
                    onChange={(e) => setTempCostPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">الكمية المستلمة:</label>
                  <input
                    type="number"
                    min="1"
                    value={tempQty || ''}
                    onChange={(e) => setTempQty(parseInt(e.target.value) || 1)}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden"
                  />
                </div>

                <button
                  type="button"
                  onClick={addItemToPurchaseCart}
                  className="sm:col-span-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                >
                  <Plus size={14} /> إضافة
                </button>
              </div>

              {/* Items List inside the invoice creation flow */}
              <div className="bg-white rounded-xl border border-slate-205 overflow-hidden">
                <table className="w-full text-right text-[11px]">
                  <thead>
                    <tr className="bg-slate-100/60 text-slate-500 font-bold border-b border-slate-105">
                      <th className="p-2.5">اسم المنتج</th>
                      <th className="p-2.5 text-left">سعر التكلفة للمحل</th>
                      <th className="p-2.5 text-center">الكمية المستلمة</th>
                      <th className="p-2.5 text-left">المجموع الإجمالي</th>
                      <th className="p-2.5 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {itemsCart.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-800 font-bold">{item.productName}</td>
                        <td className="p-2.5 text-left font-mono">{item.costPrice.toFixed(2)}</td>
                        <td className="p-2.5 text-center font-mono text-slate-800">{item.quantity} units</td>
                        <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                          {(item.costPrice * item.quantity).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemFromPurchaseCart(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {itemsCart.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          الرجاء تجميع وبناء أصناف الفاتورة للبدء.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* History list purchases table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-105">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <FileSpreadsheet size={15} className="text-teal-500" />
              أرشيف فواتير توريد المستودعات من قبل الشركات
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-505 font-bold">
                  <th className="p-3">رقم الفاتورة المرجعية</th>
                  <th className="p-3">المورد الموصول</th>
                  <th className="p-3">تاريخ استلام الشحنة</th>
                  <th className="p-3">حالة السداد</th>
                  <th className="p-3 text-center">أصناف الشراء</th>
                  <th className="p-3 text-left">قيمة الفاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {purchases.map((pur) => {
                  return (
                    <tr key={pur.id} className="hover:bg-slate-50/20">
                      <td className="p-3 font-mono font-bold text-indigo-600">{pur.invoiceNumber}</td>
                      <td className="p-3 text-slate-850 font-bold">{pur.supplierName}</td>
                      <td className="p-3 text-slate-400 font-mono">
                        {new Date(pur.date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 ${
                          pur.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          pur.paymentStatus === 'partial' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-rose-50 text-rose-700 border border-rose-150'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pur.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {pur.paymentStatus === 'paid' ? 'مسددة بالكامل' : pur.paymentStatus === 'partial' ? 'متبقي آجل' : 'آجل ومستحقة'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-600">
                        {pur.items.length} أصناف ممتازة
                      </td>
                      <td className="p-3 text-left font-mono font-black text-slate-900">
                        {pur.total.toFixed(2)} {currencySymbol}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
