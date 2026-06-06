import React from 'react';
import { Product, Category } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  ArrowUpDown,
  Filter,
  Check,
  AlertCircle,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (prod: Product) => void;
  onUpdateProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
  currencySymbol: string;
}

export default function ProductsView({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  currencySymbol,
}: ProductsViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    // CSV Header row
    const headers = [
      'اسم المنتج (Name)',
      'باركود المنتج (Barcode)',
      'الرمز الفرعي (SKU)',
      'معرف القسم (Category ID)',
      'الشركة المصنعة (Brand)',
      'سعر الشراء (Cost Price)',
      'سعر البيع (Selling Price)',
      'سعر الجملة (Wholesale Price)',
      'الكمية المتوفرة (Stock)',
      'الحد الأدنى للتنبيه (Minimum Alert)'
    ];

    // Data rows
    const rows = products.map((prod) => [
      `"${prod.name.replace(/"/g, '""')}"`,
      `"${prod.barcode.replace(/"/g, '""')}"`,
      `"${prod.sku.replace(/"/g, '""')}"`,
      `"${prod.category.replace(/"/g, '""')}"`,
      `"${(prod.brand || '').replace(/"/g, '""')}"`,
      prod.costPrice,
      prod.sellingPrice,
      prod.wholesalePrice || prod.sellingPrice,
      prod.stockQuantity,
      prod.minStockAlert
    ]);

    // Build content with BOM (Byte Order Mark) for proper Arabic display in MS Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          alert('الملف فارغ أو لا يحتوي على بنية بيانات صحيحة.');
          return;
        }

        let importedCount = 0;
        lines.slice(1).forEach((line) => {
          if (!line.trim()) return;
          
          // Split safely by comma while respecting quotes
          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              cols.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          cols.push(current.trim());

          if (cols.length >= 2 && cols[0]) {
            const prodName = cols[0].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
            const prodBarcode = (cols[1] || '').replace(/^"|"$/g, '').trim() || ('62811' + Math.floor(100000 + Math.random() * 900000));
            const prodSku = (cols[2] || '').replace(/^"|"$/g, '').trim() || ('PROD-SKU-' + Math.floor(100000 + Math.random() * 900000));
            const prodCategory = (cols[3] || '').replace(/^"|"$/g, '').trim() || (categories[0]?.id || 'cat_general');
            const prodBrand = (cols[4] || '').replace(/^"|"$/g, '').trim() || '';
            const prodCost = parseFloat(cols[5]) || 0;
            const prodSelling = parseFloat(cols[6]) || 0;
            const prodWholesale = parseFloat(cols[7]) || prodSelling;
            const prodStock = parseInt(cols[8]) || 0;
            const prodMinAlert = parseInt(cols[9]) || 5;

            // Generate unique random product ID
            const newProduct: Product = {
              id: 'prod_' + Math.random().toString(36).substr(2, 9),
              name: prodName,
              barcode: prodBarcode,
              sku: prodSku,
              category: prodCategory,
              brand: prodBrand,
              description: '',
              costPrice: prodCost,
              sellingPrice: prodSelling,
              wholesalePrice: prodWholesale,
              stockQuantity: prodStock,
              minStockAlert: prodMinAlert
            };

            onAddProduct(newProduct);
            importedCount++;
          }
        });

        alert(`✅ تم استيراد عدد (${importedCount}) من المنتجات بنجاح إلى قاعدة البيانات الخاصة بك!`);
      } catch (err) {
        alert('❌ حدث خطأ أثناء معالجة الملف. يرجى محاولة استخدام ملف CSV معتمد.');
        console.error(err);
      }
    };
    reader.readAsText(file, 'utf-8');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form Modal state
  const [showModal, setShowModal] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

  // Form Fields
  const [name, setName] = React.useState('');
  const [barcode, setBarcode] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [costPrice, setCostPrice] = React.useState(0);
  const [sellingPrice, setSellingPrice] = React.useState(0);
  const [wholesalePrice, setWholesalePrice] = React.useState(0);
  const [stockQuantity, setStockQuantity] = React.useState(0);
  const [minStockAlert, setMinStockAlert] = React.useState(5);

  React.useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setBarcode(editingProduct.barcode);
      setSku(editingProduct.sku);
      setCategory(editingProduct.category);
      setBrand(editingProduct.brand || '');
      setDescription(editingProduct.description || '');
      setCostPrice(editingProduct.costPrice);
      setSellingPrice(editingProduct.sellingPrice);
      setWholesalePrice(editingProduct.wholesalePrice || editingProduct.sellingPrice);
      setStockQuantity(editingProduct.stockQuantity);
      setMinStockAlert(editingProduct.minStockAlert);
    } else {
      setName('');
      setBarcode('');
      setSku('');
      setCategory(categories[0]?.id || '');
      setBrand('');
      setDescription('');
      setCostPrice(0);
      setSellingPrice(0);
      setWholesalePrice(0);
      setStockQuantity(0);
      setMinStockAlert(5);
    }
  }, [editingProduct, showModal, categories]);

  const openAddModal = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setShowModal(true);
  };

  const generateRandomSKUAndBarcode = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setBarcode(`62811${randomNum}`);
    setSku(`PROD-SKU-${randomNum}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !category) {
      alert('يرجى كتابة اسم المنتج والـ SKU واختيار القسم المناسب.');
      return;
    }

    const payload: Product = {
      id: editingProduct ? editingProduct.id : 'prod_' + Date.now(),
      name,
      barcode,
      sku,
      category,
      brand,
      description,
      costPrice: parseFloat(costPrice.toString()) || 0,
      sellingPrice: parseFloat(sellingPrice.toString()) || 0,
      wholesalePrice: parseFloat(wholesalePrice.toString()) || parseFloat(sellingPrice.toString()) || 0,
      stockQuantity: parseInt(stockQuantity.toString()) || 0,
      minStockAlert: parseInt(minStockAlert.toString()) || 0,
    };

    if (editingProduct) {
      onUpdateProduct(payload);
    } else {
      onAddProduct(payload);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من المستودع؟')) {
      onDeleteProduct(id);
    }
  };

  // Filtering list
  const filteredProducts = products.filter((prod) => {
    const matchesCat = selectedCategory === 'all' || prod.category === selectedCategory;
    const matchesQuery =
      prod.name.includes(searchQuery) ||
      prod.barcode.includes(searchQuery) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.brand && prod.brand.includes(searchQuery));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-5">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          {/* Text search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم المنتج، كود SKU، أو الرمز الشريطي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-1 focus:outline-hidden focus:ring-emerald-500"
          >
            <option value="all">كل التصنيفات والأصناف</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Hidden File Input for CSV Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
            title="استيراد منتجات من ملف Excel بصيغة CSV"
          >
            <Upload size={14} />
            <span>استيراد Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="py-2.5 px-3.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition shadow-xs cursor-pointer"
            title="تصدير قائمة المنتجات إلى ملف Excel بصيغة CSV"
          >
            <Download size={14} />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="py-2.5 px-5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-550 font-bold">
                <th className="p-4">المنتج والـ SKU</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4 whitespace-nowrap">الرمز الشريطي (Barcode)</th>
                <th className="p-4 text-left">التكلفة</th>
                <th className="p-4 text-left">سعر التجزءة</th>
                <th className="p-4 text-left">الجملة</th>
                <th className="p-4 text-center">المخزون الحالي</th>
                <th className="p-4 text-center">خيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const remains = prod.stockQuantity;
                  const isLow = remains <= prod.minStockAlert;
                  const belongsCat = categories.find((c) => c.id === prod.category);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black select-none">
                            {prod.name.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate max-w-[200px]" title={prod.name}>
                              {prod.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono tracking-wide mt-0.5">
                              {prod.brand ? `${prod.brand} • ` : ''}
                              {prod.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                          {belongsCat ? belongsCat.name : 'غير مصنف'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-500 font-bold">{prod.barcode}</td>
                      <td className="p-4 text-left font-mono font-bold text-slate-600">
                        {prod.costPrice.toFixed(2)} {currencySymbol}
                      </td>
                      <td className="p-4 text-left font-mono font-black text-slate-800">
                        {prod.sellingPrice.toFixed(2)} {currencySymbol}
                      </td>
                      <td className="p-4 text-left font-mono text-slate-500 font-bold">
                        {prod.wholesalePrice.toFixed(2)} {currencySymbol}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`font-mono font-black px-2.5 py-1 rounded-lg text-xs inline-block ${
                            remains <= 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/55 font-bold'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/55 animate-pulse font-bold'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/55'
                          }`}
                        >
                          {remains} وحدة
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="تعديل تفاصيل المنتج"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="حذف المنتج من السيستم"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-xs">لا يوجد أي منتجات تطابق البحث الحالي.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal (Add / Edit) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 text-slate-800 flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingProduct ? 'تعديل بيانات المنتج الحالي' : 'إضافة منتجات ومستلزمات جديدة'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                🍳 اغلاق
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-650 block">اسم المنتج التجاري *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أرز بسمتي السفير 5 كجم"
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* SKU Code */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">رمز SKU للمخزن *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="مثال: RICE-SAF-5K"
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Barcode */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">الرمز الشريطي الـ Barcode</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="62811..."
                      className="flex-1 px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={generateRandomSKUAndBarcode}
                      className="px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700"
                      title="توليد عشوائي كود باركود سريع"
                    >
                      توليد تلقائي
                    </button>
                  </div>
                </div>

                {/* Category selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">تصنيف المنتج *</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">الماركة / العلامة التجارية</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="مثال: شركة ساديا الغذائية"
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Cost Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">سعر التكلفة للمحل ({currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Selling Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">سعر البيع للتجزئة ({currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Wholesale Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">سعر الجملة للشركاء ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={wholesalePrice || ''}
                    onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Stock starting values */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">صفي الكمية الحالية بالمخازن *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockQuantity || ''}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    disabled={!!editingProduct} // In editing mode, inventory movements should record stock entries safely
                  />
                  {editingProduct && (
                    <p className="text-[10px] text-amber-600 font-bold">
                      ⚠️ لتعديل المخزون، يرجى القيام بـ "حركة مستودع" أو تزويد مشتريات.
                    </p>
                  )}
                </div>

                {/* Min stock alerts threshold */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-650 block">الحد الأدنى لتنبيه نقص المنتج *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStockAlert || ''}
                    onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                    placeholder="5"
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Short description */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-650 block">وصف أو تفاصيل إضافية</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="تاريخ الصلاحية، المواصفات الفنية للضمان،..."
                    rows={2}
                    className="w-full px-3.5 py-2 border border-slate-205 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editingProduct ? 'تحديث المنتج' : 'إضافة للمستودع'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
