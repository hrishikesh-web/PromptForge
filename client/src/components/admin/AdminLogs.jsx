import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { formatRelative } from '../../utils/format';

const describeMeta = (meta) => {
  if (!meta) return '';
  const obj = typeof meta === 'string' ? (() => { try { return JSON.parse(meta); } catch { return null; } })() : meta;
  if (!obj) return String(meta);
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(', ');
};

/** Read-only view of activity_logs (the audit trail written by utils/activityLogger.js). */
export const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAdminLogs({ limit: 200, action });
      setLogs(res.data);
      setActions(res.actions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Newest first, latest 200 entries. Deleted users appear as "Deleted user" (ON DELETE SET NULL).</p>
        <label htmlFor="log-action" className="sr-only">
          Filter by action
        </label>
        <select id="log-action" value={action} onChange={(e) => setAction(e.target.value)} className="field !w-48 !py-1.5">
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading activity…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Activity log</caption>
            <thead className="text-left text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Record</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {logs.map((l) => (
                <tr key={l.log_id}>
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap" title={new Date(l.created_at).toLocaleString('en-IN')}>
                    {formatRelative(l.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-200 whitespace-nowrap">{l.user_name || <span className="text-slate-500">Deleted user</span>}</td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs text-brand-200">{l.action}</code>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell whitespace-nowrap">
                    {l.table_name}
                    {l.record_id ? ` #${l.record_id}` : ''}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 hidden lg:table-cell max-w-md truncate">{describeMeta(l.metadata)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
