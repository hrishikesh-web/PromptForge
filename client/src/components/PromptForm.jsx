import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Braces } from 'lucide-react';
import { TagInput } from './TagInput';
import { PromptCustomizer } from './PromptCustomizer';
import { extractPlaceholders } from '../utils/placeholders';
import { modelLabel } from '../utils/models';

const LIMITS = { title: 255, description: 1000, content: 20000, notes: 255 };

/**
 * Shared form for creating and editing a prompt.
 * `initial` = starting values; `mode` = 'create' | 'edit'.
 * Calls onSubmit(payload) — the page decides which API to call.
 */
export const PromptForm = ({ mode, initial, categories, models, onSubmit, submitting, serverError, onDirtyChange }) => {
  const [values, setValues] = useState(initial);
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [tab, setTab] = useState('write');
  const contentRef = useRef(null);

  const placeholders = useMemo(() => extractPlaceholders(values.content), [values.content]);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || notes.trim() !== '';
  const contentChanged = mode === 'edit' && values.content.trim() !== initial.content.trim();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const errors = {
    title: values.title.trim().length < 3 ? 'Give the prompt a title of at least 3 characters.' : null,
    content: !values.content.trim() ? 'Write the prompt text.' : null,
    category_id: !values.category_id ? 'Choose a category.' : null,
    model_id: !values.model_id ? 'Choose a suggested model.' : null
  };
  const hasErrors = Object.values(errors).some(Boolean);

  /** Insert "{{name}}" at the cursor in the content box. */
  const [phName, setPhName] = useState('');
  const [phOpen, setPhOpen] = useState(false);
  const cursor = useRef({ start: 0, end: 0 });
  const phKey = phName.trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
  const phValid = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(phKey);

  const openPlaceholder = () => {
    const el = contentRef.current;
    cursor.current = el ? { start: el.selectionStart, end: el.selectionEnd } : { start: values.content.length, end: values.content.length };
    setPhName('');
    setPhOpen(true);
  };

  const insertPlaceholder = () => {
    if (!phValid) return;
    const token = `{{${phKey}}}`;
    const { start, end } = cursor.current;
    setValues((v) => ({ ...v, content: v.content.slice(0, start) + token + v.content.slice(end) }));
    setPhOpen(false);
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      content: values.content,
      category_id: Number(values.category_id),
      model_id: Number(values.model_id),
      tags: values.tags,
      status: values.status,
      ...(mode === 'edit' ? { change_notes: notes.trim() } : {})
    });
  };

  const showError = (key) => touched && errors[key] && <p className="mt-1 text-xs text-rose-300">{errors[key]}</p>;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {serverError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {serverError}
        </div>
      )}

      <section className="panel p-5 sm:p-6 space-y-5">
        <div>
          <label htmlFor="pf-title" className="block text-sm font-medium text-slate-200 mb-1.5">
            Title
          </label>
          <input
            id="pf-title"
            value={values.title}
            onChange={set('title')}
            maxLength={LIMITS.title}
            placeholder="e.g. Open-book exam notes from lecture slides"
            className="field"
          />
          {showError('title')}
        </div>

        <div>
          <label htmlFor="pf-desc" className="block text-sm font-medium text-slate-200 mb-1.5">
            Short description <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="pf-desc"
            rows={2}
            value={values.description}
            onChange={set('description')}
            maxLength={LIMITS.description}
            placeholder="What does it help with, and when would someone use it?"
            className="field resize-y"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pf-category" className="block text-sm font-medium text-slate-200 mb-1.5">
              Category
            </label>
            <select id="pf-category" value={values.category_id} onChange={set('category_id')} className="field">
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
            {showError('category_id')}
          </div>
          <div>
            <label htmlFor="pf-model" className="block text-sm font-medium text-slate-200 mb-1.5">
              Suggested model
            </label>
            <select id="pf-model" value={values.model_id} onChange={set('model_id')} className="field">
              <option value="">Choose a model</option>
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {modelLabel(m)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">What you recommend, not a claim that it was tested there.</p>
            {showError('model_id')}
          </div>
        </div>

        <div>
          <label htmlFor="pf-tags" className="block text-sm font-medium text-slate-200 mb-1.5">
            Tags
          </label>
          <TagInput id="pf-tags" value={values.tags} onChange={(tags) => setValues((v) => ({ ...v, tags }))} />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900">
          <div className="inline-flex rounded-lg bg-slate-950 border border-slate-800 p-0.5" role="tablist">
            {[
              ['write', 'Write'],
              ['preview', 'Preview']
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'write' && (
            <button type="button" onClick={openPlaceholder} className="btn-ghost !py-1.5 !text-xs" aria-expanded={phOpen}>
              <Braces className="w-3.5 h-3.5" />
              Insert placeholder
            </button>
          )}
        </div>

        {tab === 'write' ? (
          <div className="p-4 sm:p-5 space-y-3">
            {phOpen && (
              <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
                <div className="flex-1 min-w-[12rem]">
                  <label htmlFor="pf-ph" className="block text-xs font-medium text-slate-300 mb-1">
                    Placeholder name
                  </label>
                  <input
                    id="pf-ph"
                    autoFocus
                    value={phName}
                    onChange={(e) => setPhName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        insertPlaceholder();
                      }
                      if (e.key === 'Escape') setPhOpen(false);
                    }}
                    placeholder="e.g. topic, exam_name, target_fps"
                    className="field !py-1.5"
                  />
                </div>
                <span className="slot mb-2">{`{{${phKey || 'name'}}}`}</span>
                <button type="button" onClick={insertPlaceholder} disabled={!phValid} className="btn-primary !py-1.5 !text-xs">
                  Insert
                </button>
                <button type="button" onClick={() => setPhOpen(false)} className="btn-ghost !py-1.5 !text-xs">
                  Cancel
                </button>
              </div>
            )}
            <label htmlFor="pf-content" className="sr-only">
              Prompt text
            </label>
            <textarea
              id="pf-content"
              ref={contentRef}
              rows={16}
              value={values.content}
              onChange={set('content')}
              maxLength={LIMITS.content}
              spellCheck
              placeholder={'Write the prompt. Mark the parts people change each time with double braces, e.g.\n\nExplain {{topic}} from {{subject}} to a second-year student…'}
              className="field font-mono !text-[13px] leading-relaxed resize-y"
            />
            {showError('content')}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              {placeholders.length === 0 ? (
                <span>
                  No placeholders yet. Wrap changeable parts in double braces, like <span className="slot">{'{{topic}}'}</span>, so
                  people can fill them in.
                </span>
              ) : (
                <>
                  <span>
                    {placeholders.length} placeholder{placeholders.length === 1 ? '' : 's'}:
                  </span>
                  {placeholders.map((p) => (
                    <span key={p.key} className="slot">
                      {`{{${p.key}}}`}
                      {p.count > 1 && <span className="ml-1 text-amber-300/70">×{p.count}</span>}
                    </span>
                  ))}
                </>
              )}
              <span className="ml-auto text-slate-500">
                {values.content.length.toLocaleString('en-IN')}/{LIMITS.content.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <p className="mb-3 text-xs text-slate-500">This is how people will see and fill in your prompt.</p>
            {values.content.trim() ? (
              <PromptCustomizer promptId={`preview-${mode}`} template={values.content} versionNumber={initial.version || 1} />
            ) : (
              <p className="text-sm text-slate-500">Write the prompt first.</p>
            )}
          </div>
        )}
      </section>

      <section className="panel p-5 sm:p-6 space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-slate-200 mb-2">Visibility</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              ['published', 'Published', 'Anyone can find, use and save it.'],
              ['draft', 'Draft', 'Only you (and admins) can see it.']
            ].map(([val, label, hint]) => (
              <label
                key={val}
                className={`flex gap-3 rounded-xl border p-3 cursor-pointer ${
                  values.status === val ? 'border-brand-500/50 bg-brand-500/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <input type="radio" name="status" value={val} checked={values.status === val} onChange={set('status')} className="mt-1 accent-brand-500" />
                <span>
                  <span className="block text-sm font-medium text-white">{label}</span>
                  <span className="block text-xs text-slate-400">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          {mode === 'edit' && initial.status === 'archived' && (
            <p className="mt-2 text-xs text-slate-500">This prompt is currently archived. Choosing an option above changes that.</p>
          )}
        </fieldset>

        {mode === 'edit' && (
          <div>
            <label htmlFor="pf-notes" className="block text-sm font-medium text-slate-200 mb-1.5">
              What changed? <span className="font-normal text-slate-500">(saved with the new version)</span>
            </label>
            <input
              id="pf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={LIMITS.notes}
              placeholder="e.g. Added a rule to keep page numbers"
              className="field"
            />
            <p className="mt-1 text-xs text-slate-500">
              {contentChanged
                ? `Saving creates version ${(initial.version || 1) + 1}. Version ${initial.version || 1} stays in the history.`
                : 'The prompt text is unchanged, so no new version will be created.'}
            </p>
          </div>
        )}
      </section>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={() => window.history.back()} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={submitting || (mode === 'edit' && !dirty)} className="btn-primary">
          {submitting
            ? 'Saving…'
            : mode === 'create'
            ? values.status === 'draft'
              ? 'Save draft'
              : 'Publish prompt'
            : contentChanged
            ? `Save as version ${(initial.version || 1) + 1}`
            : 'Save changes'}
        </button>
      </div>
    </form>
  );
};
