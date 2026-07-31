import { importFireSaleJSON } from './db';
import { Transaction } from './types';

const PC_IP_STORAGE_KEY = 'mahlawy_pc_wifi_ip';

export function getSavedPcIp(): string {
  return localStorage.getItem(PC_IP_STORAGE_KEY) || '';
}

export function savePcIp(ip: string): void {
  let cleanIp = ip.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (cleanIp && !cleanIp.includes(':')) {
    cleanIp += ':4000'; // Default port
  }
  localStorage.setItem(PC_IP_STORAGE_KEY, cleanIp);
}

export async function testPcConnection(targetIp?: string): Promise<{ success: boolean; message: string; ip?: string; pcName?: string }> {
  const ip = (targetIp || getSavedPcIp()).trim();
  if (!ip) {
    return { success: false, message: 'يرجى إدخال عنوان IP الخاص بـ كمبيوتر المحل أولاً' };
  }

  const url = `http://${ip.replace(/^https?:\/\//, '')}/api/wifi/status`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: `تم الاتصال بنجاح بـ ${data.pcName || 'كمبيوتر المحل'} (${data.ip || ip})`,
        ip: data.ip || ip,
        pcName: data.pcName || 'كمبيوتر المحل'
      };
    }
    return { success: false, message: 'فشل الاتصال: الكمبيوتر لم يستجب عبر شبكة الـ Wi-Fi' };
  } catch (err: any) {
    return { success: false, message: `تعذر الاتصال بـ ${ip}. تأكد أن الهاتف والكمبيوتر متصلان بنفس شبكة الـ Wi-Fi` };
  }
}

export async function pullProductsFromPcWifi(targetIp?: string): Promise<{ success: boolean; count: number; message: string }> {
  const ip = (targetIp || getSavedPcIp()).trim();
  if (!ip) {
    return { success: false, count: 0, message: 'لم يتم حفظ عنوان IP لكمبيوتر المحل' };
  }

  const url = `http://${ip.replace(/^https?:\/\//, '')}/api/wifi/products`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: false, count: 0, message: `خطأ من الكمبيوتر (رمز ${res.status})` };
    }

    const text = await res.text();
    const importRes = await importFireSaleJSON(text);
    return importRes;
  } catch (err: any) {
    console.error('Wi-Fi pull products error:', err);
    return { success: false, count: 0, message: `فشل سحب الأصناف من الكمبيوتر: ${err.message}` };
  }
}

export async function sendInvoiceToPcWifi(tx: Transaction, targetIp?: string): Promise<{ success: boolean; message: string }> {
  const ip = (targetIp || getSavedPcIp()).trim();
  if (!ip) {
    return { success: false, message: 'عنوان IP للكمبيوتر غير معرف' };
  }

  const url = `http://${ip.replace(/^https?:\/\//, '')}/api/wifi/invoice`;
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
