import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getNavSections } from './navItems';

export const NavList = ({ onNavigate }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const sections = getNavSections({ isAuthenticated, isAdmin, unreadCount });

  return (
    <nav className="space-y-6" aria-label="Main">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-3 mb-1.5 text-xs font-medium text-slate-500">{section.label}</p>
          <ul className="space-y-0.5">
            {section.items.map(({ label, path, icon: Icon, badge, end }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-slate-800/80 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white" aria-label={`${badge} unread`}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export const Sidebar = () => (
  <aside className="hidden md:block w-56 shrink-0 border-r border-slate-800/70 px-3 py-6">
    <div className="sticky top-20">
      <NavList />
    </div>
  </aside>
);
