/**
 * Placeholder engine for reusable prompt templates.
 *
 * A placeholder is written as {{name}}, e.g. "Explain {{topic}} to a {{year_of_study}} student".
 *  - Names start with a letter and may contain letters, numbers, spaces, _ or -.
 *  - Spaces just inside the braces are ignored: {{ topic }} is the same as {{topic}}.
 *  - The same placeholder may appear many times; it is filled once and replaced everywhere.
 *  - Unfilled placeholders are left as {{name}} so the user can see what is missing.
 *
 * Pure functions only (no React), so they can be unit-tested with `npm test`.
 */

const PLACEHOLDER_SOURCE = String.raw`\{\{\s*([A-Za-z][A-Za-z0-9 _-]{0,39}?)\s*\}\}`;

/** A fresh global RegExp each time (global regexes keep state between calls). */
const placeholderRegex = () => new RegExp(PLACEHOLDER_SOURCE, 'g');

/** Canonical key for a placeholder name: trimmed, inner whitespace collapsed. */
export const normalizeKey = (name) => name.trim().replace(/\s+/g, ' ');

/**
 * Unique placeholders in order of first appearance.
 * @returns {{ key: string, count: number }[]}
 */
export function extractPlaceholders(template) {
  if (typeof template !== 'string' || !template) return [];
  const found = new Map();
  for (const match of template.matchAll(placeholderRegex())) {
    const key = normalizeKey(match[1]);
    found.set(key, (found.get(key) || 0) + 1);
  }
  return Array.from(found, ([key, count]) => ({ key, count }));
}

/** "year_of_study" -> "Year of study", "targetFPS" -> "Target FPS" */
export function labelFor(key) {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const hasValue = (values, key) => typeof values?.[key] === 'string' && values[key].trim() !== '';

/**
 * Replace every placeholder that has a non-empty value. Missing ones stay as {{key}}.
 */
export function fillTemplate(template, values = {}) {
  if (typeof template !== 'string') return '';
  return template.replace(placeholderRegex(), (whole, name) => {
    const key = normalizeKey(name);
    return hasValue(values, key) ? values[key] : `{{${key}}}`;
  });
}

/**
 * Split a template into text and slot segments for highlighted previews.
 * @returns {{ type: 'text', text: string } | { type: 'slot', key: string, value: string, filled: boolean }}[]
 */
export function segmentTemplate(template, values = {}) {
  if (typeof template !== 'string' || !template) return [];
  const segments = [];
  let last = 0;
  for (const match of template.matchAll(placeholderRegex())) {
    if (match.index > last) segments.push({ type: 'text', text: template.slice(last, match.index) });
    const key = normalizeKey(match[1]);
    const filled = hasValue(values, key);
    segments.push({ type: 'slot', key, value: filled ? values[key] : `{{${key}}}`, filled });
    last = match.index + match[0].length;
  }
  if (last < template.length) segments.push({ type: 'text', text: template.slice(last) });
  return segments;
}

/** Keys from `placeholders` that do not yet have a value. */
export function missingKeys(placeholders, values = {}) {
  return placeholders.filter((p) => !hasValue(values, p.key)).map((p) => p.key);
}

/** Keep only values whose keys still exist in the template (e.g. after a version change). */
export function pruneValues(placeholders, values = {}) {
  const allowed = new Set(placeholders.map((p) => p.key));
  return Object.fromEntries(Object.entries(values).filter(([k]) => allowed.has(k)));
}
