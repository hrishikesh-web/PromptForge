import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

/** Shared frame for the sign-in and registration pages. */
export const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen grid lg:grid-cols-2">
    <div className="hidden lg:flex flex-col justify-between border-r border-slate-800/70 bg-slate-900/30 p-10">
      <Link to="/" aria-label="PromptForge home">
        <Logo showTagline />
      </Link>
      <div className="max-w-md">
        <p className="text-2xl font-semibold leading-snug text-white">
          A prompt you wrote well once shouldn't have to be written again.
        </p>
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
          Save templates with <span className="slot">{'{{placeholders}}'}</span> for the parts that change, keep every version, and
          share the ones that work.
        </p>
      </div>
      <p className="text-xs text-slate-500">PromptForge, a DBMS course project.</p>
    </div>

    <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
      <div className="w-full max-w-sm mx-auto">
        <Link to="/" className="lg:hidden inline-block mb-8" aria-label="PromptForge home">
          <Logo />
        </Link>
        <h1 className="text-2xl font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 text-sm text-slate-400">{footer}</div>}
      </div>
    </div>
  </div>
);
