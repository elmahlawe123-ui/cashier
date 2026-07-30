import React from 'react';
import QRCode from 'react-qr-code';
import { Transaction } from '../types';
import { X, Printer, CheckCircle2, Store, Phone } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  storeName?: string;
  storePhone?: string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen, onClose, transaction,
  storeName = 'نظام المحلاوى POS',
  storePhone = '01000000000',
}) => {
  if (!isOpen || !transaction) return null;

  const qrData = transaction.qrCodeData || JSON.stringify({
    inv: transaction.invoiceNumber, total: transaction.total, date: transaction.date,
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: '480px', margin: 'auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,11,24,0.60)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 style={{ width: '1.1rem', height: '1.1rem', color: '#6ee7b7' }} />
            <span style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.9rem' }}>
              فاتورة #{transaction.invoiceNumber}
            </span>
            <span className="badge badge-emerald">مكتملة</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => window.print()} className="btn btn-ghost" style={{ padding: '0.35rem 0.8rem', fontSize: '0.7rem' }}>
              <Printer className="w-3.5 h-3.5" />
              طباعة
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.35rem' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div id="printable-invoice" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Store Header */}
          <div style={{ textAlign: 'center', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '3rem', height: '3rem', borderRadius: '1rem', marginBottom: '0.6rem',
              background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.40)',
            }}>
              <Store style={{ width: '1.4rem', height: '1.4rem', color: '#fff' }} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f1f5f9' }}>{storeName}</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <Phone style={{ width: '0.75rem', height: '0.75rem' }} />
              {storePhone}
            </div>
          </div>

          {/* Meta Info Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem',
            background: 'rgba(6,11,24,0.50)', borderRadius: '0.875rem', padding: '0.875rem',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            {[
              { label: 'رقم الفاتورة', value: `#${transaction.invoiceNumber}`, color: '#818cf8' },
              { label: 'التاريخ', value: new Date(transaction.date).toLocaleDateString('ar-EG') },
              { label: 'العميل', value: transaction.customerName || 'عميل نقدي' },
              { label: 'طريقة الدفع', value: transaction.paymentMethod || 'نقدي', color: '#6ee7b7' },
            ].map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: '0.63rem', color: '#475569', marginBottom: '0.15rem', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: m.color || '#e2e8f0' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Items Table */}
          <table className="pos-table" style={{ fontSize: '0.72rem' }}>
            <thead>
              <tr>
                <th>الصنف</th>
                <th style={{ textAlign: 'center' }}>العدد</th>
                <th style={{ textAlign: 'center' }}>السعر</th>
                <th style={{ textAlign: 'left' }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {transaction.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{item.productName}</td>
                  <td style={{ textAlign: 'center', color: '#94a3b8' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'center', color: '#94a3b8' }}>{item.price.toFixed(2)}</td>
                  <td style={{ textAlign: 'left', fontWeight: 800, color: '#6ee7b7' }}>{item.total.toFixed(2)} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
              <span>المجموع الجزئي</span>
              <span>{(transaction.subTotal || transaction.total).toFixed(2)} ج.م</span>
            </div>
            {transaction.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#fda4af' }}>
                <span>الخصم</span>
                <span>- {transaction.discount.toFixed(2)} ج.م</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', marginTop: '0.15rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#94a3b8' }}>الإجمالي الصافي</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#6ee7b7' }}>
                {transaction.total.toFixed(2)}<span style={{ fontSize: '0.65rem', color: '#4ade80', marginRight: '3px' }}>ج.م</span>
              </span>
            </div>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ padding: '0.75rem', background: '#fff', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.20)' }}>
              <QRCode value={qrData} size={100} />
            </div>
            <p style={{ fontSize: '0.65rem', color: '#475569', textAlign: 'center' }}>
              امسح الـ QR لاسترجاع بيانات الفاتورة بصيغة JSON
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-ghost">إغلاق</button>
        </div>
      </div>
    </div>
  );
};
