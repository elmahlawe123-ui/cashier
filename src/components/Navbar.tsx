import React from 'react';
import { Package, Receipt, Store, Camera, Zap } from 'lucide-react';

interface NavbarProps {
  activeTab: 'inventory' | 'invoices';
  onTabChange: (tab: 'inventory' | 'invoices') => void;
  onOpenQRScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenQRScanner }) => {
  return (
    <header className="sticky top-0 z-40 navbar-glow" style={{ background: 'rgba(6,11,24,0.88)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px]">

          {/* ── Brand ─────────────────────────── */}
          <div className="flex items-center gap-3 min-w-0">
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.20)',
              borderRadius: '0.75rem',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontWeight: 900, fontSize: '1rem', color: '#f1f5f9', lineHeight: 1.2 }}>
                  الكاشير والمخزن
                </span>
                <span className="badge badge-indigo hidden sm:inline-flex">
                  <Zap className="w-2.5 h-2.5" />
                  FireSale POS
                </span>
              </div>
              <p style={{ fontSize: '0.65rem', color: '#475569', lineHeight: 1, marginTop: '2px' }}>
                تابع لنظام pos-system-offline الأصلي
              </p>
            </div>
          </div>

          {/* ── Tab Switcher ──────────────────── */}
          <nav style={{
            display: 'flex',
            gap: '0.25rem',
            background: 'rgba(6,11,24,0.80)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '1rem',
            padding: '0.3rem',
          }}>
            {([
              { id: 'inventory', label: 'المخزن', labelFull: 'صفحة المخزن (JSON)', icon: <Package className="w-3.5 h-3.5" /> },
              { id: 'invoices', label: 'الفواتير', labelFull: 'صفحة الفواتير (QR)', icon: <Receipt className="w-3.5 h-3.5" /> },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={activeTab === tab.id ? {
                  background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.40)',
                  borderRadius: '0.75rem',
                  padding: '0.45rem 0.9rem',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                } : {
                  background: 'transparent',
                  color: '#64748b',
                  borderRadius: '0.75rem',
                  padding: '0.45rem 0.9rem',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.labelFull}</span>
                <span className="sm:hidden">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* ── QR Camera Shortcut ────────────── */}
          <button
            onClick={onOpenQRScanner}
            className="btn btn-ghost animate-pulse-ring"
            style={{ borderColor: 'rgba(99,102,241,0.25)', color: '#818cf8' }}
            title="فتح قارئ الـ QR بكاميرا الهاتف"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden md:inline">QR كاميرا</span>
          </button>

        </div>
      </div>
    </header>
  );
};
