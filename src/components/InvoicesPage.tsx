import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../db';
import { syncTransactionToCloud, syncProductToCloud } from '../firebaseSync';
import { Product, Transaction, TransactionItem } from '../types';
import { CameraQRScanner } from './CameraQRScanner';
import { InvoiceModal } from './InvoiceModal';
import { ScanAddProductModal } from './ScanAddProductModal';
import {
  Receipt, Search, Trash2, Camera, CheckCircle2, FileText, QrCode, DollarSign,
  CreditCard, Smartphone, Banknote, X, Clock, Plus, User, ShoppingBag
} from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'cash',          icon: <Banknote className="w-4 h-4" />,    label: 'نقدي' },
  { id: 'card',          icon: <CreditCard className="w-4 h-4" />,  label: 'فيزا' },
  { id: 'vodafone_cash', icon: <Smartphone className="w-4 h-4" />, label: 'فودافون' },
  { id: 'instapay',      icon: <DollarSign className="w-4 h-4" />, label: 'إنستا' },
] as const;

interface InvoicesPageProps {
  cameraTrigger?: number;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ cameraTrigger }) => {
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

  // ⚡ Scanned Product Modal State
  const [scanModal, setScanModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    scannedCode: string | null;
  }>({ isOpen: false, product: null, scannedCode: null });

  // Handle Navbar Camera Trigger
  useEffect(() => {
    if (cameraTrigger && cameraTrigger > 0) {
      setCameraMode('product');
      setIsCameraOpen(true);
    }
  }, [cameraTrigger]);

  const subTotal   = cart.reduce((s, i) => s + i.total, 0);
  const finalTotal = Math.max(0, subTotal - discount);

  /* ── Cart operations ──────────────────────── */
  const addToCart = (p: Product, qtyToAdd: number = 1) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === p.id);
      if (idx > -1) {
        const next = [...prev];
        const newQty = next[idx].quantity + qtyToAdd;
        next[idx] = { ...next[idx], quantity: newQty, total: newQty * next[idx].price };
        return next;
      }
      return [...prev, {
        productId: p.id,
        productName: p.name,
        brand: p.brand,
        category: p.category,
        quantity: qtyToAdd,
        price: p.price,
        total: p.price * qtyToAdd,
        barcode: p.barcode
      }];
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
      setScanModal({
        isOpen: true,
        product: p || null,
        scannedCode: clean,
      });
    } else {
      let invNum: string | number = clean;
      try { if (clean.startsWith('{')) { const parsed = JSON.parse(clean); if (parsed.inv) invNum = parsed.inv; } } catch {}
      const t = transactions.find(tx => String(tx.invoiceNumber) === String(invNum) || tx.id === clean);
      if (t) {
        setSelectedInvoice(t);
        setIsInvoiceOpen(true);
      } else {
        setScanModal({
          isOpen: true,
          product: null,
          scannedCode: `فاتورة #${invNum}`,
        });
      }
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
    const q = productSearch.toLowerCase().trim();
    return q && (p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)) || (p.brand && p.brand.toLowerCase().includes(q)));
  });

  const searchResults = filteredProducts.slice(0, 30);

  const filteredTransactions = transactions.filter(t =>
    String(t.invoiceNumber).includes(invoiceSearch) ||
    (t.customerName && t.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>

      {/* ── Page Header ─────────────────────────── */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Receipt style={{ width: '1.2rem', height: '1.2rem', color: '#818cf8' }} />
            نقطة بيع الكاشير
          </h1>
          <p style={{ fontSize: '0.68rem', color: '#64748b', margin: '0.15rem 0 0' }}>
            واجهة سريعة مناسبة للهواتف لمسح الأصناف وإنشاء الفواتير
          </p>
        </div>

        <button
          onClick={() => { setCameraMode('product'); setIsCameraOpen(true); }}
          className="btn btn-primary animate-pulse-ring"
          style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', borderRadius: '0.75rem' }}
        >
          <Camera className="w-4 h-4" />
          <span>مسح QR 📱</span>
        </button>
      </div>

      {/* ── MAIN MOBILE-FIRST CART CONTAINER ───── */}
      <div className="glass-strong animate-fade-in" style={{ borderRadius: '1.25rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
        
        {/* Cart Header */}
        <div className="section-header" style={{ background: 'rgba(6,11,24,0.60)', padding: '0.85rem 1rem' }}>
          <div className="section-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Receipt className="w-4 h-4" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, color: '#f1f5f9', fontSize: '0.9rem' }}>الفاتورة الحالية</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
              {cart.length ? `${cart.length} صنف · ${cart.reduce((s, i) => s + i.quantity, 0)} قطعة` : 'السلة فارغة'}
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="btn btn-danger" style={{ padding: '0.3rem 0.65rem', fontSize: '0.65rem' }}>
              تفريغ السلة
            </button>
          )}
        </div>

        {/* 🔍 Mobile Instant Product Search Bar */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', background: 'rgba(13,21,40,0.40)' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', width: '0.95rem', height: '0.95rem', color: '#818cf8', pointerEvents: 'none' }} />
            <input
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="🔍 اكتب اسم الصنف أو الماركة أو البار كود..."
              className="glass-input"
              style={{ width: '100%', borderRadius: '0.75rem', paddingRight: '2.4rem', paddingLeft: '2rem', paddingTop: '0.65rem', paddingBottom: '0.65rem', fontSize: '0.82rem', fontWeight: 600 }}
            />
            {productSearch && (
              <button
                onClick={() => setProductSearch('')}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ⚡ Dropdown Search Results Overlay */}
          {productSearch.trim() && (
            <div className="glass-strong animate-slide-up" style={{
              position: 'absolute', top: '100%', right: '1rem', left: '1rem', zIndex: 40,
              borderRadius: '1rem', maxHeight: '300px', overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.3)',
              background: 'rgba(10,16,32,0.97)', padding: '0.5rem',
            }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                  لا يوجد صنف مطابق لـ "{productSearch}"
                </div>
              ) : (
                searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setScanModal({ isOpen: true, product: p, scannedCode: p.barcode || p.id });
                      setProductSearch('');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                      color: '#f1f5f9', cursor: 'pointer', textAlign: 'right', transition: 'all 0.15s ease',
                      marginBottom: '0.35rem',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.15)';
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#f1f5f9' }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.63rem', color: '#818cf8', background: 'rgba(99,102,241,0.12)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem', fontWeight: 700 }}>
                          {p.brand}
                        </span>
                        <span style={{ fontSize: '0.63rem', color: '#64748b' }}>{p.category}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 900, color: '#6ee7b7', fontSize: '0.9rem' }}>
                        {p.price.toFixed(2)} <span style={{ fontSize: '0.6rem', color: '#4ade80' }}>ج.م</span>
                      </div>
                      <div style={{ fontSize: '0.6rem', color: p.stock <= (p.minStock ?? 5) ? '#fda4af' : '#64748b', fontWeight: 700 }}>
                        {p.stock} متبقي
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Customer Input */}
        <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,11,24,0.30)' }}>
          <div style={{ position: 'relative' }}>
            <User style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.8rem', height: '0.8rem', color: '#475569', pointerEvents: 'none' }} />
            <input
              type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="اسم العميل (اختياري) — عميل نقدي"
              className="glass-input"
              style={{ width: '100%', borderRadius: '0.65rem', paddingRight: '2.1rem', paddingLeft: '0.75rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.75rem' }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '160px', maxHeight: '340px' }}>
          {cart.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#334155' }}>
              <ShoppingBag style={{ width: '3rem', height: '3rem', margin: '0 auto 0.75rem', color: '#1e293b' }} />
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>السلة فارغة</div>
              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.25rem' }}>
                ابحث عن صنف بالأعلى أو امسح الـ QR بكاميرا الهاتف 📱
              </div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="cart-row" style={{ padding: '0.85rem 1rem' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.82rem' }}>{item.productName}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.1rem' }}>
                    {item.price.toFixed(2)} ج.م × {item.quantity}
                  </div>
                </div>

                {/* Touch Qty Controls */}
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => updateQty(item.productId, -1)} style={{ padding: '0.4rem 0.75rem' }}>−</button>
                  <span className="qty-value" style={{ padding: '0.4rem 0.75rem' }}>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.productId, +1)} style={{ padding: '0.4rem 0.75rem' }}>+</button>
                </div>

                {/* Total Item Price */}
                <div style={{ fontWeight: 900, color: '#6ee7b7', fontSize: '0.9rem', minWidth: '70px', textAlign: 'center' }}>
                  {item.total.toFixed(2)}<span style={{ fontSize: '0.6rem', marginRight: '2px', color: '#4ade80' }}>ج.م</span>
                </div>

                {/* Remove Item */}
                <button
                  onClick={() => removeFromCart(item.productId)}
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.18)', color: '#fda4af', cursor: 'pointer', padding: '0.4rem', borderRadius: '0.5rem' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Payment & Totals Section ─────────────────── */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,11,24,0.70)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

          {/* Discount */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>خصم إضافي (ج.م):</label>
            <input
              type="number" min="0" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))}
              className="glass-input"
              placeholder="0"
              style={{ borderRadius: '0.6rem', padding: '0.45rem 0.75rem', fontSize: '0.82rem', color: '#fda4af', fontWeight: 800, flex: 1 }}
            />
          </div>

          {/* Payment Method Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                className={`pay-method-btn ${payMethod === m.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', flexDirection: 'column', padding: '0.5rem 0.2rem', borderRadius: '0.65rem' }}
              >
                {m.icon}
                <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Total Display Box */}
          <div className="total-display">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>المجموع الجزئي:</span>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>{subTotal.toFixed(2)} ج.م</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>الخصم:</span>
                <span style={{ fontSize: '0.82rem', color: '#fda4af', fontWeight: 700 }}>- {discount.toFixed(2)} ج.م</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(16,185,129,0.18)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9' }}>الإجمالي الصافي:</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#6ee7b7', lineHeight: 1 }}>
                {finalTotal.toFixed(2)}<span style={{ fontSize: '0.7rem', color: '#4ade80', marginRight: '3px' }}>ج.م</span>
              </span>
            </div>
          </div>

          {/* Big Checkout Button */}
          <button
            disabled={cart.length === 0}
            onClick={checkout}
            className="btn btn-success animate-pulse-ring"
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem', borderRadius: '0.875rem' }}
          >
            <CheckCircle2 className="w-5 h-5" />
            حفظ وإصدار الفاتورة 🧾
          </button>
        </div>
      </div>

      {/* ── INVOICE HISTORY ───────────────────────── */}
      <div className="glass-strong" style={{ borderRadius: '1.25rem', overflow: 'hidden' }}>
        <div className="section-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.85rem 1rem' }}>
          <div className="section-icon" style={{ background: 'rgba(245,158,11,0.10)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.22)' }}>
            <Clock className="w-4 h-4" />
          </div>
          <div style={{ flex: 1, fontWeight: 900, color: '#f1f5f9', fontSize: '0.875rem' }}>سجل الفواتير الصادرة</div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              onClick={() => { setCameraMode('invoice'); setIsCameraOpen(true); }}
              className="btn btn-ghost"
              style={{ fontSize: '0.68rem', padding: '0.35rem 0.65rem', borderColor: 'rgba(99,102,241,0.25)', color: '#818cf8' }}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مسح QR</span>
            </button>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', width: '0.75rem', height: '0.75rem', color: '#475569', pointerEvents: 'none' }} />
              <input type="text" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)}
                placeholder="رقم الفاتورة..."
                className="glass-input"
                style={{ borderRadius: '0.55rem', paddingRight: '1.8rem', paddingLeft: '0.5rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.7rem', width: '130px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pos-table">
            <thead>
              <tr>
                <th>الفاتورة</th>
                <th>العميل</th>
                <th>التاريخ</th>
                <th style={{ textAlign: 'center' }}>الدفع</th>
                <th style={{ textAlign: 'center' }}>الإجمالي</th>
                <th style={{ textAlign: 'left' }}>عرض</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#475569' }}>
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
                  <td style={{ color: '#64748b', fontSize: '0.7rem' }}>{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-slate">{t.paymentMethod || 'cash'}</span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#6ee7b7', fontSize: '0.875rem' }}>
                    {t.total.toFixed(2)} <span style={{ fontSize: '0.6rem', color: '#4ade80' }}>ج.م</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <button
                      onClick={() => { setSelectedInvoice(t); setIsInvoiceOpen(true); }}
                      className="btn btn-ghost"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.68rem', borderColor: 'rgba(99,102,241,0.20)', color: '#818cf8' }}
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

      {/* ── 📱 Custom Scanned Add Product Modal (مع اختيار العدد وإظهار تفاصيل الصنف) ───── */}
      <ScanAddProductModal
        isOpen={scanModal.isOpen}
        onClose={() => setScanModal({ ...scanModal, isOpen: false })}
        product={scanModal.product}
        scannedCode={scanModal.scannedCode}
        onConfirmAdd={(prod, qty) => addToCart(prod, qty)}
      />
    </div>
  );
};
