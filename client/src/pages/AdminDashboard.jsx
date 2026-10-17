import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flag, FileText, Users, Tags, ScrollText } from 'lucide-react';
import { api } from '../services/api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { AdminReports } from '../components/admin/AdminReports';
import { AdminPrompts } from '../components/admin/AdminPrompts';
import { AdminUsers } from '../components/admin/AdminUsers';
import { AdminTaxonomy } from '../components/admin/AdminTaxonomy';
import { AdminLogs } from '../components/admin/AdminLogs';

const TABS = [
  { key: 'reports', label: 'Reports', icon: Flag },
  { key: 'prompts', label: 'Prompts', icon: FileText },
  { key: 'users', label: 'Users & roles', icon: Users },
  { key: 'taxonomy', label: 'Categories, models & tags', icon: Tags },
  { key: 'logs', label: 'Activity log', icon: ScrollText }
];

/**
 * Admin area. The route is wrapped in <AdminRoute> (frontend), but every API it
 * calls is ALSO protected on the server by requireRole('ADMIN').
 */
export const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'reports';
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setError('');
    try {
      const res = await api.getAdminOverview();
      setOverview(res.data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (error && !overview) return <ErrorState message={error} onRetry={loadOverview} />;
  if (!overview) return <LoadingState message="Loading admin dashboard…" fullScreen />;

  const stats = [
    { label: 'Pending reports', value: overview.pendingReports, tone: overview.pendingReports > 0 ? 'text-amber-300' : 'text-white' },
    { label: 'Users', value: overview.totalUsers, sub: `${overview.totalAdmins} admin${overview.totalAdmins === 1 ? '' : 's'}` },
    { label: 'Published prompts', value: overview.publishedPrompts, sub: `${overview.draftPrompts} drafts, ${overview.hiddenPrompts} hidden` },
    { label: 'Prompt versions', value: overview.totalVersions },
    { label: 'Categories / models / tags', value: `${overview.totalCategories} / ${overview.totalModels} / ${overview.totalTags}` }
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          Moderate content and manage users, roles and the prompt taxonomy. These are website roles only; MySQL account
          privileges are managed separately in MySQL.
        </p>
      </header>

      <dl className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="panel px-4 py-3">
            <dt className="text-xs text-slate-400">{s.label}</dt>
            <dd className={`mt-1 text-xl font-semibold ${s.tone || 'text-white'}`}>{s.value}</dd>
            {s.sub && <dd className="text-[11px] text-slate-500">{s.sub}</dd>}
          </div>
        ))}
      </dl>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 -mx-1 px-1" aria-label="Admin sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSearchParams({ tab: key })}
            aria-current={tab === key ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-brand-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'reports' && overview.pendingReports > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 text-[11px] font-semibold text-amber-200">{overview.pendingReports}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === 'reports' && <AdminReports onChange={loadOverview} />}
      {tab === 'prompts' && <AdminPrompts onChange={loadOverview} />}
      {tab === 'users' && <AdminUsers onChange={loadOverview} />}
      {tab === 'taxonomy' && <AdminTaxonomy onChange={loadOverview} />}
      {tab === 'logs' && <AdminLogs />}
    </div>
  );
};
