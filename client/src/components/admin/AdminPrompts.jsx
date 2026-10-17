import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../ConfirmDialog';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { StatusBadge } from '../StatusBadge';
import { formatDate } from '../../utils/format';

/** Every prompt (admins see drafts and hidden ones too), with hide / restore / delete. */
export const AdminPrompts = ({ onChange }) => {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [prompts, setPrompts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState(null); // { type: 'hide'|'restore'|'delete', prompt }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPrompts({ status, search: query, sort: 'updated', limit: 50 });
      setPrompts(res.data);
      setTotal(res.pagination.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async () => {
    setSaving(true);
    try {
      const { type, prompt } = action;
      const res =
        type === 'delete' ? await api.deletePrompt(prompt.prompt_id) : await api.setPromptModeration(prompt.prompt_id, type === 'hide');
      toast.success(res.message);
      setAction(null);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const dialog = {
    hide: {
      title: 'Hide this prompt?',
      message: 'It will be archived and hidden from everyone except its creator and admins.',
      confirm: 'Hide prompt',
      destructive: true
    },
    restore: { title: 'Restore this prompt?', message: 'It will be published and visible to everyone again.', confirm: 'Restore and publish' },
    delete: {
      title: 'Delete this prompt?',
      message: 'This permanently deletes the prompt and, through ON DELETE CASCADE, its versions, tags, likes, bookmarks, comments, ratings and reports.',
      confirm: 'Delete prompt',
      destructive: true
    }
  }[action?.type || 'hide'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <label htmlFor="admin-prompt-search" className="sr-only">
            Search prompts
          </label>
          <input
            id="admin-prompt-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description, tag or creator, then press Enter"
            className="field !pl-9"
          />
        </form>
        <label htmlFor="admin-prompt-status" className="sr-only">
          Status
        </label>
        <select id="admin-prompt-status" value={status} onChange={(e) => setStatus(e.target.value)} className="field sm:!w-44">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived / hidden</option>
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading prompts…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Prompts</caption>
            <thead className="text-left text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Prompt</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Creator</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {prompts.map((p) => (
                <tr key={p.prompt_id} className="align-top">
                  <td className="px-4 py-3 min-w-[14rem]">
                    <Link to={`/prompts/${p.prompt_id}`} className="font-medium text-white hover:text-brand-300">
                      {p.title}
                    </Link>
                    <p className="text-xs text-slate-500">{p.category_name}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{p.creator_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} moderated={Boolean(p.is_moderated)} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell whitespace-nowrap">{formatDate(p.updated_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {p.is_moderated ? (
                      <button onClick={() => setAction({ type: 'restore', prompt: p })} className="btn-ghost !px-2 !py-1 !text-xs">
                        Restore
                      </button>
                    ) : (
                      <button onClick={() => setAction({ type: 'hide', prompt: p })} className="btn-ghost !px-2 !py-1 !text-xs">
                        Hide
                      </button>
                    )}
                    <button onClick={() => setAction({ type: 'delete', prompt: p })} className="btn-ghost !px-2 !py-1 !text-xs hover:!text-rose-300">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {prompts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No prompts match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {total > prompts.length && (
            <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-800">
              Showing the {prompts.length} most recently updated of {total}. Search to narrow the list.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(action)}
        onClose={() => setAction(null)}
        onConfirm={confirm}
        loading={saving}
        title={dialog.title}
        message={action ? `"${action.prompt.title}": ${dialog.message}` : ''}
        confirmText={dialog.confirm}
        isDestructive={dialog.destructive}
      />
    </div>
  );
};
