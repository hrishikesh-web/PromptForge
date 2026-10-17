import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Code2 } from 'lucide-react';
import { api } from '../services/api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { modelLabel } from '../utils/models';

// Single-series charts use one hue, validated against the dark chart surface (#0f172a).
const SERIES = '#2b93f0';
const GRID = '#1e293b';
const AXIS = '#94a3b8';

const UC3_DEFAULT = { category: 'Study & Exams', model: 'Any model with file upload', tag: 'needs-pdf' };

/** Fetch one analytics endpoint; returns { data, query, loading, error, reload }. */
const useQuery = (fn, deps) => {
  const [state, setState] = useState({ data: [], query: null, loading: true, error: '' });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await fn();
      setState({ data: res.data, query: res.query, loading: false, error: '' });
    } catch (err) {
      setState({ data: [], query: null, loading: false, error: err.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
};

const ChartTooltip = ({ active, payload, label, unit, extra }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-white">{label}</p>
      <p className="text-slate-300">
        {payload[0].value} {unit}
      </p>
      {extra && <p className="text-slate-500">{extra(row)}</p>}
    </div>
  );
};

/** One numbered use case: title, concepts, explanation, result, and the exact SQL that ran. */
const UseCase = ({ n, state, title, children, controls }) => {
  const [showSql, setShowSql] = useState(false);
  const q = state.query;
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby={`uc${n}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">Use case {n}</p>
          <h2 id={`uc${n}`} className="text-lg font-semibold text-white">
            {q?.title || title}
          </h2>
        </div>
        <button onClick={() => setShowSql((s) => !s)} aria-expanded={showSql} className="btn-ghost !py-1.5 !text-xs">
          <Code2 className="w-4 h-4" />
          {showSql ? 'Hide SQL' : 'Show SQL'}
        </button>
      </div>
      {q?.concepts?.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="SQL concepts">
          {q.concepts.map((c) => (
            <li key={c} className="rounded-md border border-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
              {c}
            </li>
          ))}
        </ul>
      )}
      {q?.explanation && <p className="mt-3 max-w-3xl text-sm text-slate-400 leading-relaxed">{q.explanation}</p>}
      {showSql && q && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950">
          <pre className="max-h-96 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-slate-300 whitespace-pre">{q.sql}</pre>
          {q.params?.length > 0 && (
            <p className="border-t border-slate-800 px-4 py-2 font-mono text-[11px] text-slate-500">
              Parameters (?): {q.params.map((p) => JSON.stringify(p)).join(', ')}
            </p>
          )}
        </div>
      )}
      {controls && <div className="mt-4">{controls}</div>}
      <div className="mt-4">
        {state.loading ? (
          <LoadingState message="Running query…" />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : state.data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
            The query ran and returned no rows.
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
};

const Table = ({ columns, rows, caption }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-800">
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="text-left text-xs text-slate-400 border-b border-slate-800 bg-slate-950/40">
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={`px-3 py-2.5 font-medium whitespace-nowrap ${c.num ? 'text-right' : ''}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/70">
        {rows.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} className={`px-3 py-2.5 ${c.num ? 'text-right tabular-nums text-slate-300' : 'text-slate-200'}`}>
                {c.render ? c.render(r, i) : r[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ChartOrTable = ({ chart, table }) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={() => setAsTable((t) => !t)} className="text-xs text-slate-400 underline hover:text-white">
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {asTable ? table : chart}
    </div>
  );
};

export const Analytics = () => {
  const [metrics, setMetrics] = useState(null);
  const [month, setMonth] = useState('');
  const [uc3, setUc3] = useState(UC3_DEFAULT);
  const [options, setOptions] = useState({ categories: [], models: [], tags: [] });

  useEffect(() => {
    api.getAnalyticsMetrics().then((r) => setMetrics(r.data)).catch(() => {});
    Promise.all([api.getCategories(), api.getModels(), api.getTags()])
      .then(([c, m, t]) => setOptions({ categories: c.data, models: m.data, tags: t.data.filter((x) => Number(x.prompt_count) > 0) }))
      .catch(() => {});
  }, []);

  const top = useQuery(() => api.getTopEngagementPrompts(), []);
  const active = useQuery(() => api.getActiveCreators(month ? { month } : {}), [month]);
  const filtered = useQuery(() => api.getFilteredPromptsMulti(uc3), [uc3.category, uc3.model, uc3.tag]);
  const bookmarks = useQuery(() => api.getMostBookmarksUsers(), []);
  const byCategory = useQuery(() => api.getRatingByCategory(), []);
  const trend = useQuery(() => api.getMonthlyTrend(), []);
  const byModel = useQuery(() => api.getModelDistribution(), []);

  const totals = metrics && [
    ['Users', metrics.total_users],
    ['Public prompts', metrics.public_prompts],
    ['Versions', metrics.total_versions],
    ['Likes', metrics.total_likes],
    ['Bookmarks', metrics.total_bookmarks],
    ['Ratings', `${metrics.total_ratings} (avg ${Number(metrics.average_rating).toFixed(2)})`]
  ];

  const monthLabel = (ym) => {
    const [y, m] = String(ym).split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Analytics</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          The six SQL use cases from our DBMS project, run live against MySQL. Only public prompts (published and not hidden by a
          moderator) are counted, so private drafts never appear here. Use "Show SQL" to see the exact query and its parameters.
        </p>
      </header>

      {totals && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {totals.map(([label, value]) => (
            <div key={label} className="panel px-4 py-3">
              <dt className="text-xs text-slate-400">{label}</dt>
              <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <UseCase n={1} state={top} title="Top 10 prompts by engagement">
        <Table
          caption="Top prompts by engagement"
          rows={top.data}
          columns={[
            { key: 'rank', label: '#', render: (_, i) => <span className="text-slate-500">{i + 1}</span> },
            {
              key: 'title',
              label: 'Prompt',
              render: (r) => (
                <Link to={`/prompts/${r.prompt_id}`} className="hover:text-brand-300">
                  {r.title}
                </Link>
              )
            },
            { key: 'creator_name', label: 'Creator' },
            { key: 'like_count', label: 'Likes', num: true },
            { key: 'bookmark_count', label: 'Saves', num: true },
            { key: 'comment_count', label: 'Comments', num: true },
            { key: 'avg_rating', label: 'Avg rating', num: true, render: (r) => Number(r.avg_rating).toFixed(2) },
            { key: 'engagement_score', label: 'Score', num: true, render: (r) => <span className="font-semibold text-white">{r.engagement_score}</span> }
          ]}
        />
      </UseCase>

      <UseCase
        n={2}
        state={active}
        title="Most active prompt creators in a month"
        controls={
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="uc2-month" className="text-sm text-slate-400">
              Month
            </label>
            <input id="uc2-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="field !w-auto !py-1.5" />
            {month ? (
              <button onClick={() => setMonth('')} className="text-xs text-slate-400 underline hover:text-white">
                Use the last 30 days
              </button>
            ) : (
              <span className="text-xs text-slate-500">Showing the last 30 days.</span>
            )}
          </div>
        }
      >
        <Table
          caption="Most active creators"
          rows={active.data}
          columns={[
            {
              key: 'creator_name',
              label: 'Creator',
              render: (r) => (
                <Link to={`/creators/${r.user_id}`} className="hover:text-brand-300">
                  {r.creator_name}
                </Link>
              )
            },
            { key: 'prompts_created', label: 'Prompts created', num: true },
            { key: 'versions_written', label: 'New versions', num: true },
            { key: 'total_activity', label: 'Total', num: true, render: (r) => <span className="font-semibold text-white">{r.total_activity}</span> }
          ]}
        />
      </UseCase>

      <UseCase
        n={3}
        state={filtered}
        title="Prompts filtered by AI model, category and tag"
        controls={
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ['category', 'Category', options.categories.map((c) => c.name)],
              ['model', 'Suggested model', options.models.map((m) => m.model_name)],
              ['tag', 'Tag', options.tags.map((t) => t.tag_name)]
            ].map(([key, label, values]) => (
              <div key={key}>
                <label htmlFor={`uc3-${key}`} className="block text-xs text-slate-400 mb-1">
                  {label}
                </label>
                <select id={`uc3-${key}`} value={uc3[key]} onChange={(e) => setUc3((f) => ({ ...f, [key]: e.target.value }))} className="field !py-1.5">
                  <option value="">Any</option>
                  {values.map((v) => (
                    <option key={v} value={v}>
                      {key === 'tag' ? `#${v}` : key === 'model' ? modelLabel(options.models.find((m) => m.model_name === v)) : v}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        }
      >
        <Table
          caption="Filtered prompts"
          rows={filtered.data}
          columns={[
            {
              key: 'title',
              label: 'Prompt',
              render: (r) => (
                <Link to={`/prompts/${r.prompt_id}`} className="hover:text-brand-300">
                  {r.title}
                </Link>
              )
            },
            { key: 'category_name', label: 'Category' },
            { key: 'model_name', label: 'Suggested model' },
            { key: 'tags', label: 'Tags', render: (r) => <span className="text-xs text-slate-400">{r.tags}</span> }
          ]}
        />
      </UseCase>

      <UseCase n={4} state={bookmarks} title="Users with the most bookmarks">
        <Table
          caption="Users with the most bookmarks"
          rows={bookmarks.data}
          columns={[
            { key: 'rank', label: '#', render: (_, i) => <span className="text-slate-500">{i + 1}</span> },
            {
              key: 'user_name',
              label: 'User',
              render: (r) => (
                <Link to={`/creators/${r.user_id}`} className="hover:text-brand-300">
                  {r.user_name}
                </Link>
              )
            },
            { key: 'total_bookmarks', label: 'Bookmarks', num: true, render: (r) => <span className="font-semibold text-white">{r.total_bookmarks}</span> }
          ]}
        />
      </UseCase>

      <UseCase n={5} state={byCategory} title="Average prompt rating by category">
        <ChartOrTable
          chart={
            <div className="h-[26rem]" role="img" aria-label="Bar chart of average rating per category">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory.data.map((r) => ({ ...r, average_rating: Number(r.average_rating) }))} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category_name" width={190} interval={0} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    content={<ChartTooltip unit="average stars" extra={(r) => `${r.ratings_received} ratings on ${r.public_prompts} prompts`} />}
                  />
                  <Bar dataKey="average_rating" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
          table={
            <Table
              caption="Average rating by category"
              rows={byCategory.data}
              columns={[
                { key: 'category_name', label: 'Category' },
                { key: 'public_prompts', label: 'Prompts', num: true },
                { key: 'ratings_received', label: 'Ratings', num: true },
                { key: 'average_rating', label: 'Average', num: true, render: (r) => Number(r.average_rating).toFixed(2) },
                { key: 'min_rating', label: 'Min', num: true },
                { key: 'max_rating', label: 'Max', num: true }
              ]}
            />
          }
        />
      </UseCase>

      <UseCase n={6} state={trend} title="Monthly prompt creation trend">
        <ChartOrTable
          chart={
            <div className="h-64" role="img" aria-label="Column chart of prompts created per month">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend.data.map((r) => ({ ...r, prompts_created: Number(r.prompts_created), label: monthLabel(r.creation_month) }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} content={<ChartTooltip unit="prompts created" />} />
                  <Bar dataKey="prompts_created" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
          table={
            <Table
              caption="Prompts created per month"
              rows={trend.data}
              columns={[
                { key: 'creation_month', label: 'Month', render: (r) => monthLabel(r.creation_month) },
                { key: 'prompts_created', label: 'Prompts created', num: true }
              ]}
            />
          }
        />
      </UseCase>

      <section className="panel p-5 sm:p-6" aria-labelledby="by-model">
        <h2 id="by-model" className="text-lg font-semibold text-white">
          Public prompts per suggested model
        </h2>
        <p className="mt-1 text-sm text-slate-400">Supporting query. A LEFT JOIN keeps models that no prompt suggests (count 0).</p>
        <div className="mt-4">
          {byModel.loading ? (
            <LoadingState message="Running query…" />
          ) : byModel.error ? (
            <ErrorState message={byModel.error} onRetry={byModel.reload} />
          ) : (
            <Table
              caption="Prompts per suggested model"
              rows={byModel.data}
              columns={[
                { key: 'model_name', label: 'Suggested model', render: (r) => modelLabel(r) },
                { key: 'prompt_count', label: 'Public prompts', num: true }
              ]}
            />
          )}
        </div>
      </section>
    </div>
  );
};
