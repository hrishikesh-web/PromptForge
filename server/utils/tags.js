/**
 * Tag rules (shared by prompt create/edit and admin tag management):
 *  - lowercase, words separated by single hyphens:  "Open Book Exam" -> "open-book-exam"
 *  - only a-z, 0-9 and hyphens; 2 to 40 characters
 *  - at most MAX_TAGS tags per prompt, duplicates removed
 *
 * Normalising before every lookup means "React", "react " and "#react" all
 * resolve to the same existing tag row, which prevents duplicate tags
 * (tag_name is also UNIQUE in the database).
 */
const MAX_TAGS = 5;
const MIN_LEN = 2;
const MAX_LEN = 40;

const normalizeTag = (raw) => {
  if (typeof raw !== 'string') return '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/^#+/, '')            // allow users to type "#react"
    .replace(/[\s_]+/g, '-')      // spaces/underscores -> hyphen
    .replace(/[^a-z0-9-]/g, '')   // drop anything else
    .replace(/-+/g, '-')          // collapse repeated hyphens
    .replace(/^-|-$/g, '');       // trim hyphens at the ends
};

const isValidTag = (tag) => typeof tag === 'string' && tag.length >= MIN_LEN && tag.length <= MAX_LEN;

/**
 * Validate and normalise a list of tag names from a request body.
 * Returns { tags } on success or { error } with a user-friendly message.
 */
const normalizeTagList = (input) => {
  if (input === undefined || input === null) return { tags: [] };
  if (!Array.isArray(input)) return { error: 'Tags must be a list.' };

  const seen = new Set();
  const tags = [];
  for (const raw of input) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    if (!isValidTag(tag)) {
      return { error: `Tag "${raw}" must be ${MIN_LEN}-${MAX_LEN} characters (letters, numbers, hyphens).` };
    }
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  if (tags.length > MAX_TAGS) {
    return { error: `A prompt can have at most ${MAX_TAGS} tags.` };
  }
  return { tags };
};

/**
 * Inside an open transaction: replace the tag links of a prompt.
 * Existing tags are reused; unknown ones are created (INSERT IGNORE + SELECT
 * keeps this safe even if two requests create the same tag at the same time).
 */
const setPromptTags = async (tx, promptId, tags) => {
  await tx.query('DELETE FROM prompt_tags WHERE prompt_id = ?', [promptId]);
  for (const tag of tags) {
    await tx.query('INSERT IGNORE INTO tags (tag_name) VALUES (?)', [tag]);
    const rows = await tx.query('SELECT tag_id FROM tags WHERE tag_name = ?', [tag]);
    await tx.query('INSERT IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)', [promptId, rows[0].tag_id]);
  }
};

/**
 * Lists return tags as one GROUP_CONCAT string "12:react||15:nodejs" (one query
 * instead of one per prompt). This turns that column into [{ tag_id, tag_name }].
 */
const attachTags = (row) => {
  const tags = row.raw_tags
    ? row.raw_tags.split('||').map((item) => {
        const sep = item.indexOf(':');
        return { tag_id: parseInt(item.slice(0, sep), 10), tag_name: item.slice(sep + 1) };
      })
    : [];
  const { raw_tags, ...rest } = row;
  return { ...rest, tags };
};

module.exports = { MAX_TAGS, normalizeTag, isValidTag, normalizeTagList, setPromptTags, attachTags };
