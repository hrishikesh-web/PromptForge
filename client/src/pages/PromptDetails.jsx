import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Bookmark, Link2, History, Pencil, Trash2, Flag, Cpu, EyeOff, ChevronRight, Star } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RatingStars } from '../components/RatingStars';
import { TagBadge } from '../components/TagBadge';
import { CommentSection } from '../components/CommentSection';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { PromptCustomizer } from '../components/PromptCustomizer';
import { Avatar } from '../components/Avatar';
import { StatusBadge } from '../components/StatusBadge';
import { copyText } from '../utils/clipboard';
import { formatDate, formatRelative, plural } from '../utils/format';
import { modelLabel } from '../utils/models';

const REPORT_REASONS = [
  'Misleading or incorrect output',
  'Harmful or unsafe instructions',
  'Encourages academic dishonesty',
  'Spam or duplicate content',
  'Copied without credit',
  'Other'
];

export const PromptDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated, isAdmin } = useAuth();

  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState('');

  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.getPromptById(id);
      setPrompt(data);
      setLiked(Boolean(data.user_liked));
      setLikeCount(data.like_count || 0);
      setBookmarked(Boolean(data.user_bookmarked));
      setBookmarkCount(data.bookmark_count || 0);
      setUserRating(data.user_rating || 0);
      setAvgRating(data.avg_rating || 0);
      setRatingCount(data.rating_count || 0);
      setIsFollowing(Boolean(data.user_following_creator));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  const requireLogin = () => {
    if (isAuthenticated) return false;
    navigate('/login', { state: { from: `/prompts/${id}` } });
    return true;
  };

  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const handleLike = () =>
    !requireLogin() &&
    run('like', async () => {
      const res = await api.toggleLike(prompt.prompt_id);
      setLiked(res.isLiked);
      setLikeCount(res.likeCount);
    });

  const handleBookmark = () =>
    !requireLogin() &&
    run('bookmark', async () => {
      const res = await api.toggleBookmark(prompt.prompt_id);
      setBookmarked(res.isBookmarked);
      setBookmarkCount(res.bookmarkCount);
      toast.success(res.isBookmarked ? 'Saved to your bookmarks.' : 'Removed from your bookmarks.');
    });

  const handleRate = (value) =>
    !requireLogin() &&
    run('rate', async () => {
      const res = await api.ratePrompt(prompt.prompt_id, value);
      setUserRating(res.userRating);
      setAvgRating(res.avgRating);
      setRatingCount(res.ratingCount);
      toast.success(`Rated ${plural(value, 'star')}.`);
    });

  const handleFollow = () =>
    !requireLogin() &&
    run('follow', async () => {
      const res = await api.toggleFollow(prompt.creator_id);
      setIsFollowing(res.isFollowing);
    });

  const handleShare = async () => {
    const ok = await copyText(window.location.href);
    ok ? toast.success('Link copied.') : toast.error('Could not copy the link.');
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deletePrompt(prompt.prompt_id);
      toast.success('Prompt deleted.');
      navigate('/my-prompts');
    } catch (err) {
      toast.error(err.message || 'Could not delete the prompt.');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;
    setReportSubmitting(true);
    try {
      const res = await api.createReport({ prompt_id: prompt.prompt_id, reason: reportReason, description: reportDesc.trim() });
      toast.success(res.message || 'Report sent to the moderators.');
      setReportOpen(false);
      setReportDesc('');
    } catch (err) {
      toast.error(err.message || 'Could not send the report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading prompt…" fullScreen />;
  if (error) {
    return error.status === 404 ? (
      <ErrorState
        title="Prompt not found"
        message="It may have been deleted, or it's a private draft."
        actionLabel="Browse prompts"
        onAction={() => navigate('/explore')}
      />
    ) : (
      <ErrorState message={error.message} onRetry={fetchPrompt} />
    );
  }
  if (!prompt) return null;

  const isOwner = Boolean(user && user.userId === prompt.creator_id);
  const canModify = isOwner || isAdmin;
  const isPublic = prompt.status === 'published' && !prompt.is_moderated;
  const latest = prompt.latestVersion;
  const versionCount = prompt.versions?.length || 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link to="/explore" className="hover:text-slate-300">
          Explore
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/explore?category_id=${prompt.category_id}`} className="hover:text-slate-300">
          {prompt.category_name}
        </Link>
      </nav>

      {!isPublic && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
          <EyeOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
          <p>
            {prompt.is_moderated
              ? 'A moderator has hidden this prompt after a report. Only you and admins can see it.'
              : prompt.status === 'draft'
              ? 'This is a draft. Only you and admins can see it until you publish it.'
              : 'This prompt is archived. Only you and admins can see it.'}
          </p>
        </div>
      )}

      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={prompt.status} moderated={prompt.is_moderated} hidePublished />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Suggested model:</span> {modelLabel(prompt)}
          </span>
        </div>

        <h1 className="text-2xl sm:text-[2rem] sm:leading-tight font-semibold text-white tracking-tight max-w-3xl">
          {prompt.title}
        </h1>
        {prompt.description && <p className="text-[15px] text-slate-300 leading-relaxed max-w-3xl">{prompt.description}</p>}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
          <Link to={`/creators/${prompt.creator_id}`} className="inline-flex items-center gap-2 hover:text-white">
            <Avatar name={prompt.creator_name} id={prompt.creator_id} size="sm" />
            <span className="font-medium text-slate-200">{prompt.creator_name}</span>
          </Link>
          <span>Updated {formatRelative(prompt.updated_at)}</span>
          <button onClick={() => setHistoryOpen(true)} className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200">
            <History className="w-4 h-4" />
            Version {latest?.version_number || 1} of {versionCount}
          </button>
        </div>

        {prompt.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prompt.tags.map((tag) => (
              <TagBadge key={tag.tag_id} name={tag.tag_name} to={`/explore?tag_id=${tag.tag_id}`} />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleLike}
            disabled={busy === 'like' || (!isPublic && !liked)}
            aria-pressed={liked}
            className={`btn-secondary ${liked ? '!border-rose-500/40 !bg-rose-500/10 !text-rose-200' : ''}`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-rose-400 text-rose-400' : ''}`} />
            {liked ? 'Liked' : 'Like'} <span className="text-slate-400">{likeCount}</span>
          </button>
          <button
            onClick={handleBookmark}
            disabled={busy === 'bookmark'}
            aria-pressed={bookmarked}
            className={`btn-secondary ${bookmarked ? '!border-amber-500/40 !bg-amber-500/10 !text-amber-100' : ''}`}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-300 text-amber-300' : ''}`} />
            {bookmarked ? 'Saved' : 'Save'} <span className="text-slate-400">{bookmarkCount}</span>
          </button>
          <button onClick={handleShare} className="btn-ghost">
            <Link2 className="w-4 h-4" />
            Copy link
          </button>

          <div className="flex items-center gap-1 sm:ml-auto">
            {canModify && (
              <>
                <Link to={`/prompts/${prompt.prompt_id}/edit`} className="btn-ghost">
                  <Pencil className="w-4 h-4" />
                  Edit
                </Link>
                <button onClick={() => setDeleteOpen(true)} className="btn-ghost hover:!text-rose-300">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
            {isAuthenticated && !isOwner && (
              <button onClick={() => setReportOpen(true)} className="btn-ghost hover:!text-amber-300">
                <Flag className="w-4 h-4" />
                Report
              </button>
            )}
          </div>
        </div>
      </header>

      {/* The template + placeholder customiser */}
      <PromptCustomizer promptId={prompt.prompt_id} template={latest?.content || ''} versionNumber={latest?.version_number || 1} />

      {latest?.change_notes && latest.version_number > 1 && (
        <p className="text-xs text-slate-500 -mt-3">
          Latest change: {latest.change_notes} ({latest.author_name}, {formatDate(latest.created_at)})
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <CommentSection promptId={prompt.prompt_id} canComment={isPublic} />

        <aside className="space-y-4">
          <section className="panel p-5" aria-labelledby="rating-heading">
            <h2 id="rating-heading" className="text-sm font-semibold text-white">
              Rating
            </h2>
            <div className="mt-2 flex items-baseline gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400 self-center" />
              <span className="text-2xl font-semibold text-white">{ratingCount ? Number(avgRating).toFixed(1) : '–'}</span>
              <span className="text-sm text-slate-500">{plural(ratingCount, 'rating')}</span>
            </div>
            {isAuthenticated && !isOwner && isPublic && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-400 mb-1.5">{userRating ? 'Your rating' : 'Rate this prompt'}</p>
                <RatingStars rating={userRating} interactive onRate={handleRate} size="lg" showValue={false} />
              </div>
            )}
            {isOwner && <p className="mt-3 text-xs text-slate-500">You can't rate your own prompt.</p>}
          </section>

          <section className="panel p-5" aria-labelledby="creator-heading">
            <h2 id="creator-heading" className="sr-only">
              Creator
            </h2>
            <div className="flex items-center gap-3">
              <Avatar name={prompt.creator_name} id={prompt.creator_id} size="md" />
              <div className="min-w-0">
                <Link to={`/creators/${prompt.creator_id}`} className="block text-sm font-semibold text-white hover:text-brand-300 truncate">
                  {prompt.creator_name}
                </Link>
                <p className="text-xs text-slate-500">Created {formatDate(prompt.created_at)}</p>
              </div>
            </div>
            {prompt.creator_bio && <p className="mt-3 text-sm text-slate-400 leading-relaxed line-clamp-4">{prompt.creator_bio}</p>}
            {isAuthenticated && !isOwner && (
              <button onClick={handleFollow} disabled={busy === 'follow'} className={`mt-4 w-full ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </section>
        </aside>
      </div>

      <VersionHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        promptId={prompt.prompt_id}
        versions={prompt.versions || []}
        canRollback={canModify}
        onRollbackSuccess={fetchPrompt}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this prompt?"
        message={`"${prompt.title}" will be permanently deleted.`}
        details={
          <p className="text-xs text-slate-400">
            The database also removes its {plural(versionCount, 'version')}, tags, likes, bookmarks, comments, ratings and reports
            (ON DELETE CASCADE). This cannot be undone.
          </p>
        }
        confirmText="Delete prompt"
        isDestructive
        loading={deleting}
      />

      <Modal isOpen={reportOpen} onClose={() => setReportOpen(false)} title="Report this prompt" maxWidth="max-w-lg">
        <form onSubmit={handleReport} className="space-y-4">
          <div>
            <label htmlFor="report-reason" className="block text-sm font-medium text-slate-300 mb-1.5">
              Reason
            </label>
            <select id="report-reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="field">
              {REPORT_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-desc" className="block text-sm font-medium text-slate-300 mb-1.5">
              What's wrong?
            </label>
            <textarea
              id="report-desc"
              required
              rows={4}
              maxLength={1000}
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              placeholder="Explain the problem so a moderator can check it."
              className="field resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setReportOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={reportSubmitting || !reportDesc.trim()} className="btn-danger">
              {reportSubmitting ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
