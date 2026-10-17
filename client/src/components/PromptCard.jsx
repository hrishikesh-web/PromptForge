import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Bookmark, Star, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';
import { extractPlaceholders } from '../utils/placeholders';

/**
 * A prompt in a list. Shows how many {{blanks}} the template has, because
 * "fill in N blanks and copy" is what people come here to do.
 */
export const PromptCard = ({ prompt, showStatus = false, onBookmarkChange }) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(Boolean(prompt.user_bookmarked));
  const [bookmarkCount, setBookmarkCount] = useState(Number(prompt.bookmark_count) || 0);
  const [busy, setBusy] = useState(false);

  const blanks = prompt.latest_content ? extractPlaceholders(prompt.latest_content) : null;
  const rating = Number(prompt.avg_rating) || 0;

  const toggleBookmark = async () => {
    if (!isAuthenticated) return navigate('/login');
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.toggleBookmark(prompt.prompt_id);
      setBookmarked(res.isBookmarked);
      setBookmarkCount(res.bookmarkCount);
      onBookmarkChange?.(prompt.prompt_id, res.isBookmarked);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900/70">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-400">{prompt.category_name}</p>
        <button
          onClick={toggleBookmark}
          disabled={busy}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? `Remove "${prompt.title}" from bookmarks` : `Save "${prompt.title}"`}
          className={`relative z-10 -mt-1 -mr-1 rounded-lg p-1.5 transition-colors ${
            bookmarked ? 'text-amber-300' : 'text-slate-500 hover:text-amber-200 hover:bg-slate-800'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-300' : ''}`} />
        </button>
      </div>

      <h3 className="mt-1 text-[15px] font-semibold leading-snug text-white">
        <Link to={`/prompts/${prompt.prompt_id}`} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
          {prompt.title}
        </Link>
      </h3>

      {prompt.description && <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-3">{prompt.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {showStatus && <StatusBadge status={prompt.status} moderated={Boolean(prompt.is_moderated)} />}
        {blanks && blanks.length > 0 && (
          <span className="slot !text-[11px]">
            {blanks.length} blank{blanks.length === 1 ? '' : 's'} to fill
          </span>
        )}
        {(prompt.tags || []).slice(0, 3).map((t) => (
          <span key={t.tag_id} className="text-xs text-slate-500">
            #{t.tag_name}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
          <Link
            to={`/creators/${prompt.creator_id}`}
            className="relative z-10 inline-flex min-w-0 items-center gap-2 hover:text-white"
          >
            <Avatar name={prompt.creator_name} id={prompt.creator_id} size="xs" />
            <span className="truncate">{prompt.creator_name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <span className="inline-flex items-center gap-1" title={`${prompt.rating_count || 0} ratings`}>
              <Star className={`w-3.5 h-3.5 ${rating ? 'text-amber-400 fill-amber-400' : ''}`} />
              {rating ? rating.toFixed(1) : '–'}
            </span>
            <span className="inline-flex items-center gap-1" title="Likes">
              <Heart className="w-3.5 h-3.5" />
              {prompt.like_count || 0}
            </span>
            <span className="inline-flex items-center gap-1" title="Saves">
              <Bookmark className="w-3.5 h-3.5" />
              {bookmarkCount}
            </span>
            {Number(prompt.comment_count) > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1" title="Comments">
                <MessageSquare className="w-3.5 h-3.5" />
                {prompt.comment_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
