import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal: closes on Escape or backdrop click, locks page scroll,
 * moves focus into the dialog and restores it afterwards.
 */
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', footer = null }) => {
  const dialogRef = useRef(null);
  // Keep the latest onClose in a ref so the effect below only runs when the
  // modal opens/closes (not on every parent render, which would steal focus).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    // Focus the first focusable element (or the dialog itself)
    const first = dialogRef.current?.querySelector('input, textarea, select, button:not([data-close])');
    (first || dialogRef.current)?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full ${maxWidth} bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[92vh] focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            data-close
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-slate-800 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};
