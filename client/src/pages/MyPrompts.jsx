import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { formatRelative } from '../utils/format';
import { extractPlaceholders } from '../utils/placeholders';

const FILTERS = [
  ['all', 'All'],
  ['published', 'Published'],
  ['draft', 'Drafts'],
  ['archived', 'Archived']
];

/** The signed-in user's own prompts, including private drafts. */
export const MyPrompts = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState('all');
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPrompts({ user_id: user.userId, status, sort: 'updated', limit: 50 });
      setPrompts(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.userId, status]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deletePrompt(toDelete.prompt_id);
      toast.success('Prompt deleted.');
      setPrompts((list) => list.filter((p) => p.prompt_id !== toDelete.prompt_id));
      setToDelete(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">My prompts</h1>
          <p className="mt-1 text-sm text-slate-400">Everything you've written. Drafts are visible only to you.</p>
        </div>
        <Link to="/create" className="btn-primary self-start">
          <Plus className="w-4 h-4" /> New prompt
        </Link>
      </header>

      <div className="flex gap-1.5" role="group" aria-label="Filter by status">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            aria-pressed={status === key}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === key ? 'border-brand-500/50 bg-brand-500/15 text-white' : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading your prompts…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : prompts.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={status === 'all' ? 'No prompts yet' : `No ${FILTERS.find((f) => f[0] === status)[1].toLowerCase()}`}
          description="Turn a prompt you keep retyping into a template with placeholders."
          actionLabel="Write a prompt"
          onAction={() => navigate('/create')}
        />
      ) : (
        <ul className="panel divide-y divide-slate-800/70">
          {prompts.map((p) => {
            const blanks = extractPlaceholders(p.latest_content || '').length;
            return (
              <li key={p.prompt_id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/prompts/${p.prompt_id}`} className="font-medium text-white hover:text-brand-300">
                      {p.title}
                    </Link>
                    <StatusBadge status={p.status} moderated={Boolean(p.is_moderated)} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.category_name}. Version {p.current_version || 1}
                    {blanks ? `, ${blanks} placeholder${blanks === 1 ? '' : 's'}` : ''}. Updated {formatRelative(p.updated_at)}.
                  </p>
                </div>
                <p className="text-xs text-slate-400 whitespace-nowrap">
                  {p.like_count} likes, {p.bookmark_count} saves{Number(p.rating_count) ? `, ${Number(p.avg_rating).toFixed(1)}★` : ''}
                </p>
                <div className="flex gap-1">
                  <Link to={`/prompts/${p.prompt_id}/edit`} className="btn-ghost !px-2 !py-1.5" aria-label={`Edit ${p.title}`}>
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button onClick={() => setToDelete(p)} className="btn-ghost !px-2 !py-1.5 hover:!text-rose-300" aria-label={`Delete ${p.title}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
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
        loading={deleting}
        isDestructive
        title="Delete this prompt?"
        message={toDelete ? `"${toDelete.title}" and all its versions, likes, comments and ratings will be permanently deleted.` : ''}
        confirmText="Delete prompt"
      />
    </div>
  );
};
