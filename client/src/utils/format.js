/** Date and number formatting helpers (Indian English locale). */

export const formatDate = (value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', opts);
};

/** "just now", "5 min ago", "3 days ago", or a date for anything older than 30 days. */
export const formatRelative = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(d);
};

export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;
