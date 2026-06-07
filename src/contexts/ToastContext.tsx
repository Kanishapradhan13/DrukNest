import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}

const COLORS: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC' },
  error:   { bg: '#FEF2F2', border: '#FECACA' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE' },
  warning: { bg: '#FFFBEB', border: '#FDE68A' },
};

const TOAST_ICONS: Record<ToastType, React.ReactElement> = {
  success: <CheckCircle size={16} strokeWidth={2} />,
  error:   <XCircle size={16} strokeWidth={2} />,
  info:    <Info size={16} strokeWidth={2} />,
  warning: <AlertTriangle size={16} strokeWidth={2} />,
};

const TEXT: Record<ToastType, string> = {
  success: '#16A34A', error: '#DC2626', info: '#2563EB', warning: '#D97706',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => {
          const c = COLORS[t.type];
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 12,
              padding: '12px 18px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--ink)',
              minWidth: 240, maxWidth: 360, pointerEvents: 'all',
              animation: 'slideInRight 0.25s ease',
            }}>
              <span style={{ color: TEXT[t.type], flexShrink: 0, display: 'flex' }}>{TOAST_ICONS[t.type]}</span>
              <span style={{ lineHeight: 1.45 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}
