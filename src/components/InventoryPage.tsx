import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, importFireSaleJSON, exportFireSaleJSON, generateId } from '../db';
import { syncProductToCloud, deleteProductFromCloud } from '../firebaseSync';
import { Product } from '../types';
import {
  Package, Search, Plus, Upload, Download, FileJson,
  AlertTriangle, Layers, Tag, CheckCircle2, Trash2, Edit3,
  Camera, X, ChevronDown, BarChart2, Loader2
} from 'lucide-react';

interface InventoryPageProps {
  onOpenQRScanner: () => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ onOpenQRScanner }) => {
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [searchTerm, setSearchTerm]     = useState('');
  const [selCategory, setSelCategory]   = useState('all');
  const [selBrand, setSelBrand]         = useState('all');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting]   = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [editingProd, setEditingProd]   = useState<Product | null>(null);
  const [form, setForm]                 = useState<Partial<Product>>({
    name: '', brand: 'عام', category: 'أدوات صحية',
    price: 0, purchasePrice: 0, stock: 0, barcode: '', minStock: 5, unit: 'قطعة',
  });

  const [displayLimit, setDisplayLimit] = useState(60);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ⚡ Open Import Modal Instantly (0ms latency)
  const openImportModal = () => {
    setImportStatus({ type: null, msg: '' });
    setIsImporting(false);
    setIsImportOpen(true);
  };

  // ⚡ Memoized expensive collection statistics
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category || 'عام'))), [products]);
  const brands     = useMemo(() => Array.from(new Set(products.map(p => p.brand || 'عام'))), [products]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return products.filter(p => (
      (!q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)) || (p.brand && p.brand.toLowerCase().includes(q))) &&
      (selCategory === 'all' || p.category === selCategory) &&
      (selBrand    === 'all' || p.brand    === selBrand)
    ));
  }, [products, searchTerm, selCategory, selBrand]);

  const visibleProducts = useMemo(() => filtered.slice(0, displayLimit), [filtered, displayLimit]);

  const totalProducts = products.length;
  const lowStockCount = useMemo(() => products.filter(p => p.stock <= (p.minStock ?? 5)).length, [products]);
  const totalStockVal = useMemo(() => products.reduce((s, p) => s + p.price * p.stock, 0), [products]);
  const totalSKUs     = useMemo(() => new Set(products.map(p => p.category)).size, [products]);

  /* ── Fast Asynchronous File/Text Import Handlers ─────────────── */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setIsImporting(true);
    setImportStatus({ type: null, msg: '' });

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        // Allow UI to paint loading state first
        setTimeout(async () => {
          const res = await importFireSaleJSON(text);
          setImportStatus({ type: res.success ? 'success' : 'error', msg: res.message });
          setIsImporting(false);
        }, 50);
      } else {
        setIsImporting(false);
      }
    };
    reader.readAsText(f);
  };

  const handleTextImport = () => {
    const textVal = textareaRef.current?.value?.trim() || '';
    if (!textVal) {
      setImportStatus({ type: 'error', msg: 'يرجى إدخال أو لصق نص الـ JSON أولاً' });
      return;
    }
    setIsImporting(true);
    setImportStatus({ type: null, msg: '' });

    setTimeout(async () => {
      const res = await importFireSaleJSON(textVal);
      setImportStatus({ type: res.success ? 'success' : 'error', msg: res.message });
      setIsImporting(false);
    }, 50);
  };



  const handleExport = async () => {
    const json = await exportFireSaleJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `firesale_inventory_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openAdd = () => {
    setEditingProd(null);
    setForm({ name: '', brand: 'عام', category: 'أدوات صحية', price: 0, purchasePrice: 0, stock: 0, barcode: '', minStock: 5, unit: 'قطعة' });
    setIsAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    const p: Product = {
      id: editingProd?.id ?? generateId(),
      name: form.name.trim(),
      brand: form.brand || 'عام',
      category: form.category || 'عام',
      price: Number(form.price || 0),
      purchasePrice: Number(form.purchasePrice || 0),
      stock: Number(form.stock || 0),
      barcode: form.barcode ? String(form.barcode).trim() : '',
      minStock: Number(form.minStock || 5),
      unit: form.unit || 'قطعة',
      updatedAt: new Date().toISOString(),
    };
    await db.products.put(p);
    syncProductToCloud(p);
    setIsAddOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصنف من المخزن؟')) {
      await db.products.delete(id);
      deleteProductFromCloud(id);
    }
  };


  /* ── Render ───────────────────────────────── */
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>

      {/* ── Page Title ───────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package style={{ width: '1.3rem', height: '1.3rem', color: '#818cf8', flexShrink: 0 }} />
          إدارة المخزن واستدعاء JSON
        </h1>
        <p style={{ fontSize: '0.72rem', color: '#475569', margin: '0.3rem 0 0' }}>
          استدعاء بيانات الأصناف من النظام الأصلي بصيغة FireSale JSON، والبحث والفلترة السريعة
        </p>
      </div>

      {/* ── Action Bar ───────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <button className="btn btn-primary" onClick={openImportModal}>
          <FileJson className="w-4 h-4" />
          استدعاء مخزن JSON
        </button>

        <button className="btn btn-ghost" onClick={handleExport}>
          <Download style={{ width: '1rem', height: '1rem', color: '#6ee7b7' }} />
          تصدير JSON
        </button>
        <button className="btn btn-ghost" onClick={onOpenQRScanner} style={{ borderColor: 'rgba(99,102,241,0.25)', color: '#818cf8' }}>
          <Camera className="w-4 h-4" />
          مسح QR
        </button>
        <button className="btn btn-success" onClick={openAdd} style={{ marginRight: 'auto' }}>
          <Plus className="w-4 h-4" />
          صنف جديد
        </button>
      </div>

      {/* ── Stats Row ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: <Layers className="w-5 h-5" />, label: 'إجمالي الأصناف', value: `${totalProducts} صنف`, cls: 'stat-card-indigo', color: '#818cf8' },
          { icon: <AlertTriangle className="w-5 h-5" />, label: 'موشكة على النفاذ', value: `${lowStockCount} صنف`, cls: 'stat-card-amber', color: '#fcd34d' },
          { icon: <Tag className="w-5 h-5" />, label: 'قيمة المخزن الكلية', value: `${totalStockVal.toLocaleString('ar-EG', { minimumFractionDigits: 0 })} ج.م`, cls: 'stat-card-emerald', color: '#6ee7b7' },
          { icon: <BarChart2 className="w-5 h-5" />, label: 'عدد الفئات', value: `${totalSKUs} فئة`, cls: 'stat-card-violet', color: '#c4b5fd' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.cls}`} style={{ animationDelay: `${i * 60}ms` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', flexShrink: 0,
                background: `${s.color}18`, border: `1px solid ${s.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginBottom: '0.15rem' }}>{s.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="glass-strong" style={{ borderRadius: '1rem', padding: '0.9rem 1rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.9rem', height: '0.9rem', color: '#475569', pointerEvents: 'none' }} />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم أو البار كود أو الماركة..."
            className="glass-input"
            style={{ width: '100%', borderRadius: '0.65rem', paddingRight: '2.25rem', paddingLeft: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.78rem' }}
          />
        </div>
        <select value={selCategory} onChange={e => setSelCategory(e.target.value)}
          className="glass-input"
          style={{ borderRadius: '0.65rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem', flex: '0 1 170px', background: 'rgba(6,11,24,0.80)' }}>
          <option value="all">كل الفئات ({categories.length})</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={selBrand} onChange={e => setSelBrand(e.target.value)}
          className="glass-input"
          style={{ borderRadius: '0.65rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem', flex: '0 1 170px', background: 'rgba(6,11,24,0.80)' }}>
          <option value="all">كل الماركات ({brands.length})</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {searchTerm && (
          <button className="btn btn-ghost" onClick={() => setSearchTerm('')} style={{ padding: '0.5rem 0.75rem' }}>
            <X className="w-4 h-4" /> مسح
          </button>
        )}
      </div>

      {/* ── Products Table ───────────────────────── */}
      <div className="glass-strong" style={{ borderRadius: '1.25rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
            {filtered.length} صنف {searchTerm ? `(مطابق للبحث "${searchTerm}")` : ''}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pos-table">
            <thead>
              <tr>
                <th>اسم الصنف والوحدة</th>
                <th>الفئة / الماركة</th>
                <th style={{ textAlign: 'center' }}>البار كود</th>
                <th style={{ textAlign: 'center' }}>سعر البيع</th>
                <th style={{ textAlign: 'center' }}>المخزون</th>
                <th style={{ textAlign: 'left' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
                    <Package style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 0.75rem', color: '#334155' }} />
                    <div style={{ fontSize: '0.8rem' }}>لا توجد أصناف مطابقة</div>
                    <div style={{ fontSize: '0.7rem', color: '#334155', marginTop: '0.25rem' }}>جرب استدعاء بيانات المخزن عبر زر "استدعاء مخزن JSON"</div>
                  </td>
                </tr>
              ) : visibleProducts.map(p => {
                const isLow = p.stock <= (p.minStock ?? 5);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.8rem' }}>{p.name}</div>
                      {p.unit && <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.1rem' }}>{p.unit}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-indigo">{p.category}</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>/ {p.brand}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="font-mono" style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '0.02em' }}>
                        {p.barcode || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#6ee7b7' }}>
                        {p.price.toFixed(2)}
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4ade80', marginRight: '0.2rem' }}>ج.م</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={isLow ? 'badge badge-rose' : 'badge badge-emerald'}>
                        {isLow && <AlertTriangle className="w-3 h-3" />}
                        {p.stock}
                      </span>
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-start' }}>
                        <button
                          onClick={() => { setEditingProd(p); setForm(p); setIsAddOpen(true); }}
                          title="تعديل"
                          style={{ padding: '0.35rem', borderRadius: '0.5rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#818cf8')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          title="حذف"
                          style={{ padding: '0.35rem', borderRadius: '0.5rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#fb7185')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {filtered.length > displayLimit && (
          <div style={{ padding: '0.875rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,11,24,0.40)' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setDisplayLimit(prev => prev + 60)}
              style={{ fontSize: '0.75rem', padding: '0.5rem 1.5rem', borderColor: 'rgba(99,102,241,0.30)', color: '#818cf8' }}
            >
              عرض المزيد (يتم عرض {visibleProducts.length} من أصل {filtered.length} صنف)
            </button>
          </div>
        )}
      </div>


      {/* ══ IMPORT JSON MODAL ══════════════════════ */}
      {isImportOpen && (
        <div className="modal-backdrop">
          <div className="modal-box animate-slide-up" style={{ maxWidth: '560px' }}>
            {/* Header */}
            <div className="section-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="section-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                <FileJson className="w-4 h-4" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.9rem' }}>استدعاء بيانات المخزن (FireSale JSON)</div>
                <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '1px' }}>ارفع ملف JSON أو الصق النص مباشرة</div>
              </div>
              <button onClick={() => { setIsImportOpen(false); setImportStatus({ type: null, msg: '' }); }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.35rem', borderRadius: '0.5rem' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Drop Zone */}
              <div style={{ position: 'relative', border: '2px dashed rgba(99,102,241,0.25)', borderRadius: '0.875rem', padding: '1.75rem', textAlign: 'center', background: 'rgba(99,102,241,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.50)'; e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}>
                <input type="file" accept=".json" onChange={handleFile}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                <Upload style={{ width: '2rem', height: '2rem', color: '#818cf8', margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 700, color: '#c7d2fe', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  اسحب أو اضغط لرفع ملف products.json
                </div>
                <div style={{ fontSize: '0.67rem', color: '#475569' }}>
                  يقبل صيغ FireSale و pos-system-offline JSON
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: '0.67rem', color: '#475569' }}>أو الصق النص مباشرة</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                defaultValue=""
                rows={5}
                className="glass-input font-mono"
                style={{ borderRadius: '0.75rem', padding: '0.75rem', fontSize: '0.72rem', resize: 'vertical', lineHeight: 1.5, width: '100%' }}
                placeholder={'[\n  {"id":"1","name":"محبس 1/2 بوصة","price":120,"stock":50},\n  ...\n]'}
              />


              {/* Status Message */}
              {importStatus.type && (
                <div style={{
                  borderRadius: '0.75rem', padding: '0.75rem 1rem',
                  background: importStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                  border: `1px solid ${importStatus.type === 'success' ? 'rgba(16,185,129,0.22)' : 'rgba(244,63,94,0.22)'}`,
                  color: importStatus.type === 'success' ? '#6ee7b7' : '#fda4af',
                  fontSize: '0.78rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {importStatus.msg}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <button disabled={isImporting} className="btn btn-ghost" onClick={() => { setIsImportOpen(false); setImportStatus({ type: null, msg: '' }); }}>إغلاق</button>
                <button disabled={isImporting} className="btn btn-primary" onClick={handleTextImport}>
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isImporting ? 'جاري التحليل والمقارنة...' : 'تأكيد الاستيراد'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══ ADD / EDIT PRODUCT MODAL ═══════════════ */}
      {isAddOpen && (
        <div className="modal-backdrop">
          <div className="modal-box animate-slide-up" style={{ maxWidth: '500px' }}>
            <div className="section-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="section-icon" style={{ background: 'rgba(16,185,129,0.10)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                <Package className="w-4 h-4" />
              </div>
              <div style={{ flex: 1, fontWeight: 800, color: '#f1f5f9', fontSize: '0.9rem' }}>
                {editingProd ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للمخزن'}
              </div>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>اسم الصنف *</label>
                <input type="text" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: خلاط حوض المحلاوى"
                  className="glass-input" style={{ width: '100%', borderRadius: '0.65rem', padding: '0.55rem 0.85rem', fontSize: '0.82rem' }} />
              </div>

              {/* Category / Brand */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'الفئة', key: 'category', placeholder: 'أدوات صحية' },
                  { label: 'الماركة', key: 'brand', placeholder: 'المحلاوى' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>{f.label}</label>
                    <input type="text" value={(form as any)[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="glass-input" style={{ width: '100%', borderRadius: '0.65rem', padding: '0.55rem 0.85rem', fontSize: '0.78rem' }} />
                  </div>
                ))}
              </div>

              {/* Price / Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>سعر البيع (ج.م) *</label>
                  <input type="number" step="0.01" required value={form.price || 0} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    className="glass-input" style={{ width: '100%', borderRadius: '0.65rem', padding: '0.55rem 0.85rem', fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 800 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>الكمية بالمخزن *</label>
                  <input type="number" required value={form.stock || 0} onChange={e => setForm({ ...form, stock: Number(e.target.value) })}
                    className="glass-input" style={{ width: '100%', borderRadius: '0.65rem', padding: '0.55rem 0.85rem', fontSize: '0.82rem', color: '#a5b4fc', fontWeight: 800 }} />
                </div>
              </div>

              {/* Barcode / Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>البار كود</label>
                  <input type="text" value={form.barcode || ''} onChange={e => setForm({ ...form, barcode: e.target.value })}
                    className="glass-input font-mono" placeholder="امسح أو اكتب" style={{ width: '100%', borderRadius: '0.65rem', padding: '0.55rem 0.85rem', fontSize: '0.75rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>الوحدة</label>
                  <input type="text" value={form.unit || 'قطعة'} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="glass-input" style={{ width: '100%', borderRadius: '0.65rem', padding: '0.55rem 0.85rem', fontSize: '0.78rem' }} />
                </div>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsAddOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-success">
                  <CheckCircle2 className="w-4 h-4" />
                  {editingProd ? 'حفظ التعديلات' : 'إضافة الصنف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
