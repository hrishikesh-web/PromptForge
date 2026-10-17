import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, cls: 'border-emerald-500/30 text-emerald-200', iconCls: 'text-emerald-400' },
  error: { icon: AlertCircle, cls: 'border-rose-500/30 text-rose-200', iconCls: 'text-rose-400' },
  info: { icon: Info, cls: 'border-slate-700 text-slate-200', iconCls: 'text-brand-400' }
};

/**
 * Small toast system used instead of window.alert().
 * const toast = useToast(); toast.success('Saved'); toast.error(err.message);
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
    },
    [dismiss]
  );

  const api = useRef({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m)
  });
  api.current.success = (m) => push('success', m);
  api.current.error = (m) => push('error', m);
  api.current.info = (m) => push('info', m);

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96" aria-live="polite">
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={`toast-in flex items-start gap-3 rounded-xl border bg-slate-900 px-4 py-3 shadow-xl shadow-black/40 ${s.cls}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.iconCls}`} />
              <p className="text-sm flex-1 leading-snug">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-white" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
