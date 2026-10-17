import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { TagBadge } from './TagBadge';
import { MAX_TAGS, normalizeTagInput, isValidTag } from '../utils/tags';

/**
 * Tag picker: suggests existing tags while typing (most-used first) so people
 * reuse "#open-book" instead of creating "#openbook". New tags are allowed and
 * shown exactly as they will be saved. Maximum of MAX_TAGS tags.
 */
export const TagInput = ({ id = 'tags', value, onChange }) => {
  const [allTags, setAllTags] = useState([]);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    api
      .getTags()
      .then((res) => setAllTags(res.data || []))
      .catch(() => setAllTags([]));
  }, []);

  const typed = normalizeTagInput(text);
  const full = value.length >= MAX_TAGS;

  const suggestions = useMemo(() => {
    const chosen = new Set(value);
    return allTags
      .filter((t) => !chosen.has(t.tag_name) && (!typed || t.tag_name.includes(typed)))
      .sort((a, b) => {
        const aStarts = typed && a.tag_name.startsWith(typed) ? 0 : 1;
        const bStarts = typed && b.tag_name.startsWith(typed) ? 0 : 1;
        return aStarts - bStarts || Number(b.prompt_count) - Number(a.prompt_count);
      })
      .slice(0, 8);
  }, [allTags, typed, value]);

  const exactExists = allTags.some((t) => t.tag_name === typed);
  const options = [
    ...suggestions.map((t) => ({ name: t.tag_name, count: Number(t.prompt_count), existing: true })),
    ...(typed && isValidTag(typed) && !exactExists && !value.includes(typed) ? [{ name: typed, existing: false }] : [])
  ];

  const add = (name) => {
    const tag = normalizeTagInput(name);
    if (!isValidTag(tag) || value.includes(tag) || full) return;
    onChange([...value, tag]);
    setText('');
    setActive(0);
    inputRef.current?.focus();
  };

  const remove = (tag) => onChange(value.filter((t) => t !== tag));

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (!text.trim()) return;
      if (e.key !== 'Tab' || options.length) e.preventDefault();
      const pick = open && options[active] ? options[active].name : text;
      add(pick);
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const listId = `${id}-suggestions`;

  return (
    <div className="relative">
      <div
        className="field !p-2 flex flex-wrap items-center gap-1.5 cursor-text min-h-[44px]"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <TagBadge key={tag} name={tag} onRemove={() => remove(tag)} />
        ))}
        {!full && (
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            placeholder={value.length ? 'Add another' : 'e.g. open-book, react, no-spoilers'}
            className="flex-1 min-w-[10rem] bg-transparent px-1 py-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-500">
        {full
          ? `Maximum of ${MAX_TAGS} tags reached.`
          : `${value.length}/${MAX_TAGS}. Press Enter or comma to add.${typed && text.trim() !== typed ? ` Will be saved as #${typed}.` : ''}`}
      </p>

      {open && !full && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl shadow-black/40"
        >
          {options.map((opt, i) => (
            <li
              key={opt.name}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                add(opt.name);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${i === active ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
            >
              <span>
                <span className="text-slate-500">#</span>
                {opt.name}
              </span>
              <span className="text-xs text-slate-500">{opt.existing ? `${opt.count} prompt${opt.count === 1 ? '' : 's'}` : 'New tag'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
