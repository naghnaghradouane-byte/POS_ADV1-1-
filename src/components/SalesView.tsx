import React from 'react';
import { Order, Product, Customer, SystemUser, CompanySettings } from '../types';
import { formatFr } from '../utils/numberFormat';
import { useTranslation } from '../context/LanguageContext';
import { 
  Search, 
  Receipt, 
  X, 
  Edit3, 
  Save, 
  Info, 
  Download, 
  Clock,
  User
} from 'lucide-react';

interface SalesViewProps {
  orders: Order[];
  products: Product[];
  customers?: Customer[];
  onRefundOrder: (orderId: string) => void;
  onUpdateOrder: (order: Order) => void;
  onRestockProduct: (productId: string, val: number) => void;
  onUpdateCustomerBalance: (customerId: string, balanceChange: number) => void;
  currencySymbol: string;
  activeUser?: SystemUser;
  settings: CompanySettings;
}

export default function SalesView({
  orders = [],
  products = [],
  customers = [],
  onRefundOrder,
  onUpdateOrder,
  onRestockProduct,
  onUpdateCustomerBalance,
  currencySymbol,
  activeUser,
  settings,
}: SalesViewProps) {
  const { lang, t } = useTranslation();
  const isRtl = lang === 'ar';

  const [searchQuery, setSearchQuery] = React.useState('');

  // Invoice Editing state
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);

  // Input fields for metadata modifications
  const [editInvoiceNumber, setEditInvoiceNumber] = React.useState('');
  const [editCustomerId, setEditCustomerId] = React.useState('');
  const [editCustomerName, setEditCustomerName] = React.useState('');
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<'cash' | 'card' | 'transfer' | 'debt'>('cash');
  const [editDate, setEditDate] = React.useState('');

  // Authorize edit/return permissions based on active operator
  const canEdit = activeUser?.permissions?.editInvoices !== false;

  const handleExportSalesCSV = () => {
    // CSV Header row
    const headers = isRtl ? [
      'رقم الفاتورة (Invoice Number)',
      'العميل (Customer)',
      'طريقة الدفع (Payment Method)',
      'التاريخ والوقت (Date & Time)',
      'عدد السلع (Total Items)',
      'المجموع الفرعي (Subtotal)',
      'الخصومات (Discount)',
      'قيمة الضريبة (VAT 15%)',
      'الإجمالي النهائي (Total)',
      'حالة الفاتورة (Status)'
    ] : [
      'N° Facture',
      'Client',
      'Mode de paiement',
      'Date & Heure',
      'Total d\'articles',
      'Sous-total',
      'Remise',
      'Taxe (15%)',
      'Total',
      'Statut'
    ];

    // Data rows
    const rows = orders.map((order) => {
      const isRefunded = order.status === 'refunded';
      const isPartiallyReturned = order.status === 'returned' || order.status === 'partially_returned';
      const statusText = isRefunded 
        ? (isRtl ? 'مرتجع بالكامل' : 'Retourné intégral') 
        : isPartiallyReturned 
          ? (isRtl ? 'مرتجع جزئي' : 'Retour partiel') 
          : (isRtl ? 'مكتملة ومرحلة' : 'Complétée');

      const paymentMethodText = 
         order.paymentMethod === 'cash' ? (isRtl ? 'نقدي' : 'Espèces') :
         order.paymentMethod === 'card' ? (isRtl ? 'بطاقة مادا' : 'Carte') :
         order.paymentMethod === 'transfer' ? (isRtl ? 'تحويل بنكي' : 'Virement') : 
         (isRtl ? 'آجل (دين)' : 'À crédit');
      const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

      return [
        `"${order.invoiceNumber}"`,
        `"${order.customerName.replace(/"/g, '""')}"`,
        `"${paymentMethodText}"`,
        `"${new Date(order.date).toLocaleString('fr-FR')}"`,
        totalItems,
        order.subtotal,
        order.discountAmount,
        order.taxAmount,
        order.total,
        `"${statusText}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEditOrder = (order: Order) => {
    if (!canEdit) {
      alert(isRtl 
        ? '🔒 حظر أمني: الموظف النشط لا يمتلك صلاحية تعديل بنود الفواتير الصادرة.'
        : '🔒 Blocage : L\'utilisateur n\'a pas l\'autorisation de modifier les factures.'
      );
      return;
    }
    if (order.status === 'refunded') {
      alert(isRtl
        ? 'عذراً، هذه الفاتورة معادة بالكامل ولا يمكن تعديلها.'
        : 'Désolé, cette facture est entièrement remboursée et ne peut plus être modifiée.'
      );
      return;
    }
    
    setEditingOrder({
      ...order,
      items: order.items.map(item => ({ ...item }))
    });

    setEditInvoiceNumber(order.invoiceNumber);
    setEditCustomerId(order.customerId || '');
    setEditCustomerName(order.customerName);
    setEditPaymentMethod(order.paymentMethod);

    try {
      const d = new Date(order.date);
      const offsetMs = d.getTimezoneOffset() * 60 * 1000;
      const localISOTime = new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
      setEditDate(localISOTime);
    } catch {
      setEditDate(order.date.slice(0, 16));
    }
  };

  const handleEditItemQuantity = (productId: string, newQty: number) => {
    if (!editingOrder) return;
    
    const originalOrder = orders.find(o => o.id === editingOrder.id);
    const origItem = originalOrder?.items.find(i => i.productId === productId);
    const maxQty = origItem?.quantity || 9999;

    if (newQty < 0) return;
    if (newQty > maxQty) {
      alert(isRtl
        ? `الحد الأقصى للتعديل هو الكمية التي اشتراها العميل بالفعل وهي (${maxQty})`
        : `La quantité maximale de modification est la quantité achetée (${maxQty})`
      );
      return;
    }

    setEditingOrder({
      ...editingOrder,
      items: editingOrder.items.map(item =>
        item.productId === productId ? { ...item, quantity: newQty } : item
      )
    });
  };

  const handleEditItemPrice = (productId: string, newPrice: number) => {
    if (!editingOrder) return;
    if (newPrice < 0) return;

    setEditingOrder({
      ...editingOrder,
      items: editingOrder.items.map(item =>
        item.productId === productId ? { ...item, price: newPrice } : item
      )
    });
  };

  const handleEditItemDiscount = (productId: string, newDiscount: number) => {
    if (!editingOrder) return;
    if (newDiscount < 0 || newDiscount > 100) return;

    setEditingOrder({
      ...editingOrder,
      items: editingOrder.items.map(item =>
        item.productId === productId ? { ...item, discount: newDiscount } : item
      )
    });
  };

  const calculateEditTotals = () => {
    if (!editingOrder) return { subtotal: 0, discount: 0, tax: 0, total: 0 };
    
    const subtotal = editingOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = editingOrder.items.reduce((sum, item) => sum + (item.price * (item.discount / 100) * item.quantity), 0);
    const tax = (subtotal - discount) * (settings.taxRate / 100);
    const total = (subtotal - discount) + tax;

    return { subtotal, discount, tax, total };
  };

  const editTotals = calculateEditTotals();

  const handleSaveEditedOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const originalOrder = orders.find(o => o.id === editingOrder.id);
    if (!originalOrder) return;

    const normalizedInv = editInvoiceNumber.trim();
    if (!normalizedInv) {
      alert(isRtl ? 'يجب إدخال رقم الفاتورة.' : 'Le numéro de facture est requis.');
      return;
    }
    const isDuplicate = orders.some(o => o.id !== originalOrder.id && o.invoiceNumber.toLowerCase() === normalizedInv.toLowerCase());
    if (isDuplicate) {
      alert(isRtl
        ? `رقم الفاتورة "${normalizedInv}" مستخدم بالفعل لفاتورة أخرى. يرجى اختيار رقم فريد.`
        : `Le numéro de facture "${normalizedInv}" est déjà utilisé. Veuillez en choisir un autre.`
      );
      return;
    }

    originalOrder.items.forEach(origItem => {
      const editedItem = editingOrder.items.find(i => i.productId === origItem.productId);
      const editedQty = editedItem ? editedItem.quantity : 0;
      const returnedQty = origItem.quantity - editedQty;
      
      if (returnedQty !== 0) {
        onRestockProduct(origItem.productId, returnedQty);
      }
    });

    editingOrder.items.forEach(newItem => {
      const origItem = originalOrder.items.find(i => i.productId === newItem.productId);
      if (!origItem) {
        onRestockProduct(newItem.productId, -newItem.quantity);
      }
    });

    const oldTotal = originalOrder.total;
    const oldCustId = originalOrder.customerId;
    const oldMethod = originalOrder.paymentMethod;

    const newTotal = editTotals.total;
    const newCustId = editCustomerId || undefined;
    const newMethod = editPaymentMethod;

    if (oldMethod === 'debt' && oldCustId) {
      onUpdateCustomerBalance(oldCustId, -oldTotal);
    }

    if (newMethod === 'debt' && newCustId) {
      onUpdateCustomerBalance(newCustId, newTotal);
    }

    let finalStatus: Order['status'] = 'completed';
    const totalQtyInvoiced = editingOrder.items.reduce((s, i) => s + i.quantity, 0);
    const originalTotalQty = originalOrder.items.reduce((s, i) => s + i.quantity, 0);

    if (totalQtyInvoiced === 0 || editTotals.total === 0) {
      finalStatus = 'refunded';
    } else if (totalQtyInvoiced < originalTotalQty) {
      finalStatus = 'partially_returned';
    } else if (originalOrder.status === 'partially_returned' || originalOrder.status === 'returned') {
      finalStatus = 'partially_returned';
    }

    const finalOrder: Order = {
      ...originalOrder,
      invoiceNumber: normalizedInv,
      customerId: editCustomerId || undefined,
      customerName: editCustomerName || (isRtl ? 'عميل غير مسجل' : 'Client non enregistré'),
      paymentMethod: editPaymentMethod,
      date: new Date(editDate).toISOString(),
      items: editingOrder.items.filter(item => item.quantity > 0),
      subtotal: editTotals.subtotal,
      discountAmount: editTotals.discount,
      taxAmount: editTotals.tax,
      total: editTotals.total,
      status: finalStatus,
    };

    onUpdateOrder(finalOrder);
    setEditingOrder(null);
    alert(isRtl
      ? '🟢 تم تحديث الفاتورة والمقادير المخزنية وتسوية الحسابات المالية للزبائن بنجاح!'
      : '🟢 Facture mise à jour avec succès !'
    );
  };

  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    return (
      order.invoiceNumber.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.paymentMethod.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in" id="sales-view-container">
      {/* Top action row */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <span className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-slate-400`}>
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder={isRtl ? 'ابحث برقم الفاتورة، اسم الزبون، طريقة الدفع...' : 'Recherche par facture, client, mode...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-2.5 rounded-2xl border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-zinc-100 ${
              isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'
            }`}
          />
        </div>

        <button
          onClick={handleExportSalesCSV}
          className="w-full md:w-auto py-2.5 px-4 bg-indigo-50/90 text-indigo-750 dark:bg-slate-800 dark:text-slate-200 border border-indigo-200/40 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-100/80 transition shadow-xs cursor-pointer"
          title="Export Excel CSV"
        >
          <Download size={14} />
          <span>{isRtl ? 'تصدير كشف المبيعات (Excel CSV)' : 'Exporter (CSV)'}</span>
        </button>
      </div>

      {/* Invoices List Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-850/80 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-150 flex items-center gap-1.5">
            <Receipt size={15} className="text-indigo-505" />
            <span>{isRtl ? 'عرض وإدارة الفواتير التفصيلي' : 'Historique et Édition des Factures'}</span>
          </span>
          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 font-mono py-1 px-2.5 rounded-lg text-slate-650 dark:text-slate-300 font-black">
            {isRtl ? 'إجمالي الفواتير:' : 'Total Factures :'}{' '}
            <span className="font-mono">{formatFr(filteredOrders.length, 0)}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-105 dark:border-slate-850 text-slate-500 dark:text-slate-400 font-bold select-none">
                <th className="p-4">{isRtl ? 'رقم الفاتورة' : 'N° Facture'}</th>
                <th className="p-4">{isRtl ? 'العميل المقيد' : 'Client bénéficiaire'}</th>
                <th className="p-4">{isRtl ? 'التاريخ والوقت' : 'Date & Heure'}</th>
                <th className="p-4 text-center">{isRtl ? 'طريقة التسوية' : 'Règlement'}</th>
                <th className={`p-4 ${isRtl ? 'text-left' : 'text-right'}`}>{isRtl ? 'قيمة الفاتورة المعتمدة' : 'Montant total'}</th>
                <th className="p-4 text-center">{isRtl ? 'الحالة' : 'Statut'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {filteredOrders.map((order) => {
                const isRefunded = order.status === 'refunded';
                const isPartiallyReturned = order.status === 'returned' || order.status === 'partially_returned';
                
                return (
                  <tr 
                    key={order.id} 
                    onClick={() => handleOpenEditOrder(order)}
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-850/20 transition cursor-pointer select-none"
                    title={isRtl ? 'اضغط لتعديل تفاصيل الفاتورة مباشرة' : 'Cliquez pour modifier directement la facture'}
                  >
                    {/* رقم الفاتورة */}
                    <td className="p-4 font-mono font-black text-emerald-600 dark:text-emerald-400">{order.invoiceNumber}</td>
                    
                    {/* العميل */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span className="text-slate-800 dark:text-zinc-200">{order.customerName}</span>
                      </div>
                    </td>

                    {/* التاريخ والوقت */}
                    <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} className="text-slate-400 shrink-0" />
                        <span>
                          {new Date(order.date).toLocaleString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* طريقة الدفع */}
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        order.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-705 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40' :
                        order.paymentMethod === 'card' ? 'bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40' :
                        order.paymentMethod === 'debt' ? 'bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40' :
                        'bg-amber-50 text-amber-705 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
                      }`}>
                        {order.paymentMethod === 'cash' ? (isRtl ? 'نقدي' : 'Espèces') :
                         order.paymentMethod === 'card' ? (isRtl ? 'بطاقة مادا' : 'Carte') :
                         order.paymentMethod === 'transfer' ? (isRtl ? 'تحويل بنكي' : 'Virement') :
                         (isRtl ? 'آجل (دين العميل)' : 'À crédit')}
                      </span>
                    </td>

                    {/* القيمة */}
                    <td className={`p-4 font-mono font-black text-slate-900 dark:text-zinc-100 ${isRtl ? 'text-left' : 'text-right'}`}>
                      {formatFr(order.total)} {currencySymbol}
                    </td>

                    {/* حالة الفاتورة */}
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
                        isRefunded ? 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-450 dark:border-rose-900' :
                        isPartiallyReturned ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-450 dark:border-amber-900' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-205 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900'
                      }`}>
                        {isRefunded ? (isRtl ? 'مرتجع كلي' : 'Retour total') :
                         isPartiallyReturned ? (isRtl ? 'مرتجع جزئي' : 'Retour partiel') :
                         (isRtl ? 'مكتملة ومرحلة' : 'Payée')}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 font-bold">
                    {isRtl ? 'لا توجد فواتير مبيعات مسجلة في النظام تطابق هذا البحث حالياً.' : 'Aucune facture trouvée correspondant aux critères.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Invoice Operations Center Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            
            {/* Modal Title bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 size={15} className="text-violet-400" />
                <h3 className="font-extrabold text-xs sm:text-sm">
                  {isRtl
                    ? `مركز تعديل وإرجاع الفواتير (تعديل رقم ${editingOrder.invoiceNumber})`
                    : `Saisie & Traitement de Facture N° ${editingOrder.invoiceNumber}`}
                </h3>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-450 hover:text-white p-1 rounded-full bg-slate-800 w-7 h-7 flex items-center justify-center text-xs cursor-pointer border-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <form onSubmit={handleSaveEditedOrder} className="space-y-4">
                
                {/* Basic Metadata settings */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* رقم الفاتورة */}
                  <div className="space-y-1 text-right">
                    <label className={`text-[10px] sm:text-xs font-black text-slate-650 dark:text-slate-400 block p-0.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? 'رقم الفاتورة المميز *' : 'Numéro de facture unique *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editInvoiceNumber}
                      onChange={(e) => setEditInvoiceNumber(e.target.value)}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-zinc-100 ${isRtl ? 'text-right' : 'text-left'}`}
                      placeholder="Facture N°..."
                    />
                  </div>

                  {/* التاريخ والوقت */}
                  <div className="space-y-1 text-right">
                    <label className={`text-[10px] sm:text-xs font-black text-slate-655 dark:text-slate-400 block p-0.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? 'التاريخ والوقت للفاتورة *' : 'Date & Heure de facture *'}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 text-slate-500 dark:text-zinc-200 ${isRtl ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  {/* العميل المستفيد */}
                  <div className="space-y-1 text-right">
                    <label className={`text-[10px] sm:text-xs font-black text-slate-650 dark:text-slate-400 block p-0.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? 'العميل والمستفيد المعتمد *' : 'Client référencé *'}
                    </label>
                    <select
                      value={editCustomerId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setEditCustomerId(cid);
                        const c = customers.find(x => x.id === cid);
                        setEditCustomerName(c ? c.name : (isRtl ? 'عميل غير مسجل' : 'Client Comptant Regular'));
                      }}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-zinc-105 ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <option value="">{isRtl ? '-- عميل مبيعات نقدي عام --' : '-- Client comptant général --'}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  </div>

                  {/* طريقة الدفع والتحصيل */}
                  <div className="space-y-1 text-right">
                    <label className={`text-[10px] sm:text-xs font-black text-slate-650 dark:text-slate-400 block p-0.5 ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? 'طريقة التحصيل والتسوية *' : 'Mode de règlement *'}
                    </label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-zinc-100 ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <option value="cash">{isRtl ? 'نقدي (كاش بالدرج)' : 'Espèces (Caisse)'}</option>
                      <option value="card">{isRtl ? 'البطاقات المصرفية (مادا)' : 'Carte Bancaire'}</option>
                      <option value="transfer">{isRtl ? 'التحويلات البنكية المباشرة' : 'Virement Bancaire Direct'}</option>
                      <option value="debt">{isRtl ? 'الحساب الآجل (ذمم ديون العميل)' : 'Compte à Crédit (Dette Client)'}</option>
                    </select>
                  </div>

                </div>

                {/* Pricing and discounts editing table for items */}
                <div className="space-y-2 text-right">
                  <label className={`text-xs font-black text-slate-800 dark:text-zinc-200 block ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'تعديل بنود الفاتورة والأسعار والخصم المطبق مسبقاً:' : 'Articles de la Facture :'}
                  </label>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                    <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-400 font-bold select-none">
                          <th className="p-3">{isRtl ? 'المنتج (السلعة)' : 'Produit'}</th>
                          <th className="p-3 text-center">{isRtl ? 'السعر المبيع (ر.س)' : 'Prix unitaire'}</th>
                          <th className="p-3 text-center">{isRtl ? 'الخصم (%)' : 'Remise (%)'}</th>
                          <th className="p-3 text-center">{isRtl ? 'الكمية المقيدة' : 'Quantité'}</th>
                          <th className={`p-3 ${isRtl ? 'text-left' : 'text-right'}`}>{isRtl ? 'الصافي الكلي' : 'Total Net'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-855">
                        {editingOrder.items.map((item) => (
                          <tr key={item.productId} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/40">
                            <td className="p-3 font-extrabold text-slate-800 dark:text-zinc-150">{item.productName}</td>
                            
                            {/* تعديل سعر البيع للسلعة */}
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.price || ''}
                                onChange={(e) => handleEditItemPrice(item.productId, parseFloat(e.target.value) || 0)}
                                className="w-16 px-1.5 py-1 text-center font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded text-xs text-slate-800 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                              />
                            </td>

                            {/* تعديل خصم السلعة */}
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount || ''}
                                onChange={(e) => handleEditItemDiscount(item.productId, parseFloat(e.target.value) || 0)}
                                className="w-12 px-1 py-1 text-center font-mono bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded text-xs text-slate-800 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                              />
                            </td>

                            {/* تعديل الكمية */}
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleEditItemQuantity(item.productId, item.quantity - 1)}
                                  className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-205 border border-slate-200 dark:border-slate-700 font-bold text-xs text-rose-650 flex items-center justify-center cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-bold font-mono text-xs text-slate-805 dark:text-zinc-100">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEditItemQuantity(item.productId, item.quantity + 1);
                                  }}
                                  className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-205 border border-slate-200 dark:border-slate-705 font-bold text-xs text-emerald-650 flex items-center justify-center cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className={`p-3 font-mono font-black text-slate-900 dark:text-zinc-150 ${isRtl ? 'text-left' : 'text-right'}`}>
                              {formatFr((item.price - item.price * (item.discount / 100)) * item.quantity)} {currencySymbol}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial summary calculations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-805 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-500 border-b pb-1 dark:border-slate-800">
                      <span>{isRtl ? 'القيم المالية المعدلة (حسابات الفاتورة):' : 'Calcul financier ajusté :'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isRtl ? 'المجموع الفرعي الجديد:' : 'Nouveau sous-total :'}</span>
                      <span className="font-bold">{formatFr(editTotals.subtotal)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>{isRtl ? 'الخصومات المطبقة الجديدة:' : 'Nouvelles remises :'}</span>
                      <span className="font-bold">-{formatFr(editTotals.discount)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isRtl ? `مبلغ الضريبة الجديد (${settings.taxRate}%):` : `Nouvel impôt (${settings.taxRate}%) :`}</span>
                      <span className="font-bold">{formatFr(editTotals.tax)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-905 dark:text-white border-t dark:border-slate-800 pt-2">
                      <span>{isRtl ? 'الإجمالي الجديد:' : 'Nouveau Net à payer :'}</span>
                      <span className="font-mono">{formatFr(editTotals.total)} {currencySymbol}</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 dark:bg-amber-955/20 p-4 rounded-2xl border border-amber-200/50 flex flex-col justify-center space-y-1.5 leading-relaxed text-xs text-right">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold justify-end">
                      <Info size={14} />
                      <span>{isRtl ? 'أثر التعديل على الحسابات المالية:' : 'Impact de l\'ajustement :'}</span>
                    </div>
                    <p className="font-bold text-slate-650 dark:text-slate-350 mt-1">
                      {isRtl ? 'إجمالي الفاتورة الأساسية السابقة كان:' : 'Total de la facture originale :'} <strong className="font-mono text-slate-800 dark:text-white">{formatFr(orders.find(o => o.id === editingOrder.id)?.total)} {currencySymbol}</strong>
                    </p>
                    <p className="font-bold text-slate-655 dark:text-slate-350">
                      {isRtl ? 'فرق التوجيه المالي المسترجّع للزبون:' : 'Solde à rembourser / ajuster :'} <strong className="font-mono text-amber-650 dark:text-amber-400 text-sm">{formatFr(orders.find(o => o.id === editingOrder.id)!.total - editTotals.total)} {currencySymbol}</strong>
                    </p>
                  </div>
                </div>

                {/* Actions buttons footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-violet-650 hover:bg-violet-600 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer border-none"
                  >
                    <Save size={14} />
                    <span>{isRtl ? 'حفظ كافة التعديلات والتسويات ونقل المبيعات' : 'Enregistrer et liquider les modifications'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="w-32 py-3 bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-zinc-300 hover:bg-slate-200 rounded-2xl font-bold text-xs transition cursor-pointer border-none"
                  >
                    {isRtl ? 'إلغاء التعديل' : 'Annuler'}
                  </button>
                </div>

              </form>
            </div>

            {/* Quick footer helper info bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-505 font-bold text-[10px] text-center select-none">
              {isRtl ? 'نظام الفوترة الإلكتروني المتكامل والمبيعات الذكي • الإصدار v1.0' : 'Système de Facturation Électronique Intégré v1.0'}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
