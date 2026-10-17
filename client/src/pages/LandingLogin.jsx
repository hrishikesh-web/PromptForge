import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AuthShell } from '../components/AuthShell';
import { Avatar } from '../components/Avatar';

/**
 * Sign-in page. There are NO hard-coded credentials here.
 * If the server runs with DEMO_MODE=true, it lists the demo USER accounts
 * (names and emails only); clicking one fills the email field and the
 * presenter types the local demo password.
 */
export const LandingLogin = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = typeof location.state?.from === 'string' ? location.state.from : location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    api
      .getDemoAccounts()
      .then((res) => setDemoAccounts(res.data || []))
      .catch(() => setDemoAccounts([])); // 404 when demo mode is off — that's expected
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Your saved prompts are waiting."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="text-brand-300 hover:text-brand-200 font-medium">
            Create an account
          </Link>
          <span className="mx-2 text-slate-700">|</span>
          <Link to="/explore" className="hover:text-white">
            Browse without signing in
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
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field !pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {demoAccounts.length > 0 && (
        <section className="mt-8 rounded-xl border border-slate-800 p-4" aria-labelledby="demo-heading">
          <h2 id="demo-heading" className="text-sm font-medium text-white">
            Demo accounts
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Local demonstration mode. Choose an account to fill in its email, then type the demo password set with{' '}
            <code className="text-slate-400">npm run demo:passwords</code>.
          </p>
          <ul className="mt-3 space-y-1">
            {demoAccounts.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setError('');
                    document.getElementById('password')?.focus();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-900 ${email === a.email ? 'bg-slate-900' : ''}`}
                >
                  <Avatar name={a.name} id={a.email.length} size="sm" />
                  <span className="min-w-0 leading-tight">
                    <span className="block text-sm text-slate-200">{a.name}</span>
                    <span className="block text-xs text-slate-500 truncate">{a.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AuthShell>
  );
};
