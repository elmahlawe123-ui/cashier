import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, Keyboard, SwitchCamera } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export const CameraQRScanner: React.FC<Props> = ({
  isOpen, onClose, onScan, title = 'مسح QR / بار كود بالكاميرا',
}) => {
  const [cameras, setCameras]     = useState<{ id: string; label: string }[]>([]);
  const [camId, setCamId]         = useState('');
  const [isScanning, setScanning] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [manual, setManual]       = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) { stop(); return; }
    Html5Qrcode.getCameras()
      .then(list => {
        if (!list.length) { setError('لم يتم العثور على كاميرا متصلة'); return; }
        const mapped = list.map((d, i) => ({ id: d.id, label: d.label || `كاميرا ${i + 1}` }));
        setCameras(mapped);
        const back = list.find(d => /back|rear|خلف/i.test(d.label));
        const id   = back ? back.id : list[list.length - 1].id;
        setCamId(id);
        startScanner(id);
      })
      .catch(() => setError('تعذر الوصول للكاميرا — تأكد من إذن الكاميرا في المتصفح'));
    return () => { stop(); };
  }, [isOpen]);

  const startScanner = async (cameraId: string) => {
    try {
      await stop();
      setError(null);
      const qr = new Html5Qrcode('qr-reader');
      scannerRef.current = qr;
      await qr.start(cameraId, { fps: 15, qrbox: { width: 240, height: 240 } },
        (text) => {
          // beep
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.frequency.value = 1100; g.gain.setValueAtTime(0.08, ctx.currentTime);
            o.start(); o.stop(ctx.currentTime + 0.12);
          } catch {}
          onScan(text); onClose();
        }, () => {});
      setScanning(true);
    } catch {
      setError('فشل تشغيل الكاميرا المحددة — جرب كاميرا أخرى أو أدخل الكود يدوياً');
      setScanning(false);
    }
  };

  const stop = async () => {
    if (scannerRef.current) {
      try { if (isScanning) await scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
      finally { scannerRef.current = null; setScanning(false); }
    }
  };

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manual.trim()) { onScan(manual.trim()); setManual(''); onClose(); }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: '460px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,11,24,0.60)',
        }}>
          <div style={{
            width: '2.2rem', height: '2.2rem', borderRadius: '0.7rem', flexShrink: 0,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
          }}>
            <Camera className="w-4 h-4" style={{ animation: 'pulse 2s infinite' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '0.875rem' }}>{title}</div>
            <div style={{ fontSize: '0.63rem', color: '#64748b', marginTop: '1px' }}>وجه الكاميرا نحو الكود للمسح التلقائي الفوري</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.35rem' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error ? (
            <div style={{
              borderRadius: '0.875rem', padding: '1.25rem', textAlign: 'center',
              background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.22)',
              color: '#fda4af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
            }}>
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <span style={{ fontSize: '0.8rem' }}>{error}</span>
            </div>
          ) : (
            <div style={{
              position: 'relative', borderRadius: '1rem', overflow: 'hidden',
              border: '2px solid rgba(99,102,241,0.30)',
              boxShadow: '0 0 0 4px rgba(99,102,241,0.08), 0 16px 48px rgba(0,0,0,0.40)',
              background: '#000',
              minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Corner decorators */}
              {[
                { top: '0.6rem', right: '0.6rem', borderRight: '2px solid #6366f1', borderTop: '2px solid #6366f1' },
                { top: '0.6rem', left: '0.6rem', borderLeft: '2px solid #6366f1', borderTop: '2px solid #6366f1' },
                { bottom: '0.6rem', right: '0.6rem', borderRight: '2px solid #6366f1', borderBottom: '2px solid #6366f1' },
                { bottom: '0.6rem', left: '0.6rem', borderLeft: '2px solid #6366f1', borderBottom: '2px solid #6366f1' },
              ].map((style, i) => (
                <div key={i} style={{ position: 'absolute', width: '1.2rem', height: '1.2rem', borderRadius: '2px', zIndex: 10, ...style }} />
              ))}
              <div id="qr-reader" style={{ width: '100%' }} />
            </div>
          )}

          {/* Camera Switcher */}
          {cameras.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SwitchCamera style={{ width: '0.9rem', height: '0.9rem', color: '#64748b', flexShrink: 0 }} />
              <select value={camId} onChange={e => { setCamId(e.target.value); startScanner(e.target.value); }}
                className="glass-input"
                style={{ flex: 1, borderRadius: '0.6rem', padding: '0.4rem 0.7rem', fontSize: '0.72rem', background: 'rgba(6,11,24,0.80)' }}>
                {cameras.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          )}

          {/* Manual Input Fallback */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.875rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              أدخل الكود يدوياً إذا تعذرت الكاميرا:
            </label>
            <form onSubmit={handleManual} style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" value={manual} onChange={e => setManual(e.target.value)}
                placeholder="أدخل البار كود أو الـ QR..."
                className="glass-input font-mono"
                style={{ flex: 1, borderRadius: '0.65rem', padding: '0.5rem 0.85rem', fontSize: '0.75rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.72rem' }}>
                إدخال
              </button>
            </form>
          </div>
        </div>

        <div style={{ padding: '0.6rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', fontSize: '0.63rem', color: '#334155' }}>
          يعمل مع جميع هواتف الأندرويد و iOS عبر أي متصفح حديث 📱
        </div>
      </div>
    </div>
  );
};
