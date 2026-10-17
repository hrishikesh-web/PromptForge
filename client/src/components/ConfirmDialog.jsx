import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

/**
 * Confirmation dialog for actions that change or delete data.
 * `details` can list consequences (e.g. what a cascade delete removes).
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  details = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false
}) => (
  <Modal
    isOpen={isOpen}
    onClose={loading ? () => {} : onClose}
    title={title}
    maxWidth="max-w-md"
    footer={
      <>
        <button type="button" disabled={loading} onClick={onClose} className="btn-ghost">
          {cancelText}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onConfirm}
          className={isDestructive ? 'btn-danger' : 'btn-primary'}
        >
          {loading ? 'Working…' : confirmText}
        </button>
      </>
    }
  >
    <div className="flex items-start gap-4">
      {isDestructive && (
        <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
      )}
      <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
        {message && <p>{message}</p>}
        {details}
      </div>
    </div>
  </Modal>
);
