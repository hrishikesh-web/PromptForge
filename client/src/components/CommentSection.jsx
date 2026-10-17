import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';
import { ConfirmDialog } from './ConfirmDialog';
import { formatRelative } from '../utils/format';

const MAX_LENGTH = 2000;

export const CommentSection = ({ promptId, canComment = true }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.getComments(promptId);
      setComments(res.data || []);
    } catch (err) {
      setLoadError(err.message || 'Could not load comments.');
    } finally {
      setLoading(false);
    }
  }, [promptId]);

  useEffect(() => {
    if (promptId) fetchComments();
  }, [promptId, fetchComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.addComment(promptId, text);
      setComments((prev) => [...prev, res.comment]);
      setNewComment('');
    } catch (err) {
      toast.error(err.message || 'Could not post the comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteComment(toDelete.comment_id);
      setComments((prev) => prev.filter((c) => c.comment_id !== toDelete.comment_id));
      toast.success('Comment deleted.');
      setToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Could not delete the comment.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section id="comments" className="panel p-5 sm:p-6" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="text-base font-semibold text-white mb-1">
        Comments <span className="text-slate-500 font-normal">({comments.length})</span>
      </h2>
      <p className="text-xs text-slate-500 mb-5">Share how the prompt worked for you, or what you changed.</p>

      {isAuthenticated && canComment ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <label htmlFor={`comment-${promptId}`} className="sr-only">
            Write a comment
          </label>
          <textarea
            id={`comment-${promptId}`}
            rows={3}
            maxLength={MAX_LENGTH}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="e.g. Worked well for my OS unit 3 slides; I added a line asking for diagrams."
            className="field resize-y"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-500">
              {newComment.length}/{MAX_LENGTH}
            </span>
            <button type="submit" disabled={submitting || !newComment.trim()} className="btn-primary">
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      ) : !isAuthenticated ? (
        <p className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          <Link to="/login" className="text-brand-400 hover:underline font-medium">
            Sign in
          </Link>{' '}
          to comment.
        </p>
      ) : (
        <p className="mb-6 text-sm text-slate-500">Comments open once this prompt is published.</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 py-4">Loading comments…</p>
      ) : loadError ? (
        <p className="text-sm text-rose-300 py-4">
          {loadError}{' '}
          <button onClick={fetchComments} className="underline">
            Try again
          </button>
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => {
            const canDelete = (user && user.userId === comment.user_id) || isAdmin;
            return (
              <li key={comment.comment_id} className="flex gap-3">
                <Avatar name={comment.author_name} id={comment.user_id} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/creators/${comment.user_id}`} className="text-sm font-medium text-white hover:text-brand-300">
                      {comment.author_name}
                    </Link>
                    {comment.author_role === 'ADMIN' && (
                      <span className="rounded px-1.5 text-[10px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20">
                        Admin
                      </span>
                    )}
                    <time className="text-xs text-slate-500" dateTime={comment.created_at}>
                      {formatRelative(comment.created_at)}
                    </time>
                    {canDelete && (
                      <button
                        onClick={() => setToDelete(comment)}
                        className="ml-auto p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                    {comment.comment_text}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete comment"
        message="This comment will be permanently removed."
        confirmText="Delete comment"
        isDestructive
        loading={deleting}
      />
    </section>
  );
};
