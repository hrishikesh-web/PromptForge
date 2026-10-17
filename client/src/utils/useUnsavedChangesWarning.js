import { useEffect } from 'react';

/** Ask the browser to confirm before closing/reloading the tab while a form has unsaved changes. */
export function useUnsavedChangesWarning(active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
