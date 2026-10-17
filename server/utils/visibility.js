const { query } = require('../config/db');

/**
 * ONE rule decides who may see a prompt. Every endpoint that lists, opens,
 * likes, bookmarks, rates, comments on or reports a prompt uses it.
 *
 *  - ADMIN            : every prompt (drafts, archived, moderated).
 *  - Logged-in USER   : published + not moderated prompts, plus ALL of their own prompts.
 *  - Guest            : published + not moderated prompts only.
 *
 * Returns a SQL fragment and its parameters so callers can add it to a WHERE clause.
 * The SQL is always parameterized (no string concatenation of user input).
 */
const visibilityCondition = (user, alias = 'p') => {
  if (user && user.role === 'ADMIN') {
    return { sql: '1 = 1', params: [] };
  }
  const publicRule = `(${alias}.status = 'published' AND ${alias}.is_moderated = FALSE)`;
  if (user && user.userId) {
    return { sql: `(${publicRule} OR ${alias}.user_id = ?)`, params: [user.userId] };
  }
  return { sql: publicRule, params: [] };
};

/**
 * Fetch a prompt only if the given user is allowed to see it.
 * Returns null when it does not exist OR is not visible, so callers answer 404
 * in both cases and never reveal that a private draft exists.
 */
const findVisiblePrompt = async (promptId, user) => {
  if (!Number.isInteger(promptId) || promptId <= 0) return null;
  const vis = visibilityCondition(user, 'p');
  const rows = await query(
    `SELECT p.prompt_id, p.user_id, p.title, p.status, p.is_moderated
     FROM prompts p
     WHERE p.prompt_id = ? AND ${vis.sql}`,
    [promptId, ...vis.params]
  );
  return rows[0] || null;
};

/**
 * Is this prompt publicly listed (published and not moderated)?
 * Interactions such as likes and ratings are only allowed on public prompts,
 * except that owners and admins may still view their own private prompts.
 */
const isPublic = (prompt) => prompt && prompt.status === 'published' && !prompt.is_moderated;

module.exports = { visibilityCondition, findVisiblePrompt, isPublic };
