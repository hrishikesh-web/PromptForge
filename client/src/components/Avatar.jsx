import React from 'react';

// A few muted, distinct tints so different people are easy to tell apart.
const TINTS = [
  'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'bg-teal-500/15 text-teal-300 border-teal-500/30'
];

const SIZES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl'
};

export const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

/** Initials avatar; the tint is derived from the user id so it stays stable. */
export const Avatar = ({ name, id = 0, size = 'sm', className = '' }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-full border font-semibold ${SIZES[size]} ${
      TINTS[Math.abs(Number(id) || 0) % TINTS.length]
    } ${className}`}
    aria-hidden="true"
  >
    {initialsOf(name)}
  </span>
);
