import Dexie, { Table } from 'dexie';
import { Product, Transaction, Customer, StoreSettings } from './types';
import { syncProductToCloud, syncProductsBatchToCloud } from './firebaseSync';


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

// دالة توليد معرف ثوابت ومستقر بناءً على الكود أو اسم واسم الماركة لمنع التكرار
function getStableId(raw: any): string {
  if (raw.id && String(raw.id).trim()) return String(raw.id).trim();
  if (raw.barcode && String(raw.barcode).trim()) return 'bc_' + String(raw.barcode).trim().toLowerCase();
  const nameSlug = String(raw.name || raw.title || 'item').trim().replace(/\s+/g, '_').toLowerCase();
  const brandSlug = String(raw.brand || raw.manufacturer || 'عام').trim().replace(/\s+/g, '_').toLowerCase();
  return `p_${nameSlug}_${brandSlug}`;
}

// دالة استيراد وتفسير بيانات المخزن بصيغة FireSale / POS JSON الذكية
export async function importFireSaleJSON(jsonInput: string): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const data = JSON.parse(jsonInput);
    let itemsToImport: any[] = [];

    if (Array.isArray(data)) {
      itemsToImport = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.products)) {
        itemsToImport = data.products;
      } else if (Array.isArray(data.items)) {
        itemsToImport = data.items;
      } else if (data.id && data.name) {
        itemsToImport = [data];
      }
    }

    if (!itemsToImport.length) {
      return { success: false, count: 0, message: 'لم يتم العثور على أي منتجات في ملف الـ JSON المرفوع' };
    }

    // جلب المنتجات الحالية من قاعدة البيانات للمقارنة الذكية
    const existingProducts = await db.products.toArray();
    const existingMap = new Map<string, Product>(existingProducts.map(p => [p.id, p]));

    const toSync: Product[] = [];
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const raw of itemsToImport) {
      const stableId = getStableId(raw);
      const name = String(raw.name || raw.title || 'منتج بدون اسم').trim();
      const brand = String(raw.brand || raw.manufacturer || 'عام').trim();
      const category = String(raw.category || 'عام').trim();
      const price = Number(raw.price || raw.sellingPrice || 0);
      const purchasePrice = Number(raw.purchasePrice || raw.costPrice || 0);
      const stock = Number(raw.stock !== undefined ? raw.stock : (raw.quantity || 0));
      const barcode = raw.barcode ? String(raw.barcode).trim() : '';
      const minStock = Number(raw.minStock || 5);
      const unit = String(raw.unit || 'قطعة').trim();

      const existing = existingMap.get(stableId);

      if (existing) {
        // مقارنة الحقول لمعرفة هل تغير أي شيء (سعر، اسم، كمية، ماركة، باركود)
        const isIdentical =
          existing.name === name &&
          existing.brand === brand &&
          existing.category === category &&
          existing.price === price &&
          existing.stock === stock &&
          existing.barcode === barcode &&
          existing.unit === unit;

        if (isIdentical) {
          skippedCount++;
          continue; // ⚡ تخطي المنتجات المطابقة 100% دون أي كتابة لقاعدة البيانات أو السحابة
        } else {
          // ⚡ صنف موجود وتعدل (السعر أو الاسم أو الكمية)
          const updatedProd: Product = {
            ...existing,
            name,
            brand,
            category,
            price,
            purchasePrice,
            stock,
            barcode,
            minStock,
            unit,
            updatedAt: new Date().toISOString()
          };
          toSync.push(updatedProd);
          updatedCount++;
        }
      } else {
        // ⚡ صنف جديد بالكامل
        const newProd: Product = {
          id: stableId,
          name,
          brand,
          category,
          price,
          purchasePrice,
          stock,
          barcode,
          minStock,
          unit,
          notes: raw.notes || '',
          updatedAt: new Date().toISOString()
        };
        toSync.push(newProd);
        addedCount++;
      }
    }

    if (toSync.length > 0) {
      // ⚡ حفظ التعديلات والجديد فقط دفعة واحدة فائقة السرعة
      await db.products.bulkPut(toSync);
      syncProductsBatchToCloud(toSync).catch(err => console.error('Cloud sync error:', err));
    }

    let msg = `تم معالجة ${itemsToImport.length} صنف: `;
    if (addedCount > 0) msg += `تم إضافة ${addedCount} صنف جديد. `;
    if (updatedCount > 0) msg += `تم تحديث ${updatedCount} صنف. `;
    if (skippedCount > 0) msg += `تم تخطي ${skippedCount} صنف متطابق بدون تغيير.`;

    return { success: true, count: itemsToImport.length, message: msg };
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
