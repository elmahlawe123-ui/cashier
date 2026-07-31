import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

let toastListener: ((toast: ToastMessage) => void) | null = null;

export const showToast = (title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (toastListener) {
    toastListener({
      id: String(Date.now() + Math.random()),
      type,
      title,
      message,
    });
  }
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListener = (newToast) => {
      setToasts(prev => [...prev.slice(-2), newToast]); // keep max 3 toasts
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 4500);
    };
    return () => {
      toastListener = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '50%',
      transform: 'translateX(50%)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      width: 'calc(100% - 2rem)',
      maxWidth: '420px',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="animate-slide-up"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            borderRadius: '1rem',
            background: t.type === 'success' ? 'rgba(6, 30, 20, 0.96)' : t.type === 'error' ? 'rgba(38, 10, 18, 0.96)' : 'rgba(15, 23, 42, 0.96)',
            border: `1px solid ${t.type === 'success' ? 'rgba(16, 185, 129, 0.40)' : t.type === 'error' ? 'rgba(244, 63, 94, 0.40)' : 'rgba(99, 102, 241, 0.40)'}`,
            boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(16px)',
            color: '#f1f5f9',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          <div style={{
            padding: '0.35rem', borderRadius: '0.6rem', flexShrink: 0, marginTop: '2px',
            background: t.type === 'success' ? 'rgba(16,185,129,0.20)' : t.type === 'error' ? 'rgba(244,63,94,0.20)' : 'rgba(99,102,241,0.20)',
            color: t.type === 'success' ? '#6ee7b7' : t.type === 'error' ? '#fda4af' : '#a5b4fc',
          }}>
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {t.type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {t.type === 'info' && <Info className="w-4 h-4" />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: t.type === 'success' ? '#6ee7b7' : t.type === 'error' ? '#fda4af' : '#f1f5f9' }}>
              {t.title}
            </div>
            {t.message && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>
                {t.message}
              </div>
            )}
          </div>

          <button
            onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
