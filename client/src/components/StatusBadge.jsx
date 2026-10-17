import React from 'react';

const STYLES = {
  published: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  draft: 'text-slate-300 bg-slate-800 border-slate-700',
  archived: 'text-slate-400 bg-slate-900 border-slate-700',
  hidden: 'text-amber-200 bg-amber-500/10 border-amber-500/25'
};

const LABELS = { published: 'Published', draft: 'Draft', archived: 'Archived', hidden: 'Hidden by moderator' };

/** Shows a prompt's visibility state. `hidePublished` renders nothing for normal public prompts. */
export const StatusBadge = ({ status, moderated = false, hidePublished = false }) => {
  const key = moderated ? 'hidden' : status;
  if (hidePublished && key === 'published') return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[key] || STYLES.draft}`}>
      {LABELS[key] || status}
    </span>
  );
};
