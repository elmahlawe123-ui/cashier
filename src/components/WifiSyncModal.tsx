import React, { useState, useEffect } from 'react';
import { getSavedPcIp, savePcIp, testPcConnection, pullProductsFromPcWifi, runSmartWifiDiagnostics, WifiDiagnosticResult } from '../wifiSync';
import { Wifi, RefreshCw, CheckCircle2, AlertTriangle, X, QrCode, Server, Radio, Smartphone, Camera, Stethoscope, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenQRScanner?: () => void;
}

export const WifiSyncModal: React.FC<Props> = ({ isOpen, onClose, onOpenQRScanner }) => {
  const [ip, setIp] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; msg: string }>({ type: null, msg: '' });
  const [isPulling, setIsPulling] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<WifiDiagnosticResult | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    setShowDiagnostics(true);
    const diag = await runSmartWifiDiagnostics(ip);
    setDiagnosticResult(diag);
    setIsDiagnosing(false);
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
      <div className="modal-box animate-slide-up" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,11,24,0.60)', position: 'sticky', top: 0, zIndex: 10
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
                  placeholder="مثال: 192.168.100.3:4000"
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

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {onOpenQRScanner && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    onClose();
                    onOpenQRScanner();
                  }}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem', borderColor: 'rgba(99,102,241,0.25)', color: '#818cf8' }}
                >
                  <Camera className="w-3.5 h-3.5" />
                  مسح QR الربط 📷
                </button>
              )}
              
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleRunDiagnostics}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem', borderColor: 'rgba(245,158,11,0.30)', color: '#fbbf24', background: 'rgba(245,158,11,0.08)' }}
              >
                <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
                تشخيص ذكي للشبكة 🩺
              </button>
            </div>
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

          {/* Smart Diagnostics Panel */}
          {showDiagnostics && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.90)',
              border: '1.5px solid rgba(245, 158, 11, 0.40)',
              borderRadius: '1rem',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 900, fontSize: '0.85rem' }}>
                  <Stethoscope className="w-4 h-4" />
                  <span>لوحة التشخيص الذكي لاتصال الشبكة 🩺</span>
                </div>
                {isDiagnosing && <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />}
              </div>

              {isDiagnosing ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700 }}>
                  <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
                  جاري تشغيل التشخيص الذكي وفحص المنافذ والبروتوكولات...
                </div>
              ) : diagnosticResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Step Status Badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {diagnosticResult.steps.map((step, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                        padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                        background: step.status === 'pass' ? 'rgba(16,185,129,0.08)' : step.status === 'warn' ? 'rgba(245,158,11,0.08)' : 'rgba(244,63,94,0.08)',
                        border: `1px solid ${step.status === 'pass' ? 'rgba(16,185,129,0.2)' : step.status === 'warn' ? 'rgba(245,158,11,0.2)' : 'rgba(244,63,94,0.2)'}`,
                      }}>
                        {step.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                        {step.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                        {step.status === 'fail' && <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.75rem', color: step.status === 'pass' ? '#6ee7b7' : step.status === 'warn' ? '#fcd34d' : '#fda4af' }}>
                            {step.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: '1px', lineHeight: 1.4 }}>
                            {step.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary & Actionable Solution */}
                  {diagnosticResult.suggestedSolution && (
                    <div style={{
                      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
                      borderRadius: '0.75rem', padding: '0.75rem', color: '#fef3c7', fontSize: '0.72rem', fontWeight: 700
                    }}>
                      <div style={{ color: '#fbbf24', fontWeight: 900, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>💡 الحل والعلاج المقترح من التشخيص الذكي:</span>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#fde68a' }}>
                        {diagnosticResult.suggestedSolution}
                      </div>

                      {/* Direct HTTP Link Button if HTTPS issue detected */}
                      {diagnosticResult.isHttps && diagnosticResult.cleanIp && (
                        <a
                          href={`http://${diagnosticResult.cleanIp}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            marginTop: '0.6rem', padding: '0.4rem 0.8rem', borderRadius: '0.5rem',
                            background: '#f59e0b', color: '#000', fontWeight: 900, textDecoration: 'none', fontSize: '0.72rem'
                          }}
                        >
                          <Wifi className="w-3.5 h-3.5" />
                          <span>فتح الرابط المباشر السريع الخالي من الحظر (http://{diagnosticResult.cleanIp}) 🚀</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
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
