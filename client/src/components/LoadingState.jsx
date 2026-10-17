import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading…', fullScreen = false }) => (
  <div role="status" className={`flex items-center justify-center gap-2.5 text-sm text-slate-400 ${fullScreen ? 'min-h-[50vh]' : 'py-12'}`}>
    <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
    <span>{message}</span>
  </div>
);
