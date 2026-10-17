import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { NavList } from './Sidebar';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden -ml-2 rounded-lg p-2 text-slate-300 hover:bg-slate-900"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" aria-label="PromptForge home">
            <Logo />
          </Link>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to="/create" className="btn-primary !py-1.5 hidden sm:inline-flex">
              <Plus className="w-4 h-4" />
              New prompt
            </Link>
            <Link
              to="/notifications"
              className="relative rounded-lg p-2 text-slate-300 hover:bg-slate-900 hover:text-white"
              aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-400 ring-2 ring-slate-950" aria-hidden="true" />
              )}
            </Link>
            <Link to={`/creators/${user.userId}`} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-900" title="Your profile">
              <Avatar name={user.name} id={user.userId} size="sm" />
              <span className="hidden lg:block text-left leading-tight">
                <span className="block text-sm font-medium text-white">{user.name}</span>
                {isAdmin && <span className="block text-[11px] text-rose-300">Admin</span>}
              </span>
            </Link>
            <button onClick={handleLogout} className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white" aria-label="Sign out" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link to="/login" className="btn-ghost !py-1.5">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary !py-1.5">
              Create account
            </Link>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button className="absolute inset-0 bg-slate-950/70" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-800 bg-slate-950 p-4 overflow-y-auto" role="dialog" aria-label="Menu">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-900" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavList onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
};
