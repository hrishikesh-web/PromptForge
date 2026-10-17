import React from 'react';

/** PromptForge mark: a pair of braces, the same shape as a {{placeholder}}. */
export const Logo = ({ showTagline = false }) => (
  <span className="flex items-center gap-2.5">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-mono text-sm font-semibold text-white">
      {'{ }'}
    </span>
    <span className="leading-tight">
      <span className="block text-[15px] font-semibold tracking-tight text-white">PromptForge</span>
      {showTagline && <span className="block text-[11px] text-slate-400">Save it. Customise it. Reuse it.</span>}
    </span>
  </span>
);
