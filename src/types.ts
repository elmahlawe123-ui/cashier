export interface Product {
  id: string;
  name: string;
  brand: string;
  supplier?: string;
  category: string;
  price: number;
  purchasePrice?: number;
  wholesalePrice?: number;
  stock: number;
  barcode?: string;
  minStock?: number;
  unit?: string;
  packaging?: string;
  isArchived?: boolean;
  isDeleted?: boolean;
  salesCount?: number;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type?: 'customer' | 'retail' | 'wholesale';
  balance?: number;
  points?: number;
  createdAt?: string;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  brand?: string;
  category?: string;
  quantity: number;
  price: number;
  total: number;
  barcode?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string | number;
  type: 'sale' | 'return' | 'quotation';
  items: TransactionItem[];
  subTotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  customerName?: string;
  customerPhone?: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'vodafone_cash' | 'instapay' | 'credit';
  qrCodeData?: string;
  notes?: string;
  createdAt?: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  phone: string;
  address: string;
  logoUrl?: string;
  taxEnabled?: boolean;
  taxRate?: number;
}
