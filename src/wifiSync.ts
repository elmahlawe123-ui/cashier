import { importFireSaleJSON } from './db';
import { Transaction } from './types';

const PC_IP_STORAGE_KEY = 'mahlawy_pc_wifi_ip';

export function getSavedPcIp(): string {
  return localStorage.getItem(PC_IP_STORAGE_KEY) || '';
}

export function formatPcUrl(inputIp: string, path: string): string {
  let clean = (inputIp || getSavedPcIp()).trim();
  clean = clean.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (clean && !clean.includes(':')) {
    clean += ':4000'; // Default port
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `http://${clean}${cleanPath}`;
}

export function savePcIp(ip: string): void {
  let cleanIp = ip.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (cleanIp && !cleanIp.includes(':')) {
    cleanIp += ':4000'; // Default port
  }
  localStorage.setItem(PC_IP_STORAGE_KEY, cleanIp);
}

export async function testPcConnection(targetIp?: string): Promise<{ success: boolean; message: string; ip?: string; pcName?: string }> {
  const rawIp = (targetIp || getSavedPcIp()).trim();
  if (!rawIp) {
    return { success: false, message: 'يرجى إدخال عنوان IP الخاص بـ كمبيوتر المحل أولاً' };
  }

  // Auto save clean IP
  savePcIp(rawIp);
  const cleanIp = getSavedPcIp();

  const endpoints = ['/api/wifi/status', '/api/status', '/status', '/'];

  for (const endpoint of endpoints) {
    const url = formatPcUrl(cleanIp, endpoint);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({ status: 'ok' }));
        return {
          success: true,
          message: `تم الاتصال بنجاح بـ ${data.pcName || 'كمبيوتر المحل'} (${data.ip || cleanIp})`,
          ip: data.ip || cleanIp,
          pcName: data.pcName || 'كمبيوتر المحل'
        };
      }
    } catch (err: any) {
      // Try next endpoint if any
    }
  }

  return { success: false, message: `تعذر الاتصال بـ ${cleanIp}. تأكد أن الهاتف والكمبيوتر متصلان بنفس شبكة الـ Wi-Fi` };
}

export async function pullProductsFromPcWifi(targetIp?: string): Promise<{ success: boolean; count: number; message: string }> {
  const cleanIp = (targetIp || getSavedPcIp()).trim();
  if (!cleanIp) {
    return { success: false, count: 0, message: 'لم يتم حفظ عنوان IP لكمبيوتر المحل' };
  }

  const endpoints = ['/api/wifi/products', '/api/products', '/products'];

  for (const endpoint of endpoints) {
    const url = formatPcUrl(cleanIp, endpoint);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const importRes = await importFireSaleJSON(text);
        return importRes;
      }
    } catch (err: any) {
      console.warn(`Pull products endpoint ${endpoint} failed:`, err);
    }
  }

  return { success: false, count: 0, message: `فشل سحب الأصناف من الكمبيوتر (${cleanIp})` };
}

export async function sendInvoiceToPcWifi(tx: Transaction, targetIp?: string): Promise<{ success: boolean; message: string }> {
  const cleanIp = (targetIp || getSavedPcIp()).trim();
  if (!cleanIp) {
    return { success: false, message: 'عنوان IP للكمبيوتر غير معرف' };
  }

  const url = formatPcUrl(cleanIp, '/api/wifi/invoice');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });

    if (res.ok) {
      return { success: true, message: 'تم إرسال الفاتورة وتفريغها بنجاح في كمبيوتر المحل' };
    }
    return { success: false, message: 'لم يتم قبول الفاتورة من الكمبيوتر' };
  } catch (err: any) {
    console.warn('Wi-Fi send invoice error:', err);
    return { success: false, message: `تعذر إرسال الفاتورة للكمبيوتر: ${err.message}` };
  }
}

export async function sendItemToPcSalesScreen(product: any, quantity: number = 1, targetIp?: string): Promise<{ success: boolean; message: string }> {
  const cleanIp = (targetIp || getSavedPcIp()).trim();
  if (!cleanIp) {
    return { success: false, message: 'عنوان IP الكمبيوتر غير معرف' };
  }

  const url = formatPcUrl(cleanIp, '/api/wifi/add-item');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, quantity }),
    });

    if (res.ok) {
      return { success: true, message: `تم إرسال (${product.name}) إلى شاشة مبيعات الكمبيوتر!` };
    }
    return { success: false, message: 'لم يستجب كمبيوتر المحل' };
  } catch (err: any) {
    return { success: false, message: `تعذر إرسال الصنف للكمبيوتر: ${err.message}` };
  }
}


