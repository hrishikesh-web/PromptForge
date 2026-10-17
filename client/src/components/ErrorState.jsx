import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error panel that says what went wrong and offers a way forward.
 * Network failures (backend not running) get a specific hint.
 */
export const ErrorState = ({ title = "Couldn't load this page", message, onRetry, actionLabel, onAction }) => {
  const offline = /failed to fetch|network|ECONNREFUSED/i.test(message || '');
  return (
    <div className="max-w-lg mx-auto my-10 panel p-6 text-center">
      <div className="w-11 h-11 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-300">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h2 className="text-base font-semibold text-white mb-1">{offline ? "Can't reach the server" : title}</h2>
      <p className="text-sm text-slate-400 mb-5">
        {offline
          ? 'Start the backend (cd server, then npm start) and check that MySQL is running.'
          : message || 'The server returned an error.'}
      </p>
      <div className="flex justify-center gap-2">
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        )}
        {actionLabel && onAction && (
          <button onClick={onAction} className="btn-primary">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
