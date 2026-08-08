import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { sendAuditCountToPc } from '../wifiSync';
import { showToast } from './Toast';
import { Product } from '../types';
import { CameraQRScanner } from './CameraQRScanner';
import {
  ClipboardCheck, Search, Camera, CheckCircle2, AlertTriangle,
  RotateCcw, Send, Plus, Minus, Package, Sparkles, Filter, Volume2
} from 'lucide-react';

interface AuditPageProps {
  onOpenQRScanner: () => void;
}

export const AuditPage: React.FC<AuditPageProps> = ({ onOpenQRScanner }) => {
  const products = useLiveQuery(() => db.products.toArray()) || [];

  // Local state for counted audit quantities: { [productId]: number }
  const [countedMap, setCountedMap] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('mobile_audit_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'audited' | 'discrepancy' | 'pending'>('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Save countedMap to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mobile_audit_counts', JSON.stringify(countedMap));
    } catch {}
  }, [countedMap]);

  // Audio Beep generator
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  /* ── Scan Handler ──────────────────────── */
  const handleScanBarcode = (code: string) => {
    const cleanCode = code.trim();
    const matched = products.find(p => p.barcode === cleanCode || p.id === cleanCode || p.name.includes(cleanCode));

    if (matched) {
      playBeep();
      const currentVal = countedMap[matched.id] ?? 0;
      const newVal = currentVal + 1;
      setCountedMap(prev => ({ ...prev, [matched.id]: newVal }));
      sendAuditCountToPc(matched, newVal);
      showToast(`✅ تم جرد: ${matched.name} (${newVal} قطعة)`);
    } else {
      showToast(`⚠️ صنف غير معروف للباركود: ${cleanCode}`);
    }
  };

  /* ── Update Counted Quantity ───────────── */
  const updateCount = (productId: string, newCount: number) => {
    const val = Math.max(0, newCount);
    setCountedMap(prev => ({ ...prev, [productId]: val }));
    const product = products.find(p => p.id === productId);
    if (product) {
      sendAuditCountToPc(product, val);
    }
  };

  /* ── Stats Calculations ────────────────── */
  const auditedCount = useMemo(() => Object.keys(countedMap).length, [countedMap]);
  const discrepancyCount = useMemo(() => {
    return products.filter(p => {
      const counted = countedMap[p.id];
      return counted !== undefined && counted !== p.stock;
    }).length;
  }, [products, countedMap]);

  /* ── Filtered Products ─────────────────── */
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      const isCounted = countedMap[p.id] !== undefined;
      const isDiscrepancy = isCounted && countedMap[p.id] !== p.stock;

      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeTab === 'audited') return isCounted;
      if (activeTab === 'discrepancy') return isDiscrepancy;
      if (activeTab === 'pending') return !isCounted;
      return true;
    });
  }, [products, countedMap, searchTerm, activeTab]);

  /* ── Send All Audit Counts to PC ───────── */
  const handleSyncAllToPc = async () => {
    const auditedIds = Object.keys(countedMap);
    if (auditedIds.length === 0) {
      showToast('لا توجد أصناف مجرودة لإرسالها للكمبيوتر');
      return;
    }

    setIsSyncingAll(true);
    let successCount = 0;

    for (const id of auditedIds) {
      const product = products.find(p => p.id === id);
      if (product) {
        const res = await sendAuditCountToPc(product, countedMap[id]);
        if (res.success) successCount++;
      }
    }

    setIsSyncingAll(false);
    showToast(`📱 تم إرسال جرد ${successCount} صنف بنجاح لشاشة الكمبيوتر!`);
  };

  /* ── Reset Local Audit Session ─────────── */
  const handleResetAudit = () => {
    if (window.confirm('هل أنت متأكد من تصفية بيانات الجرد الحالية على الموبايل؟')) {
      setCountedMap({});
      localStorage.removeItem('mobile_audit_counts');
      showToast('تم تصفية الجرد المحلي بنجاح');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-purple-900/90 p-4 sm:p-6 rounded-3xl border border-indigo-500/30 shadow-2xl text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black flex items-center gap-2">
                جرد المخزون الميداني بالباركود
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-500/40">
                  مباشر ⚡
                </span>
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">امسح الباركود بالكاميرا لتحديث "الكمية الفعلية" مباشرة على كمبيوتر المحل</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 text-sm transition-all"
            >
              <Camera className="w-5 h-5 animate-pulse" />
              <span>ماسح الباركود 📷</span>
            </button>
            <button
              onClick={handleSyncAllToPc}
              disabled={isSyncingAll || auditedCount === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-emerald-600/30"
              title="إرسال كافة المجرودات للكمبيوتر"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">إرسال للكمبيوتر</span>
            </button>
          </div>
        </div>

        {/* Audit Statistics Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 pt-4 border-t border-white/10 text-center">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
            <p className="text-[10px] text-slate-400 font-bold">إجمالي أصناف المخزن</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-1">{products.length}</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/30">
            <p className="text-[10px] text-emerald-300 font-bold">تم جردها</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{auditedCount}</p>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/30">
            <p className="text-[10px] text-amber-300 font-bold">فروقات (عجز/زيادة)</p>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{discrepancyCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Tabs Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-3 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الصنف أو الباركود..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'audited', label: 'تم جردها' },
            { id: 'discrepancy', label: 'فروقات' },
            { id: 'pending', label: 'لم تجرد' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Products List */}
      <div className="space-y-3">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => {
            const counted = countedMap[product.id];
            const isAudited = counted !== undefined;
            const diff = isAudited ? counted - product.stock : 0;

            return (
              <div
                key={product.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isAudited
                    ? diff === 0
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm truncate">{product.name}</h3>
                      {isAudited && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
                          diff === 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : diff < 0
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {diff === 0 ? 'مطابق' : diff < 0 ? `عجز (${diff})` : `زيادة (+${diff})`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                      <span>الباركود: <strong className="text-slate-200">{product.barcode || 'بدون'}</strong></span>
                      <span>•</span>
                      <span>الماركة: <strong className="text-slate-200">{product.brand || 'عام'}</strong></span>
                    </div>
                  </div>

                  {/* Counted Quantity Control Widget */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">الكمية المسجلة: {product.stock}</span>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => updateCount(product.id, (counted ?? product.stock) - 1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 text-white font-black flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={counted ?? ''}
                        placeholder={String(product.stock)}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          updateCount(product.id, isNaN(val) ? 0 : val);
                        }}
                        className="w-14 bg-slate-900 text-center font-black text-white text-sm py-1 border border-slate-700 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      <button
                        onClick={() => updateCount(product.id, (counted ?? product.stock) + 1)}
                        className="w-8 h-8 rounded-lg bg-slate-800 text-white font-black flex items-center justify-center hover:bg-emerald-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-12 bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">لا توجد أصناف مطابقة للبحث</p>
          </div>
        )}
      </div>

      {/* Floating Camera Scanner Modal */}
      {isScannerOpen && (
        <CameraQRScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScanBarcode}
        />
      )}
    </div>
  );
};
