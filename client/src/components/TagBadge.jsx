import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A tag chip. Pass `to` to make it a link, `onClick` to make it a button,
 * `onRemove` to show a remove control (used in the tag editor).
 */
export const TagBadge = ({ name, to, onClick, onRemove, selected = false }) => {
  const cls = `inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${
    selected
      ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
      : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-white'
  }`;
  const content = (
    <>
      <span className="text-slate-500">#</span>
      {name}
    </>
  );

  if (onRemove) {
    return (
      <span className={cls}>
        {content}
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 -mr-0.5 rounded px-1 text-slate-500 hover:text-rose-300"
          aria-label={`Remove tag ${name}`}
        >
          ×
        </button>
      </span>
    );
  }
  if (to) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} aria-pressed={selected}>
        {content}
      </button>
    );
  }
  return <span className={cls}>{content}</span>;
};
