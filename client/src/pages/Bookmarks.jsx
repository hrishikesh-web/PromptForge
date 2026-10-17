import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { api } from '../services/api';
import { PromptCard } from '../components/PromptCard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export const Bookmarks = () => {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getBookmarks();
      setBookmarks(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Bookmarks</h1>
        <p className="mt-1 text-sm text-slate-400">Templates you saved to reuse. Newest first.</p>
      </header>

      {loading ? (
        <LoadingState message="Loading bookmarks…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Use Save on any prompt to keep it here."
          actionLabel="Explore prompts"
          onAction={() => navigate('/explore')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((p) => (
            <PromptCard
              key={p.prompt_id}
              prompt={p}
              onBookmarkChange={(id, saved) => !saved && setBookmarks((list) => list.filter((b) => b.prompt_id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
};
