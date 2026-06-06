/**
 * types.ts
 * Core types for the POS & ERP Application
 */

export interface Product {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  category: string; // Category ID
  brand: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  stockQuantity: number;
  minStockAlert: number;
  image?: string;
  cartonPrice?: number;
  unitsPerCarton?: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color?: string; // Theme color for POS buttons
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number; // Positive = credit (unpaid), Negative = deposit/advance
  debtLimit: number;
  purchaseHistory: string[]; // Order IDs
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  payables: number; // Monies owed to this supplier
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
  discount: number; // Percentage or absolute? Let's use percentage
  packagingUnit?: 'unit' | 'box';
}

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    discount: number;
  }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'debt';
  amountPaid: number;
  change: number;
  date: string; // ISO string
  status: 'completed' | 'refunded' | 'returned' | 'partially_returned';
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    costPrice: number;
  }[];
  total: number;
  date: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  amountPaid: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string; // e.g. "رواتب", "إيجار", "فواتير", "أخرى"
  date: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjust';
  quantity: number; // Always positive
  notes: string;
  date: string;
}

export interface CompanySettings {
  name: string;
  logo: string;
  phone: string;
  address: string;
  taxNumber: string;
  taxRate: number; // e.g. 15 for 15%
  currencySymbol: string; // e.g. "ر.س"
  invoiceNotes: string;
}

export interface ERPState {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  purchases: Purchase[];
  expenses: Expense[];
  movements: InventoryMovement[];
  settings: CompanySettings;
  users?: SystemUser[];
  activeUserId?: string;
}

export interface UserPermissions {
  dashboard: boolean;
  pos: boolean;
  products: boolean;
  categories: boolean;
  customers: boolean;
  suppliers: boolean;
  inventory: boolean;
  purchases: boolean;
  sales: boolean;
  expenses: boolean;
  reports: boolean;
  settings: boolean;
  editInvoices: boolean;
  returnItems: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  phone: string;
  pinCode: string;
  role: 'admin' | 'manager' | 'cashier';
  permissions: UserPermissions;
}
