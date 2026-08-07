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
  let success = false;

  // 1. Try Local Wi-Fi HTTP Server
  if (cleanIp) {
    const url = formatPcUrl(cleanIp, '/api/wifi/add-item');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, quantity }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        success = true;
      }
    } catch {}
  }

  // 2. Dual Cloud Bridge (Firestore REST API) for Internet/GitHub Pages users
  try {
    const docId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fields = {
      product: { stringValue: JSON.stringify(product) },
      quantity: { integerValue: String(quantity) },
      createdAt: { stringValue: new Date().toISOString() }
    };
    const cloudRes = await fetch(`https://firestore.googleapis.com/v1/projects/al-rawi-6a998/databases/(default)/documents/pending_wifi_items/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (cloudRes.ok) {
      success = true;
    }
  } catch {}

  if (success) {
    return { success: true, message: `تم إرسال (${product.name}) إلى شاشة مبيعات الكمبيوتر!` };
  }

  return { success: false, message: 'تعذر الاتصال ببرنامج الكمبيوتر. يرجى التأكد من تشغيل خادم الربط.' };
}

export interface WifiDiagnosticResult {
  isHttps: boolean;
  cleanIp: string;
  ipValid: boolean;
  pingMs: number | null;
  serverOk: boolean;
  pcName?: string;
  detectedIssue?: string;
  suggestedSolution?: string;
  steps: { title: string; status: 'pass' | 'fail' | 'warn'; detail: string }[];
}

export async function runSmartWifiDiagnostics(targetIp?: string): Promise<WifiDiagnosticResult> {
  const isHttps = window.location.protocol === 'https:';
  const rawIp = (targetIp || getSavedPcIp()).trim();
  const cleanIp = rawIp.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const ipValid = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(cleanIp);

  const steps: { title: string; status: 'pass' | 'fail' | 'warn'; detail: string }[] = [];

  // Step 1: Protocol Security Check
  if (isHttps) {
    steps.push({
      title: 'فحص بروتوكول الصفحة (HTTPS)',
      status: 'warn',
      detail: 'الصفحة مفتوحة بـ HTTPS بينما سيرفر المحل بـ HTTP، يحظر المتصفح الاتصال المحلي بسبب حظر المحتوى المختلط.'
    });
  } else {
    steps.push({
      title: 'فحص بروتوكول الصفحة (HTTP)',
      status: 'pass',
      detail: 'الصفحة تعمل ببروتوكول HTTP المحلي الخالي من حظر المتصفح.'
    });
  }

  // Step 2: IP Format Check
  if (!cleanIp) {
    steps.push({
      title: 'صيغة عنوان IP',
      status: 'fail',
      detail: 'لم يتم إدخال عنوان IP الكمبيوتر.'
    });
    return {
      isHttps, cleanIp, ipValid: false, pingMs: null, serverOk: false,
      detectedIssue: 'عنوان IP فارغ',
      suggestedSolution: 'قم بإدخال عنوان الـ IP أو امسح كود الـ QR من شاشة الكمبيوتر.',
      steps
    };
  }

  if (ipValid) {
    steps.push({
      title: 'صيغة عنوان IP',
      status: 'pass',
      detail: `العنوان (${cleanIp}) مصاغ بشكل قياسي صحيح.`
    });
  } else {
    steps.push({
      title: 'صيغة عنوان IP',
      status: 'warn',
      detail: `العنوان (${cleanIp}) يحتوي على خانات غير مكتملة.`
    });
  }

  // Step 3: Server Ping & Response Audit
  const startTime = Date.now();
  const testUrl = formatPcUrl(cleanIp, '/api/wifi/status');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(testUrl, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json().catch(() => ({ status: 'ok' }));
      steps.push({
        title: 'استجابة سيرفر كمبيوتر المحل',
        status: 'pass',
        detail: `تم الاتصال بنجاح بـ ${data.pcName || 'الكمبيوتر'} في زمن قدره ${duration}ms!`
      });

      return {
        isHttps,
        cleanIp,
        ipValid: true,
        pingMs: duration,
        serverOk: true,
        pcName: data.pcName,
        steps
      };
    } else {
      steps.push({
        title: 'استجابة سيرفر كمبيوتر المحل',
        status: 'fail',
        detail: `الكمبيوتر رد برمز خطأ (HTTP ${res.status}).`
      });

      return {
        isHttps, cleanIp, ipValid, pingMs: duration, serverOk: false,
        detectedIssue: `الكمبيوتر رد برمز HTTP ${res.status}`,
        suggestedSolution: 'تأكد من فتح برنامج Mahlawy POS على الكمبيوتر والتأكد من تفعيل خادم Wi-Fi.',
        steps
      };
    }
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    steps.push({
      title: 'استجابة سيرفر كمبيوتر المحل',
      status: 'fail',
      detail: isTimeout ? 'انتهت مهلة الاتصال (6 ثوانٍ) دون رد من الكمبيوتر.' : `فشل طلب الشبكة (${err.message || 'NetworkError'}).`
    });

    let detectedIssue = 'تعذر الوصول لسيرفر الكمبيوتر عبر الـ Wi-Fi';
    let suggestedSolution = `1. افتح الرابط المباشر السريع من متصفح الموبايل: http://${cleanIp}\n2. إيقاف داتا الموبايل (4G) والتأكد أن الهاتف والكمبيوتر متصلان بنفس الواي فاي.\n3. التأكد من فتح برنامج Mahlawy POS على الكمبيوتر.`;

    if (isHttps) {
      detectedIssue = 'حظر المحتوى المختلط (Mixed Content) من متصفح الجوال بسبب فتح رابط HTTPS الخارجي';
      suggestedSolution = `افتح الرابط المباشر المحلي الخالي من المشاكل: http://${cleanIp} مباشرة من متصفح الجوال بدلاً من رابط HTTPS الخارجي.`;
    }

    return {
      isHttps, cleanIp, ipValid, pingMs: null, serverOk: false,
      detectedIssue, suggestedSolution, steps
    };
  }
}


