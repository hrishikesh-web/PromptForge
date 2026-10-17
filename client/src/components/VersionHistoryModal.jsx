import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { diffLines, diffStats } from '../utils/diff';
import { formatDate } from '../utils/format';

/**
 * Version history of a prompt (rows of the prompt_versions table).
 * "Changes" compares the selected version with the one before it.
 * Restoring never deletes anything: it creates a NEW version with old content.
 */
export const VersionHistoryModal = ({ isOpen, onClose, promptId, versions = [], canRollback = false, onRollbackSuccess }) => {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('changes'); // 'changes' | 'full'
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Select the newest version whenever the list changes (e.g. after a restore).
  useEffect(() => {
    if (isOpen) setSelectedId(versions[0]?.version_id ?? null);
  }, [isOpen, versions]);

  const index = versions.findIndex((v) => v.version_id === selectedId);
  const selected = versions[index] || null;
  const previous = index >= 0 ? versions[index + 1] || null : null; // list is newest first
  const latestNumber = versions[0]?.version_number;

  const lines = useMemo(
    () => (selected ? diffLines(previous ? previous.content : '', selected.content) : []),
    [selected, previous]
  );
  const stats = diffStats(lines);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const res = await api.rollbackPromptVersion(promptId, selected.version_number);
      toast.success(res.message || 'Version restored.');
      setConfirmOpen(false);
      onRollbackSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not restore this version.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Version history (${versions.length})`} maxWidth="max-w-5xl">
      <div className="grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
        <ol className="space-y-1.5 md:max-h-[62vh] md:overflow-y-auto md:pr-2" aria-label="Versions, newest first">
          {versions.map((ver) => {
            const isSelected = ver.version_id === selectedId;
            return (
              <li key={ver.version_id}>
                <button
                  onClick={() => setSelectedId(ver.version_id)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    isSelected
                      ? 'border-brand-500/50 bg-brand-500/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      Version {ver.version_number}
                      {ver.version_number === latestNumber && (
                        <span className="ml-2 rounded px-1.5 py-px text-[10px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                          Current
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400 line-clamp-2">{ver.change_notes || 'No notes'}</span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    {ver.author_name}, {formatDate(ver.created_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {selected ? (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="inline-flex rounded-lg bg-slate-950 border border-slate-800 p-0.5">
                {[
                  ['changes', previous ? `Changes from v${previous.version_number}` : 'First version'],
                  ['full', 'Full text']
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      view === key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {view === 'changes' && previous && (
                  <span className="text-xs">
                    <span className="text-emerald-400">+{stats.added}</span>{' '}
                    <span className="text-rose-400">−{stats.removed}</span>
                  </span>
                )}
                {canRollback && selected.version_number !== latestNumber && (
                  <button onClick={() => setConfirmOpen(true)} className="btn-secondary !py-1.5 !text-xs">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore this version
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 max-h-[52vh] overflow-auto">
              {view === 'full' || !previous ? (
                <pre className="p-4 text-[13px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-words">
                  {selected.content}
                </pre>
              ) : (
                <div className="py-2 font-mono text-[13px] leading-relaxed">
                  {lines.map((l, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 px-4 whitespace-pre-wrap break-words ${
                        l.type === 'added'
                          ? 'bg-emerald-500/10 text-emerald-100'
                          : l.type === 'removed'
                          ? 'bg-rose-500/10 text-rose-200 line-through decoration-rose-400/40'
                          : 'text-slate-400'
                      }`}
                    >
                      <span className="select-none w-3 shrink-0 text-slate-500" aria-hidden="true">
                        {l.type === 'added' ? '+' : l.type === 'removed' ? '−' : ' '}
                      </span>
                      <span className="min-w-0">{l.text || ' '}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-12 text-center">No versions found.</p>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRestore}
        title={`Restore version ${selected?.version_number}?`}
        message={`Its text will be saved as a new version (v${(latestNumber || 0) + 1}). Nothing is deleted, so you can switch back at any time.`}
        confirmText="Restore version"
        loading={restoring}
      />
    </Modal>
  );
};
