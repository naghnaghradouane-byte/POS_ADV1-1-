import React, { useState } from 'react';
import { Product, Order, Purchase, Expense, Customer, Supplier } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Truck, 
  Info, 
  Printer, 
  Search, 
  Calendar, 
  Coins, 
  Percent, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface ReportsViewProps {
  products: Product[];
  orders: Order[];
  purchases: Purchase[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  currencySymbol: string;
}

type ProfitPeriodKey = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'annual' | 'custom';

export default function ReportsView({
  products,
  orders,
  purchases,
  expenses,
  customers,
  suppliers,
  currencySymbol,
}: ReportsViewProps) {
  // Current Active Tab State
  const [activeTab, setActiveTab] = useState<'summary' | 'durations' | 'products' | 'customers'>('summary');

  // Interactive Product search & sort
  const [productSearch, setProductSearch] = useState('');
  const [productSortField, setProductSortField] = useState<'qty' | 'revenue' | 'profit' | 'margin'>('profit');
  const [productSortOrder, setProductSortOrder] = useState<'asc' | 'desc'>('desc');

  // Interactive Customer search & sort
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSortField, setCustomerSortField] = useState<'count' | 'revenue' | 'profit'>('profit');
  const [customerSortOrder, setCustomerSortOrder] = useState<'asc' | 'desc'>('desc');

  // Custom range picker states
  const todayDate = new Date();
  const formatDate = (d: Date) => d.toISOString().substring(0, 10);
  
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  
  const sevenDaysAgoDate = new Date();
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);

  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);

  const [startDateInput, setStartDateInput] = useState(formatDate(sevenDaysAgoDate));
  const [endDateInput, setEndDateInput] = useState(formatDate(todayDate));

  // Pre-calculated dates strings
  const todayStr = formatDate(todayDate);
  const yesterdayStr = formatDate(yesterdayDate);
  const sevenDaysAgoStr = formatDate(sevenDaysAgoDate);
  const thirtyDaysAgoStr = formatDate(thirtyDaysAgoDate);
  const startOfYearStr = `${todayDate.getFullYear()}-01-01`;

  // Filter completed and active orders
  const completedOrders = orders.filter((o) => o.status !== 'returned' && o.status !== 'refunded');
  const grossSales = completedOrders.reduce((s, o) => s + o.total, 0);

  // Total Cost of Sold Goods (COGS)
  let totalCOGS = 0;
  completedOrders.forEach((o) => {
    o.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const costPerUnit = prod ? prod.costPrice : item.price * 0.7;
      totalCOGS += costPerUnit * item.quantity;
    });
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = Math.max(0, grossSales - totalCOGS - totalExpenses);

  // CRM Balance / Debts
  const totalCustomerDebt = customers.reduce((s, c) => s + c.balance, 0);
  const totalSupplierPayables = suppliers.reduce((s, sup) => s + sup.payables, 0);

  // Inventory assessment
  const totalStockItems = products.reduce((s, p) => s + p.stockQuantity, 0);
  const lowStockItemsCount = products.filter((p) => p.stockQuantity <= p.minStockAlert).length;
  const totalAssetValue = products.reduce((s, p) => s + p.costPrice * p.stockQuantity, 0);

  // --------------------------------------------------------------------------------------
  // Helper to calculate financials within any arbitrary date range
  // --------------------------------------------------------------------------------------
  const calculateFinancialsForPeriod = (start: string, end: string) => {
    const periodOrders = completedOrders.filter((o) => {
      const oDate = o.date.substring(0, 10);
      return oDate >= start && oDate <= end;
    });

    const sales = periodOrders.reduce((sum, o) => sum + o.total, 0);
    
    let cogs = 0;
    periodOrders.forEach((o) => {
      o.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cost = prod ? prod.costPrice : item.price * 0.7;
        cogs += cost * item.quantity;
      });
    });

    const periodExpenses = expenses
      .filter((e) => {
        const eDate = e.date.substring(0, 10);
        return eDate >= start && eDate <= end;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const grossProfit = Math.max(0, sales - cogs);
    const netProfitWithExpenses = sales - cogs - periodExpenses;
    const margin = sales > 0 ? (grossProfit / sales) * 100 : 0;

    return {
      sales,
      cogs,
      expenses: periodExpenses,
      grossProfit,
      netProfit: netProfitWithExpenses,
      margin,
      count: periodOrders.length,
    };
  };

  // Pre-compiled list of comparative profit periods
  const profitPeriods = [
    {
      key: 'today',
      name: 'الأرباح اليومية (Daily)',
      duration: todayStr,
      start: todayStr,
      end: todayStr,
      ...calculateFinancialsForPeriod(todayStr, todayStr),
    },
    {
      key: 'yesterday',
      name: 'أرباح أمس (Yesterday)',
      duration: yesterdayStr,
      start: yesterdayStr,
      end: yesterdayStr,
      ...calculateFinancialsForPeriod(yesterdayStr, yesterdayStr),
    },
    {
      key: 'weekly',
      name: 'الأرباح الأسبوعية (Weekly)',
      duration: `من ${sevenDaysAgoStr} إلى ${todayStr}`,
      start: sevenDaysAgoStr,
      end: todayStr,
      ...calculateFinancialsForPeriod(sevenDaysAgoStr, todayStr),
    },
    {
      key: 'monthly',
      name: 'الأرباح الشهرية (Monthly)',
      duration: `من ${thirtyDaysAgoStr} إلى ${todayStr}`,
      start: thirtyDaysAgoStr,
      end: todayStr,
      ...calculateFinancialsForPeriod(thirtyDaysAgoStr, todayStr),
    },
    {
      key: 'annual',
      name: 'الأرباح السنوية (Annual)',
      duration: `من ${startOfYearStr} إلى ${todayStr}`,
      start: startOfYearStr,
      end: todayStr,
      ...calculateFinancialsForPeriod(startOfYearStr, todayStr),
    },
    {
      key: 'custom',
      name: 'فترة مخصصة (Custom Period)',
      duration: `من ${startDateInput} إلى ${endDateInput}`,
      start: startDateInput,
      end: endDateInput,
      ...calculateFinancialsForPeriod(startDateInput, endDateInput),
    }
  ];

  // --------------------------------------------------------------------------------------
  // Product-based Profit Calculations
  // --------------------------------------------------------------------------------------
  const rawProductProfitData = products.map((prod) => {
    let soldQty = 0;
    let revenue = 0;
    
    completedOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (item.productId === prod.id) {
          soldQty += item.quantity;
          // Item revenue after line-by-line discount
          const lineRevenue = item.price * (1 - item.discount / 100) * item.quantity;
          revenue += lineRevenue;
        }
      });
    });

    const cogs = prod.costPrice * soldQty;
    const profit = Math.max(0, revenue - cogs);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      product: prod,
      soldQty,
      revenue,
      cogs,
      profit,
      margin,
    };
  });

  // Filter & Sort Products
  const filteredProductsData = rawProductProfitData
    .filter((p) => 
      p.product.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.product.barcode.includes(productSearch) ||
      p.product.sku.toLowerCase().includes(productSearch.toLowerCase())
    )
    .sort((a, b) => {
      let fieldA = 0;
      let fieldB = 0;
      if (productSortField === 'qty') { fieldA = a.soldQty; fieldB = b.soldQty; }
      else if (productSortField === 'revenue') { fieldA = a.revenue; fieldB = b.revenue; }
      else if (productSortField === 'profit') { fieldA = a.profit; fieldB = b.profit; }
      else if (productSortField === 'margin') { fieldA = a.margin; fieldB = b.margin; }

      return productSortOrder === 'desc' ? fieldB - fieldA : fieldA - fieldB;
    });

  // --------------------------------------------------------------------------------------
  // Customer-based Profit Calculations
  // --------------------------------------------------------------------------------------
  const rawCustomerProfitData = customers.map((c) => {
    let orderCount = 0;
    let revenue = 0;
    let cogs = 0;

    completedOrders.forEach((o) => {
      // Check both ID and exact customerName match for robustness
      if (o.customerId === c.id || (o.customerName === c.name && c.id)) {
        orderCount++;
        revenue += o.total; // Net amount paid by the customer after discount + tax
        
        o.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const itemCost = prod ? prod.costPrice : item.price * 0.7;
          cogs += itemCost * item.quantity;
        });
      }
    });

    const profit = Math.max(0, revenue - cogs);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      customer: c,
      orderCount,
      revenue,
      cogs,
      profit,
      margin,
    };
  });

  // Sum up Anonymous / Walk-in customers calculations
  let walkInCount = 0;
  let walkInRevenue = 0;
  let walkInCOGS = 0;

  completedOrders.forEach((o) => {
    const isRegistered = customers.some(c => o.customerId === c.id || o.customerName === c.name);
    if (!isRegistered) {
      walkInCount++;
      walkInRevenue += o.total;
      o.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const itemCost = prod ? prod.costPrice : item.price * 0.7;
        walkInCOGS += itemCost * item.quantity;
      });
    }
  });

  const walkInProfit = Math.max(0, walkInRevenue - walkInCOGS);
  const walkInMargin = walkInRevenue > 0 ? (walkInProfit / walkInRevenue) * 100 : 0;

  // Combine registered customer data
  const combinedCustomerData = [...rawCustomerProfitData];
  if (walkInCount > 0) {
    combinedCustomerData.push({
      customer: {
        id: 'walkin',
        name: 'زبائن الـ POS المباشرين (نقدي / Walk-in)',
        phone: 'غير متوفر',
        address: 'مبيعات الكاونتر',
        balance: 0,
        debtLimit: 0,
        purchaseHistory: []
      },
      orderCount: walkInCount,
      revenue: walkInRevenue,
      cogs: walkInCOGS,
      profit: walkInProfit,
      margin: walkInMargin,
    });
  }

  // Filter & Sort Customer profitability
  const filteredCustomersData = combinedCustomerData
    .filter((c) => c.customer.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.customer.phone.includes(customerSearch))
    .sort((a, b) => {
      let fieldA = 0;
      let fieldB = 0;
      if (customerSortField === 'count') { fieldA = a.orderCount; fieldB = b.orderCount; }
      else if (customerSortField === 'revenue') { fieldA = a.revenue; fieldB = b.revenue; }
      else if (customerSortField === 'profit') { fieldA = a.profit; fieldB = b.profit; }

      return customerSortOrder === 'desc' ? fieldB - fieldA : fieldA - fieldB;
    });

  // Cycle Sort criteria helper functions
  const handleProductSort = (field: 'qty' | 'revenue' | 'profit' | 'margin') => {
    if (productSortField === field) {
      setProductSortOrder(productSortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setProductSortField(field);
      setProductSortOrder('desc');
    }
  };

  const handleCustomerSort = (field: 'count' | 'revenue' | 'profit') => {
    if (customerSortField === field) {
      setCustomerSortOrder(customerSortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setCustomerSortField(field);
      setCustomerSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6" id="reports-container">
      
      {/* Title & Section controller tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-sans font-black text-slate-800 text-sm">بوابة التقارير المالية الذكية والأرباح</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
            مراقبة الأرباح التشغيلية، احتساب تكلفة المبيعات والمصاريف وتتبع الفترات حسب العميل والسلعة.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'summary' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            الموقف المالي العام
          </button>
          <button
            onClick={() => setActiveTab('durations')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'durations' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            أرباح الفترات
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'products' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            أرباح السلع
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'customers' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            أرباح العملاء
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------------------- */}
      {/* TAB I: SUMMARY */}
      {/* ---------------------------------------------------------------------------------- */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* KPI 1: Gross Sales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">إجمالي حجم المبيعات (الركام)</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{grossSales.toFixed(2)}</span>
                <span className="text-xs font-semibold text-slate-500">{currencySymbol}</span>
              </div>
              <p className="text-[9px] text-slate-450 mt-1">المبيعات الإجمالية المحققة والمدفوعة</p>
            </div>

            {/* KPI 2: Total COGS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">تكلفة البضاعة المباعة (جملة)</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-850 font-mono">{totalCOGS.toFixed(2)}</span>
                <span className="text-xs font-semibold text-slate-500">{currencySymbol}</span>
              </div>
              <p className="text-[9px] text-slate-450 mt-1">التكلفة الأساسية للسلع قبل هامش البيع</p>
            </div>

            {/* KPI 3: Total Operating Overhead */}
            <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">المصاريف التشغيلية المدفوعة</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-rose-600 font-mono">{totalExpenses.toFixed(2)}</span>
                <span className="text-xs font-semibold text-slate-500">{currencySymbol}</span>
              </div>
              <p className="text-[9px] text-slate-450 mt-1">فواتير، رواتب وبنود الصرف اليومية</p>
            </div>

            {/* KPI 4: Absolute net Profit */}
            <div className="bg-gradient-to-tr from-emerald-500/10 to-teal-400/5 p-5 rounded-2xl border border-emerald-500/30 shadow-xs">
              <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">صافي الأرباح النهائية التقديرية</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-emerald-700 font-mono">{netProfit.toFixed(2)}</span>
                <span className="text-xs font-semibold text-slate-500">{currencySymbol}</span>
              </div>
              <p className="text-[9px] text-emerald-600 mt-1 font-bold">صافي الربح بعد خصم التكلفة والمصاريف</p>
            </div>
          </div>

          {/* Row 2: Customer Debts and Supplier Payables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Users size={16} className="text-emerald-500" />
                  أرصدة حسابات ديون العملاء (الأجل)
                </span>
                <span className="font-mono text-[11px] font-black bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-md">
                  الإجمالي المدين: {totalCustomerDebt.toFixed(0)} {currencySymbol}
                </span>
              </div>

              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {customers.filter((c) => c.balance > 0).map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-rose-50/20 border border-slate-100 rounded-xl">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">الجوال: {c.phone} | حد الدين: {c.debtLimit} ر.س</p>
                    </div>
                    <span className="font-mono text-xs font-black text-rose-700">
                      {c.balance.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                ))}
                {customers.filter((c) => c.balance > 0).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">لا يوجد أي مديونيات معلقة للعملاء.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Truck size={16} className="text-indigo-500" />
                  أرصدة مستحقات الموردين ومذمات الشراء
                </span>
                <span className="font-mono text-[11px] font-black bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded-md">
                  الإجمالي المستحقات: {totalSupplierPayables.toFixed(0)} {currencySymbol}
                </span>
              </div>

              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {suppliers.filter((s) => s.payables > 0).map((s) => (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">المندوب: {s.contactPerson} • هاتف: {s.phone}</p>
                    </div>
                    <span className="font-mono text-xs font-black text-amber-600">
                      {s.payables.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                ))}
                {suppliers.filter((s) => s.payables > 0).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">لا توجد ديون معلقة لأي مورد.</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Stock Valuation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-202 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <BarChart3 size={16} className="text-purple-500" />
                جرد وتقييم قيمة المستودع الحالي
              </span>
              <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-650 px-2.5 py-0.5 rounded-md">
                النواقص: {lowStockItemsCount} أصناف معطلة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-purple-50/50 border border-purple-100/50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">إجمالي المنتجات المخزنة</span>
                <span className="text-lg font-black font-mono text-purple-705">{totalStockItems} حبة</span>
              </div>
              <div className="p-4 bg-emerald-50/50 border border-emerald-110 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">تقييم المخزن بسعر التكلفة</span>
                <span className="text-lg font-black font-mono text-emerald-700">
                  {totalAssetValue.toFixed(2)} {currencySymbol}
                </span>
              </div>
              <div className="p-4 bg-amber-50/50 border border-amber-110 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">أصناف شارفت على النفاد</span>
                <span className="text-lg font-black font-mono text-amber-700">{lowStockItemsCount} أصناف</span>
              </div>
            </div>

            {/* Info and action bar */}
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-slate-500 font-bold flex items-center gap-2">
              <Info size={14} className="text-indigo-505 shrink-0" />
              <span>
                تقترن هذه الحسابات تلقائياً ببيانات حركة المخزن ومبيعات الـ POS اللحظية. يمكنك ضغط زر الطباعة العام لاستخراج تقرير رسمي.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------------- */}
      {/* TAB II: DURATIONS (PROFIT PERIODS & CUSTOM TIMELINE) */}
      {/* ---------------------------------------------------------------------------------- */}
      {activeTab === 'durations' && (
        <div className="space-y-6">
          {/* Custom Duration Specific Selector widgets */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
            <h4 className="font-black text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
              <Calendar size={15} />
              محدد واجهات الفترة المخصصة وحساب ربح المدة
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-4">
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-bold text-slate-400 block">من تاريخ (Start Date):</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="w-full bg-slate-800 text-white font-mono text-xs p-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 text-right leading-relaxed"
                  />
                </div>
              </div>

              <div className="space-y-1 text-right">
                <label className="text-[10px] font-bold text-slate-400 block">إلى تاريخ (End Date):</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="w-full bg-slate-800 text-white font-mono text-xs p-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 text-right leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center flex flex-col justify-center h-[42px] sm:h-[46px]">
                <span className="text-[10px] text-slate-400 block">حالة الفترة المخصصة</span>
                <span className="text-xs font-black text-white font-mono mt-0.5">
                  {calculateFinancialsForPeriod(startDateInput, endDateInput).count} فواتير نشطة
                </span>
              </div>
            </div>
          </div>

          {/* Master comparative table of Durations and Profits */}
          <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-850 text-xs border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <Coins className="text-emerald-500" size={16} />
              الأرباح المفرزة حسب الفترات التشغيلية والنسب
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs leading-relaxed border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                    <th className="p-3">الفترة الدورية</th>
                    <th className="p-3">المدة الزمنية المحددة للاحتساب</th>
                    <th className="p-3 text-center">عدد المبيعات</th>
                    <th className="p-3 text-left">قيمة المبيعات الإجمالية</th>
                    <th className="p-3 text-left bg-slate-100/50">تكلفة البضاعة المبيعة</th>
                    <th className="p-3 text-left">المصاريف الموزعة</th>
                    <th className="p-3 text-left text-emerald-800 font-extrabold bg-emerald-50/40">صافي الأرباح المحققة</th>
                    <th className="p-3 text-center text-indigo-800">هامش الربح %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono font-bold">
                  {profitPeriods.map((p) => {
                    const isCustom = p.key === 'custom';
                    return (
                      <tr key={p.key} className={`hover:bg-slate-50/50 transition ${isCustom ? 'bg-amber-50/20' : ''}`}>
                        <td className="p-3 font-sans text-slate-800 font-black">
                          {p.name}
                          {isCustom && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md mr-1 font-bold">محدد تفاعلي</span>}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] font-sans">{p.duration}</td>
                        <td className="p-3 text-center text-slate-700 font-mono">{p.count} فواتير</td>
                        <td className="p-3 text-left text-slate-900">{p.sales.toFixed(2)} {currencySymbol}</td>
                        <td className="p-3 text-left text-slate-600 bg-slate-100/30">{p.cogs.toFixed(2)} {currencySymbol}</td>
                        <td className="p-3 text-left text-rose-600">-{p.expenses.toFixed(2)} {currencySymbol}</td>
                        <td className={`p-3 text-left text-sm font-black bg-emerald-50/20 ${p.netProfit >= 0 ? 'text-emerald-650' : 'text-red-600'}`}>
                          {p.netProfit.toFixed(2)} {currencySymbol}
                        </td>
                        <td className="p-3 text-center text-indigo-600 font-mono">
                          <span className="bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                            {p.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl text-[10px] text-slate-500 flex items-start gap-2 leading-relaxed">
              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <span>
                <strong>معادلة صافي الربح للمدة:</strong> صافي الربح = (إجمالي المبيعات) - (تكلفة البضاعة المبيعة على أساس سعر الشراء) - (كافة المصاريف التشغيلية المقيدة خلال نفس الفترة الزمنية المحددة بعمود المزامنة).
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------------- */}
      {/* TAB III: PROFITS BY PRODUCT */}
      {/* ---------------------------------------------------------------------------------- */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Interactive controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-205 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search inputs */}
            <div className="relative w-full md:w-80">
              <Search className="absolute right-3.5 top-3.5 text-slate-400" size={15} />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ابحث باسم المنتج، الباركود أو الـ SKU..."
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition leading-relaxed text-right font-bold"
              />
            </div>

            {/* Hint label */}
            <div className="text-[10px] text-slate-550 leading-relaxed font-bold flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl">
              <Info size={14} className="text-indigo-500" />
              أضغط على عناوين أعمدة الجدول بالأسفل للتبديل وتغيير شروط الفرز والترتيب.
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                    <th className="p-3">تفاصيل السلعة / المنتج</th>
                    <th className="p-3">رقم الباركود / SKU</th>
                    <th 
                      onClick={() => handleProductSort('qty')}
                      className="p-3 text-center cursor-pointer hover:bg-slate-100/70 select-none transition"
                    >
                      الكمية المباعة {productSortField === 'qty' && (productSortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="p-3 text-left">سعر الشراء (التكلفة)</th>
                    <th className="p-3 text-left">سعر البيع الافتراضي</th>
                    <th 
                      onClick={() => handleProductSort('revenue')}
                      className="p-3 text-left cursor-pointer hover:bg-slate-100/70 select-none transition bg-slate-100/20"
                    >
                      إجمالي الإيرادات {productSortField === 'revenue' && (productSortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th 
                      onClick={() => handleProductSort('profit')}
                      className="p-3 text-left cursor-pointer hover:bg-slate-100/70 select-none transition text-emerald-800 font-black bg-emerald-50/20"
                    >
                      إيراد الأرباح الصافية {productSortField === 'profit' && (productSortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th 
                      onClick={() => handleProductSort('margin')}
                      className="p-3 text-center cursor-pointer hover:bg-slate-100/70 select-none transition text-indigo-800"
                    >
                      هامش الربح % {productSortField === 'margin' && (productSortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono font-bold">
                  {filteredProductsData.map((p) => (
                    <tr key={p.product.id} className="hover:bg-slate-50/40 transition">
                      <td className="p-3 font-sans text-slate-900 font-black truncate max-w-[200px]">
                        {p.product.name}
                        <span className="block text-[9px] text-slate-400 font-normal mt-0.5">قسم: {p.product.brand || 'عام'}</span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] font-mono">{p.product.barcode || p.product.sku}</td>
                      <td className="p-3 text-center text-slate-800">{p.soldQty} حبة</td>
                      <td className="p-3 text-left text-slate-600">{p.product.costPrice.toFixed(2)} {currencySymbol}</td>
                      <td className="p-3 text-left text-slate-500">{p.product.sellingPrice.toFixed(2)} {currencySymbol}</td>
                      <td className="p-3 text-left text-slate-900 bg-slate-100/10">{p.revenue.toFixed(2)} {currencySymbol}</td>
                      <td className="p-3 text-left text-sm text-emerald-650 font-black bg-emerald-50/10">
                        {p.profit.toFixed(2)} {currencySymbol}
                      </td>
                      <td className="p-3 text-center text-indigo-700">
                        <span className="bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">
                          {p.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredProductsData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold font-sans">
                        لا توجد بيانات بيع متطابقة مع شروط البحث أو الفرز المحددة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------------- */}
      {/* TAB IV: PROFITS BY CUSTOMER */}
      {/* ---------------------------------------------------------------------------------- */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-205 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search customer inputs */}
            <div className="relative w-full md:w-80">
              <Search className="absolute right-3.5 top-3.5 text-slate-400" size={15} />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="ابحث باسم العميل أو رقم الجوال..."
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition leading-relaxed text-right font-bold"
              />
            </div>

            <div className="text-[10px] text-slate-550 leading-relaxed font-bold flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl">
              <Info size={14} className="text-indigo-500" />
              أرباح الفواتير المباشرة لزبائن الـ POS تحسب مجملة ضمن الزبائن المباشرين لضمان دقة كاملة.
            </div>
          </div>

          {/* Table lists */}
          <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                    <th className="p-3">اسم المستهلك / العميل</th>
                    <th className="p-3">رقم جوال العميل</th>
                    <th className="p-3">العنوان المقيد</th>
                    <th 
                      onClick={() => handleCustomerSort('count')}
                      className="p-3 text-center cursor-pointer hover:bg-slate-100/70 select-none transition"
                    >
                      عدد الفواتير الصادرة {customerSortField === 'count' && (customerSortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th 
                      onClick={() => handleCustomerSort('revenue')}
                      className="p-3 text-left cursor-pointer hover:bg-slate-100/70 select-none transition bg-slate-100/10"
                    >
                      حجم المشتريات الإجمالي {customerSortField === 'revenue' && (customerSortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="p-3 text-left">تكلفة السلع المشتراة</th>
                    <th 
                      onClick={() => handleCustomerSort('profit')}
                      className="p-3 text-left cursor-pointer hover:bg-slate-100/70 select-none transition text-emerald-800 font-black bg-emerald-50/20"
                    >
                      صافي الأرباح المحققة منه {customerSortField === 'profit' && (customerSortOrder === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="p-3 text-center text-indigo-850">معدل الربحية %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono font-bold">
                  {filteredCustomersData.map((c, idx) => {
                    const isWalkIn = c.customer.id === 'walkin';
                    return (
                      <tr key={c.customer.id + '-' + idx} className={`hover:bg-slate-50/40 transition ${isWalkIn ? 'bg-indigo-50/15' : ''}`}>
                        <td className="p-3 font-sans text-slate-900 font-black">
                          {c.customer.name}
                          {isWalkIn && <span className="text-[9px] bg-indigo-100 text-indigo-750 px-2 py-0.5 rounded-md mr-1 font-bold">POS مباشر</span>}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{c.customer.phone}</td>
                        <td className="p-3 text-slate-400 font-sans text-[11px]">{c.customer.address || 'غير مقيد'}</td>
                        <td className="p-3 text-center text-slate-800">{c.orderCount} فواتير</td>
                        <td className="p-3 text-left text-slate-900 bg-slate-100/5">{c.revenue.toFixed(2)} {currencySymbol}</td>
                        <td className="p-3 text-left text-slate-600">{c.cogs.toFixed(2)} {currencySymbol}</td>
                        <td className="p-3 text-left text-sm text-emerald-650 font-black bg-emerald-50/10">
                          {c.profit.toFixed(2)} {currencySymbol}
                        </td>
                        <td className="p-3 text-center text-indigo-650">
                          <span className="bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">
                            {c.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCustomersData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold font-sans">
                        لا يوجد مستهلك معطيات تناسب شروط البحث المقروءة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
