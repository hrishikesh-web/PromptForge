import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SearchX } from 'lucide-react';
import { api } from '../services/api';
import { PromptCard } from '../components/PromptCard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { modelLabel } from '../utils/models';

const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Most saved & liked'],
  ['rating', 'Highest rated'],
  ['updated', 'Recently updated']
];
const PAGE_SIZE = 12;

/**
 * Prompt discovery. The URL is the single source of truth for filters
 * (?search=&category_id=&model_id=&tag_id=&sort=&page=), so every view can be
 * bookmarked or shared and the browser Back button works.
 */
export const ExplorePrompts = () => {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const categoryId = params.get('category_id') || '';
  const modelId = params.get('model_id') || '';
  const tagId = params.get('tag_id') || '';
  const sort = params.get('sort') || 'newest';
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  const [searchText, setSearchText] = useState(search);
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [tags, setTags] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => setSearchText(search), [search]);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getModels(), api.getTags()])
      .then(([c, m, t]) => {
        setCategories(c.data);
        setModels(m.data);
        setTags(t.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .getPrompts({ search, category_id: categoryId, model_id: modelId, tag_id: tagId, sort, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setPrompts(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search, categoryId, modelId, tagId, sort, page, reload]);

  /** Update some query params; any filter change resets to page 1. */
  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const usedCategories = categories.filter((c) => Number(c.prompt_count) > 0);
  const usedModels = models.filter((m) => Number(m.prompt_count) > 0);
  const popularTags = useMemo(() => tags.filter((t) => Number(t.prompt_count) > 0).slice(0, 14), [tags]);

  const active = [
    search && { key: 'search', label: `"${search}"` },
    categoryId && { key: 'category_id', label: categories.find((c) => String(c.category_id) === categoryId)?.name || 'Category' },
    modelId && { key: 'model_id', label: modelLabel(models.find((m) => String(m.model_id) === modelId)) || 'Model' },
    tagId && { key: 'tag_id', label: `#${tags.find((t) => String(t.tag_id) === tagId)?.tag_name || 'tag'}` }
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Explore prompts</h1>
          <p className="mt-1 text-sm text-slate-400">Find a template for the task you keep repeating, fill in the blanks, and copy it.</p>
        </div>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ search: searchText.trim() });
          }}
          className="relative max-w-2xl"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <label htmlFor="explore-search" className="sr-only">
            Search prompts
          </label>
          <input
            id="explore-search"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by title, description, tag or creator"
            className="field !pl-10 !pr-24 !py-3"
          />
          <button type="submit" className="btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 !py-1.5">
            Search
          </button>
        </form>

        {usedCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Categories">
            <button
              onClick={() => update({ category_id: '' })}
              aria-pressed={!categoryId}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
                !categoryId ? 'border-brand-500/50 bg-brand-500/15 text-white' : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              All
            </button>
            {usedCategories.map((c) => {
              const on = String(c.category_id) === categoryId;
              return (
                <button
                  key={c.category_id}
                  onClick={() => update({ category_id: on ? '' : String(c.category_id) })}
                  aria-pressed={on}
                  title={c.description || undefined}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
                    on ? 'border-brand-500/50 bg-brand-500/15 text-white' : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {c.name} <span className="text-slate-500">{c.prompt_count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="f-tag" className="sr-only">
            Tag
          </label>
          <select id="f-tag" value={tagId} onChange={(e) => update({ tag_id: e.target.value })} className="field !w-auto !py-1.5">
            <option value="">Any tag</option>
            {tags
              .filter((t) => Number(t.prompt_count) > 0 || String(t.tag_id) === tagId)
              .map((t) => (
                <option key={t.tag_id} value={t.tag_id}>
                  #{t.tag_name} ({t.prompt_count})
                </option>
              ))}
          </select>
          <label htmlFor="f-model" className="sr-only">
            Suggested model
          </label>
          <select id="f-model" value={modelId} onChange={(e) => update({ model_id: e.target.value })} className="field !w-auto !py-1.5">
            <option value="">Any suggested model</option>
            {usedModels.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {modelLabel(m)} ({m.prompt_count})
              </option>
            ))}
          </select>
          <label htmlFor="f-sort" className="sr-only">
            Sort
          </label>
          <select id="f-sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })} className="field !w-auto !py-1.5 sm:ml-auto">
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {!tagId && popularTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Popular tags</span>
            {popularTags.map((t) => (
              <button
                key={t.tag_id}
                onClick={() => update({ tag_id: String(t.tag_id) })}
                className="rounded-md border border-slate-800 px-2 py-0.5 text-xs text-slate-400 hover:text-white hover:border-slate-600"
              >
                #{t.tag_name}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
        <p className="text-sm text-slate-400" aria-live="polite">
          {loading ? 'Searching…' : `${pagination.total} prompt${pagination.total === 1 ? '' : 's'}`}
        </p>
        {active.map((a) => (
          <button
            key={a.key}
            onClick={() => update({ [a.key]: '' })}
            className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-200 hover:bg-slate-700"
            aria-label={`Remove filter ${a.label}`}
          >
            {a.label}
            <X className="w-3 h-3" />
          </button>
        ))}
        {active.length > 1 && (
          <button onClick={() => setParams({})} className="text-xs text-slate-400 underline hover:text-white">
            Clear all
          </button>
        )}
      </div>

      {loading ? (
        <LoadingState message="Loading prompts…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : prompts.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No prompts match"
          description={active.length ? 'Try removing a filter or searching for a broader word.' : 'Nobody has published a prompt yet.'}
          actionLabel={active.length ? 'Clear filters' : undefined}
          onAction={active.length ? () => setParams({}) : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {prompts.map((p) => (
              <PromptCard key={p.prompt_id} prompt={p} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Pagination">
              <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="btn-secondary !py-1.5">
                Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => update({ page: String(page + 1) })}
                className="btn-secondary !py-1.5"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
};
