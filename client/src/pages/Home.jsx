import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Copy, History } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TemplateDemo } from '../components/TemplateDemo';
import { PromptCard } from '../components/PromptCard';
import { Dashboard } from './Dashboard';

const STEPS = [
  { icon: Search, title: 'Find a template', text: 'Browse by category or search for the task you keep repeating: exam notes, code review, a game setting.' },
  { icon: SlidersHorizontal, title: 'Fill in the blanks', text: 'Each template marks what changes with {{placeholders}}. Type your topic, subject or file details.' },
  { icon: Copy, title: 'Copy and reuse', text: 'Paste the finished prompt into the AI tool you already use. Save the template to find it next time.' }
];

/** Public home page. Signed-in users get their personal dashboard instead. */
export const Home = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Dashboard /> : <PublicHome />;
};

const PublicHome = () => {
  const [categories, setCategories] = useState([]);
  const [popular, setPopular] = useState([]);

  useEffect(() => {
    api.getCategories().then((r) => setCategories(r.data.filter((c) => Number(c.prompt_count) > 0))).catch(() => {});
    api.getPrompts({ sort: 'popular', limit: 6 }).then((r) => setPopular(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-16 lg:space-y-20">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] pt-2 lg:pt-6">
        <div>
          <h1 className="text-[2.1rem] sm:text-5xl font-semibold tracking-tight text-white leading-[1.08]">
            Stop rewriting the same prompt.
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-300 leading-relaxed">
            PromptForge is a library of reusable AI prompt templates. Find one for a task you repeat every week, fill in the blanks,
            and copy it into any AI tool.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/explore" className="btn-primary !px-5 !py-2.5">
              Explore prompts
            </Link>
            <Link to="/register" className="btn-secondary !px-5 !py-2.5">
              Create a free account
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">Save it. Customise it. Reuse it.</p>
        </div>
        <TemplateDemo />
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-xl font-semibold text-white">
          How it works
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="panel p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-300">
                  {i + 1}
                </span>
                <Icon className="w-4 h-4 text-brand-300" />
              </div>
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <History className="w-4 h-4" />
          Every edit is kept as a new version, so a template can improve without losing what worked before.
        </p>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="text-xl font-semibold text-white">
            Browse by category
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.category_id}>
                <Link
                  to={`/explore?category_id=${c.category_id}`}
                  className="block h-full rounded-xl border border-slate-800 px-4 py-3.5 transition-colors hover:border-slate-600 hover:bg-slate-900/60"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.prompt_count}</span>
                  </span>
                  {c.description && <span className="mt-1 block text-sm text-slate-400 line-clamp-2">{c.description}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {popular.length > 0 && (
        <section aria-labelledby="popular-heading">
          <div className="flex items-end justify-between gap-4">
            <h2 id="popular-heading" className="text-xl font-semibold text-white">
              Most saved
            </h2>
            <Link to="/explore?sort=popular" className="text-sm text-brand-300 hover:text-brand-200">
              See all
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {popular.map((p) => (
              <PromptCard key={p.prompt_id} prompt={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
