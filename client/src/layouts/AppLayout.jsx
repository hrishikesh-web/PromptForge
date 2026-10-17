
import React, { useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

export const AppLayout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] btn-primary"
      >
        Skip to content
      </a>

      <Navbar />

      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        <Sidebar />

        <main
          id="main"
          className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
        >
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-slate-800/70 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            PromptForge, a DBMS course project. Prompts are user-written
            templates; check AI output before relying on it.
          </p>

          <Link to="/analytics" className="hover:text-slate-300">
            How the database is used
          </Link>
        </div>
      </footer>
    </div>
  );
};
