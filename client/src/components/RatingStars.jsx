import React, { useState } from 'react';
import { Star } from 'lucide-react';

const SIZES = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-6 h-6' };

/**
 * Star rating. Read-only by default; with `interactive` + `onRate` it becomes
 * five buttons ("Rate 1 star" … "Rate 5 stars") that work with the keyboard.
 */
export const RatingStars = ({ rating = 0, interactive = false, onRate, size = 'md', count = null, showValue = true }) => {
  const [hover, setHover] = useState(0);
  const current = hover || rating;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className="flex items-center"
        role={interactive ? 'radiogroup' : 'img'}
        aria-label={interactive ? 'Rate this prompt' : `Rated ${Number(rating).toFixed(1)} out of 5`}
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= Math.round(current);
          const star = (
            <Star className={`${SIZES[size]} ${filled ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
          );
          return interactive ? (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(0)}
              onClick={() => onRate && onRate(n)}
              className="p-0.5 rounded transition-transform hover:scale-110"
            >
              {star}
            </button>
          ) : (
            <span key={n} className="p-px">
              {star}
            </span>
          );
        })}
      </div>
      {showValue && rating > 0 && <span className="text-xs font-medium text-slate-300">{Number(rating).toFixed(1)}</span>}
      {count !== null && <span className="text-xs text-slate-500">({count})</span>}
    </div>
  );
};
