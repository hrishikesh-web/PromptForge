import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../ConfirmDialog';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { Avatar } from '../Avatar';
import { formatDate } from '../../utils/format';

const DEMO_DOMAIN = '@demo.promptforge.test';

export const AdminUsers = ({ onChange }) => {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleChange, setRoleChange] = useState(null); // { user, role }
  const [toDelete, setToDelete] = useState(null); // { user, impact }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [u, r] = await Promise.all([api.getAdminUsers(), api.getAdminRoles()]);
      setUsers(u.data);
      setRoles(r.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const askDelete = async (user) => {
    try {
      const res = await api.getUserDeleteImpact(user.user_id);
      setToDelete({ user, impact: res.data });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const applyRole = async () => {
    setSaving(true);
    try {
      const res = await api.updateUserRole(roleChange.user.user_id, roleChange.role.role_id);
      toast.success(res.message);
      setRoleChange(null);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const applyDelete = async () => {
    setSaving(true);
    try {
      const res = await api.deleteUser(toDelete.user.user_id);
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

  if (loading) return <LoadingState message="Loading users…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const impact = toDelete?.impact;
  const blocked = impact && impact.blocking_versions > 0;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        Changing a role here updates <code className="text-slate-300">users.role_id</code>. It takes effect on that user's next request.
      </p>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Users</caption>
          <thead className="text-left text-xs text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Activity</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {users.map((u) => {
              const isMe = me && u.user_id === me.userId;
              return (
                <tr key={u.user_id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} id={u.user_id} size="sm" />
                      <div className="min-w-0">
                        <Link to={`/creators/${u.user_id}`} className="font-medium text-white hover:text-brand-300">
                          {u.name}
                        </Link>
                        {isMe && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                        <p className="text-xs text-slate-500 truncate">
                          {u.email}
                          {u.email.endsWith(DEMO_DOMAIN) && <span className="ml-1.5 text-slate-600">demo account</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell whitespace-nowrap">
                    {u.prompt_count} prompts, {u.version_count} versions
                    <br />
                    {u.like_count} likes, {u.bookmark_count} saves, {u.rating_count} ratings
                  </td>
                  <td className="px-4 py-3">
                    <label htmlFor={`role-${u.user_id}`} className="sr-only">
                      Role for {u.name}
                    </label>
                    <select
                      id={`role-${u.user_id}`}
                      value={u.role_id}
                      disabled={isMe}
                      title={isMe ? "You can't change your own role" : undefined}
                      onChange={(e) => {
                        const role = roles.find((r) => r.role_id === Number(e.target.value));
                        if (role) setRoleChange({ user: u, role });
                      }}
                      className="field !w-28 !py-1.5 disabled:opacity-60"
                    >
                      {roles.map((r) => (
                        <option key={r.role_id} value={r.role_id}>
                          {r.role_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell whitespace-nowrap">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {!isMe && (
                      <button onClick={() => askDelete(u)} className="btn-ghost !px-2 !py-1 !text-xs hover:!text-rose-300">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={Boolean(roleChange)}
        onClose={() => setRoleChange(null)}
        onConfirm={applyRole}
        loading={saving}
        title={`Make ${roleChange?.user.name} ${roleChange?.role.role_name}?`}
        message={
          roleChange?.role.role_name === 'ADMIN'
            ? 'Admins can moderate content, delete prompts and users, and manage categories, models and tags.'
            : 'They will lose access to the admin area on their next request.'
        }
        confirmText={`Make ${roleChange?.role.role_name}`}
      />

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={blocked ? () => setToDelete(null) : applyDelete}
        loading={saving}
        isDestructive={!blocked}
        title={blocked ? `${toDelete?.user.name} can't be deleted` : `Delete ${toDelete?.user.name}?`}
        message={
          blocked
            ? `They wrote ${impact.blocking_versions} version(s) of other people's prompts. Version history is protected by ON DELETE RESTRICT. Change their role instead.`
            : 'This permanently deletes the account and everything that depends on it:'
        }
        details={
          impact && !blocked ? (
            <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
              <li>
                {impact.prompts} prompt(s) with {impact.versions_on_own_prompts} version(s)
              </li>
              <li>
                Other people's activity on those prompts: {impact.others_likes_on_their_prompts} likes, {impact.others_comments_on_their_prompts}{' '}
                comments
              </li>
              <li>
                Their own {impact.likes_given} likes, {impact.bookmarks} bookmarks, {impact.ratings_given} ratings, {impact.comments} comments and{' '}
                {impact.follows} follows
              </li>
              <li>Activity-log entries are kept, with the user shown as deleted (ON DELETE SET NULL)</li>
            </ul>
          ) : null
        }
        confirmText={blocked ? 'OK' : 'Delete user'}
        cancelText={blocked ? 'Close' : 'Cancel'}
      />
    </div>
  );
};
