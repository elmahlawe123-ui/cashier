import React, { useState, useEffect, useRef } from 'react';
import { Shield, Eye, EyeOff, Lock, CheckCircle2, AlertTriangle, Store, Zap } from 'lucide-react';

const CORRECT_PIN = '7324';
const STORAGE_KEY = 'cashier_pin_auth';
const REMEMBER_KEY = 'cashier_remember_me';
const SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 ساعات

interface PinAuthProps {
  onAuthenticated: () => void;
}

export const PinAuth: React.FC<PinAuthProps> = ({ onAuthenticated }) => {
  const [pin, setPin]           = useState<string[]>(['', '', '', '']);
  const [showPin, setShowPin]   = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [shake, setShake]       = useState(false);
  const [success, setSuccess]   = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked]     = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ── Check saved session on mount ──────── */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const remember = localStorage.getItem(REMEMBER_KEY);
    if (saved && remember === 'true') {
      try {
        const { ts } = JSON.parse(saved);
        if (Date.now() - ts < SESSION_TTL) {
          onAuthenticated();
          return;
        }
      } catch {}
      localStorage.removeItem(STORAGE_KEY);
    }
    // Pre-load remember-me preference
    if (remember === 'true') setRememberMe(true);
    // Focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  /* ── Lock countdown ────────────────────── */
  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      setLockTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setLocked(false);
          setAttempts(0);
          setError(null);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  /* ── Handle single digit input ─────────── */
  const handleInput = (index: number, value: string) => {
    if (locked) return;
    const digit = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(null);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (digit && newPin.filter(d => d !== '').length === 4 && index === 3) {
      setTimeout(() => verify(newPin), 80);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
    }
    if (e.key === 'Enter') {
      const fullPin = pin.join('');
      if (fullPin.length === 4) verify(pin);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newPin = [...pin];
    for (let i = 0; i < text.length; i++) newPin[i] = text[i];
    setPin(newPin);
    if (text.length === 4) {
      inputRefs.current[3]?.focus();
      setTimeout(() => verify(newPin), 80);
    } else {
      inputRefs.current[text.length]?.focus();
    }
  };

  /* ── Numpad click ──────────────────────── */
  const handleNumpad = (digit: string) => {
    if (locked) return;
    const firstEmpty = pin.findIndex(d => d === '');
    if (firstEmpty === -1) return;
    const newPin = [...pin];
    newPin[firstEmpty] = digit;
    setPin(newPin);
    setError(null);
    if (firstEmpty === 3 && newPin.every(d => d !== '')) {
      setTimeout(() => verify(newPin), 80);
    }
  };

  const handleNumpadBackspace = () => {
    const lastFilled = [...pin].reverse().findIndex(d => d !== '');
    if (lastFilled === -1) return;
    const idx = 3 - lastFilled;
    const newPin = [...pin];
    newPin[idx] = '';
    setPin(newPin);
    inputRefs.current[idx]?.focus();
  };

  /* ── Verify PIN ───────────────────────── */
  const verify = (digits: string[]) => {
    const entered = digits.join('');
    if (entered.length < 4) return;

    if (entered === CORRECT_PIN) {
      setSuccess(true);
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now() }));
        localStorage.setItem(REMEMBER_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      setTimeout(() => onAuthenticated(), 700);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setShake(true);
      setPin(['', '', '', '']);
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 600);

      if (newAttempts >= 5) {
        setLocked(true);
        setLockTimer(30);
        setError('تم إغلاق النظام مؤقتاً لمدة 30 ثانية بسبب محاولات خاطئة متعددة');
      } else {
        setError(`رقم سري خاطئ — محاولة ${newAttempts} من 5`);
      }
    }
  };

  /* ── Render ────────────────────────────── */
  const filled = pin.filter(d => d !== '').length;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
      background: '#060b18',
    }}>
      {/* Animated BG blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%)' }} />
      </div>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '380px',
        background: 'rgba(10,16,32,0.90)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(99,102,241,0.18)',
        borderRadius: '1.75rem',
        boxShadow: '0 32px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(99,102,241,0.10), 0 0 60px rgba(99,102,241,0.08)',
        overflow: 'hidden',
        animation: 'slideUp 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Top gradient bar */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #6366f1, #7c3aed, #6366f1)', backgroundSize: '200%', animation: 'shimmer 3s linear infinite' }} />

        {/* Header */}
        <div style={{ padding: '2rem 2rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Logo */}
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', borderRadius: '1.25rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 8px 32px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.20)' }}>
            <Store style={{ width: '1.8rem', height: '1.8rem', color: '#fff' }} />
          </div>
          <h1 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#f1f5f9', margin: '0 0 0.25rem' }}>
            نظام الكاشير والمخزن
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.68rem', color: '#6366f1', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: '9999px', padding: '0.15rem 0.65rem', fontWeight: 700 }}>
              ⚡ FireSale POS
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#475569', margin: '0.75rem 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <Lock style={{ width: '0.8rem', height: '0.8rem' }} />
            أدخل الرقم السري للدخول
          </p>
        </div>

        {/* PIN Body */}
        <div style={{ padding: '1.5rem 2rem 2rem' }}>

          {/* 4 Dot Indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {pin.map((d, i) => (
              <div
                key={i}
                style={{
                  width: '1rem', height: '1rem', borderRadius: '50%',
                  background: success ? '#10b981' : (d !== '' ? '#6366f1' : 'transparent'),
                  border: `2px solid ${success ? '#10b981' : (d !== '' ? '#6366f1' : 'rgba(255,255,255,0.18)')}`,
                  boxShadow: d !== '' ? '0 0 12px rgba(99,102,241,0.5)' : 'none',
                  transition: 'all 0.2s ease',
                  transform: d !== '' ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Hidden text inputs for keyboard on desktop */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              animation: shake ? 'shake 0.5s ease' : 'none',
            }}
          >
            {pin.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={locked || success}
                style={{
                  width: '3rem', height: '3.5rem',
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  background: 'rgba(6,11,24,0.70)',
                  border: `1px solid ${error ? 'rgba(244,63,94,0.40)' : success ? 'rgba(16,185,129,0.40)' : d !== '' ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.10)'}`,
                  borderRadius: '0.75rem',
                  color: '#f1f5f9',
                  outline: 'none',
                  boxShadow: d !== '' ? '0 0 16px rgba(99,102,241,0.20)' : 'none',
                  transition: 'all 0.2s ease',
                  caretColor: '#6366f1',
                }}
              />
            ))}
          </div>

          {/* Show/Hide PIN toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.25rem' }}>
            <button
              onClick={() => setShowPin(!showPin)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0', fontFamily: "'Cairo', sans-serif", fontWeight: 600 }}
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPin ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
            </button>
          </div>

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => (
              key === '' ? (
                <div key={idx} />
              ) : (
                <button
                  key={idx}
                  onClick={() => key === '⌫' ? handleNumpadBackspace() : handleNumpad(key)}
                  disabled={locked || success}
                  style={{
                    padding: '0.85rem',
                    background: key === '⌫' ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${key === '⌫' ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '0.75rem',
                    color: key === '⌫' ? '#fda4af' : '#e2e8f0',
                    fontSize: key === '⌫' ? '1rem' : '1.25rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: "'Cairo', sans-serif",
                    opacity: locked || success ? 0.4 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!locked && !success) {
                      e.currentTarget.style.background = key === '⌫' ? 'rgba(244,63,94,0.15)' : 'rgba(99,102,241,0.12)';
                      e.currentTarget.style.borderColor = key === '⌫' ? 'rgba(244,63,94,0.30)' : 'rgba(99,102,241,0.30)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = key === '⌫' ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = key === '⌫' ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.07)';
                  }}
                >
                  {key}
                </button>
              )
            ))}
          </div>

          {/* Remember Me */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              onClick={() => setRememberMe(!rememberMe)}
              style={{
                width: '1.1rem', height: '1.1rem', borderRadius: '0.3rem', flexShrink: 0,
                background: rememberMe ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : 'transparent',
                border: `2px solid ${rememberMe ? '#6366f1' : 'rgba(255,255,255,0.18)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                boxShadow: rememberMe ? '0 0 10px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              {rememberMe && <CheckCircle2 style={{ width: '0.7rem', height: '0.7rem', color: '#fff' }} />}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, flex: 1 }}>
              تذكرني لمدة 8 ساعات
            </span>
            <Shield style={{ width: '0.85rem', height: '0.85rem', color: '#475569' }} />
          </label>

          {/* Error / Lock / Success Message */}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.75rem', color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 700 }}>
              <CheckCircle2 className="w-4 h-4" />
              تم التحقق بنجاح! جاري الدخول...
            </div>
          )}
          {error && !success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.22)', borderRadius: '0.75rem', color: '#fda4af', fontSize: '0.75rem', fontWeight: 600 }}>
              {locked
                ? <Lock className="w-4 h-4" style={{ flexShrink: 0 }} />
                : <AlertTriangle className="w-4 h-4" style={{ flexShrink: 0 }} />}
              <span style={{ flex: 1 }}>{error}</span>
              {locked && <span style={{ fontWeight: 900, color: '#fb7185', fontSize: '0.875rem', flexShrink: 0 }}>{lockTimer}s</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 2rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.62rem', color: '#334155' }}>
            نظام المحلاوى للأدوات الصحية — FireSale POS v1.0
          </span>
        </div>
      </div>

      {/* CSS for shake & shimmer keyframes injected inline via style tag approach */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        @keyframes shimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
};
