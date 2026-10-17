import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, RotateCcw, FileText, SlidersHorizontal, AlertCircle } from 'lucide-react';
import {
  extractPlaceholders,
  fillTemplate,
  segmentTemplate,
  missingKeys,
  labelFor,
  pruneValues
} from '../utils/placeholders';
import { copyText } from '../utils/clipboard';

const storageKey = (promptId) => `promptforge:fill:${promptId}`;

const loadValues = (promptId) => {
  try {
    const raw = window.localStorage.getItem(storageKey(promptId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveValues = (promptId, values) => {
  try {
    if (Object.keys(values).length === 0) window.localStorage.removeItem(storageKey(promptId));
    else window.localStorage.setItem(storageKey(promptId), JSON.stringify(values));
  } catch {
    /* storage unavailable (private window) — values just won't persist */
  }
};

/**
 * Shows a saved prompt template and lets the user fill its {{placeholders}}.
 * The template itself is never modified: filling happens only in the browser,
 * so the stored prompt and its version history stay exactly as they are.
 */
export const PromptCustomizer = ({ promptId, template, versionNumber }) => {
  const placeholders = useMemo(() => extractPlaceholders(template), [template]);
  const hasPlaceholders = placeholders.length > 0;

  const [mode, setMode] = useState(hasPlaceholders ? 'customise' : 'template');
  const [values, setValues] = useState(() => pruneValues(placeholders, loadValues(promptId)));
  const [copyState, setCopyState] = useState(null); // null | { kind: 'filled'|'template', missing: number }
  const timer = useRef(null);

  // When the version (template) changes, keep only values that still apply.
  useEffect(() => {
    setValues((prev) => pruneValues(placeholders, prev));
    setMode(placeholders.length > 0 ? 'customise' : 'template');
  }, [placeholders]);

  useEffect(() => saveValues(promptId, values), [promptId, values]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const filledText = useMemo(() => fillTemplate(template, values), [template, values]);
  const segments = useMemo(() => segmentTemplate(template, values), [template, values]);
  const missing = useMemo(() => missingKeys(placeholders, values), [placeholders, values]);
  const filledCount = placeholders.length - missing.length;

  const flash = (state) => {
    setCopyState(state);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState(null), 3500);
  };

  const handleCopy = async (kind) => {
    const text = kind === 'template' ? template : filledText;
    const ok = await copyText(text);
    flash(ok ? { kind, missing: kind === 'filled' ? missing.length : 0 } : { kind: 'error' });
  };

  const handleReset = () => {
    setValues({});
    setCopyState(null);
  };

  const setValue = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden" aria-label="Prompt">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900">
        <div className="inline-flex rounded-lg bg-slate-950 border border-slate-800 p-0.5" role="tablist">
          {hasPlaceholders && (
            <button
              role="tab"
              aria-selected={mode === 'customise'}
              onClick={() => setMode('customise')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'customise' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Customise
            </button>
          )}
          <button
            role="tab"
            aria-selected={mode === 'template'}
            onClick={() => setMode('template')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'template' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Original template
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] font-mono text-slate-500">v{versionNumber}</span>
          {mode === 'customise' ? (
            <button
              onClick={() => handleCopy('filled')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors"
            >
              {copyState?.kind === 'filled' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copyState?.kind === 'filled' ? 'Copied' : 'Copy prompt'}
            </button>
          ) : (
            <button
              onClick={() => handleCopy('template')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors"
            >
              {copyState?.kind === 'template' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copyState?.kind === 'template' ? 'Copied' : 'Copy template'}
            </button>
          )}
        </div>
      </div>

      {/* Copy feedback */}
      <div aria-live="polite">
        {copyState && (
          <div
            className={`px-4 sm:px-5 py-2 text-xs border-b ${
              copyState.kind === 'error'
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                : copyState.missing > 0
                ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            }`}
          >
            {copyState.kind === 'error'
              ? 'Your browser blocked clipboard access. Select the text below and copy it manually.'
              : copyState.missing > 0
              ? `Copied. ${copyState.missing} blank${copyState.missing === 1 ? ' was' : 's were'} left as {{placeholder}} — fill ${copyState.missing === 1 ? 'it' : 'them'} in your AI tool.`
              : copyState.kind === 'template'
              ? 'Original template copied, placeholders included.'
              : 'Copied. Paste it into the AI tool you use.'}
          </div>
        )}
      </div>

      {mode === 'customise' && hasPlaceholders ? (
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Inputs */}
          <div className="p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Fill in the blanks</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filledCount} of {placeholders.length} filled. Your answers stay in this browser.
                </p>
              </div>
              <button
                onClick={handleReset}
                disabled={filledCount === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            <div className="h-1 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${(filledCount / placeholders.length) * 100}%` }}
              />
            </div>

            <div className="space-y-3">
              {placeholders.map(({ key, count }) => {
                const id = `ph-${promptId}-${key.replace(/\W+/g, '-')}`;
                const value = values[key] || '';
                return (
                  <div key={key}>
                    <label htmlFor={id} className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                      <span>{labelFor(key)}</span>
                      {count > 1 && <span className="text-[10px] text-slate-500 font-normal">used {count}×</span>}
                    </label>
                    <textarea
                      id={id}
                      rows={value.length > 60 || value.includes('\n') ? 3 : 1}
                      value={value}
                      onChange={(e) => setValue(key, e.target.value)}
                      placeholder={`{{${key}}}`}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 resize-y"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div className="p-4 sm:p-5 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300">Preview</h3>
              {missing.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {missing.length} left
                </span>
              )}
            </div>
            <pre className="text-[13px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-words">
              {segments.map((seg, i) =>
                seg.type === 'text' ? (
                  <React.Fragment key={i}>{seg.text}</React.Fragment>
                ) : (
                  <mark
                    key={i}
                    className={`rounded px-0.5 ${
                      seg.filled ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'
                    }`}
                  >
                    {seg.value}
                  </mark>
                )
              )}
            </pre>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          <pre className="text-[13px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-words">
            {template || 'No content found.'}
          </pre>
          {!hasPlaceholders && (
            <p className="mt-4 text-[11px] text-slate-500">
              This prompt has no {'{{placeholders}}'}, so it can be copied and used as it is.
            </p>
          )}
        </div>
      )}
    </section>
  );
};
