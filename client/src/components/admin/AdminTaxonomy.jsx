import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../Modal';
import { ConfirmDialog } from '../ConfirmDialog';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { normalizeTagInput } from '../../utils/tags';

/**
 * Admin management of the three lookup tables that prompts reference:
 * categories (prompts.category_id), ai_models (prompts.model_id) and tags (prompt_tags).
 */
export const AdminTaxonomy = ({ onChange }) => {
  const [section, setSection] = useState('categories');
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="group" aria-label="Choose what to manage">
        {[
          ['categories', 'Categories'],
          ['models', 'Suggested models'],
          ['tags', 'Tags']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            aria-pressed={section === key}
            className={`rounded-full px-3 py-1 text-xs border ${
              section === key ? 'border-brand-500/50 bg-brand-500/15 text-brand-100' : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {section === 'categories' && <CategoryManager onChange={onChange} />}
      {section === 'models' && <ModelManager onChange={onChange} />}
      {section === 'tags' && <TagManager onChange={onChange} />}
    </div>
  );
};

/* ------------------------------------------------------------------ helpers */

const useList = (loader) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await loader();
      setItems(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    load();
  }, [load]);
  return { items, loading, error, load };
};

const Field = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

/* ------------------------------------------------------------------ categories */

const CategoryManager = ({ onChange }) => {
  const toast = useToast();
  const { items, loading, error, load } = useList(api.getCategories);
  const [editing, setEditing] = useState(null); // {} for new, or a category
  const [form, setForm] = useState({ name: '', description: '' });
  const [toDelete, setToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const open = (cat) => {
    setEditing(cat || {});
    setForm({ name: cat?.name || '', description: cat?.description || '' });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = editing.category_id ? await api.updateCategory(editing.category_id, form) : await api.createCategory(form);
      toast.success(res.message);
      setEditing(null);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      const res = await api.deleteCategory(toDelete.category_id);
      toast.success(res.message);
      setToDelete(null);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
      setToDelete(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading categories…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">A category in use can't be deleted (ON DELETE RESTRICT). Move its prompts first.</p>
        <button onClick={() => open(null)} className="btn-primary !py-1.5 shrink-0">
          <Plus className="w-4 h-4" /> New category
        </button>
      </div>
      <div className="panel divide-y divide-slate-800/70">
        {items.map((c) => (
          <div key={c.category_id} className="flex items-start gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{c.name}</p>
              {c.description && <p className="text-sm text-slate-400 line-clamp-2">{c.description}</p>}
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap pt-1">
              {c.total_prompt_count} prompt{c.total_prompt_count === 1 ? '' : 's'}
            </span>
            <button onClick={() => open(c)} className="btn-ghost !p-1.5" aria-label={`Edit ${c.name}`}>
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => setToDelete(c)} className="btn-ghost !p-1.5 hover:!text-rose-300" aria-label={`Delete ${c.name}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.category_id ? 'Edit category' : 'New category'} maxWidth="max-w-lg">
        <form onSubmit={save} className="space-y-4">
          <Field id="cat-name" label="Name">
            <input id="cat-name" required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
          </Field>
          <Field id="cat-desc" label="Description" hint="One sentence shown on the Explore page.">
            <textarea id="cat-desc" rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field resize-y" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing?.category_id ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={saving}
        isDestructive
        title={`Delete "${toDelete?.name}"?`}
        message={
          toDelete?.total_prompt_count > 0
            ? `It is used by ${toDelete.total_prompt_count} prompt(s), so the server will refuse. Move those prompts to another category first.`
            : 'This category has no prompts and will be removed.'
        }
        confirmText="Delete category"
      />
    </>
  );
};

/* ------------------------------------------------------------------ models */

const ModelManager = ({ onChange }) => {
  const toast = useToast();
  const { items, loading, error, load } = useList(api.getModels);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ model_name: '', provider: '', context_window: '' });
  const [toDelete, setToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const open = (m) => {
    setEditing(m || {});
    setForm({ model_name: m?.model_name || '', provider: m?.provider || '', context_window: m?.context_window ? String(m.context_window) : '' });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, context_window: form.context_window === '' ? 0 : form.context_window };
      const res = editing.model_id ? await api.updateModel(editing.model_id, body) : await api.createModel(body);
      toast.success(res.message);
      setEditing(null);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      const res = await api.deleteModel(toDelete.model_id);
      toast.success(res.message);
      setToDelete(null);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
      setToDelete(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading models…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex justify-between items-center gap-4">
        <p className="text-sm text-slate-400">
          Shown on prompts as "Suggested model". Use rows like "Any chat model" for prompts that work everywhere.
        </p>
        <button onClick={() => open(null)} className="btn-primary !py-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Add model
        </button>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Suggested models</caption>
          <thead className="text-left text-xs text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Context window</th>
              <th className="px-4 py-3 font-medium">Prompts</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {items.map((m) => (
              <tr key={m.model_id}>
                <td className="px-4 py-3 font-medium text-white">{m.model_name}</td>
                <td className="px-4 py-3 text-slate-300">{m.provider}</td>
                <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{m.context_window ? `${Number(m.context_window).toLocaleString('en-IN')} tokens` : '–'}</td>
                <td className="px-4 py-3 text-slate-300">{m.total_prompt_count}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => open(m)} className="btn-ghost !p-1.5" aria-label={`Edit ${m.model_name}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setToDelete(m)} className="btn-ghost !p-1.5 hover:!text-rose-300" aria-label={`Delete ${m.model_name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.model_id ? 'Edit model' : 'Add model'} maxWidth="max-w-lg">
        <form onSubmit={save} className="space-y-4">
          <Field id="m-name" label="Model name" hint='e.g. "Any chat model" or a specific product you actually use'>
            <input id="m-name" required minLength={2} maxLength={100} value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} className="field" />
          </Field>
          <Field id="m-provider" label="Provider" hint='Use "Model-agnostic" for general rows.'>
            <input id="m-provider" required maxLength={100} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="field" />
          </Field>
          <Field id="m-cw" label="Context window (tokens, optional)">
            <input id="m-cw" type="number" min={0} value={form.context_window} onChange={(e) => setForm({ ...form, context_window: e.target.value })} className="field" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing?.model_id ? 'Save changes' : 'Add model'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={saving}
        isDestructive
        title={`Delete "${toDelete?.model_name}"?`}
        message={
          toDelete?.total_prompt_count > 0
            ? `${toDelete.total_prompt_count} prompt(s) suggest this model, so the server will refuse. Change those prompts first.`
            : 'No prompts use this model; it will be removed.'
        }
        confirmText="Delete model"
      />
    </>
  );
};

/* ------------------------------------------------------------------ tags */

const TagManager = ({ onChange }) => {
  const toast = useToast();
  const { items, loading, error, load } = useList(api.getTags);
  const [filter, setFilter] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');
  const [mergeAsk, setMergeAsk] = useState(null); // message when the name already exists
  const [toDelete, setToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const shown = useMemo(() => {
    const f = normalizeTagInput(filter);
    return f ? items.filter((t) => t.tag_name.includes(f)) : items;
  }, [items, filter]);
  const unused = items.filter((t) => Number(t.prompt_count) === 0).length;

  const rename = async (merge = false) => {
    setSaving(true);
    try {
      const res = await api.updateTag(renaming.tag_id, newName, merge);
      toast.success(res.message);
      setRenaming(null);
      setMergeAsk(null);
      load();
      onChange?.();
    } catch (err) {
      if (err.data?.code === 'TAG_EXISTS') setMergeAsk(err.message);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      const res = await api.deleteTag(toDelete.tag_id);
      toast.success(res.message);
      setToDelete(null);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading tags…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {items.length} tags, {unused} not used by any public prompt. Rename onto an existing tag to merge duplicates.
        </p>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <label htmlFor="tag-filter" className="sr-only">
            Filter tags
          </label>
          <input id="tag-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter tags" className="field !pl-9 !py-1.5" />
        </div>
      </div>

      <div className="panel p-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
        {shown.map((t) => (
          <div key={t.tag_id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-900">
            <span className="text-sm text-slate-200 flex-1 truncate">
              <span className="text-slate-500">#</span>
              {t.tag_name}
            </span>
            <span className={`text-xs ${Number(t.prompt_count) === 0 ? 'text-amber-300/80' : 'text-slate-500'}`}>{t.prompt_count}</span>
            <button
              onClick={() => {
                setRenaming(t);
                setNewName(t.tag_name);
                setMergeAsk(null);
              }}
              className="btn-ghost !p-1"
              aria-label={`Rename ${t.tag_name}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setToDelete(t)} className="btn-ghost !p-1 hover:!text-rose-300" aria-label={`Delete ${t.tag_name}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {shown.length === 0 && <p className="p-4 text-sm text-slate-500">No tags match.</p>}
      </div>

      <Modal isOpen={Boolean(renaming)} onClose={() => setRenaming(null)} title={`Rename #${renaming?.tag_name}`} maxWidth="max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            rename(false);
          }}
          className="space-y-4"
        >
          <Field id="tag-new" label="New name" hint={`Saved as #${normalizeTagInput(newName) || '…'} (lowercase, hyphens).`}>
            <input
              id="tag-new"
              required
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setMergeAsk(null);
              }}
              className="field"
            />
          </Field>
          {mergeAsk && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              {mergeAsk} Prompts tagged with both keep a single tag.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRenaming(null)} className="btn-ghost">
              Cancel
            </button>
            {mergeAsk ? (
              <button type="button" onClick={() => rename(true)} disabled={saving} className="btn-primary">
                {saving ? 'Merging…' : 'Merge tags'}
              </button>
            ) : (
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Rename tag'}
              </button>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={saving}
        isDestructive
        title={`Delete #${toDelete?.tag_name}?`}
        message="The tag is removed from every prompt that uses it (the prompts themselves are not deleted)."
        confirmText="Delete tag"
      />
    </>
  );
};
