import Dexie, { Table } from 'dexie';
import { Product, Transaction, Customer, StoreSettings } from './types';
import { syncProductToCloud } from './firebaseSync';

export class CashierDatabase extends Dexie {
  products!: Table<Product, string>;
  transactions!: Table<Transaction, string>;
  customers!: Table<Customer, string>;
  settings!: Table<StoreSettings, string>;

  constructor() {
    super('FireSaleCashierDB');
    this.version(1).stores({
      products: 'id, name, brand, category, barcode, price, stock',
      transactions: 'id, invoiceNumber, date, status, customerName',
      customers: 'id, name, phone',
      settings: 'id'
    });
  }
}

export const db = new CashierDatabase();

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// دالة استيراد وتفسير بيانات المخزن بصيغة FireSale / POS JSON
export async function importFireSaleJSON(jsonInput: string): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const data = JSON.parse(jsonInput);
    let itemsToImport: Product[] = [];

    if (Array.isArray(data)) {
      itemsToImport = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.products)) {
        itemsToImport = data.products;
      } else if (Array.isArray(data.items)) {
        itemsToImport = data.items;
      } else if (data.id && data.name) {
        itemsToImport = [data as Product];
      }
    }

    if (!itemsToImport.length) {
      return { success: false, count: 0, message: 'لم يتم العثور على أي منتجات في ملف الـ JSON المرفوع' };
    }


    let count = 0;
    await db.transaction('rw', db.products, async () => {
      for (const raw of itemsToImport as any[]) {
        const product: Product = {
          id: raw.id || generateId(),
          name: raw.name || raw.title || 'منتج بدون اسم',
          brand: raw.brand || raw.manufacturer || 'عام',
          category: raw.category || 'عام',
          price: Number(raw.price || raw.sellingPrice || 0),
          purchasePrice: Number(raw.purchasePrice || raw.costPrice || 0),
          stock: Number(raw.stock !== undefined ? raw.stock : (raw.quantity || 0)),
          barcode: raw.barcode ? String(raw.barcode).trim() : '',
          minStock: Number(raw.minStock || 5),
          unit: raw.unit || 'قطع',
          notes: raw.notes || '',
          updatedAt: new Date().toISOString()
        };
        await db.products.put(product);
        syncProductToCloud(product); // Sync to Firestore
        count++;
      }
    });

    return { success: true, count, message: `تم استدعاء واستيراد ${count} منتج بنجاح في مخزن الكاشير وتزامنه سحابياً` };
  } catch (err: any) {

    console.error('Import FireSale JSON error:', err);
    return { success: false, count: 0, message: `خطأ في قراءة صيغة JSON: ${err.message}` };
  }
}

// دالة تصدير بيانات المخزن كـ FireSale JSON
export async function exportFireSaleJSON(): Promise<string> {
  const products = await db.products.toArray();
  const transactions = await db.transactions.toArray();
  
  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'FireSale Cashier Module',
    version: '1.0.0',
    totalProducts: products.length,
    totalTransactions: transactions.length,
    products,
    transactions
  };

  return JSON.stringify(payload, null, 2);
}
