/**
 * Same normalisation rule as the server (server/utils/tags.js), used to show
 * users exactly how a tag will be saved while they type.
 */
export const MAX_TAGS = 5;

export const normalizeTagInput = (raw) =>
  String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/^#+/, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const isValidTag = (t) => t.length >= 2 && t.length <= 40;
