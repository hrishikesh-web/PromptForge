import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../ConfirmDialog';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { EmptyState } from '../EmptyState';
import { formatRelative } from '../../utils/format';
import { Flag } from 'lucide-react';

const FILTERS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Dismissed'],
  ['', 'All']
];

export const AdminReports = ({ onChange }) => {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // { report, decision }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAdminReports(status ? { status } : {});
      setReports(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async () => {
    setSaving(true);
    try {
      const res = await api.updateReportStatus(pending.report.report_id, pending.decision);
      toast.success(res.message);
      setPending(null);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="group" aria-label="Filter reports">
        {FILTERS.map(([key, label]) => (
          <button
            key={label}
            onClick={() => setStatus(key)}
            aria-pressed={status === key}
            className={`rounded-full px-3 py-1 text-xs border ${
              status === key ? 'border-brand-500/50 bg-brand-500/15 text-brand-100' : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading reports…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title="Nothing to review" description={status === 'pending' ? 'No reports are waiting for a decision.' : 'No reports match this filter.'} />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.report_id} className="panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/prompts/${r.prompt_id}`} className="font-medium text-white hover:text-brand-300">
                    {r.prompt_title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    By {r.prompt_owner_name}. Reported by {r.reporter_name} {formatRelative(r.created_at)}.
                    {r.prompt_is_moderated ? ' Currently hidden.' : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    r.status === 'pending'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      : r.status === 'approved'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {r.status === 'rejected' ? 'Dismissed' : r.status === 'approved' ? 'Approved' : 'Pending'}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-200">
                <span className="font-medium">{r.reason}.</span> <span className="text-slate-300">{r.description}</span>
              </p>
              {r.status !== 'pending' && r.reviewer_name && (
                <p className="mt-2 text-xs text-slate-500">
                  Reviewed by {r.reviewer_name} {formatRelative(r.reviewed_at)}
                </p>
              )}
              {r.status === 'pending' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setPending({ report: r, decision: 'approved' })} className="btn-danger !py-1.5 !text-xs">
                    Approve and hide prompt
                  </button>
                  <button onClick={() => setPending({ report: r, decision: 'rejected' })} className="btn-secondary !py-1.5 !text-xs">
                    Dismiss report
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={decide}
        loading={saving}
        isDestructive={pending?.decision === 'approved'}
        title={pending?.decision === 'approved' ? 'Approve report and hide prompt?' : 'Dismiss this report?'}
        message={
          pending?.decision === 'approved'
            ? `"${pending?.report.prompt_title}" will be hidden from everyone except its creator and admins. You can restore it later from the Prompts tab.`
            : 'The report will be closed. The prompt stays visible unless another approved report hid it.'
        }
        confirmText={pending?.decision === 'approved' ? 'Approve and hide' : 'Dismiss report'}
      />
    </div>
  );
};
