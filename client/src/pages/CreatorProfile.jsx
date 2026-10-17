import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, FileText } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { PromptCard } from '../components/PromptCard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/format';

export const CreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated, refreshProfile } = useAuth();
  const [creator, setCreator] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '' });
  const [saving, setSaving] = useState(false);

  const isSelf = Boolean(user && String(user.userId) === String(id));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCreatorProfile(id);
      setCreator(res.creator);
      setPrompts(res.prompts);
      setFollowing(Boolean(res.creator.is_following));
      setFollowers(Number(res.creator.followers_count) || 0);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async () => {
    if (!isAuthenticated) return navigate('/login');
    setBusy(true);
    try {
      const res = await api.toggleFollow(id);
      setFollowing(res.isFollowing);
      setFollowers(res.followersCount);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({ name: form.name.trim(), bio: form.bio.trim() });
      toast.success('Profile updated.');
      setEditOpen(false);
      refreshProfile();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading profile…" fullScreen />;
  if (error) {
    return error.status === 404 ? (
      <ErrorState title="Profile not found" message="This account may have been removed." actionLabel="Explore prompts" onAction={() => navigate('/explore')} />
    ) : (
      <ErrorState message={error.message} onRetry={load} />
    );
  }

  const stats = [
    ['Prompts', creator.prompts_count],
    ['Followers', followers],
    ['Following', creator.following_count],
    ['Likes received', creator.total_likes_received],
    ['Saves received', creator.total_bookmarks_received]
  ];

  return (
    <div className="space-y-8">
      <header className="panel p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <Avatar name={creator.name} id={creator.user_id} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-white tracking-tight">{creator.name}</h1>
              {creator.role === 'ADMIN' && (
                <span className="rounded px-1.5 text-[11px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20">Admin</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Joined {formatDate(creator.created_at, { month: 'long', year: 'numeric' })}
              {creator.email ? `. ${creator.email} (visible only to you${isSelf ? '' : ' and admins'})` : ''}
            </p>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 leading-relaxed">
              {creator.bio || (isSelf ? 'Add a short bio so people know what kind of prompts you write.' : 'No bio yet.')}
            </p>
          </div>
          <div className="shrink-0">
            {isSelf ? (
              <button
                onClick={() => {
                  setForm({ name: creator.name, bio: creator.bio || '' });
                  setEditOpen(true);
                }}
                className="btn-secondary"
              >
                <Pencil className="w-4 h-4" /> Edit profile
              </button>
            ) : (
              <button onClick={toggleFollow} disabled={busy} className={following ? 'btn-secondary' : 'btn-primary'}>
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-3 border-t border-slate-800 pt-5">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-lg font-semibold text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="published-heading">
        <h2 id="published-heading" className="text-lg font-semibold text-white">
          Published prompts
        </h2>
        {prompts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No published prompts yet"
            description={isSelf ? 'Your drafts are in My prompts.' : `${creator.name.split(' ')[0]} hasn't published anything yet.`}
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {prompts.map((p) => (
              <PromptCard key={p.prompt_id} prompt={p} />
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" maxWidth="max-w-lg">
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label htmlFor="p-name" className="block text-sm font-medium text-slate-300 mb-1.5">
              Display name
            </label>
            <input id="p-name" required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
          </div>
          <div>
            <label htmlFor="p-bio" className="block text-sm font-medium text-slate-300 mb-1.5">
              Bio
            </label>
            <textarea id="p-bio" rows={4} maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="field resize-y" />
            <p className="mt-1 text-xs text-slate-500">{form.bio.length}/500</p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving || form.name.trim().length < 2} className="btn-primary">
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
