import React from 'react';
import { Product, Order, Expense } from '../types';
import { useTranslation } from '../context/LanguageContext';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  PackageCheck,
  ShoppingCart,
  Users
} from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  orders: Order[];
  expenses: Expense[];
  onNavigate: (view: string) => void;
  currencySymbol: string;
}

export default function DashboardView({
  products,
  orders,
  expenses,
  onNavigate,
  currencySymbol,
}: DashboardViewProps) {
  const { lang } = useTranslation();
  const isRtl = lang === 'ar';

  // Compute analytics based on simulated dates
  const todayStr = '2026-06-04';

  const todayOrders = orders.filter(
    (o) => o.date.startsWith(todayStr) && o.status !== 'returned'
  );
  const dailySalesTotal = todayOrders.reduce((sum, o) => sum + o.total, 0);

  const monthlyOrders = orders.filter(
    (o) => o.date.startsWith('2026-06') && o.status !== 'returned'
  );
  const monthlySalesTotal = monthlyOrders.reduce((sum, o) => sum + o.total, 0);

  const calculateCOGS = (ordersList: Order[]) => {
    let totalCOGS = 0;
    ordersList.forEach((order) => {
      order.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cost = prod ? prod.costPrice : item.price * 0.7;
        totalCOGS += cost * item.quantity;
      });
    });
    return totalCOGS;
  };

  const monthlyCOGS = calculateCOGS(monthlyOrders);
  const monthlyExpenses = expenses
    .filter((e) => e.date.startsWith('2026-06'))
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyNetProfit = Math.max(0, monthlySalesTotal - monthlyCOGS - monthlyExpenses);

  const lowStockProducts = products.filter(
    (p) => p.stockQuantity <= p.minStockAlert
  );

  const productSalesMap: Record<string, { name: string; qty: number; total: number }> = {};
  orders.forEach((o) => {
    if (o.status !== 'returned') {
      o.items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.productName, qty: 0, total: 0 };
        }
        productSalesMap[item.productId].qty += item.quantity;
        productSalesMap[item.productId].total += item.price * item.quantity;
      });
    }
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);

  const dailyChartData = [
    { label: isRtl ? '01 يونيو' : '01 Juin', value: 850 },
    { label: isRtl ? '02 يونيو' : '02 Juin', value: 1200 },
    { label: isRtl ? '03 يونيو' : '03 Juin', value: 193 },
    { label: isRtl ? '04 يونيو' : '04 Juin', value: Math.round(orders.filter((o) => o.date.startsWith('2026-06-04')).reduce((s, o) => s + o.total, 0)) },
  ];

  const maxChartVal = Math.max(...dailyChartData.map((d) => d.value), 1000);

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Top Banner with Clock / Greeting */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-lg border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className={isRtl ? 'text-right' : 'text-left'}>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              {isRtl ? 'مرحباً بك مجدداً، مدير النظام 👋' : 'Bienvenue à nouveau, Admin 👋'}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              {isRtl 
                ? 'التقرير العام لمبيعات اليوم والمستودعات. النظام محدّث ويعمل بكامل كفاءته دون اتصال بالإنترنت.' 
                : 'Aperçu général des ventes du jour et du stock. Le système est à jour.'}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700/65 font-mono text-xs md:text-sm text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>{isRtl ? '4 يونيو 2026' : '04 Juin 2026'}</span>
            <span className={isRtl ? 'border-r border-slate-705 pr-2' : 'border-l border-slate-700 pl-2'}>
              {isRtl ? '06:26 م' : '18:26'} (Local)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Core Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className={isRtl ? 'text-right space-y-1' : 'text-left space-y-1'}>
            <p className="text-xs font-semibold text-slate-500">
              {isRtl ? 'مبيعات اليوم' : 'Ventes du jour'}
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono">
              {dailySalesTotal.toFixed(2)} <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
            </h3>
            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
              <span className="font-mono">+{todayOrders.length}</span> {isRtl ? 'فواتير مباعة اليوم' : 'Factures vendues aujourd\'hui'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <ShoppingCart size={22} />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className={isRtl ? 'text-right space-y-1' : 'text-left space-y-1'}>
            <p className="text-xs font-semibold text-slate-500">
              {isRtl ? 'مبيعات الشهر الحالي' : 'Ventes mensuelles'}
            </p>
            <h3 className="text-2xl font-black text-indigo-900 font-mono">
              {monthlySalesTotal.toFixed(2)} <span className="text-xs font-normal text-slate-500">{currencySymbol}</span>
            </h3>
            <p className="text-[11px] text-indigo-600 flex items-center gap-1">
              <span className="font-mono">+{monthlyOrders.length}</span> {isRtl ? 'إجمالي مبيعات يونيو' : 'Ventes totales en Juin'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className={isRtl ? 'text-right space-y-1' : 'text-left space-y-1'}>
            <p className="text-xs font-semibold text-slate-500">
              {isRtl ? 'صافي الربح التقديري' : 'Bénéfice net estimé'}
            </p>
            <h3 className="text-2xl font-black text-emerald-700 font-mono">
              {monthlyNetProfit.toFixed(2)} <span className="text-xs font-normal text-slate-505">{currencySymbol}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {isRtl ? 'خصم ثمن التكلفة والمصروفات' : 'Moins coût et dépenses'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100/60 flex items-center justify-center text-emerald-700">
            <PackageCheck size={22} />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className={isRtl ? 'text-right space-y-1' : 'text-left space-y-1'}>
            <p className="text-xs font-semibold text-slate-500">
              {isRtl ? 'تنبيهات نواقص المخزن' : 'Alertes de stock faible'}
            </p>
            <h3 className={`text-2xl font-black font-mono ${lowStockProducts.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-800'}`}>
              {lowStockProducts.length} <span className="text-xs font-normal text-slate-500">{isRtl ? 'منتجات' : 'Produits'}</span>
            </h3>
            <p className="text-[11px] text-amber-700 font-medium">
              {isRtl ? 'وصلت للحد الأدنى المسموح' : 'Seuil minimum atteint'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowStockProducts.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Charts & Top lists block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart Analytics Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="font-bold text-slate-800">
                {isRtl ? 'مخطط الإيرادات اليومية' : 'Graphique des revenus'}
              </h3>
              <p className="text-xs text-slate-505">
                {isRtl ? 'حركة المبيعات خلال الأيام الأربعة الأخيرة لشهر يونيو' : 'Ventes des 4 derniers jours en Juin'}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-bold text-slate-600">
              {isRtl ? 'إحصاء فوري' : 'Direct Sync'}
            </span>
          </div>

          {/* SVG Custom Sales Graph */}
          <div className="relative pt-4 h-60">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="170" x2="480" y2="170" stroke="#e2e8f0" strokeWidth="1" />

              {/* Values and Line */}
              {(() => {
                const getPoints = () => {
                  const paddingX = 110;
                  const startX = 60;
                  return dailyChartData.map((d, index) => {
                    const x = startX + index * paddingX;
                    const y = 170 - (d.value / maxChartVal) * 130;
                    return { x, y, label: d.label, val: d.value };
                  });
                };
                const points = getPoints();
                const dPath = points.reduce((str, p, index) => {
                  return str + (index === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
                }, '');
                const dArea = dPath + ` L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

                return (
                  <>
                    {/* Shadow Area under the line */}
                    <path d={dArea} fill="url(#chartGrad)" />

                    {/* Main Line with Pulse */}
                    <path d={dPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Nodes and Labels */}
                    {points.map((p, index) => (
                      <g key={index} className="group cursor-pointer">
                        <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
                        <circle cx={p.x} cy={p.y} r="10" fill="#10b981" fillOpacity="0.1" className="hover:scale-150 transition-all duration-200" />
                        
                        {/* Tooltip text */}
                        <text x={p.x} y={p.y - 12} textAnchor="middle" className="font-mono text-10px font-extrabold fill-emerald-600">
                          {p.val} {currencySymbol}
                        </text>

                        {/* Axis X Label */}
                        <text x={p.x} y="190" textAnchor="middle" className="text-11px font-medium fill-slate-505">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Top Product list Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">
              {isRtl ? 'الأكثر مبيعاً' : 'Les plus vendus'}
            </h3>
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
              {isRtl ? 'تحديث يومي' : 'Mis à jour'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 space-y-3.5 pt-1">
            {topProducts.length > 0 ? (
              topProducts.map((prod, index) => (
                <div key={index} className="flex items-center gap-3 pt-3.5 first:pt-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className={`font-bold text-xs text-slate-800 truncate ${isRtl ? 'text-right' : 'text-left'}`}>{prod.name}</p>
                    <p className={`text-[10px] text-slate-550 ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? `تم بيع ${prod.qty} وحدات` : `${prod.qty} unités vendues`}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-800 shrink-0">
                    {prod.total.toFixed(2)} {currencySymbol}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                {isRtl ? 'لا توجد مبيعات مسجلة حتى الآن.' : 'Aucune vente enregistrée pour le moment.'}
              </p>
            )}
          </div>
          <button
            onClick={() => onNavigate('pos')}
            className="w-full mt-2 text-center text-xs text-emerald-605 font-extrabold hover:text-emerald-700 flex items-center justify-center gap-1 group py-2 bg-emerald-50/50 rounded-xl"
          >
            <span>
              {isRtl ? 'انتقل لشاشة البيع لتسجيل مبيعات جديدة' : "Aller à la caisse pour l'enregistrement"}
            </span>
            <ArrowUpRight size={14} className="group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition" />
          </button>
        </div>
      </div>

      {/* Row: Low Stock list & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts (1/3 of row) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <AlertTriangle className="text-amber-500 shrink-0" size={18} />
            <h3 className="font-bold text-slate-800">
              {isRtl ? 'تنبيهات نقص المخزن' : 'Alertes de stock'}
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 bg-amber-50/70 border border-amber-200/50 rounded-xl flex items-center justify-between"
                >
                  <div className="min-w-0 text-right">
                    <p className={`font-bold text-xs text-slate-800 truncate ${isRtl ? 'text-right' : 'text-left'}`}>{prod.name}</p>
                    <p className={`text-[10px] text-amber-705 font-mono ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? `الحد الأدنى: ${prod.minStockAlert}` : `Alerte min: ${prod.minStockAlert}`}
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="px-2 py-0.5 text-10px font-extrabold bg-amber-100 text-amber-805 rounded-md block">
                      {isRtl ? `متبقي ${prod.stockQuantity}` : `Reste ${prod.stockQuantity}`}
                    </span>
                    <button
                      onClick={() => onNavigate('inventory')}
                      className="text-[9px] text-indigo-600 font-extrabold hover:underline mt-1 block"
                    >
                      {isRtl ? 'طلب توريد' : 'Commander'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                {isRtl ? '✨ جميع البضائع كافية ومستقرة!' : '✨ Stock suffisant et stable !'}
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices list (2/3 of row) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Receipt className="text-emerald-500 shrink-0" size={18} />
              <h3 className="font-bold text-slate-800">
                {isRtl ? 'الفواتير المستخرجة مؤخراً' : 'Factures récentes'}
              </h3>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-bold text-indigo-650 hover:underline"
            >
              {isRtl ? 'عرض الكل' : 'Voir tout'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold">
                  <th className="p-3">{isRtl ? 'رقم الفاتورة' : 'N° Facture'}</th>
                  <th className="p-3">{isRtl ? 'العميل' : 'Client'}</th>
                  <th className="p-3">{isRtl ? 'طريقة الدفع' : 'Paiement'}</th>
                  <th className="p-3">{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th className={`p-3 ${isRtl ? 'text-left' : 'text-right'}`}>{isRtl ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.slice(0, 4).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-emerald-600">{order.invoiceNumber}</td>
                    <td className="p-3 text-slate-800">{order.customerName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        order.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        order.paymentMethod === 'card' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        order.paymentMethod === 'debt' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {order.paymentMethod === 'cash' ? (isRtl ? 'نقدي' : 'Espèces') :
                         order.paymentMethod === 'card' ? (isRtl ? 'بطاقة مدا' : 'Carte') :
                         order.paymentMethod === 'transfer' ? (isRtl ? 'تحويل بنكي' : 'Virement') :
                         (isRtl ? 'آجل (دين)' : 'À crédit')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono">
                      {new Date(order.date).toLocaleDateString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className={`p-3 font-mono font-extrabold text-slate-800 ${isRtl ? 'text-left' : 'text-right'}`}>
                      {order.total.toFixed(2)} {currencySymbol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
