import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Bookmark } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PromptCard } from '../components/PromptCard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { formatRelative } from '../utils/format';

/** Home page for signed-in users: their own library first, then what's popular. */
export const Dashboard = () => {
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [mine, setMine] = useState([]);
  const [saved, setSaved] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, mineRes, savedRes, popRes] = await Promise.all([
        api.getMe(),
        api.getPrompts({ user_id: user.userId, status: 'all', sort: 'updated', limit: 5 }),
        api.getBookmarks(),
        api.getPrompts({ sort: 'popular', limit: 6 })
      ]);
      setMe(meRes.user);
      setMine(mineRes.data);
      setSaved(savedRes.data.slice(0, 4));
      setPopular(popRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading your library…" fullScreen />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const firstName = (user.name || '').split(' ')[0];

  return (
    <div className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-400">
            You have {me.total_prompts} prompt{Number(me.total_prompts) === 1 ? '' : 's'} and {me.total_bookmarks} bookmark
            {Number(me.total_bookmarks) === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/explore" className="btn-secondary">
            Explore prompts
          </Link>
          <Link to="/create" className="btn-primary">
            <Plus className="w-4 h-4" />
            New prompt
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5" aria-labelledby="mine-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="mine-heading" className="font-semibold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-slate-400" /> Your prompts
            </h2>
            <Link to="/my-prompts" className="text-sm text-brand-300 hover:text-brand-200">
              View all
            </Link>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">
              You haven't written a prompt yet.{' '}
              <Link to="/create" className="text-brand-300 hover:underline">
                Start with a task you repeat often.
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {mine.map((p) => (
                <li key={p.prompt_id} className="flex items-center gap-3 py-2.5">
                  <Link to={`/prompts/${p.prompt_id}`} className="min-w-0 flex-1 text-sm text-slate-200 hover:text-white truncate">
                    {p.title}
                  </Link>
                  <StatusBadge status={p.status} moderated={Boolean(p.is_moderated)} hidePublished />
                  <span className="text-xs text-slate-500 whitespace-nowrap">v{p.current_version || 1}</span>
                  <span className="hidden sm:inline text-xs text-slate-500 whitespace-nowrap">{formatRelative(p.updated_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="saved-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="saved-heading" className="font-semibold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-slate-400" /> Recently saved
            </h2>
            <Link to="/bookmarks" className="text-sm text-brand-300 hover:text-brand-200">
              View all
            </Link>
          </div>
          {saved.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">Bookmark a prompt and it will show up here for quick reuse.</p>
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {saved.map((p) => (
                <li key={p.prompt_id} className="flex items-center gap-3 py-2.5">
                  <Link to={`/prompts/${p.prompt_id}`} className="min-w-0 flex-1 text-sm text-slate-200 hover:text-white truncate">
                    {p.title}
                  </Link>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{p.creator_name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {popular.length > 0 && (
        <section aria-labelledby="popular-heading">
          <div className="flex items-end justify-between gap-4">
            <h2 id="popular-heading" className="text-lg font-semibold text-white">
              Most saved
            </h2>
            <Link to="/explore?sort=popular" className="text-sm text-brand-300 hover:text-brand-200">
              See all
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {popular.map((p) => (
              <PromptCard key={p.prompt_id} prompt={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
