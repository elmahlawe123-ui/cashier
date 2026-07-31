import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ShoppingBag, Plus, Minus, CheckCircle2, AlertTriangle, X, Tag, Package, Barcode } from 'lucide-react';
import { sendItemToPcSalesScreen } from '../wifiSync';
import { showToast } from './Toast';


interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  scannedCode: string | null;
  onConfirmAdd: (product: Product, quantity: number) => void;
  onAddNewProduct?: (barcode: string) => void;
}

export const ScanAddProductModal: React.FC<Props> = ({
  isOpen,
  onClose,
  product,
  scannedCode,
  onConfirmAdd,
  onAddNewProduct,
}) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const total = product ? product.price * quantity : 0;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-slide-up" style={{ maxWidth: '440px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,11,24,0.60)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '2.2rem', height: '2.2rem', borderRadius: '0.75rem', flexShrink: 0,
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
            }}>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div style={{ fontWeight: 900, color: '#f1f5f9', fontSize: '0.9rem' }}>
                {product ? 'إضافة صنف للفاتورة' : 'نتيجة مسح البار كود'}
              </div>
              {scannedCode && (
                <div style={{ fontSize: '0.65rem', color: '#818cf8', fontFamily: 'monospace', marginTop: '1px' }}>
                  كود: {scannedCode}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.35rem' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {product ? (
            <>
              {/* Product Info Card */}
              <div style={{
                background: 'rgba(17,28,50,0.60)',
                borderRadius: '1rem',
                padding: '1rem',
                border: '1px solid rgba(99,102,241,0.18)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#f1f5f9', lineHeight: 1.3 }}>
                  {product.name}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>

                  <span className="badge badge-indigo">
                    <Tag className="w-2.5 h-2.5" />
                    {product.brand || 'عام'}
                  </span>
                  {product.category && (
                    <span className="badge badge-slate">{product.category}</span>
                  )}
                  {product.barcode && (
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Barcode className="w-3 h-3 text-slate-500" />
                      {product.barcode}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>سعر الوحدة:</span>
                    <span style={{ fontWeight: 900, color: '#6ee7b7', fontSize: '1.1rem' }}>
                      {product.price.toFixed(2)} <span style={{ fontSize: '0.65rem', color: '#4ade80' }}>ج.م</span>
                    </span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>المخزون المتاح:</span>
                    <span className={product.stock <= (product.minStock ?? 5) ? 'badge badge-rose' : 'badge badge-emerald'}>
                      {product.stock} قطعة
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Counter (عدد معين) */}
              <div style={{ background: 'rgba(6,11,24,0.50)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.6rem', textAlign: 'center' }}>
                  حدد الكمية المطلوبة لإضافتها للفاتورة:
                </label>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    style={{
                      width: '2.8rem', height: '2.8rem', borderRadius: '0.75rem',
                      background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)',
                      color: '#fda4af', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="glass-input font-mono"
                    style={{
                      width: '5rem', height: '2.8rem', textAlign: 'center',
                      fontSize: '1.35rem', fontWeight: 900, color: '#fff',
                      borderRadius: '0.75rem', border: '1px solid rgba(99,102,241,0.40)',
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    style={{
                      width: '2.8rem', height: '2.8rem', borderRadius: '0.75rem',
                      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                      color: '#6ee7b7', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Add Presets */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                  {[1, 2, 5, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantity(n)}
                      style={{
                        padding: '0.25rem 0.65rem', borderRadius: '0.5rem',
                        background: quantity === n ? 'rgba(99,102,241,0.20)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${quantity === n ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.07)'}`,
                        color: quantity === n ? '#a5b4fc' : '#64748b',
                        fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Cairo', sans-serif",
                      }}
                    >
                      {n} {n === 1 ? 'قطع' : 'قطع'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Summary Display */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1.1rem', background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.20)', borderRadius: '0.875rem',
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>إجمالي التكلفة للفاتورة:</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#6ee7b7' }}>
                  {total.toFixed(2)} <span style={{ fontSize: '0.65rem', color: '#4ade80' }}>ج.م</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: '0 0 100px' }}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-success"

                  onClick={() => {
                    onConfirmAdd(product, quantity);
                    sendItemToPcSalesScreen(product, quantity).then(res => {
                      if (res.success) {
                        showToast('تم إرسال الصنف للكمبيوتر 💻', `${product.name} (${quantity} قطعة)`, 'success');
                      }
                    });
                    onClose();
                  }}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', padding: '0.65rem' }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  إضافة للفاتورة ({quantity} قطعة)
                </button>
              </div>

            </>
          ) : (
            /* Product Not Found State */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '3.5rem', height: '3.5rem', borderRadius: '1.25rem', margin: '0 auto 1rem',
                background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185',
              }}>
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.95rem', margin: '0 0 0.4rem' }}>
                لم يتم العثور على الصنف بالمخزن
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                الرمز الممسوح <span style={{ color: '#818cf8', fontFamily: 'monospace', fontWeight: 700 }}>{scannedCode}</span> غير مسجل حالياً في قائمة الأصناف.
              </p>

              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
                {onAddNewProduct && scannedCode && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      onClose();
                      onAddNewProduct(scannedCode);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    إضافة صنف جديد بهذا الرمز
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
