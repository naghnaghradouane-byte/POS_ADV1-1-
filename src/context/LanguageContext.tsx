import React, { createContext, useContext, useState, useEffect } from 'react';

type Lang = 'ar' | 'fr';

const translations = {
  ar: {
    common: {
      search: "بحث وسحب...",
      add: "إضافة",
      edit: "تعديل",
      delete: "حذف",
      save: "حفظ",
      cancel: "إلغاء",
      actions: "العمليات",
      currency: "درهم",
      close: "إغلاق",
      confirm: "تأكيد",
      status: "الحالة",
      date: "التاريخ",
      total: "الإجمالي",
      loading: "جاري التحميل...",
      success: "تمت العملية بنجاح!",
      error: "حدث خطأ ما!",
      warning: "تنبيه",
      noData: "لا توجد بيانات متاحة حالياً.",
      all: "الكل",
      none: "لا شيء",
      yes: "نعم",
      no: "لا",
      phone: "الهاتف",
      address: "العنوان",
      notes: "ملاحظات",
      barcode: "الباركود",
      sku: "رمز SKU",
      price: "السعر",
      quantity: "الكمية",
      name: "الاسم",
      id: "المعرف",
      back: "رجوع",
      print: "طباعة",
      tax: "الضريبة",
      discount: "الخصم",
      subtotal: "المجموع الفرعي",
      unregisteredCustomer: "عميل غير مسجل",
      completed: "مكتمل",
      refunded: "مسترجع بالكامل",
      returned: "مرتجع",
      partially_returned: "مرتجع جزئياً"
    },
    sidebar: {
      brand: "المدير الذكي ERP",
      posSystem: "نظام POS المطور 2026",
      cloudSyncActive: "مزامنة السحاب نشطة",
      offlineMode: "نمط العمل المحلي",
      syncNow: "مزامنة الآن",
      syncing: "جاري المزامنة...",
      activeCashier: "الكاشير النشط (انقر للتبديل):",
      chooseEmployee: "اختر الموظف للدخول إلى النظام:",
      securedPin: "تأكيد رمز الدخول PIN",
      pinHint: "تلميح للاختبار: رمز المالك admin هو 1234، ورمز الكاشير cashier هو 0000",
      pinPlaceholder: "أدخل الرمز المكون من 4 أرقام",
      pinError: "رمز الدخول PIN الذي أدخلته غير صحيح!",
      loginConfirm: "مرحباً بك! تم تغيير هويتك وملاءمة الصلاحيات بنجاح.",
      newBadge: "جديد",
      cloudLogin: "تسجيل الدخول سحابياً",
      logout: "تسجيل الخروج",
      menu: {
        dashboard: "لوحة التحكم",
        pos: "شاشة نقطة البيع (POS)",
        products: "إدارة المنتجات",
        categories: "تصنيفات المنتجات",
        customers: "العملاء والديون",
        suppliers: "إدارة الموردين",
        inventory: "المخزون والتحركات",
        purchases: "المشتريات وفواتير الموردين",
        sales: "سجل المبيعات والفواتير",
        expenses: "المصاريف النقدية",
        reports: "التقارير والتحليلات",
        users: "الموظفون والصلاحيات",
        settings: "إعدادات النظام"
      }
    },
    header: {
      cloudConnected: "نشط اتصال سحابي • Firebase Cloud Active",
      offlineMode: "نشط دون اتصال • SQLite Offline Mode",
      lightMode: "الوضع المضيء",
      darkMode: "الوضع الداكن",
      section: "القسم"
    },
    dashboard: {
      title: "اللوحة الإحصائية والربحية",
      totalSales: "إجمالي المبيعات المعتمدة",
      averageTicket: "متوسط الفاتورة الواحدة",
      netProfit: "صافي الأرباح المحققة",
      expiredItems: "سلع أوشكت على النفاد",
      salesVsExpenses: "تبيان المبيعات الشهرية مقارنة بالمصاريف",
      topProducts: "أعلى 5 منتجات مبيعاً وطلباً",
      topCustomers: "أكثر 5 عملاء سحباً ومبيعات",
      lowStockWarning: "المنتجات أدناه وصلت للحد الحرج وتطلب الطلب الفوري لتلافي توقف المبيعات:",
      salesValue: "قيمة المبيعات",
      expensesValue: "قيمة المصاريف",
      noPurchases: "لا توجد مشتريات",
      stock: "المخزون",
      units: "وحدات",
      soldQty: "الكمية المباعة",
      profit: "الأرباح",
      totalOrders: "إجمالي الفواتير",
      revenue: "الإيرادات",
      activeCashier: "الكاشير المتأهب"
    },
    pos: {
      title: "نقطة البيع والمبيعات المباشرة",
      allCategories: "كافة التصنيفات",
      searchPlaceholder: "ابحث باسم المنتج، أو امسح الباركود مباشرة...",
      emptyCart: "عربة التسوق فارغة تماماً. انقر على المنتجات باليمين لإضافتها وتوليد الفاتورة فورياً.",
      customerDetails: "بيانات العميل والائتمان المتاح:",
      outstandingDebt: "الديون السابقة المرصودة:",
      outstandingDebtVal: "رصيد ديونه السابقة: {balance} درهم | الحد الأقصى للدين: {limit} درهم",
      coordinates: "تفاصيل الموقع الجغرافي:",
      cartonPackaging: "بيع بالكرتونة (محتوى {qty} وحدة)",
      cartonPriceSelected: "سعر الكرتون المطبق",
      pricePerUnit: "سعر الحبة المطبق",
      cartTotals: "حسابات الفاتورة والتسوية",
      subtotalLabel: "المجموع الفرعي (Sous Total):",
      applyDiscount: "تطبيق خصم الفاتورة العام (%):",
      taxLabel: "ضريبة القيمة المضافة / TVA ({rate}%):",
      totalRequired: "الصافي النهائي المطلوب (Net à Payer):",
      paymentMethod: "طريقة الاستلام والتحصيل المعتمدة:",
      cashPay: "الدفع النقدي (كاش بالدرج)",
      cardPay: "البطاقات المعتمدة (مادا/فيزا)",
      transferPay: "تحويل بنكي مباشر",
      debtPay: "آجل (تسجيل دين على حساب العميل)",
      amountReceived: "المبلغ المستلم نقداً من الزبون:",
      changeAmount: "المبلغ المتبقي للعميل (المسترجع):",
      processPayment: "معالجة المعاملة وإصدار الفاتورة",
      debtLimitExceeded: "خطأ مالي: لا يمكن إتمام عملية البيع بالآجل! ديون العميل الحالية مع الفاتورة الحالية تتجاوز السقف الأعلى المسموح له ({limit} درهم)!",
      cashInsufficient: "المبلغ المستلم غير كافٍ. المطلوب: {total} درهم",
      selectRegisteredCustomer: "يجب اختيار عميل مسجل من القائمة لتقييد المديونية عليه بالآجل!",
      receiptTitle: "فاتورة مبيعات مبسطة",
      billNo: "رقم الفاتورة",
      cashier: "الكاشير المسئول",
      item: "السلعة / البند",
      qtyTable: "الكمية",
      unitPriceTable: "السعر",
      netTable: "الصافي",
      totalRequiredTtc: "الصافي المطلوب (TTC):",
      paidCash: "المبلغ المستلم كاش:",
      changeReturned: "الباقي المرتجع للزبون:",
      thanks: "شكراً لزيارتكم! نأمل رؤيتكم مجدداً",
      printReceipt: "طباعة الفاتورة الفورية الحالية والنسخ",
      newOrder: "فتح معاملة مبيعات جديدة",
      customPrice: "السعر المخصص",
      noProducts: "لا توجد منتجات تطابق البحث في هذا القسم حالياً."
    },
    products: {
      title: "كتالوج ومخزون المنتجات",
      addProduct: "إضافة منتج جديد للكتالوج",
      editProduct: "تعديل تفاصيل المنتج",
      noProducts: "لا توجد منتجات مسجلة حالياً.",
      pName: "اسم المنتج المميز",
      pBarcode: "الباركود الدولي أو المحلي",
      pSku: "الرمز SKU للمخازن",
      pCategory: "التصنيف التابع له",
      pBrand: "العلامة التجارية / الماركة",
      pCost: "سعر الشراء والتكلفة (ر.س)",
      pSelling: "سعر البيع الافتراضي للحبة (ر.س)",
      pWholesale: "سعر بيع الجملة الاختياري (ر.س)",
      pStock: "كمية الرصيد الافتتاحية الحالية",
      pAlert: "حد الإنذار الأدنى للمخزون",
      pUnitsPerCarton: "عدد الحبات داخل الكرتونة الواحدة",
      pCartonPrice: "سعر بيع الكرتونة الإجمالي بالجملة",
      saveProduct: "حفظ المنتج وتحديثات السجل",
      deleteConfirm: "هل أنت متأكد من حذف هذا المنتج؟ سيتم حذفه نهائياً من كافة السجلات.",
      fieldsRequired: "يرجى ملء جميع الحقول المطلوبة بنجاح."
    },
    categories: {
      title: "الأقسام والتصنيفات المخزنية",
      addCategory: "إنشاء تصنيف جديد للمنتجات",
      editCategory: "تعديل بيانات التصنيف الحالي",
      cName: "اسم التصنيف الإداري",
      cDesc: "شرح تفصيلي للتصنيف",
      cColor: "لون الزر في لوحة البيع السريع",
      saveCategory: "تأكيد تسجيل التصنيف",
      noCategories: "لا توجد تصنيفات معرفة حالياً.",
      deleteConfirm: "هل أنت متأكد من حذف هذا التصنيف؟"
    },
    customers: {
      title: "قاعدة بيانات حسابات العملاء",
      addCustomer: "تسجيل وتكويد عميل جديد بالملف",
      editCustomer: "تعديل بيانات العميل الحالي",
      cName: "الاسم الكامل الثلاثي للعميل",
      cPhone: "رقم الجوال النشط للاتصال",
      cAddress: "العنوان السكني والتوصيل",
      cDebtLimit: "الحد الأقصى للمديونية والآجل",
      cNotes: "ملاحظات وتوجيهات حساب العميل",
      cCoordinates: "الإحداثيات الجغرافية (خط العرض والطول)",
      captureLocation: "التقاط موقع العميل بالـ GPS الآن",
      viewLocation: "عرض موقع الاستلام على الخريطة",
      viewRoute: "رسم مسار التوصيل من المتجر للعميل",
      saveCustomer: "حفظ العميل وملف التسجيل الحسابي",
      deleteConfirm: "هل أنت متأكد من حذف العميل؟",
      lat: "خط العرض",
      lng: "خط الطول",
      unpaidBalance: "الديون المستحقة",
      noCustomers: "لا توجد بيانات عملاء مسجلة تطابق محركات البحث حالياً.",
      debtLimitLabel: "سقف الدين الممنوح:",
      locationServices: "خدمات التوصيل الجغرافي والخرائط الذكية",
      routeDetails: "مسار التوصيل والخرائط",
      deliveryRoute: "مسار التوصيل والاتجاهات الجغرافية للعميل"
    },
    suppliers: {
      title: "دليل شركات الموردين",
      addSupplier: "تسجيل شركة مورد أو تاجر جملة",
      editSupplier: "تعديل بيانات المورد الحالي",
      sName: "اسم المنشأة التجارية للمورد",
      sContact: "المسئول أو المندوب المعتمد",
      sPhone: "رقم الهاتف والطلبات",
      sAddress: "المستودع الرئيسي أو عنوان المورد",
      sPayables: "الديون والالتزامات المستحقة للمورد",
      saveSupplier: "حفظ المورد في سجل الموردين المعتمدين",
      noSuppliers: "لا توجد أسماء موردين مسجلة تطابق الفرز والبحث حالياً.",
      deleteConfirm: "هل أنت متأكد من حذف هذا المورد؟"
    },
    inventory: {
      title: "حركات الدخول والخروج للمستودع",
      addMovement: "تسوية مخزنية وتعديل كميات يدوي",
      type: "نوع الحركة المستودعية",
      typeIn: "وارد للمستودع • إضافة رصيد",
      typeOut: "صادر وتصدير خارج المستودع",
      typeAdjust: "تسوية وفرق كمية الجرد الفعلي",
      mProduct: "المنتج المراد تسوية كميته",
      mQty: "الكمية المراد حركتها بالأعداد",
      mNotes: "شرح الحركة والتوجيه الإداري",
      saveMovement: "تشغيل التسوية وتحديث الأرصدة فوراً",
      movementHistory: "دفتر الأستاذ للتحركات المستودعية التاريخية للمنتجات",
      caller: "المنتج وتفاصيل الحركة المخزنية",
      dateLabel: "التاريخ والوقت",
      reason: "أسباب وعلّة الحركة المقيدة",
      noMovements: "لا توجد تحركات مخزنية مسجلة حتى اللحظة."
    },
    purchases: {
      title: "فواتير مشتريات بضائع الجملة",
      addPurchase: "تسجيل فاتورة توريد وشراء جديدة",
      invoiceNo: "رقم الفاتورة الواردة من المورد",
      selectSupplier: "اختر المورد المعتمد للمعمل",
      paymentStatus: "حالة السداد والتحويل للمورد",
      statusPaid: "مدفوعة بالكامل نقداً",
      statusPartial: "مدفوعة جزئياً (آجل المتبقي)",
      statusUnpaid: "غير مدفوعة بالكامل (آجل مستقبلي)",
      amountPaid: "المبلغ المدفوع فعلياً للمورد",
      invoiceTotal: "إجمالي الفاتورة من التكلفة الموردة",
      costPrice: "سعر شراء وتكلفة الحبة الواحدة",
      savePurchase: "تسجيل الفاتورة وإدخال رصيد السلع للمستودع",
      deleteConfirm: "هل أنت متأكد من حذف هذه الفاتورة الشراء؟",
      noPurchases: "لا توجد فواتير توريد ومشتريات مسجلة في هذا البحث حالياً.",
      billDetails: "اسم المورد وتفاصيل التوريد المالي"
    },
    sales: {
      title: "شريط مبيعات الموظفين والفواتير",
      invoiceNoPlaceholder: "ابحث برقم الفاتورة أو اسم الزبون...",
      payoutMethod: "طريقة الاستلام",
      invoiceNo: "رقم الفاتورة",
      cashier: "الكاشير",
      totalInvoice: "إجمالي السعر",
      time: "وقت البيع",
      refundFull: "إرجاع كلي",
      refundFullTitle: "إلغاء المبيعات وإرجاع الفاتورة كاملة للمستودع",
      refundSuccess: "تم استرجاع الحساب بالكامل",
      noSales: "لا توجد فواتير مبيعات مسجلة في النظام تطابق هذا البحث حالياً.",
      editSalesModal: "تعديل بنود الفاتورة والأسعار والخصم المطبق مسبقاً:",
      invoiceNoUnique: "رقم الفاتورة المميز *",
      invoiceTime: "التاريخ والوقت للفاتورة *",
      beneficiary: "العميل والمستفيد المعتمد *",
      paymentMethodSelect: "طريقة التحصيل والتسوية *",
      netTotalAmount: "الصافي الكلي",
      financialAdjust: "القيم المالية المعدلة (حسابات الفاتورة):",
      prevInvoiceTotal: "إجمالي الفاتورة الأساسية السابقة كان:",
      customerRefundAmt: "فرق التوجيه المالي المسترجّع للزبون:",
      saveAdjustments: "حفظ كافة التعديلات والتسويات ونقل المبيعات",
      cancelAdjust: "إلغاء التعديل",
      footerVersion: "نظام الفوترة الإلكتروني المتكامل والمبيعات الذكي • الإصدار v1.0"
    },
    expenses: {
      title: "سندات صرف النقدية التشغيلية",
      addExpense: "تسجيل سند صرف ومصاريف نقدية جديدة",
      eAmount: "المبلغ المصروف فعلياً بدرهم",
      eDesc: "بيان وتفاصيل الصرف وسداد المبلغ",
      eCategory: "بند ونوع المصروفات الرئيسي",
      cats: {
        salaries: "رواتب ومكافآت موظفين",
        rents: "إيجار فروع ومستودعات",
        bills: "فواتير كهرباء وهاتف وإنترنت ومياه",
        others: "مصاريف نثرية وأخرى تشغيلية"
      },
      saveExpense: "تسجيل سند الصفر وخصمه من التدفق",
      totalExpenses: "إجمالي المصاريف المسجلة والمدفوعة",
      noExpenses: "لا توجد مصروفات نقدية مطابقة للمعايير حالياً."
    },
    reports: {
      title: "التقارير والموازنة الحسابية",
      totalRevenue: "إجمالي الإيرادات وعائد المبيعات",
      totalCogs: "تكلفة البضائع المبيعة (COGS)",
      totalExpenses: "إجمالي المصروفات المنشأة",
      netProfit: "صافي الأرباح التشغيلية المحققة",
      exportExcel: "تصدير ورقة بيانات مكسورة لـ Excel",
      pProfitLabel: "هامش الأرباح وجدول كفاءة مبيعات المنتجات",
      pName: "المنتج",
      cat: "التصنيف",
      soldQty: "المباع",
      revenue: "الإيرادات",
      cogs: "تكلفة الشراء",
      profit: "أرباح",
      margin: "هامش",
      cProfitLabel: "ذمم حساب مبيعات وأرباح العملاء",
      totalSummary: "الخلاصة المالية وعائدات الفروع والنشاط"
    },
    settings: {
      title: "إعدادات الفاتورة والنظام والاتصال",
      cName: "اسم الشركة / المؤسسة المسجل بالفاتورة",
      cPhone: "رقم الجوال لإدخاله في هيدر الفاتورة",
      cAddress: "العنوان التجاري المكتوب أسفل الإيصال",
      cTaxNo: "الرقم الضريبي الموحد للمنشأة (TVA)",
      cTaxRate: "نسبة ضريبة القيمة المضافة الافتراضية (%)",
      cCurrency: "رمز العملة الوطني الرسمي المطبق",
      cInvoiceNotes: "ملاحظات إضافية تظهر نهاية إيصال العميل",
      saveSettingsBtn: "حفظ إعدادات المنشأة في قاعدة البيانات",
      cloudSyncSetup: "إعدادات المزامنة والربط السحابي",
      simulateSync: "التأكد ومزامنة السيرفر الفوري",
      backupDb: "توليد نسخة احتياطية محلية مشفرة",
      resetDb: "تصفير وإعادة تهيئة قاعدة البيانات بالكامل",
      logsTitle: "سجل العمليات والتحليلات البرمجية المحلية (Logs)"
    },
    users: {
      title: "إدارة الكوادر والصلاحيات الأمنية",
      addUser: "تسجيل موظف أو كاشير مبيعات جديد",
      editUser: "تعديل حساب وصلاحيات الكاشير الحالي",
      uName: "الاسم الكامل للموظف",
      uUsername: "اسم المستخدم للدخول (Username)",
      uPhone: "رقم هاتف الموظف لمتابعة الورديات",
      uPin: "رمز الأمان المكون من 4 أرقام للدخول (PIN)",
      uRole: "الرتبة والمسئولية الأمنية",
      roleAdmin: "المالك المالك للمنشأة (Admin)",
      roleManager: "المشرف الإداري للمستودعات (Manager)",
      roleCashier: "كاشير مبيعات ونقاط بيع (Cashier)",
      uPermissions: "تفويض صلاحيات تشغيل أقسام النظام:",
      saveUser: "حفظ الكاشير وملف الصلاحيات المطبقة",
      deleteConfirm: "هل أنت متأكد من حذف هذا الموظف وصلاحياته بالكامل؟"
    }
  },
  fr: {
    common: {
      search: "Rechercher...",
      add: "Ajouter",
      edit: "Modifier",
      delete: "Supprimer",
      save: "Enregistrer",
      cancel: "Annuler",
      actions: "Actions",
      currency: "MAD",
      close: "Fermer",
      confirm: "Confirmer",
      status: "Statut",
      date: "Date",
      total: "Total",
      loading: "Chargement...",
      success: "Opération réussie !",
      error: "Une erreur est survenue !",
      warning: "Avertissement",
      noData: "Aucune donnée disponible pour le moment.",
      all: "Tout",
      none: "Aucun",
      yes: "Oui",
      no: "Non",
      phone: "Téléphone",
      address: "Adresse",
      notes: "Notes",
      barcode: "Code à barres",
      sku: "Réf SKU",
      price: "Prix",
      quantity: "Quantité",
      name: "Nom",
      id: "ID",
      back: "Retour",
      print: "Imprimer",
      tax: "Taxe",
      discount: "Remise",
      subtotal: "Sous-total",
      unregisteredCustomer: "Client non enregistré",
      completed: "Complété",
      refunded: "Remboursé totalement",
      returned: "Retourné",
      partially_returned: "Retourné partiellement"
    },
    sidebar: {
      brand: "Directeur Intelligent ERP",
      posSystem: "Système POS Avancé 2026",
      cloudSyncActive: "Synchronisation Cloud Active",
      offlineMode: "Mode Local Hors Ligne",
      syncNow: "Synchro maintenant",
      syncing: "Synchronisation...",
      activeCashier: "Caissier Actif (cliquer pour changer) :",
      chooseEmployee: "Choisir un employé pour se connecter :",
      securedPin: "Confirmation de code PIN",
      pinHint: "Conseil test : Admin PIN est 1234, Caissier PIN est 0000",
      pinPlaceholder: "Saisir le code PIN de 4 chiffres",
      pinError: "Le code PIN saisi est incorrect !",
      loginConfirm: "Bienvenue ! Changement d'identité effectué avec succès.",
      newBadge: "NEW",
      cloudLogin: "Connexion Cloud",
      logout: "Se déconnecter",
      menu: {
        dashboard: "Tableau de Bord",
        pos: "Caisse POS",
        products: "Gestion des Produits",
        categories: "Catégories",
        customers: "Clients et Dettes",
        suppliers: "Gestion Fournisseurs",
        inventory: "Mouvements Stock",
        purchases: "Achats & Commandes",
        sales: "Historique Ventes",
        expenses: "Dépenses de Caisse",
        reports: "Rapports & Analyses",
        users: "Employés & Droits",
        settings: "Paramètres"
      }
    },
    header: {
      cloudConnected: "Synchronisation sychrone active • Firebase Cloud Active",
      offlineMode: "Mode hors ligne actif • SQLite Offline Mode",
      lightMode: "Mode Clair",
      darkMode: "Mode Sombre",
      section: "Section"
    },
    dashboard: {
      title: "Tableau de Bord et Statistiques de Rentabilité",
      totalSales: "Total des Ventes Validées",
      averageTicket: "Panier Moyen des Factures",
      netProfit: "Bénéfice Net Réalisé",
      expiredItems: "Alerte de Rupture de Stock",
      salesVsExpenses: "Comparatif Mensuel : Ventes vs Dépenses",
      topProducts: "Top 5 des Produits les plus Vendus",
      topCustomers: "Top 5 des Clients les plus Actifs",
      lowStockWarning: "Produits en dessous du seuil critique (Achat immédiat recommandé) :",
      salesValue: "Ventes",
      expensesValue: "Dépenses",
      noPurchases: "Aucun achat enregistré",
      stock: "Stock",
      units: "Unités",
      soldQty: "Quantité Vendue",
      profit: "Bénéfice",
      totalOrders: "Total Factures",
      revenue: "Chiffre d'Affaires",
      activeCashier: "Caissier en service"
    },
    pos: {
      title: "Caisse POS et Vente Directe",
      allCategories: "Toutes les catégories",
      searchPlaceholder: "Rechercher par nom ou scanner code à barres...",
      emptyCart: "Votre panier est vide. Cliquez sur un produit pour l'ajouter et éditer le reçu en temps réel.",
      customerDetails: "Données du client et crédit disponible :",
      outstandingDebt: "Dettes antérieures enregistrées :",
      outstandingDebtVal: "Dette actuelle : {balance} MAD | Plafond de crédit : {limit} MAD",
      coordinates: "Coordonnées de livraison GPS :",
      cartonPackaging: "Vente par Carton ({qty} Unités)",
      cartonPriceSelected: "Prix du Carton appliqué",
      pricePerUnit: "Prix Unitaire appliqué",
      cartTotals: "Calcul de la Facture et Règlement",
      subtotalLabel: "Sous Total (HT) :",
      applyDiscount: "Appliquer Remise Générée (%) :",
      taxLabel: "Taxe sur la valeur ajoutée / TVA ({rate}%) :",
      totalRequired: "Net à Payer (TTC) :",
      paymentMethod: "Méthode de Règlement Validée :",
      cashPay: "Espèces (Caisse)",
      cardPay: "Carte Bancaire / TPE",
      transferPay: "Virement Bancaire Direct",
      debtPay: "Crédit (Dette sur le compte du client)",
      amountReceived: "Montant reçu de la part du client :",
      changeAmount: "Rendu de Monnaie au Client :",
      processPayment: "Encaisser et Éditer le Reçu",
      debtLimitExceeded: "Erreur financière : Le plafond de crédit autorisé ({limit} MAD) est dépassé pour ce client !",
      cashInsufficient: "Montant reçu insuffisant. Requis : {total} MAD",
      selectRegisteredCustomer: "Sélectionnez un client dans la liste pour lui imputer cette vente à crédit !",
      receiptTitle: "Facture de Vente Simplifiée (Reçu de Caisse)",
      billNo: "Reçu N°",
      cashier: "Caissier responsable",
      item: "Désignation / Article",
      qtyTable: "Qté/U",
      unitPriceTable: "P.U",
      netTable: "Total",
      totalRequiredTtc: "Total à payer (TTC) :",
      paidCash: "Montant reçu en espèces :",
      changeReturned: "Rendu monnaie au client :",
      thanks: "Merci de votre visite ! À très bientôt.",
      printReceipt: "Imprimer le reçu de caisse instantané",
      newOrder: "Ouvrir une nouvelle vente",
      customPrice: "Prix Modifié",
      noProducts: "Aucun produit ne correspond à votre recherche dans cette catégorie."
    },
    products: {
      title: "Catalogue et Stock des Produits",
      addProduct: "Ajouter un nouveau produit au catalogue",
      editProduct: "Modifier les détails du produit",
      noProducts: "Aucun produit enregistré pour le moment.",
      pName: "Nom complet du produit",
      pBarcode: "Code à barres international/local",
      pSku: "Référence interne SKU",
      pCategory: "Catégorie associée",
      pBrand: "Marque / Fabricant",
      pCost: "Prix d'Achat & Coût (MAD)",
      pSelling: "Prix de Vente Unitaire (MAD)",
      pWholesale: "Prix de Vente en Gros (Optionnel)",
      pStock: "Quantité en Stock de Départ",
      pAlert: "Seuil d'Alerte de Stock Bas",
      pUnitsPerCarton: "Nombre d'unités par carton d'emballage",
      pCartonPrice: "Prix de Vente Total du Carton",
      saveProduct: "Sauvegarder le produit et rafraîchir",
      deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce produit ? Il sera supprimé définitivement de l'historique.",
      fieldsRequired: "Veuillez remplir correctement tous les champs obligatoires."
    },
    categories: {
      title: "Départements et Catégories de Stock",
      addCategory: "Créer une nouvelle catégorie",
      editCategory: "Modifier la catégorie sélectionnée",
      cName: "Nom de la Catégorie",
      cDesc: "Description des articles",
      cColor: "Couleur de bouton sur l'écran tactile",
      saveCategory: "Valider l'enregistrement",
      noCategories: "Aucune catégorie définie pour le moment.",
      deleteConfirm: "Voulez-vous supprimer cette catégorie ?"
    },
    customers: {
      title: "Base de Données et Comptes Clients",
      addCustomer: "Ficher un nouveau client",
      editCustomer: "Modifier le profil client",
      cName: "Nom complet / Raison Sociale",
      cPhone: "Numéro de téléphone mobile actif",
      cAddress: "Adresse de livraison",
      cDebtLimit: "Plafond de dette / Crédit autorisé",
      cNotes: "Instructions et notes de compte",
      cCoordinates: "Coordonnées GPS (Latitude et Longitude)",
      captureLocation: "Capturer la position GPS Actuelle",
      viewLocation: "Voir l'emplacement de livraison sur la carte",
      viewRoute: "Calculer l'itinéraire de livraison",
      saveCustomer: "Enregistrer le compte client",
      deleteConfirm: "Voulez-vous supprimer ce client ?",
      lat: "Latitude",
      lng: "Longitude",
      unpaidBalance: "Créance Actuelle",
      noCustomers: "Aucun client ne correspond à votre recherche pour le moment.",
      debtLimitLabel: "Limite crédit accordé :",
      locationServices: "Services GPS & Cartographie de livraison",
      routeDetails: "Détails itinéraire et trajet",
      deliveryRoute: "Feuille de livraison et trajet GPS"
    },
    suppliers: {
      title: "Annuaire des Sociétés Fournisseurs",
      addSupplier: "Ajouter un fournisseur ou grossiste",
      editSupplier: "Modifier la fiche du fournisseur",
      sName: "Raison Sociale / Entreprise",
      sContact: "Nom de l'interlocuteur / Agent",
      sPhone: "N° Téléphone ou Commandes",
      sAddress: "Entrepôt principal ou Adresse",
      sPayables: "Montant dû au Fournisseur (Dettes)",
      saveSupplier: "Enregistrer le profil fournisseur",
      noSuppliers: "Aucun fournisseur ne correspond à votre recherche.",
      deleteConfirm: "Supprimer définitivement ce fournisseur ?"
    },
    inventory: {
      title: "Mouvements du Stock et Entrepôt",
      addMovement: "Régulation manuelle et ajustement du stock",
      type: "Nature du Mouvement",
      typeIn: "Entrée de Stock • Réapprovisionnement (+)",
      typeOut: "Sortie de Stock • Déstockage (-)",
      typeAdjust: "Régularisation • Ajustement d'Inventaire (+/-)",
      mProduct: "Sélectionner le produit concerné",
      mQty: "Quantité d'unités à déplacer",
      mNotes: "Raison de régularisation ou commentaire administratif",
      saveMovement: "Enregistrer le mouvement de stock",
      movementHistory: "Journal Historique des Mouvements de Stock",
      caller: "Produit concerné & sens du mouvement",
      dateLabel: "Date du mouvement",
      reason: "Motif ou pièces justificatives",
      noMovements: "Aucun mouvement de stock n'est consigné pour le moment."
    },
    purchases: {
      title: "Factures d'Achats Gros Fournisseurs",
      addPurchase: "Enregistrer une nouvelle facture d'achat",
      invoiceNo: "N° Facture Fournisseur",
      selectSupplier: "Sélectionner le fournisseur agréé",
      paymentStatus: "Statut de règlement du paiement",
      statusPaid: "Payée entièrement en espèces",
      statusPartial: "Payée partiellement (Crédit restant)",
      statusUnpaid: "Dette fournisseur non payée (À régler)",
      amountPaid: "Montant payé à la livraison (Acompte)",
      invoiceTotal: "Montant total facturé",
      costPrice: "Coût unitaire d'achat facturé",
      savePurchase: "Enregistrer la facture et injecter en stock",
      deleteConfirm: "Supprimer cette facture d'achat ?",
      noPurchases: "Aucun achat enregistré correspondant à votre filtre.",
      billDetails: "Données Fournisseur & de Facturation"
    },
    sales: {
      title: "Registre des Ventes et Factures Emises",
      invoiceNoPlaceholder: "Rechercher par N° Facture ou nom de client...",
      payoutMethod: "Type Paiement",
      invoiceNo: "N° Reçu",
      cashier: "Caissier",
      totalInvoice: "Prix Total",
      time: "Heure de Vente",
      refundFull: "Retour Global",
      refundFullTitle: "Annuler cette vente et réintégrer le stock",
      refundSuccess: "Facture entièrement créditée et annulée",
      noSales: "Aucun reçu de vente ne correspond à votre recherche.",
      editSalesModal: "Modification des lignes de facturation et régularisation :",
      invoiceNoUnique: "N° Facture Spécifique *",
      invoiceTime: "Date & Heure d'Émission *",
      beneficiary: "Client payeur agréé *",
      paymentMethodSelect: "Mode de règlement / Encaissement *",
      netTotalAmount: "Montant Net",
      financialAdjust: "Calculs Financières Ajustés :",
      prevInvoiceTotal: "Ancien total global du reçu initial :",
      customerRefundAmt: "Montant remboursé/crédité au client :",
      saveAdjustments: "Enregistrer et régulariser les comptes",
      cancelAdjust: "Annuler les modifications",
      footerVersion: "Facturation Électronique Intégrée & POS Intelligent • Version v1.0"
    },
    expenses: {
      title: "Gestion des Dépenses de Fonctionnement",
      addExpense: "Enregistrer un nouveau justificatif de dépense",
      eAmount: "Montant payé (MAD)",
      eDesc: "Motif ou Libellé de paiement",
      eCategory: "Poste budgétaire et type de charge",
      cats: {
        salaries: "Salaires & Indemnités des employés",
        rents: "Loyers des succursales et locaux",
        bills: "Factures d'Énergie, Téléphone & Services",
        others: "Frais généraux et divers"
      },
      saveExpense: "Décasser et valider la dépense",
      totalExpenses: "Total des dépenses enregistrées",
      noExpenses: "Aucune dépense ne correspond aux critères."
    },
    reports: {
      title: "Rapports d'Activité et État Comptable",
      totalRevenue: "Chiffre d'Affaires Brut (HT)",
      totalCogs: "Coût d'Achat des Ventes (COGS)",
      totalExpenses: "Total Charges et Dépenses",
      netProfit: "Bénéfice Net d'Exploitation",
      exportExcel: "Exporter les feuilles en format Excel XLS",
      pProfitLabel: "Rentabilité détaillée et marge brute par produit",
      pName: "Nom Produit",
      cat: "Catégorie",
      soldQty: "Qté Vendue",
      revenue: "Chiffre d'Affaires",
      cogs: "Coût",
      profit: "Gain",
      margin: "Marge",
      cProfitLabel: "Bilan Chiffre d'Affaires et Encours par Client",
      totalSummary: "Synthèse Financière et Indicateurs de Performance"
    },
    settings: {
      title: "Paramètres de Facturation et Système",
      cName: "Raison Sociale de l'Etablissement",
      cPhone: "Téléphone officiel du reçu",
      cAddress: "Adresse imprimée sur le ticket de caisse",
      cTaxNo: "Identifiant fiscal unique de l'entreprise (TVA)",
      cTaxRate: "Taux de TVA par défaut appliqué (%)",
      cCurrency: "Symbole de la monnaie (MAD, €, $)",
      cInvoiceNotes: "Texte publicitaire / mentions en pied de ticket",
      saveSettingsBtn: "Sauvegarder les paramètres généraux",
      cloudSyncSetup: "Synchronisation Cloud & Sauvegarde",
      simulateSync: "Forcer la synchronisation avec le serveur",
      backupDb: "Générer une sauvegarde SQL cryptée",
      resetDb: "Réinitialiser et effacer la base de données",
      logsTitle: "Historique technique des événements système (Logs)"
    },
    users: {
      title: "Gestion des Comptes Utilisateurs & Droits",
      addUser: "Enregistrer un nouveau membre d'équipe",
      editUser: "Modifier les privilèges du membre",
      uName: "Nom Complet de l'employé",
      uUsername: "Identifiant de connexion (Username)",
      uPhone: "Numéro de mobile",
      uPin: "Code PIN de sécurité à 4 chiffres (PIN)",
      uRole: "Rôle et Droits applicables",
      roleAdmin: "Propriétaire / Administrateur (Admin)",
      roleManager: "Gérant opérationnel (Manager)",
      roleCashier: "Caissier de Vente Directe (Cashier)",
      uPermissions: "Droits d'Accès aux sections du logiciel :",
      saveUser: "Enregistrer les autorisations",
      deleteConfirm: "Supprimer l'accès complet pour ce collaborateur ?"
    }
  }
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (keyPath: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('POS_LANG');
    const upgraded = localStorage.getItem('POS_LANG_UPGRADED_V2');
    if (!upgraded) {
      localStorage.setItem('POS_LANG_UPGRADED_V2', 'yes');
      localStorage.setItem('POS_LANG', 'fr');
      return 'fr';
    }
    return (saved as Lang) || 'fr';
  });

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('POS_LANG', lang);
  }, [lang]);

  const t = (keyPath: string, variables?: Record<string, string | number>): string => {
    const keys = keyPath.split('.');
    let result: any = translations[lang];
    
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        // Fallback to Arabic if not found in current language
        let arabicFallback: any = translations['ar'];
        for (const subKey of keys) {
          if (arabicFallback && arabicFallback[subKey] !== undefined) {
            arabicFallback = arabicFallback[subKey];
          } else {
            return keyPath;
          }
        }
        result = arabicFallback;
        break;
      }
    }

    if (typeof result !== 'string') {
      return keyPath;
    }

    let formatted = result;
    if (variables) {
      Object.entries(variables).forEach(([key, val]) => {
        formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), String(val));
      });
    }

    return formatted;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
