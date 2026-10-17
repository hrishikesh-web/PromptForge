import React, { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';

const TEMPLATE = [
  'Explain ',
  { key: 'topic' },
  ' from ',
  { key: 'subject' },
  ' in plain words first, then write a ',
  { key: 'marks' },
  '-mark exam answer with a diagram described in words.'
];

const EXAMPLES = [
  { topic: 'normalisation (1NF to BCNF)', subject: 'DBMS', marks: '10' },
  { topic: 'the TCP three-way handshake', subject: 'Computer Networks', marks: '5' },
  { topic: 'deadlock prevention', subject: 'Operating Systems', marks: '8' }
];
const KEYS = ['topic', 'subject', 'marks'];

/**
 * The home-page demonstration: one template, its blanks filling in one at a
 * time, cycling through a few student examples. With "reduce motion" turned on
 * it simply shows the first example already filled.
 */
export const TemplateDemo = () => {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [example, setExample] = useState(0);
  const [filled, setFilled] = useState(reduce ? KEYS.length : 0);

  useEffect(() => {
    if (reduce) return undefined;
    const delay = filled === 0 ? 900 : filled < KEYS.length ? 700 : 2600;
    const t = setTimeout(() => {
      if (filled < KEYS.length) setFilled(filled + 1);
      else {
        setFilled(0);
        setExample((e) => (e + 1) % EXAMPLES.length);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [filled, reduce]);

  const values = EXAMPLES[example];

  return (
    <figure className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/40" aria-label="Example of a reusable prompt template">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-sm font-medium text-white">Explain it twice: simple, then exam-ready</span>
        <span className="text-xs text-slate-500">Study & Exams</span>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-3">
        {KEYS.map((key, i) => (
          <div key={key}>
            <p className="text-[11px] text-slate-500 mb-1 capitalize">{key}</p>
            <div
              className={`h-8 rounded-md border px-2 flex items-center text-xs font-mono truncate transition-colors duration-300 ${
                i < filled ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-dashed border-slate-700 text-slate-600'
              }`}
            >
              {i < filled ? values[key] : `{{${key}}}`}
            </div>
          </div>
        ))}
      </div>
      <blockquote className="border-t border-slate-800 px-4 py-4 font-mono text-[13px] leading-relaxed text-slate-300">
        {TEMPLATE.map((part, i) => {
          if (typeof part === 'string') return <React.Fragment key={i}>{part}</React.Fragment>;
          const idx = KEYS.indexOf(part.key);
          const done = idx < filled;
          return (
            <mark
              key={i}
              className={`rounded px-1 transition-colors duration-300 ${done ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}
            >
              {done ? values[part.key] : `{{${part.key}}}`}
            </mark>
          );
        })}
      </blockquote>
      <figcaption className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
        <span>{filled === KEYS.length ? 'Ready to paste into any chat assistant' : `${KEYS.length - filled} blank${KEYS.length - filled === 1 ? '' : 's'} left`}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium ${filled === KEYS.length ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          <Copy className="w-3.5 h-3.5" />
          Copy prompt
        </span>
      </figcaption>
    </figure>
  );
};
