import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PromptForm } from '../components/PromptForm';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useUnsavedChangesWarning } from '../utils/useUnsavedChangesWarning';
import { AGNOSTIC_PROVIDER } from '../utils/models';

export const CreatePrompt = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty && !submitting);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [c, m] = await Promise.all([api.getCategories(), api.getModels()]);
      setCategories(c.data);
      setModels(m.data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError('');
    try {
      const res = await api.createPrompt(payload);
      toast.success(payload.status === 'draft' ? 'Draft saved. Only you can see it.' : 'Prompt published.');
      setDirty(false);
      navigate(`/prompts/${res.promptId}`);
    } catch (err) {
      setServerError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading…" fullScreen />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  const defaultModel = models.find((m) => m.provider === AGNOSTIC_PROVIDER && /chat/i.test(m.model_name)) || models[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white tracking-tight">New prompt</h1>
        <p className="mt-1 text-sm text-slate-400">
          Write it once, mark the parts that change with {'{{placeholders}}'}, and reuse it every time.
        </p>
      </header>
      <PromptForm
        mode="create"
        initial={{
          title: '',
          description: '',
          content: '',
          category_id: '',
          model_id: defaultModel ? String(defaultModel.model_id) : '',
          tags: [],
          status: 'published',
          version: 1
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
