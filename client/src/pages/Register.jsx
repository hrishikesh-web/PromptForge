import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthShell } from '../components/AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Register = () => {
  const { register, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', bio: '' });
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const errors = {
    name: form.name.trim().length < 2 ? 'Enter your name (at least 2 characters).' : null,
    email: !EMAIL_RE.test(form.email.trim()) ? 'Enter a valid email address.' : null,
    password: form.password.length < 8 ? 'Use at least 8 characters.' : form.password.length > 72 ? 'Use at most 72 characters.' : null,
    confirmPassword: form.confirmPassword !== form.password ? "Passwords don't match." : null
  };
  const invalid = Object.values(errors).some(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    setError('');
    setLoading(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), bio: form.bio.trim() });
      toast.success('Account created. Welcome to PromptForge.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create the account.');
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key) => touched && errors[key] && <p className="mt-1 text-xs text-rose-300">{errors[key]}</p>;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save prompts, keep versions, and share templates with others."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-300 hover:text-brand-200 font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="r-name" className="block text-sm font-medium text-slate-300 mb-1.5">
            Name
          </label>
          <input id="r-name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={100} className="field" />
          {fieldError('name')}
        </div>
        <div>
          <label htmlFor="r-email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Email
          </label>
          <input id="r-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} maxLength={150} className="field" />
          {fieldError('email')}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="r-pass" className="block text-sm font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <input id="r-pass" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} className="field" />
            {fieldError('password')}
          </div>
          <div>
            <label htmlFor="r-pass2" className="block text-sm font-medium text-slate-300 mb-1.5">
              Confirm password
            </label>
            <input id="r-pass2" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} className="field" />
            {fieldError('confirmPassword')}
          </div>
        </div>
        <div>
          <label htmlFor="r-bio" className="block text-sm font-medium text-slate-300 mb-1.5">
            About you <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="r-bio"
            rows={2}
            value={form.bio}
            onChange={set('bio')}
            maxLength={500}
            placeholder="e.g. CSE student. I mostly save prompts for exam prep and debugging."
            className="field resize-y"
          />
        </div>
        <p className="text-xs text-slate-500">New accounts are regular users. Only an existing admin can grant admin access.</p>
        <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
};
