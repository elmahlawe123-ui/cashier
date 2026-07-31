import React, { useState, useEffect } from 'react';
import { getSavedPcIp, savePcIp, testPcConnection, pullProductsFromPcWifi } from '../wifiSync';
import { Wifi, RefreshCw, CheckCircle2, AlertTriangle, X, QrCode, Server, Radio, Smartphone, Camera } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenQRScanner?: () => void;
}

export const WifiSyncModal: React.FC<Props> = ({ isOpen, onClose, onOpenQRScanner }) => {
  const [ip, setIp] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; msg: string }>({ type: null, msg: '' });
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedPcIp();
      setIp(saved);
      if (saved) {
        handleTestConnection(saved);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    if (!ip.trim()) {
      setStatus({ type: 'error', msg: 'يرجى إدخال عنوان IP الخاص بالكمبيوتر' });
      return;
    }
    savePcIp(ip);
    await handleTestConnection(ip);
  };

  const handleTestConnection = async (targetIp: string) => {
    setStatus({ type: 'loading', msg: 'جاري جرب الاتصال عبر شبكة الـ Wi-Fi...' });
    const res = await testPcConnection(targetIp);
    setStatus({
      type: res.success ? 'success' : 'error',
      msg: res.message
    });
  };

  const handlePullProducts = async () => {
    setIsPulling(true);
    setStatus({ type: 'loading', msg: 'جاري سحب واستدعاء الأصناف من كمبيوتر المحل...' });
    const res = await pullProductsFromPcWifi(ip);
    setStatus({
      type: res.success ? 'success' : 'error',
      msg: res.message
    });
    setIsPulling(false);
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-slide-up" style={{ maxWidth: '480px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,11,24,0.60)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '2.2rem', height: '2.2rem', borderRadius: '0.75rem', flexShrink: 0,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ee7b7',
            }}>
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div style={{ fontWeight: 900, color: '#f1f5f9', fontSize: '0.9rem' }}>
                ربط الهاتف بـ كمبيوتر المحل (Wi-Fi 📶)
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '1px' }}>
                مزامنة الأصناف والفواتير بدون إنترنت عبر الشبكة المحلية
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.35rem' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* PC IP Input & Test */}
          <div style={{ background: 'rgba(17,28,50,0.50)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.5rem' }}>
              عنوان IP كمبيوتر المحل (Wi-Fi):
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Server style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '0.9rem', height: '0.9rem', color: '#818cf8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={ip}
                  onChange={e => setIp(e.target.value)}
                  placeholder="مثال: 192.168.1.105:4000"
                  className="glass-input font-mono"
                  style={{ width: '100%', borderRadius: '0.65rem', paddingRight: '2.2rem', paddingLeft: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.82rem', fontWeight: 700 }}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAndTest}
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.75rem', flexShrink: 0 }}
              >
                اختبار الاتصال 🔌
              </button>
            </div>

            {onOpenQRScanner && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  onClose();
                  onOpenQRScanner();
                }}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', borderColor: 'rgba(99,102,241,0.25)', color: '#818cf8' }}
              >
                <Camera className="w-3.5 h-3.5" />
                مسح QR الربط المطبوع على شاشة الكمبيوتر 📷
              </button>
            )}
          </div>

          {/* Status Alert Banner */}
          {status.type && (
            <div style={{
              borderRadius: '0.75rem', padding: '0.75rem 1rem',
              background: status.type === 'success' ? 'rgba(16,185,129,0.08)' : status.type === 'loading' ? 'rgba(99,102,241,0.08)' : 'rgba(244,63,94,0.08)',
              border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.22)' : status.type === 'loading' ? 'rgba(99,102,241,0.22)' : 'rgba(244,63,94,0.22)'}`,
              color: status.type === 'success' ? '#6ee7b7' : status.type === 'loading' ? '#a5b4fc' : '#fda4af',
              fontSize: '0.78rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              {status.type === 'loading' && <Radio className="w-4 h-4 animate-pulse" />}
              {status.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {status.type === 'error' && <AlertTriangle className="w-4 h-4" />}
              <span>{status.msg}</span>
            </div>
          )}

          {/* Pull Products Button */}
          <button
            type="button"
            disabled={isPulling || status.type !== 'success'}
            className="btn btn-success"
            onClick={handlePullProducts}
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.85rem', borderRadius: '0.75rem' }}
          >
            <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
            سحب واستدعاء الأصناف من الكمبيوتر الآن 🔄
          </button>

          {/* Help Info Box */}
          <div style={{ background: 'rgba(6,11,24,0.40)', borderRadius: '0.75rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.68rem', color: '#64748b', lineHeight: 1.5 }}>
            💡 <strong style={{ color: '#94a3b8' }}>ملاحظة هامة:</strong> يجب أن يكون الهاتف وجهاز الكمبيوتر متصلين بنفس شبكة الـ Wi-Fi في المحل لتتم المزامنة بدون إنترنت.
          </div>

        </div>

      </div>
    </div>
  );
};
