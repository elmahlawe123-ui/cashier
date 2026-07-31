import React from 'react';
import { Package, Receipt, Store, Camera, Zap, Wifi } from 'lucide-react';

interface NavbarProps {
  activeTab: 'inventory' | 'invoices';
  onTabChange: (tab: 'inventory' | 'invoices') => void;
  onOpenQRScanner: () => void;
  onOpenWifiSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenQRScanner, onOpenWifiSync }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-indigo-500/20 shadow-xl" style={{ background: 'rgba(6,11,24,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[56px] sm:h-[64px] gap-2">

          {/* ── Brand ─────────────────────────── */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
              borderRadius: '0.65rem',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#f1f5f9', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  الكاشير
                </span>
                <span className="badge badge-indigo hidden md:inline-flex" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                  <Zap className="w-2.5 h-2.5" />
                  FireSale POS
                </span>
              </div>
              <p className="hidden sm:block" style={{ fontSize: '0.6rem', color: '#64748b', lineHeight: 1, marginTop: '2px', whiteSpace: 'nowrap' }}>
                تابع لنظام POS الأوفلاين
              </p>
            </div>
          </div>

          {/* ── Tab Switcher ──────────────────── */}
          <nav style={{
            display: 'flex',
            gap: '0.2rem',
            background: 'rgba(13,21,40,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.75rem',
            padding: '0.2rem',
            flexShrink: 0,
          }}>
            {([
              { id: 'invoices', label: 'الفواتير', labelFull: 'الفواتير (POS)', icon: <Receipt className="w-3.5 h-3.5" /> },
              { id: 'inventory', label: 'المخزن', labelFull: 'المخزن (JSON)', icon: <Package className="w-3.5 h-3.5" /> },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={activeTab === tab.id ? {
                  background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 10px rgba(99,102,241,0.40)',
                  borderRadius: '0.6rem',
                  padding: '0.35rem 0.7rem',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontFamily: "'Cairo', sans-serif",
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                } : {
                  background: 'transparent',
                  color: '#64748b',
                  borderRadius: '0.6rem',
                  padding: '0.35rem 0.7rem',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
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

          {/* ── Action Buttons ────────────── */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {onOpenWifiSync && (
              <button
                onClick={onOpenWifiSync}
                className="btn btn-ghost"
                style={{
                  padding: '0.35rem 0.6rem',
                  borderColor: 'rgba(16,185,129,0.30)',
                  color: '#6ee7b7',
                  fontSize: '0.7rem',
                  borderRadius: '0.6rem',
                  flexShrink: 0,
                }}
                title="ربط Wi-Fi مع كمبيوتر المحل"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ربط Wi-Fi</span>
              </button>
            )}

            <button
              onClick={onOpenQRScanner}
              className="btn btn-ghost"
              style={{
                padding: '0.35rem 0.6rem',
                borderColor: 'rgba(99,102,241,0.30)',
                color: '#818cf8',
                fontSize: '0.7rem',
                borderRadius: '0.6rem',
                flexShrink: 0,
              }}
              title="فتح كاميرا الـ QR"
            >
              <Camera className="w-4 h-4 animate-pulse" />
              <span className="hidden md:inline">مسح QR</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
