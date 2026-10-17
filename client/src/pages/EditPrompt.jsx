import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PromptForm } from '../components/PromptForm';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useUnsavedChangesWarning } from '../utils/useUnsavedChangesWarning';

export const EditPrompt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const [prompt, setPrompt] = useState(null);
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty && !submitting);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, c, m] = await Promise.all([api.getPromptById(id), api.getCategories(), api.getModels()]);
      setPrompt(p.data);
      setCategories(c.data);
      setModels(m.data);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError('');
    try {
      const res = await api.updatePrompt(id, payload);
      toast.success(res.newVersion ? `Saved as version ${res.newVersion}.` : 'Changes saved.');
      setDirty(false);
      navigate(`/prompts/${id}`);
    } catch (err) {
      setServerError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading prompt…" fullScreen />;
  if (loadError) {
    return loadError.status === 404 ? (
      <ErrorState title="Prompt not found" message="It may have been deleted." actionLabel="Go to my prompts" onAction={() => navigate('/my-prompts')} />
    ) : (
      <ErrorState message={loadError.message} onRetry={load} />
    );
  }

  const isOwner = user && user.userId === prompt.creator_id;
  if (!isOwner && !isAdmin) {
    return (
      <ErrorState
        title="You can't edit this prompt"
        message="Only its creator or an admin can edit it."
        actionLabel="View prompt"
        onAction={() => navigate(`/prompts/${id}`)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <Link to={`/prompts/${id}`} className="text-xs text-slate-500 hover:text-slate-300">
          Back to prompt
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-white tracking-tight">Edit prompt</h1>
        <p className="mt-1 text-sm text-slate-400">
          Currently version {prompt.latestVersion?.version_number || 1}. Changing the prompt text saves a new version; older versions are kept.
        </p>
        {!isOwner && isAdmin && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            You're editing {prompt.creator_name}'s prompt as an admin. A new version will be recorded under your name.
          </p>
        )}
      </header>
      <PromptForm
        mode="edit"
        initial={{
          title: prompt.title,
          description: prompt.description || '',
          content: prompt.latestVersion?.content || '',
          category_id: String(prompt.category_id),
          model_id: String(prompt.model_id),
          tags: (prompt.tags || []).map((t) => t.tag_name),
          status: prompt.status,
          version: prompt.latestVersion?.version_number || 1
        }}
        categories={categories}
        models={models}
        onSubmit={handleSubmit}
        submitting={submitting}
        serverError={serverError}
        onDirtyChange={setDirty}
      />
    </div>
  );
};
