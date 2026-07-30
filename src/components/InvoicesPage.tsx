import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../db';
import { syncTransactionToCloud, syncProductToCloud } from '../firebaseSync';
import { Product, Transaction, TransactionItem } from '../types';
import { CameraQRScanner } from './CameraQRScanner';
import { InvoiceModal } from './InvoiceModal';
import {
  Receipt, ShoppingBag, Search, Plus, Minus, Trash2,
  Camera, CheckCircle2, FileText, QrCode, DollarSign,
  CreditCard, Smartphone, Banknote, X, Clock,
} from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'cash',          icon: <Banknote className="w-3.5 h-3.5" />,    label: 'نقدي' },
  { id: 'card',          icon: <CreditCard className="w-3.5 h-3.5" />,  label: 'فيزا' },
  { id: 'vodafone_cash', icon: <Smartphone className="w-3.5 h-3.5" />, label: 'فودافون' },
  { id: 'instapay',      icon: <DollarSign className="w-3.5 h-3.5" />, label: 'إنستا' },
] as const;

export const InvoicesPage: React.FC = () => {
  const products     = useLiveQuery(() => db.products.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) || [];

  const [cart, setCart]                 = useState<TransactionItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount]         = useState(0);
  const [payMethod, setPayMethod]       = useState<typeof PAYMENT_METHODS[number]['id']>('cash');
  const [productSearch, setProductSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode]     = useState<'product' | 'invoice'>('product');
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen]     = useState(false);

  const subTotal   = cart.reduce((s, i) => s + i.total, 0);
  const finalTotal = Math.max(0, subTotal - discount);

  /* ── Cart operations ──────────────────────── */
  const addToCart = (p: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === p.id);
      if (idx > -1) {
        const next = [...prev];
        const qty  = next[idx].quantity + 1;
        next[idx]  = { ...next[idx], quantity: qty, total: qty * next[idx].price };
        return next;
      }
      return [...prev, { productId: p.id, productName: p.name, brand: p.brand, category: p.category, quantity: 1, price: p.price, total: p.price, barcode: p.barcode }];
    });
  };

  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i => {
      if (i.productId !== id) return i;
      const q = i.quantity + delta;
      return q <= 0 ? null! : { ...i, quantity: q, total: q * i.price };
    }).filter(Boolean) as TransactionItem[]);

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.productId !== id));
  const clearCart = () => { setCart([]); setCustomerName(''); setDiscount(0); setPayMethod('cash'); };

  /* ── QR Scan result handler ───────────────── */
  const handleScan = (code: string) => {
    const clean = code.trim();
    if (cameraMode === 'product') {
      const p = products.find(pr => (pr.barcode && pr.barcode.trim() === clean) || pr.id === clean);
      if (p) addToCart(p);
      else alert(`لم يُعثر على صنف بالكود: ${clean}`);
    } else {
      let invNum: string | number = clean;
      try { if (clean.startsWith('{')) { const parsed = JSON.parse(clean); if (parsed.inv) invNum = parsed.inv; } } catch {}
      const t = transactions.find(tx => String(tx.invoiceNumber) === String(invNum) || tx.id === clean);
      if (t) { setSelectedInvoice(t); setIsInvoiceOpen(true); }
      else alert(`لم تُعثر على فاتورة بالكود: ${invNum}`);
    }
  };

  /* ── Checkout ─────────────────────────────── */
  const checkout = async () => {
    if (!cart.length) return;
    const invNum = transactions.length > 0 ? Number(transactions[0].invoiceNumber || 1000) + 1 : 1001;
    const id     = generateId();
    const tx: Transaction = {
      id,
      invoiceNumber: invNum,
      type: 'sale',
      items: cart,
      subTotal,
      discount,
      total: finalTotal,
      paidAmount: finalTotal,
      remainingAmount: 0,
      customerName: customerName.trim() || 'عميل نقدي',
      date: new Date().toISOString(),
      status: 'completed',
      paymentMethod: payMethod,
      qrCodeData: JSON.stringify({ inv: invNum, total: finalTotal, date: new Date().toISOString(), items: cart.length }),
    };
    await db.transaction('rw', db.transactions, db.products, async () => {
      await db.transactions.put(tx);
      for (const item of cart) {
        const prod = await db.products.get(item.productId);
        if (prod) {
          const updatedProd = { ...prod, stock: Math.max(0, prod.stock - item.quantity) };
          await db.products.put(updatedProd);
          syncProductToCloud(updatedProd);
        }
      }
    });
    syncTransactionToCloud(tx);
    setSelectedInvoice(tx);
    setIsInvoiceOpen(true);
    clearCart();
  };


  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)) || (p.brand && p.brand.toLowerCase().includes(q));
  });

  const pickerProducts = filteredProducts.slice(0, 50);

  const filteredTransactions = transactions.filter(t =>
    String(t.invoiceNumber).includes(invoiceSearch) ||
    (t.customerName && t.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()))
  );


  /* ── Render ───────────────────────────────── */
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt style={{ width: '1.3rem', height: '1.3rem', color: '#818cf8', flexShrink: 0 }} />
          نقطة بيع الكاشير (POS)
        </h1>
        <p style={{ fontSize: '0.72rem', color: '#475569', margin: '0.3rem 0 0' }}>
          إنشاء الفواتير واستخدام كاميرا الهاتف لمسح الأصناف والـ QR مباشرة
        </p>
      </div>

      {/* ── POS Grid ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '1.25rem' }}>

          {/* ── CART ─────────────────────────────── */}
          <div className="glass-strong animate-fade-in" style={{ borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Cart Header */}
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(99,102,241,0.10)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.22)' }}>
                <Receipt className="w-4 h-4" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.875rem' }}>الفاتورة الحالية</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                  {cart.length ? `${cart.length} صنف · ${cart.reduce((s, i) => s + i.quantity, 0)} وحدة` : 'السلة فارغة'}
                </div>
              </div>
              <button
                onClick={() => { setCameraMode('product'); setIsCameraOpen(true); }}
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.7rem' }}
              >
                <Camera className="w-3.5 h-3.5" />
                مسح QR 📱
              </button>
            </div>

            {/* Customer Name */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <input
                type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="اسم العميل (اختياري) — عميل نقدي"
                className="glass-input"
                style={{ width: '100%', borderRadius: '0.65rem', padding: '0.5rem 0.85rem', fontSize: '0.78rem' }}
              />
            </div>

            {/* Cart Items */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
              {cart.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#334155' }}>
                  <ShoppingBag style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 0.6rem', color: '#1e293b' }} />
                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>اختر أصناف من القائمة أو امسح الـ QR بالكاميرا</div>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="cart-row">
                    <div>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.78rem' }}>{item.productName}</div>
                      <div style={{ fontSize: '0.63rem', color: '#64748b' }}>{item.price.toFixed(2)} ج.م / وحدة</div>
                    </div>
                    {/* Qty control */}
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => updateQty(item.productId, -1)}>−</button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.productId, +1)}>+</button>
                    </div>
                    <div style={{ fontWeight: 800, color: '#6ee7b7', fontSize: '0.82rem', minWidth: '70px', textAlign: 'center' }}>
                      {item.total.toFixed(2)}<span style={{ fontSize: '0.6rem', marginRight: '2px', color: '#4ade80' }}>ج.م</span>
                    </div>
                    <button onClick={() => removeFromCart(item.productId)}
                      style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.2rem' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fb7185')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* ── Payment & Totals ─────────────────── */}
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

              {/* Discount */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, flexShrink: 0 }}>خصم (ج.م):</label>
                <input
                  type="number" min="0" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))}
                  className="glass-input"
                  placeholder="0"
                  style={{ borderRadius: '0.55rem', padding: '0.4rem 0.65rem', fontSize: '0.78rem', color: '#fda4af', fontWeight: 700, flex: 1, maxWidth: '120px' }}
                />
              </div>

              {/* Payment Method Tabs */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPayMethod(m.id)}
                    className={`pay-method-btn ${payMethod === m.id ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', flexDirection: 'column', padding: '0.45rem 0.3rem' }}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Total Display */}
              <div className="total-display">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>المجموع الجزئي:</span>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{subTotal.toFixed(2)} ج.م</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>الخصم:</span>
                    <span style={{ fontSize: '0.78rem', color: '#fda4af' }}>- {discount.toFixed(2)} ج.م</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(16,185,129,0.15)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>الإجمالي الصافي:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6ee7b7', lineHeight: 1 }}>
                    {finalTotal.toFixed(2)}<span style={{ fontSize: '0.65rem', color: '#4ade80', marginRight: '3px' }}>ج.م</span>
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                disabled={cart.length === 0}
                onClick={checkout}
                className="btn btn-success"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.875rem', borderRadius: '0.875rem' }}
              >
                <CheckCircle2 className="w-5 h-5" />
                إصدار الفاتورة وتوليد الـ QR
              </button>
            </div>
          </div>

          {/* ── PRODUCT QUICK PICKER ─────────────── */}
          <div className="glass-strong" style={{ borderRadius: '1.25rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(16,185,129,0.10)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.22)' }}>
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.875rem' }}>اختيار الأصناف</div>
            </div>

            <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
              <Search style={{ position: 'absolute', right: '1.4rem', top: '50%', transform: 'translateY(-50%)', width: '0.85rem', height: '0.85rem', color: '#475569', pointerEvents: 'none' }} />
              <input
                type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="بحث سريع..."
                className="glass-input"
                style={{ width: '100%', borderRadius: '0.65rem', paddingRight: '2.1rem', paddingLeft: '0.75rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.75rem' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '430px' }}>
              {pickerProducts.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#475569', fontSize: '0.75rem' }}>
                  لا توجد أصناف مطابقة.
                </div>
              ) : pickerProducts.map(p => {

                const isLow = p.stock <= (p.minStock ?? 5);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      background: 'rgba(17,28,50,0.55)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '0.75rem',
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'all 0.18s ease',
                      width: '100%',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.40)';
                      e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.background = 'rgba(17,28,50,0.55)';
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '0.55rem', flexShrink: 0,
                      background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', color: '#818cf8', fontWeight: 800,
                    }}>
                      +
                    </div>

                    {/* Name + Brand */}
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.78rem', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.63rem', color: '#818cf8', background: 'rgba(99,102,241,0.10)', borderRadius: '0.35rem', padding: '0.1rem 0.4rem', fontWeight: 700 }}>
                          {p.brand || 'عام'}
                        </span>
                        {p.category && (
                          <span style={{ fontSize: '0.6rem', color: '#475569' }}>{p.category}</span>
                        )}
                      </div>
                    </div>

                    {/* Price + Stock */}
                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, color: '#6ee7b7', fontSize: '0.9rem', lineHeight: 1 }}>
                        {p.price.toFixed(2)}
                        <span style={{ fontSize: '0.58rem', color: '#4ade80', marginRight: '2px' }}>ج.م</span>
                      </div>
                      <div style={{
                        fontSize: '0.6rem', marginTop: '0.2rem', fontWeight: 700, textAlign: 'center',
                        color: isLow ? '#fda4af' : '#64748b',
                        background: isLow ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.05)',
                        borderRadius: '0.35rem', padding: '0.1rem 0.35rem',
                      }}>
                        {p.stock}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Invoice History ───────────────────────── */}
      <div className="glass-strong" style={{ borderRadius: '1.25rem', overflow: 'hidden' }}>
        <div className="section-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="section-icon" style={{ background: 'rgba(245,158,11,0.10)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.22)' }}>
            <Clock className="w-4 h-4" />
          </div>
          <div style={{ flex: 1, fontWeight: 800, color: '#f1f5f9', fontSize: '0.875rem' }}>سجل الفواتير الصادرة</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => { setCameraMode('invoice'); setIsCameraOpen(true); }}
              className="btn btn-ghost"
              style={{ fontSize: '0.7rem', padding: '0.35rem 0.75rem', borderColor: 'rgba(99,102,241,0.25)', color: '#818cf8' }}
            >
              <QrCode className="w-3.5 h-3.5" />
              مسح QR فاتورة
            </button>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', width: '0.8rem', height: '0.8rem', color: '#475569', pointerEvents: 'none' }} />
              <input type="text" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)}
                placeholder="رقم أو عميل..."
                className="glass-input"
                style={{ borderRadius: '0.6rem', paddingRight: '2rem', paddingLeft: '0.65rem', paddingTop: '0.38rem', paddingBottom: '0.38rem', fontSize: '0.72rem', width: '160px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pos-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>التاريخ</th>
                <th style={{ textAlign: 'center' }}>الدفع</th>
                <th style={{ textAlign: 'center' }}>الأصناف</th>
                <th style={{ textAlign: 'center' }}>الإجمالي</th>
                <th style={{ textAlign: 'left' }}>عرض</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#475569' }}>
                    <FileText style={{ width: '2rem', height: '2rem', margin: '0 auto 0.5rem', color: '#1e293b' }} />
                    لا توجد فواتير صادرة بعد
                  </td>
                </tr>
              ) : filteredTransactions.slice(0, 20).map(t => (
                <tr key={t.id}>
                  <td>
                    <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.82rem' }}>#{t.invoiceNumber}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{t.customerName || 'عميل نقدي'}</td>
                  <td style={{ color: '#64748b', fontSize: '0.72rem' }}>{new Date(t.date).toLocaleString('ar-EG')}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-slate">{t.paymentMethod || 'cash'}</span>
                  </td>
                  <td style={{ textAlign: 'center', color: '#94a3b8' }}>{t.items.length}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#6ee7b7', fontSize: '0.875rem' }}>
                    {t.total.toFixed(2)} <span style={{ fontSize: '0.6rem', color: '#4ade80' }}>ج.م</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <button
                      onClick={() => { setSelectedInvoice(t); setIsInvoiceOpen(true); }}
                      className="btn btn-ghost"
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.68rem', borderColor: 'rgba(99,102,241,0.20)', color: '#818cf8' }}
                    >
                      <QrCode className="w-3 h-3" />
                      QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Camera Modal ──────────────────────────── */}
      <CameraQRScanner
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={handleScan}
        title={cameraMode === 'product' ? 'مسح QR / بار كود الصنف بكاميرا الهاتف' : 'مسح QR الفاتورة'}
      />

      {/* ── Invoice Modal ──────────────────────────── */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        transaction={selectedInvoice}
      />
    </div>
  );
};
