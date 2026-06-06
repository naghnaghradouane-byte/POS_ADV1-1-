import React from 'react';
import { Product, Category, Customer, Order, CartItem, CompanySettings } from '../types';
import { formatFr } from '../utils/numberFormat';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  Barcode,
  ShoppingBag,
  Percent,
  CheckCircle2,
  Check,
  Printer,
  X,
  CreditCard,
  DollarSign,
  ArrowLeftRight,
  Users,
  Info,
  ChevronDown,
  ShoppingBag as CartIcon,
  HelpCircle,
  FileText,
  MapPin,
  Phone,
  Map,
  Navigation,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface POSViewProps {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  orders: Order[];
  onAddOrder: (order: Order) => void;
  onUpdateInventory: (productId: string, qtySold: number) => void;
  onUpdateCustomerBalance: (customerId: string, balanceChange: number) => void;
  currencySymbol: string;
  defaultTaxRate: number;
  settings: CompanySettings;
}

// Crisp, lightweight audio feedback generator via Web Audio API
const playSound = (type: 'beep' | 'success' | 'delete' | 'error') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1KHz beep
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.25);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.25);
    } else if (type === 'delete') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(220, ctx.currentTime); // low pitch A3
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn('Audio feedback failed to initialize:', e);
  }
};

export default function POSView({
  products,
  categories,
  customers,
  orders = [],
  onAddOrder,
  onUpdateInventory,
  onUpdateCustomerBalance,
  currencySymbol,
  defaultTaxRate,
  settings,
}: POSViewProps) {
  // Navigation & Filtering
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [barcodeInput, setBarcodeInput] = React.useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>('cust_4'); // default geral/public client

  // Cart Management
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = React.useState<number>(0); // overall discount percentage

  // Selected details modal
  const [selectedProductForModal, setSelectedProductForModal] = React.useState<Product | null>(null);

  // Each card's local buffer configuration state for touch adjustments
  // Maps productId -> { packagingUnit: 'unit' | 'box', qty: number }
  const [cardConfigs, setCardConfigs] = React.useState<Record<string, { packagingUnit: 'unit' | 'box'; qty: number }>>({});

  // Checkout modal
  const [showCheckout, setShowCheckout] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'card' | 'transfer' | 'debt'>('cash');
  const [amountReceived, setAmountReceived] = React.useState<string>('');

  // Finished receipt modal
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = React.useState<Order | null>(null);

  // Geolocation mini map toggles
  const [miniMapVisible, setMiniMapVisible] = React.useState<boolean>(false);

  // shift analytics & Recharts aggregations
  const shiftTrendData = React.useMemo(() => {
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const shiftOrders = (orders || []).filter((o) => {
      const orderDate = new Date(o.date);
      return orderDate >= twelveHoursAgo && o.status === 'completed';
    });

    const hourlyBuckets: Record<string, { hourLabel: string; count: number; totalSales: number }> = {};
    
    // Initialize exactly in natural chronological order (from 5 hours ago up to current hour)
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setHours(d.getHours() - i);
      const label = `${d.getHours()}:00`;
      hourlyBuckets[label] = { hourLabel: label, count: 0, totalSales: 0 };
    }

    // Accumulate matching shift orders
    shiftOrders.forEach((o) => {
      const oDate = new Date(o.date);
      const label = `${oDate.getHours()}:00`;
      if (hourlyBuckets[label]) {
        hourlyBuckets[label].count += 1;
        hourlyBuckets[label].totalSales += o.total;
      }
    });

    // The order of keys is already chronological based on initialization
    return Object.values(hourlyBuckets);
  }, [orders]);

  const shiftStats = React.useMemo(() => {
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const shiftOrders = (orders || []).filter((o) => {
      return new Date(o.date) >= twelveHoursAgo && o.status === 'completed';
    });

    const totalSales = shiftOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = shiftOrders.length;
    const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    return {
      totalSales,
      orderCount,
      avgOrderValue,
    };
  }, [orders]);

  // Helper properties resolver for product units/prices
  const getProductSpecs = (prod: Product) => {
    const unitsPerCarton = prod.unitsPerCarton || 12;
    const cartonPrice = prod.cartonPrice || parseFloat((prod.sellingPrice * unitsPerCarton * 0.9).toFixed(2));
    const isOutOfStock = prod.stockQuantity <= 0;
    const isLowStock = prod.stockQuantity <= prod.minStockAlert && prod.stockQuantity > 0;
    
    return {
      unitsPerCarton,
      cartonPrice,
      isOutOfStock,
      isLowStock,
    };
  };

  // Helper to resolve custom configuration for a specific product card
  const getCardConfig = (productId: string) => {
    return cardConfigs[productId] || { packagingUnit: 'unit', qty: 1 };
  };

  const updateCardConfig = (productId: string, updates: Partial<{ packagingUnit: 'unit' | 'box'; qty: number }>) => {
    setCardConfigs((prev) => {
      const current = prev[productId] || { packagingUnit: 'unit', qty: 1 };
      const nextQty = updates.qty !== undefined ? Math.max(1, updates.qty) : current.qty;
      return {
        ...prev,
        [productId]: {
          ...current,
          ...updates,
          qty: nextQty,
        },
      };
    });
  };

  // Resolve item price in cart
  const getItemPrice = (item: CartItem) => {
    if (item.packagingUnit === 'box') {
      const specs = getProductSpecs(item.product);
      return item.customPrice || specs.cartonPrice;
    }
    return item.customPrice || item.product.sellingPrice;
  };

  // Quick category tags styling
  const getCatColorClass = (color?: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80';
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/80';
      case 'amber': return 'bg-amber-50 text-amber-500 border-amber-200 hover:bg-amber-100/80';
      case 'cyan': return 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100/80';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80';
    }
  };

  // Master add to cart handler
  const handleAddToCart = (product: Product, unit: 'unit' | 'box', quantityToAdd: number) => {
    const specs = getProductSpecs(product);
    if (specs.isOutOfStock) {
      playSound('error');
      alert('عذراً! هذا المنتج غير متوفر حالياً بالمخزن.');
      return;
    }

    const unitsPerPackage = unit === 'box' ? specs.unitsPerCarton : 1;
    const totalUnitsRequested = quantityToAdd * unitsPerPackage;

    // Check existing cart quantity to prevent exceeding total stock
    const existingUsageInCartOfProduct = cart
      .filter((i) => i.product.id === product.id)
      .reduce((sum, i) => {
        const mul = i.packagingUnit === 'box' ? (i.product.unitsPerCarton || 12) : 1;
        return sum + i.quantity * mul;
      }, 0);

    if (existingUsageInCartOfProduct + totalUnitsRequested > product.stockQuantity) {
      playSound('error');
      alert(`المخزون المتوفر لا يكفي. المتاح الكلي: ${product.stockQuantity} قطعة. في السلة حالياً: ${existingUsageInCartOfProduct} قطعة.`);
      return;
    }

    // Check if item with exact same packaging unit exists in cart
    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && (item.packagingUnit || 'unit') === unit
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += quantityToAdd;
      setCart(updatedCart);
    } else {
      setCart((prev) => [
        ...prev,
        {
          product,
          quantity: quantityToAdd,
          discount: 0,
          packagingUnit: unit,
        },
      ]);
    }

    playSound('beep');
  };

  // Direct buttons on catalog card
  const handleCardAddTrigger = (product: Product) => {
    const config = getCardConfig(product.id);
    handleAddToCart(product, config.packagingUnit, config.qty);
    // Reset quantity on card back to 1 for next sale
    updateCardConfig(product.id, { qty: 1 });
  };

  // Directly adjust item quantities pre-adding on catalog
  const handleCardQtyStep = (productId: string, val: number) => {
    const config = getCardConfig(productId);
    updateCardConfig(productId, { qty: config.qty + val });
  };

  // Increment item directly inside the Cart
  const handleCartQtyChange = (productId: string, val: number, pUnit: 'unit' | 'box') => {
    const updatedCart = cart.map((item) => {
      if (item.product.id === productId && (item.packagingUnit || 'unit') === pUnit) {
        const specs = getProductSpecs(item.product);
        const newQty = Math.max(1, item.quantity + val);

        // Verify inventory
        const unitsPerPackage = pUnit === 'box' ? specs.unitsPerCarton : 1;
        const totalOtherPackagingUnits = cart
          .filter((i) => i.product.id === productId && i.packagingUnit !== pUnit)
          .reduce((sum, i) => {
            const mul = i.packagingUnit === 'box' ? (i.product.unitsPerCarton || 12) : 1;
            return sum + i.quantity * mul;
          }, 0);

        if (newQty * unitsPerPackage + totalOtherPackagingUnits > item.product.stockQuantity) {
          playSound('error');
          alert(`لا يمكنك تجاوز الكمية المتاحة في المخازن: ${item.product.stockQuantity}`);
          return item;
        }

        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCart(updatedCart);
    playSound('beep');
  };

  const handleRemoveCartItem = (productId: string, pUnit: 'unit' | 'box') => {
    setCart(cart.filter((item) => !(item.product.id === productId && item.packagingUnit === pUnit)));
    playSound('delete');
  };

  // Barcode Scanner emulation
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput) return;

    const matchedProduct = products.find(
      (p) => p.barcode === barcodeInput || p.sku.toLowerCase() === barcodeInput.toLowerCase()
    );
    if (matchedProduct) {
      // By default add 1 Unit of matched product
      handleAddToCart(matchedProduct, 'unit', 1);
      setBarcodeInput('');
    } else {
      playSound('error');
      alert(`الباركود / الرمز "${barcodeInput}" غير مسجل في النظام.`);
    }
  };

  // Dynamic quick simulation keys
  const handleSimulateQuickScan = (code: string) => {
    setBarcodeInput(code);
    const matchedProduct = products.find((p) => p.barcode === code);
    if (matchedProduct) {
      handleAddToCart(matchedProduct, 'unit', 1);
      setBarcodeInput('');
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => {
    const price = getItemPrice(item);
    const discountVal = price * (item.discount / 100);
    return sum + (price - discountVal) * item.quantity;
  }, 0);

  const discountAmount = subtotal * (cartDiscount / 100);
  const totalAfterDiscount = subtotal - discountAmount;
  const taxAmount = totalAfterDiscount * (defaultTaxRate / 100);
  const total = totalAfterDiscount + taxAmount;

  // Selected customer model
  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Received Amount calculation logic
  const receivedAmountNum = parseFloat(amountReceived) || 0;
  const returnChange = Math.max(0, receivedAmountNum - total);

  const triggerCheckout = () => {
    if (cart.length === 0) {
      playSound('error');
      alert('السلة فارغة. يرجى إضافة بعض المنتجات أولاً.');
      return;
    }
    setAmountReceived(Math.ceil(total).toString());
    setPaymentMethod('cash');
    setShowCheckout(true);
  };

  // Save the invoice
  const handleFinishCheckout = () => {
    const paidValue = parseFloat(amountReceived) || 0;
    const changeValue = Math.max(0, paidValue - total);

    if (paymentMethod === 'cash' && paidValue < total) {
      playSound('error');
      alert(`المبلغ المستلم غير كافٍ. المطلوب: ${total.toFixed(2)} ${currencySymbol}`);
      return;
    }

    if (paymentMethod === 'debt' && selectedCustomerId === 'cust_4') {
      playSound('error');
      alert('عذراً! لا يمكن البيع بالدين لحساب العميل العام. يرجى اختيار عميل مسجل.');
      return;
    }

    if (paymentMethod === 'debt' && activeCustomer) {
      const currentDebt = activeCustomer.balance;
      const futureDebt = currentDebt + total;
      if (futureDebt > activeCustomer.debtLimit) {
        playSound('error');
        alert(`تنبيه: تجاوز العميل حد مديونيته المسموح! الحد المسموح: ${activeCustomer.debtLimit} ر.س. المديونية الحالية: ${currentDebt} ر.س.`);
        return;
      }
    }

    const invoiceNum = 'INV-2026-' + Math.floor(10000 + Math.random() * 90000);

    const newOrder: Order = {
      id: 'inv_' + Date.now(),
      invoiceNumber: invoiceNum,
      customerId: selectedCustomerId,
      customerName: activeCustomer ? activeCustomer.name : 'عميل غير مسجل',
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name + (item.packagingUnit === 'box' ? ' (كرتون / Carton)' : ' (قطعة / Unité)'),
        quantity: item.quantity,
        price: getItemPrice(item),
        discount: item.discount,
      })),
      subtotal,
      discountAmount,
      taxAmount,
      total,
      paymentMethod,
      amountPaid: paymentMethod === 'debt' ? 0 : paidValue,
      change: paymentMethod === 'cash' ? changeValue : 0,
      date: new Date().toISOString(),
      status: 'completed',
    };

    // Trigger parent callbacks to save
    onAddOrder(newOrder);

    // Synchronize inventory
    cart.forEach((item) => {
      const specs = getProductSpecs(item.product);
      const quantityMultiplier = item.packagingUnit === 'box' ? specs.unitsPerCarton : 1;
      onUpdateInventory(item.product.id, item.quantity * quantityMultiplier);
    });

    if (paymentMethod === 'debt') {
      onUpdateCustomerBalance(selectedCustomerId, total);
    }

    setCart([]);
    setCartDiscount(0);
    setShowCheckout(false);
    setLastCreatedOrder(newOrder);
    setShowReceipt(true);
    playSound('success');
  };

  // Filter products by category & search words
  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === 'all' || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.includes(searchQuery) ||
      prod.barcode.includes(searchQuery) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.brand && prod.brand.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-stretch w-full min-h-screen text-right" dir="rtl">
      
      {/* Right Section: The Cart / السلة (Occupies 4 cols on XL, visual weight priority #1) */}
      <div className="w-full xl:w-96 shrink-0 flex flex-col bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden min-h-[640px] xl:sticky xl:top-4 h-[calc(100vh-100px)]">
        
        {/* Customer & Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
              <CartIcon size={18} className="text-emerald-600" />
              <span>سلة المبيعات</span>
              <span className="text-[10px] text-slate-400 font-mono font-medium">(Panier de Vente)</span>
            </h3>
            <span className="text-xs font-mono font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              {cart.length} أصناف
            </span>
          </div>

          {/* Customer selection Row */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">العميل / Client</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl pr-3 pl-8 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                >
                  {customers.map((cust) => {
                    const debtLabel = cust.balance > 0 ? ` [مدين: ${cust.balance.toFixed(0)} ر.س]` : '';
                    return (
                      <option key={cust.id} value={cust.id}>
                        👤 {cust.name} {cust.id !== 'cust_4' ? debtLabel : ' (عميل عام)'}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center justify-center shrink-0">
                <Users size={16} />
              </div>
            </div>
          </div>

          {/* Customer Geolocation Quick Actions Panel */}
          {activeCustomer && selectedCustomerId !== 'cust_4' && (
            <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/85 text-xs text-slate-700 space-y-2.5 animate-fade-in select-none">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5 text-slate-850">
                  <MapPin size={13} className="text-emerald-500 hover:scale-110 transition shrink-0" />
                  <span>موقع العميل المتصل:</span>
                  {activeCustomer.latitude ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                      مُسجّل
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      غير مُحدد
                    </span>
                  )}
                </span>
                
                {activeCustomer.phone && (
                  <a
                    href={`tel:${activeCustomer.phone}`}
                    className="text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg text-[10px] transition shrink-0 border-none"
                  >
                    <Phone size={11} />
                    <span>اتصال</span>
                  </a>
                )}
              </div>

              {activeCustomer.latitude && activeCustomer.longitude ? (
                <>
                  <div className="text-[11px] text-slate-505 font-mono flex items-center justify-between">
                    <span>{activeCustomer.latitude.toFixed(6)}, {activeCustomer.longitude.toFixed(6)}</span>
                    {activeCustomer.notes && (
                      <span className="text-[10px] text-slate-400 font-sans max-w-[50%] truncate animate-fade-in" title={activeCustomer.notes}>
                        {activeCustomer.notes}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMiniMapVisible(prev => !prev)}
                      className="w-full py-1.5 rounded-xl border border-slate-205 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10.5px] transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Map size={12} className="text-slate-500" />
                      <span>{miniMapVisible ? 'إخفاء الخريطة' : 'عرض الخريطة'}</span>
                    </button>
                    
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeCustomer.latitude},${activeCustomer.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] transition flex items-center justify-center gap-1 cursor-pointer shadow-xs text-center border-none"
                    >
                      <Navigation size={12} />
                      <span>ابدأ الملاحة</span>
                    </a>
                  </div>

                  {miniMapVisible && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 h-28 relative">
                      <iframe
                        src={`https://maps.google.com/maps?q=${activeCustomer.latitude},${activeCustomer.longitude}&z=14&output=embed`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        title="POS Mini Customer Map"
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-slate-400 font-semibold text-center py-1">
                  لا توجد ميزات ملاحة مسجلة لهذا العميل.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Live Cart Items Body Scroll list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 min-h-0">
          <AnimatePresence initial={false}>
            {cart.length > 0 ? (
              cart.map((item) => {
                const specs = getProductSpecs(item.product);
                const itemPrice = getItemPrice(item);
                const itemDiscountVal = itemPrice * (item.discount / 100);
                const computedRowTotal = (itemPrice - itemDiscountVal) * item.quantity;
                const isPackCarton = item.packagingUnit === 'box';

                return (
                  <motion.div
                    layout
                    key={`${item.product.id}-${item.packagingUnit || 'unit'}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white border border-slate-150/80 rounded-2xl p-3.5 shadow-sm space-y-3 hover:border-slate-300 transition"
                  >
                    {/* Item header */}
                    <div className="flex gap-3 items-start justify-between">
                      {/* Product small image preview */}
                      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-black text-slate-400">{item.product.name.charAt(0)}</span>
                        )}
                      </div>

                      {/* Name description */}
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="font-bold text-slate-800 text-[11px] leading-snug line-clamp-2">
                          {item.product.name}
                        </h4>
                        <div className="flex gap-1.5 items-center mt-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            isPackCarton 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isPackCarton ? '📦 كرتون (Carton)' : '🏷️ قطعة (Unité)'}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">SKU: {item.product.sku}</span>
                        </div>
                      </div>

                      {/* Remove item button */}
                      <button
                        onClick={() => handleRemoveCartItem(item.product.id, item.packagingUnit || 'unit')}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete product"
                      >
                        <Trash2 size={14} className="text-slate-400" />
                      </button>
                    </div>

                    {/* Adjusters footer row */}
                    <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      
                      {/* Stepper qty controls inside the cart */}
                      <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleCartQtyChange(item.product.id, -1, item.packagingUnit || 'unit')}
                          className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold active:bg-slate-100 rounded"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-black min-w-[22px] text-center font-mono text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCartQtyChange(item.product.id, 1, item.packagingUnit || 'unit')}
                          className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold active:bg-slate-100 rounded"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Individual price & Row total */}
                      <div className="text-left">
                        <p className="text-[10px] text-slate-400 font-medium">
                          {itemPrice.toFixed(2)} × {item.quantity}
                        </p>
                        <p className="text-xs font-black text-slate-800 font-mono">
                          {computedRowTotal.toFixed(2)} {currencySymbol}
                        </p>
                      </div>

                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 py-24 select-none">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <ShoppingBag size={28} />
                </div>
                <p className="text-xs font-bold text-slate-600">سلة المبيعات فارغة</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                  الرجاء النقر على منتجات المعرض أو فحص الباركود الخاص بالمنتج لإضافته.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Invoice pricing summation banner */}
        <div className="p-4 bg-slate-900 text-slate-300 border-t border-slate-800 space-y-3.5 shrink-0 rounded-t-3xl shadow-inner">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>المجموع الفرعي (Sous Total):</span>
              <span className="font-mono text-white font-semibold">{formatFr(subtotal)} {currencySymbol}</span>
            </div>

            {/* Cart wide discount */}
            <div className="flex justify-between items-center text-slate-400">
              <span className="flex items-center gap-1">
                <Percent size={12} className="text-amber-500" />
                خصم إضافي / Remise:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={cartDiscount || ''}
                  placeholder="0"
                  onChange={(e) => setCartDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-12 text-center text-white text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg py-0.5 focus:outline-none focus:border-amber-500"
                />
                <span className="text-white text-[11px] font-mono">%</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>ضريبة القيمة المضافة / TVA ({defaultTaxRate}%):</span>
              <span className="font-mono text-white font-semibold">{formatFr(taxAmount)} {currencySymbol}</span>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-3 text-base font-extrabold text-emerald-400">
              <span>الإجمالي الكلي (Total TTC):</span>
              <span className="font-mono text-lg">{formatFr(total)} {currencySymbol}</span>
            </div>
          </div>

          <button
            onClick={triggerCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed font-extrabold text-xs text-white rounded-2xl shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2 transition active:scale-97 cursor-pointer"
          >
            📊 تأكيد وضبط الدفع (Valider)
          </button>
        </div>

      </div>

      {/* Left Section: Catalog Catalog Grid / المعرض الأصلي */}
      <div className="flex-1 space-y-4">
        
        {/* Navigation & Scanning Simulation */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
          <div className="flex flex-col md:flex-row gap-3">
            
            {/* Catalog search bar */}
            <div className="relative flex-1">
              <Search size={16} className="absolute right-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم المنتج، الصنف، الماركة، أو رمز SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 border-0 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-3.5 text-[9px] text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Quick barcode simulation scanner wrapper */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2 min-w-[260px]">
              <div className="relative flex-1">
                <Barcode size={16} className="absolute right-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="رقم الباركود اليدوي للمنتج..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 rounded-2xl bg-slate-50 border-0 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-left transition"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4 rounded-2xl flex items-center gap-1.5 shrink-0 transition"
              >
                مسح / Scan
              </button>
            </form>

          </div>

          {/* Preset fast scanners simulating passing items */}
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-wrap items-center justify-between gap-2 overflow-x-auto">
            <span className="text-[10px] text-slate-500 font-bold shrink-0 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              محاكاة الباركود السريعة (Scan simulator):
            </span>
            <div className="flex gap-2">
              {products.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSimulateQuickScan(p.barcode)}
                  className="text-[9px] font-mono font-bold bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg hover:border-emerald-500 hover:text-emerald-700 active:scale-95 transition cursor-pointer"
                  title={`اضغط لمحاكاة تمرير الباركود ${p.barcode}`}
                >
                  🔍 {p.brand || 'منتج'}: {p.barcode.slice(-4)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Shift Mini-Dashboard Analytics */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-white shadow-xl grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          
          {/* Shift Stats Counters */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h4 className="text-[11px] font-black tracking-wider uppercase text-emerald-400">تحليلات الوردية الحالية | Current Shift</h4>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
                <span className="text-[9px] text-slate-400 block font-bold leading-tight">مبيعات الوردية</span>
                <span className="text-xs font-black text-white font-mono block mt-1">
                  {shiftStats.totalSales.toFixed(1)}
                </span>
                <span className="text-[8px] text-emerald-400/80 block mt-0.5">{currencySymbol}</span>
              </div>

              <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
                <span className="text-[9px] text-slate-400 block font-bold leading-tight">الفواتير</span>
                <span className="text-xs font-black text-white font-mono block mt-1">
                  {shiftStats.orderCount}
                </span>
                <span className="text-[8px] text-slate-400 block mt-0.5">معاملة</span>
              </div>

              <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
                <span className="text-[9px] text-slate-400 block font-bold leading-tight">متوسط الفاتورة</span>
                <span className="text-xs font-black text-yellow-500 font-mono block mt-1">
                  {shiftStats.avgOrderValue.toFixed(1)}
                </span>
                <span className="text-[8px] text-slate-400 block mt-0.5">{currencySymbol}</span>
              </div>
            </div>
            
            <p className="text-[9px] text-slate-400 font-medium">
              * يتم تحديث مبيعات الصندوق والرسوم البيانية فورياً بمجرد إتمام الدفع.
            </p>
          </div>

          {/* Recharts Area Trend Visualizer */}
          <div className="md:col-span-7 h-28 w-full bg-slate-950/70 rounded-2xl p-2 border border-slate-800/80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={shiftTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="hourLabel" 
                  tick={{ fill: '#94a3b8', fontSize: 8 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 8 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '10px' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold', fontSize: '11px' }}
                  formatter={(value: any) => [`${value} ${currencySymbol}`, 'المبيعات']}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalSales" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#salesGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="absolute top-2 left-2 text-[8px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-bold">
              مؤشر مبيعات الساعات (ر.س)
            </div>
          </div>

        </div>

        {/* Category filtering carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin select-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-black border transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            جميع الأصناف (Tous)
          </button>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4.5 py-2.5 rounded-2xl text-xs font-black border transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                    : getCatColorClass(cat.color)
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Products Grid featuring requested design */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((prod) => {
              const specs = getProductSpecs(prod);
              const cardConfig = getCardConfig(prod.id);
              const belongsCategory = categories.find((c) => c.id === prod.category);

              // Condition state color mapping
              let stockStatusBadge = (
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-xl">
                  ● متوفر / En stock ({prod.stockQuantity})
                </span>
              );

              if (specs.isOutOfStock) {
                stockStatusBadge = (
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-xl">
                    ● نفذ المخزون / Épuisé
                  </span>
                );
              } else if (specs.isLowStock) {
                stockStatusBadge = (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-xl animate-pulse">
                    ● مخزون منخفض / Faible ({prod.stockQuantity})
                  </span>
                );
              }

              return (
                <div
                  key={prod.id}
                  className={`bg-white border rounded-[22px] p-2.5 transition duration-500 flex flex-col justify-between group space-y-2.5 hover:shadow-md relative ring-1 ring-black/5 ${
                    specs.isOutOfStock
                      ? 'opacity-65 border-slate-200 bg-slate-50/50'
                      : 'border-slate-200/80 hover:border-emerald-500'
                  }`}
                  id={`product-card-${prod.id}`}
                >
                  {/* Category Pill and Details Magnifying anchor */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[8px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded-md truncate max-w-[50%]">
                      {belongsCategory ? belongsCategory.name : 'عام'}
                    </span>
                    <button
                      onClick={() => setSelectedProductForModal(prod)}
                      className="p-0.5 px-1.5 flex items-center gap-0.5 bg-slate-50 hover:bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-extrabold transition border border-dashed border-indigo-200 shrink-0 cursor-pointer"
                    >
                      <Info size={9} />
                      <span>تفاصيل | Info</span>
                    </button>
                  </div>

                  {/* Product Image preview details */}
                  <div 
                    onClick={() => setSelectedProductForModal(prod)}
                    className="h-24 rounded-xl bg-slate-100 border border-slate-100 overflow-hidden flex items-center justify-center relative cursor-pointer group-hover:brightness-95 transition"
                  >
                    {/* Cart badge overlay showing desired quantity dynamically */}
                    {(() => {
                      const cartItemsForProd = cart.filter((i) => i.product.id === prod.id);
                      if (cartItemsForProd.length > 0) {
                        return (
                          <div 
                            className="absolute inset-x-1 top-1 flex flex-col gap-1 z-10 text-right pointer-events-auto" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cartItemsForProd.map((item, idx) => {
                              const isBox = item.packagingUnit === 'box';
                              return (
                                <div 
                                  key={idx} 
                                  className="flex items-center justify-between bg-slate-900/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md"
                                >
                                  <span className="truncate">
                                    {item.quantity} {isBox ? 'كرتون' : 'قطعة'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCartQtyChange(prod.id, -1, item.packagingUnit || 'unit')}
                                    className="w-3.5 h-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold flex items-center justify-center rounded-full transition ml-0.5 cursor-pointer border-none"
                                    title="تنقيص الكمية من السلة"
                                  >
                                    -
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ShoppingBag size={24} className="mx-auto mb-1 opacity-40" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">{prod.sku}</span>
                      </div>
                    )}
                  </div>

                  {/* Text Details core */}
                  <div className="space-y-0.5">
                    <h4 
                      onClick={() => setSelectedProductForModal(prod)}
                      className="text-[10.5px] font-black text-slate-850 line-clamp-2 hover:text-emerald-650 cursor-pointer transition leading-snug h-[32px] overflow-hidden animate-fade-in"
                      title={prod.name}
                    >
                      {prod.name}
                    </h4>
                    {prod.brand && (
                      <p className="text-[8.5px] text-slate-400 font-bold font-mono">Brand: {prod.brand}</p>
                    )}
                  </div>

                  {/* Requested Pricing lists with Carton specs */}
                  <div className="p-2 bg-slate-50/80 rounded-xl space-y-1 text-[10px] text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>💵 قطعة:</span>
                      <strong className="text-slate-900 font-mono">{prod.sellingPrice.toFixed(2)} {currencySymbol}</strong>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200/40 pt-1">
                      <span className="flex items-center gap-1">📦 كرتون / S:</span>
                      <strong className="text-emerald-700 font-mono font-extrabold">{specs.cartonPrice.toFixed(2)} {currencySymbol}</strong>
                    </div>
                    <div className="text-[8px] text-slate-400 text-left leading-none font-medium">
                      *(الكرتون: {specs.unitsPerCarton} قطع)
                    </div>
                  </div>

                  {/* Stock safety status indicator badge line */}
                  <div className="flex justify-between items-center bg-slate-100/30 p-1 rounded-lg text-[9px]">
                    <span className="text-[8px] text-slate-400 block font-bold">المخزون:</span>
                    {stockStatusBadge}
                  </div>

                  {/* Interactive card controls section: Type Selector and Quantity config */}
                  <div className="space-y-2 pt-2 border-t border-slate-150">
                    
                    {/* Unit vs Carton selectors option dropdown as requested */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-bold text-slate-500">النوع:</span>
                      <div className="bg-slate-100 rounded-lg p-0.5 flex items-center border border-slate-200/50 select-none">
                        <button
                          type="button"
                          onClick={() => updateCardConfig(prod.id, { packagingUnit: 'unit' })}
                          className={`px-1.5 py-0.5 rounded-md text-[8px] font-black transition ${
                            cardConfig.packagingUnit === 'unit'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          قطعة
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCardConfig(prod.id, { packagingUnit: 'box' })}
                          className={`px-1.5 py-0.5 rounded-md text-[8px] font-black transition ${
                            cardConfig.packagingUnit === 'box'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          كرتون
                        </button>
                      </div>
                    </div>

                    {/* Stepper text field for directly writing quantity changes */}
                    <div className="flex items-center justify-between gap-1 bg-slate-50/80 p-1.5 rounded-lg">
                      <span className="text-[9px] font-bold text-slate-500">الكمية:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={cardConfig.qty <= 1}
                          onClick={() => handleCardQtyStep(prod.id, -1)}
                          className="w-5 h-5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold rounded flex items-center justify-center disabled:opacity-40 transition"
                        >
                          <Minus size={9} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={cardConfig.qty || ''}
                          onChange={(e) => updateCardConfig(prod.id, { qty: parseInt(e.target.value) || 1 })}
                          className="w-8 h-5 rounded text-center font-extrabold text-slate-900 border border-slate-200 bg-white shadow-xs outline-none text-[10px]"
                        />
                        <button
                          type="button"
                          onClick={() => handleCardQtyStep(prod.id, 1)}
                          className="w-5 h-5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold rounded flex items-center justify-center transition"
                        >
                          <Plus size={9} />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Add action button */}
                  <button
                    type="button"
                    disabled={specs.isOutOfStock}
                    onClick={() => handleCardAddTrigger(prod)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-emerald-650 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-extrabold rounded-lg text-[10px] flex items-center justify-center gap-1 transition duration-500 active:scale-95 cursor-pointer border-none mt-1"
                  >
                    <Plus size={10} />
                    <span>إضافة للسلة</span>
                  </button>

                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs space-y-2">
              <p>📭 لا توجد منتجات تطابق شروط التصفية أو البحث الحالية.</p>
              <p className="text-[10px] text-slate-400">جرب كتابة باركود صحيح أو غير الفئة النشطة.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- Dialog / Product Details Bottom Sheet Modal --- */}
      <AnimatePresence>
        {selectedProductForModal && (() => {
          const prodObj = selectedProductForModal;
          const specs = getProductSpecs(prodObj);
          
          // Local configuration buffer for details modal
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
              onClick={() => setSelectedProductForModal(null)}
            >
              <motion.div
                initial={{ y: 50, scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 50, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative border border-slate-100 overflow-hidden text-right"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header title */}
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <Info size={16} className="text-indigo-600" />
                    <span>تفاصيل المنتج | Fiche Produit</span>
                  </h3>
                  <button
                    onClick={() => setSelectedProductForModal(null)}
                    className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold rounded-lg transition"
                  >
                    X
                  </button>
                </div>

                {/* Body Content */}
                <div className="space-y-4 pt-4">
                  
                  {/* Large Product image */}
                  <div className="h-56 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center relative">
                    {prodObj.image ? (
                      <img
                        src={prodObj.image}
                        alt={prodObj.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ShoppingBag size={48} className="mx-auto mb-2 opacity-30" />
                        <span className="text-xs font-mono">{prodObj.sku}</span>
                      </div>
                    )}
                  </div>

                  {/* Header labels */}
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">{prodObj.name}</h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {prodObj.brand && (
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
                          الماركة: {prodObj.brand}
                        </span>
                      )}
                      <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full font-mono font-bold">
                        Barcode: {prodObj.barcode}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Specs list table */}
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl text-xs text-slate-700 font-bold">
                    <div className="space-y-1.5 border-l border-slate-200/70 p-1">
                      <p className="text-[10px] text-slate-400">سعر الوحدة (Unité):</p>
                      <p className="font-mono text-slate-900 text-sm">{prodObj.sellingPrice.toFixed(2)} ر.س</p>
                    </div>
                    <div className="space-y-1.5 p-1 pr-3">
                      <p className="text-[10px] text-slate-400">سعر الكرتون (Carton):</p>
                      <p className="font-mono text-emerald-700 text-sm">{specs.cartonPrice.toFixed(2)}  ر.س</p>
                    </div>
                    <div className="space-y-1.5 border-l border-slate-200/70 pt-2 p-1 border-t">
                      <p className="text-[10px] text-slate-400">المخزون المتوفر (Stock):</p>
                      <p className="text-indigo-600 font-black">{prodObj.stockQuantity} حبة / Unit</p>
                    </div>
                    <div className="space-y-1.5 pt-2 p-1 pr-3 border-t">
                      <p className="text-[10px] text-slate-400">كميات الكرتون (Units/Ctn):</p>
                      <p className="text-slate-600">{specs.unitsPerCarton} قطعة داخل الكرتون الواحد</p>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">وصف وتفاصيل المنتج / Description:</label>
                    <p className="text-xs text-slate-500 bg-slate-50/50 p-3 rounded-xl leading-relaxed border border-slate-100">
                      {prodObj.description || 'لا يوجد وصف تفصيلي مسجل لهذا الصنف في النظام المالي.'}
                    </p>
                  </div>

                  {/* Quick additions controller form inside details modal */}
                  <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500">جودة البيع / Packaging Unit:</span>
                      <div className="flex gap-2">
                        {['unit', 'box'].map((type) => {
                          const isActive = getCardConfig(prodObj.id).packagingUnit === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => updateCardConfig(prodObj.id, { packagingUnit: type as 'unit' | 'box' })}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                isActive ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {type === 'box' ? 'كرتون / Carton' : 'قطعة / Unité'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quantity Stepper unit in Modal */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500">الكمية المطلوبة:</span>
                      <div className="flex items-center gap-1 bg-white border border-slate-200/60 p-1.5 rounded-xl shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleCardQtyStep(prodObj.id, -1)}
                          className="w-6 h-6 bg-slate-50 rounded-lg text-xs font-black active:bg-slate-200"
                        >
                          —
                        </button>
                        <span className="text-xs font-mono font-bold px-2 min-w-[20px] text-center">
                          {getCardConfig(prodObj.id).qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCardQtyStep(prodObj.id, 1)}
                          className="w-6 h-6 bg-slate-50 rounded-lg text-xs font-black active:bg-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer anchor */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => {
                      const config = getCardConfig(prodObj.id);
                      handleAddToCart(prodObj, config.packagingUnit, config.qty);
                      setSelectedProductForModal(null);
                    }}
                    disabled={specs.isOutOfStock}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10 transition cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>إضافة إلى السلة / Ajouter au Panier</span>
                  </button>
                  <button
                    onClick={() => setSelectedProductForModal(null)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    إغلاق
                  </button>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* --- Checkout Drawer Modal Overlay popup --- */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-right flex flex-col justify-between max-h-[92vh] overflow-hidden"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-150 pb-3 shrink-0">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>نافذة الدفع وإصدار الفاتورة</span>
                  <span className="text-[9px] text-slate-400 font-mono">(Caisse et Facturation)</span>
                </h3>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-250 text-slate-500 text-xs font-bold rounded-lg"
                >
                  X
                </button>
              </div>

              {/* Scrollable details wrapper */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                
                {/* Due banner */}
                <div className="p-4 bg-emerald-50 rounded-2xl flex justify-between items-center text-slate-900 border border-emerald-100">
                  <span className="text-xs font-extrabold text-emerald-800">إجمالي المبلغ المطلوب سداده:</span>
                  <span className="text-xl font-black font-mono text-emerald-700">
                    {total.toFixed(2)} {currencySymbol}
                  </span>
                </div>

                {/* Active user recap */}
                {activeCustomer && (
                  <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-[11px] text-slate-600 leading-relaxed">
                    <p className="font-bold text-indigo-900">حساب العميل المقترن بفاتورة البيع:</p>
                    <p className="mt-1 font-medium">الاسم: {activeCustomer.name}</p>
                    <p>رصيد ديونه السابقة: {activeCustomer.balance.toFixed(2)} ر.س | الحد الأقصى للدين: {activeCustomer.debtLimit} ر.س</p>
                  </div>
                )}

                {/* Payment Methods selector Grid */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 block">طريقة السداد المفضلة: | Mode de Paiement:</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3.5 rounded-2xl border font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <DollarSign size={18} className="text-emerald-500" />
                      <span>نقدي (Espèce / Cash)</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3.5 rounded-2xl border font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === 'card'
                          ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm'
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard size={18} className="text-blue-500" />
                      <span>بطاقة مدى (Carte / TPE)</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('transfer')}
                      className={`p-3.5 rounded-2xl border font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === 'transfer'
                          ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <ArrowLeftRight size={18} className="text-amber-500" />
                      <span>تحويل بنكي (Virement)</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('debt')}
                      className={`p-3.5 rounded-2xl border font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                        paymentMethod === 'debt'
                          ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm'
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Users size={18} className="text-rose-500" />
                      <span>بيع بالآجل / بالدين (Crédit)</span>
                    </button>
                  </div>
                </div>

                {/* Received cash math for changes */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <label className="text-[11px] font-bold text-slate-500 block">المبلغ المستلم نقداً (Montant Reçu):</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl font-mono text-center text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="أدخل الكاش..."
                      />
                      {/* Currency fast-filling buttons */}
                      {[Math.ceil(total), 50, 100, 200, 500].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmountReceived(val.toString())}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-mono font-bold text-slate-700 text-xs transition"
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Change to return */}
                    {receivedAmountNum >= total && (
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-xs text-indigo-900 font-extrabold flex justify-between">
                        <span>💰 الباقي للزبون (Reste à rendre):</span>
                        <span>{(receivedAmountNum - total).toFixed(2)} {currencySymbol}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom footer buttons inside checkout modal */}
              <div className="pt-4 border-t border-slate-150 shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition cursor-pointer"
                >
                  إلغاء النافذة
                </button>
                <button
                  type="button"
                  onClick={handleFinishCheckout}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition tracking-wide shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check size={16} />
                  <span>تأكيد المبيعات وحفظ الفاتورة</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Invoice Receipt Thermal Paper overlay --- */}
      <AnimatePresence>
        {showReceipt && lastCreatedOrder && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 rounded-3xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-[305px] sm:max-w-sm overflow-hidden shadow-2xl border border-slate-100 text-slate-800 flex flex-col max-h-[92vh] text-right animate-fade-in"
            >
              
              {/* Header Title */}
              <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <span className="font-bold text-xs">تم تسجيل وحفظ الفاتورة بنجاح ⚡</span>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 text-xs px-2 w-6 h-6 flex items-center justify-center"
                >
                  X
                </button>
              </div>

              {/* Receipt Thermal container */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 font-mono text-[9px] sm:text-[10px] text-right bg-amber-50/10 space-y-3 sm:space-y-4">
                
                {/* Store layout template */}
                <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
                  <p className="text-sm font-black tracking-tight text-slate-900">{settings.logo} {settings.name} {settings.logo}</p>
                  <p className="text-[9px] text-slate-500">{settings.address}</p>
                  {settings.phone && (
                    <p className="text-[9px] text-slate-500">الهاتف: {settings.phone}</p>
                  )}
                  {settings.taxNumber && (
                    <p className="text-[9px] text-slate-500 font-extrabold">الرقم الضريبي VAT: {settings.taxNumber}</p>
                  )}
                </div>

                {/* Invoice Metadata */}
                <div className="space-y-1 text-slate-600 border-b border-dashed border-slate-200 pb-3">
                  <p>رقم الفاتورة: <strong className="text-slate-900 font-bold">{lastCreatedOrder.invoiceNumber}</strong></p>
                  <p>التاريخ: {new Date(lastCreatedOrder.date).toLocaleString('fr-FR')}</p>
                  <p>العميل: {lastCreatedOrder.customerName}</p>
                  <p>أمين الصندوق: مدير النظام (Admin)</p>
                </div>

                {/* Order rows */}
                <div className="space-y-2 border-b border-dashed border-slate-200 pb-3">
                  <div className="flex font-bold text-slate-900 text-[11px] pb-1 border-b border-slate-100">
                    <span className="w-1/2">البيان (صنف)</span>
                    <span className="w-1/6 text-center">الكمية</span>
                    <span className="w-1/3 text-left">المجموع</span>
                  </div>
                  {lastCreatedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex text-slate-700 leading-tight">
                      <div className="w-1/2">
                        <p className="truncate font-bold text-[9px]">{item.productName}</p>
                        <p className="text-[8px] text-slate-400 font-mono">
                          {formatFr(item.price)} {item.discount > 0 ? `(خصم %${item.discount})` : ''}
                        </p>
                      </div>
                      <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                      <span className="w-1/3 text-left font-bold font-mono">{formatFr(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Subtotals summaries */}
                <div className="space-y-1.5 text-slate-800 text-[11px] border-b border-dashed border-slate-200 pb-3">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي (HT):</span>
                    <span className="font-bold">{formatFr(lastCreatedOrder.subtotal)} {currencySymbol}</span>
                  </div>
                  {lastCreatedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold text-[10px]">
                      <span>خصم الفاتورة العام:</span>
                      <span>-{formatFr(lastCreatedOrder.discountAmount)} {currencySymbol}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة {settings.taxRate}%:</span>
                    <span className="font-bold">{formatFr(lastCreatedOrder.taxAmount)} {currencySymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-950 border-t border-slate-300 pt-2">
                    <span>الصافي المطلوب (TTC):</span>
                    <span className="font-mono text-base">{formatFr(lastCreatedOrder.total)} {currencySymbol}</span>
                  </div>
                </div>

                {/* Paid Details recap */}
                <div className="text-[9px] text-slate-600 space-y-1 bg-slate-50 p-2 rounded-xl">
                  <p>طريقة الدفع: {
                    lastCreatedOrder.paymentMethod === 'cash' ? '💵 نقدي (كاش)' :
                    lastCreatedOrder.paymentMethod === 'card' ? '💳 بطاقة مدى' :
                    lastCreatedOrder.paymentMethod === 'transfer' ? '🏦 تحويل بنكي' :
                    '📝 ذمم ديون آجل'
                  }</p>
                  {lastCreatedOrder.paymentMethod === 'cash' && (
                    <>
                      <p>المبلغ المستلم كاش: {lastCreatedOrder.amountPaid.toFixed(2)} {currencySymbol}</p>
                      <p>الباقي المرتجع للزبون: {lastCreatedOrder.change.toFixed(2)} {currencySymbol}</p>
                    </>
                  )}
                </div>

                {/* VAT QR code graphics */}
                <div className="flex flex-col items-center justify-center pt-3 pb-1 space-y-1.5 border-t border-dashed border-slate-200">
                  <div className="w-24 h-24 bg-slate-900 p-2.5 rounded-xl flex items-center justify-center relative shadow-xs">
                    {/* QR block grid simulation */}
                    <div className="grid grid-cols-5 gap-1.5 w-full h-full text-white opacity-95">
                      <div className="border-2 border-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-transparent" />
                      <div className="bg-white rounded-xs" />
                      <div className="border-2 border-white rounded-xs" />
                      
                      <div className="bg-white rounded-xs" />
                      <div className="bg-transparent" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-transparent" />

                      <div className="bg-transparent" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white text-center text-[7px]" style={{ fontSize: '5px' }}>VAT</div>
                      <div className="bg-transparent" />
                      <div className="bg-white rounded-xs" />

                      <div className="bg-white rounded-xs" />
                      <div className="bg-transparent" />
                      <div className="bg-white rounded-xs animate-pulse" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />

                      <div className="border-2 border-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-transparent" />
                      <div className="bg-white rounded-xs" />
                      <div className="border-2 border-white rounded-xs" />
                    </div>
                  </div>
                  <p className="text-[7px] text-slate-400 font-extrabold text-center uppercase tracking-tight">
                    ZATCA Electronic VAT Invoice Approved ✓
                  </p>
                </div>

                {/* Footer notes */}
                <div className="text-center text-[8px] text-slate-400 border-t border-dashed border-slate-200 pt-3 leading-relaxed">
                  شكراً لتعاملكم معنا! البضاعة تفحص قبل الخروج ولا تستبدل إلا بالفاتورة الأصلية.
                </div>
              </div>

              {/* Thermal footer commands */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playSound('success');
                    alert('جاري محاكاة الطباعة الحرارية للفاتورة... تم إرسال ملف الأوامر بنجاح!');
                  }}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>طابعة حرارية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceipt(false)}
                  className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl transition"
                >
                  إغلاق الفاتورة
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Checkout & Invoice Amount Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 80, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 80, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-4 cursor-pointer hover:bg-emerald-600 transition-all duration-300 w-[92%] max-w-sm sm:max-w-md select-none justify-between"
            onClick={triggerCheckout}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-full flex items-center justify-center">
                <CartIcon size={16} className="text-emerald-400 animate-pulse" />
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 block font-bold leading-none">إجمالي الفاتورة:</span>
                <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-400 mt-0.5 block leading-none">
                  {total.toFixed(2)} {currencySymbol || 'د.ج'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-white/15 px-2.5 py-1 rounded-full font-black text-slate-100">
                {cart.length} أصناف
              </span>
              <span className="text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white px-3.5 py-1.5 rounded-full transition shadow-md flex items-center gap-1.5">
                <span>دفع المجموع</span>
                <span>←</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
