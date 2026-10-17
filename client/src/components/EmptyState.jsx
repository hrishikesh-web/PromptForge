import React from 'react';
import { Inbox } from 'lucide-react';

/** Empty screens explain what to do next. */
export const EmptyState = ({ icon: Icon = Inbox, title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 px-6 py-12 text-center">
    <Icon className="w-8 h-8 text-slate-600 mb-3" />
    <h2 className="text-base font-semibold text-white">{title}</h2>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
    {actionLabel && onAction && (
      <button onClick={onAction} className="btn-primary mt-5">
        {actionLabel}
      </button>
    )}
  </div>
);
