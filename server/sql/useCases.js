/**
 * The six DBMS SQL use cases from the project presentation — ONE source of truth.
 *
 * Used by:
 *  - controllers/analytics.controller.js  (the website's Analytics page)
 *  - test/test-ppt-queries.js             (runs them against your MySQL)
 *  - database/library/build.js            (writes database/sample_queries.sql)
 *
 * Each builder returns { sql, params }. All values are passed as parameters (?),
 * never concatenated into the SQL string.
 *
 * Analytics only count PUBLIC content (status = 'published' AND is_moderated = FALSE),
 * so private drafts never influence or appear in public statistics.
 */

const PUBLIC = "p.status = 'published' AND p.is_moderated = FALSE";

/** Use case 1 — Top 10 prompts by engagement. */
const topPromptsByEngagement = () => ({
  title: 'Top 10 prompts by engagement',
  concepts: ['derived tables', 'LEFT JOIN', 'COALESCE', 'computed column', 'ORDER BY + LIMIT'],
  explanation:
    'Each interaction table is aggregated separately in a derived table first, then joined once per prompt. ' +
    'Joining likes, bookmarks, comments and ratings directly would multiply rows (fan-out) and corrupt counts and averages. ' +
    'Engagement score = likes x 2 + bookmarks x 3 + comments.',
  sql: `SELECT
  p.prompt_id,
  p.title,
  u.name AS creator_name,
  c.name AS category_name,
  COALESCE(l.like_count, 0)     AS like_count,
  COALESCE(b.bookmark_count, 0) AS bookmark_count,
  COALESCE(cm.comment_count, 0) AS comment_count,
  ROUND(COALESCE(r.avg_rating, 0), 2) AS avg_rating,
  COALESCE(l.like_count, 0) * 2 + COALESCE(b.bookmark_count, 0) * 3 + COALESCE(cm.comment_count, 0) AS engagement_score
FROM prompts p
INNER JOIN users u      ON u.user_id = p.user_id
INNER JOIN categories c ON c.category_id = p.category_id
LEFT JOIN (SELECT prompt_id, COUNT(*) AS like_count     FROM likes     GROUP BY prompt_id) l  ON l.prompt_id = p.prompt_id
LEFT JOIN (SELECT prompt_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY prompt_id) b  ON b.prompt_id = p.prompt_id
LEFT JOIN (SELECT prompt_id, COUNT(*) AS comment_count  FROM comments  GROUP BY prompt_id) cm ON cm.prompt_id = p.prompt_id
LEFT JOIN (SELECT prompt_id, AVG(rating_value) AS avg_rating FROM ratings GROUP BY prompt_id) r ON r.prompt_id = p.prompt_id
WHERE ${PUBLIC}
ORDER BY engagement_score DESC, avg_rating DESC, p.created_at DESC
LIMIT 10`,
  params: []
});

/**
 * Use case 2 — Most active prompt creators in a month.
 * Activity = public prompts created + new versions written (edits, version_number > 1).
 * `month` = 'YYYY-MM' for a calendar month; omitted = the last 30 days.
 */
const mostActiveCreators = ({ month } = {}) => {
  const useMonth = typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const window = useMonth
    ? { cond: 'a.created_at >= ? AND a.created_at < DATE_ADD(?, INTERVAL 1 MONTH)', params: [`${month}-01`, `${month}-01`] }
    : { cond: 'a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)', params: [] };
  return {
    title: 'Most active prompt creators in a month',
    concepts: ['UNION ALL', 'derived table', 'conditional aggregation (CASE)', 'date arithmetic', 'GROUP BY + HAVING'],
    explanation:
      'Prompt creations and later versions are combined with UNION ALL into one activity list, filtered to the chosen ' +
      'month, then grouped per user. CASE inside COUNT separates the two kinds of activity.',
    sql: `SELECT
  u.user_id,
  u.name AS creator_name,
  COUNT(CASE WHEN a.kind = 'prompt'  THEN 1 END) AS prompts_created,
  COUNT(CASE WHEN a.kind = 'version' THEN 1 END) AS versions_written,
  COUNT(*) AS total_activity
FROM users u
INNER JOIN (
  SELECT 'prompt' AS kind, p.user_id, p.created_at
  FROM prompts p
  WHERE ${PUBLIC}
  UNION ALL
  SELECT 'version' AS kind, v.created_by AS user_id, v.created_at
  FROM prompt_versions v
  INNER JOIN prompts p ON p.prompt_id = v.prompt_id
  WHERE v.version_number > 1 AND ${PUBLIC}
) a ON a.user_id = u.user_id
WHERE ${window.cond}
GROUP BY u.user_id, u.name
HAVING total_activity > 0
ORDER BY total_activity DESC, prompts_created DESC, u.name ASC
LIMIT 10`,
    params: window.params,
    example: useMonth ? { month } : { window: 'last 30 days' }
  };
};

/**
 * Use case 3 — Prompts filtered by suggested model + category + tag (all optional, by name).
 * The tag filter uses EXISTS so the tags column still lists ALL of a prompt's tags.
 */
const filterByModelCategoryTag = ({ model, category, tag } = {}) => {
  const conditions = [PUBLIC];
  const params = [];
  if (category) {
    conditions.push('c.name = ?');
    params.push(category);
  }
  if (model) {
    conditions.push('m.model_name = ?');
    params.push(model);
  }
  if (tag) {
    conditions.push(`EXISTS (SELECT 1 FROM prompt_tags ft INNER JOIN tags ftn ON ftn.tag_id = ft.tag_id
              WHERE ft.prompt_id = p.prompt_id AND ftn.tag_name = ?)`);
    params.push(tag);
  }
  return {
    title: 'Prompts filtered by AI model, category and tag',
    concepts: ['multi-table INNER JOIN', 'EXISTS subquery', 'GROUP_CONCAT', 'parameterised filters'],
    explanation:
      'Joins prompts to users, categories and ai_models (many-to-one) and to tags through the prompt_tags junction table ' +
      '(many-to-many). The tag filter is an EXISTS subquery, so GROUP_CONCAT can still list every tag of each match.',
    sql: `SELECT
  p.prompt_id,
  p.title,
  c.name AS category_name,
  m.model_name,
  u.name AS creator_name,
  GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ', ') AS tags
FROM prompts p
INNER JOIN users u      ON u.user_id = p.user_id
INNER JOIN categories c ON c.category_id = p.category_id
INNER JOIN ai_models m  ON m.model_id = p.model_id
LEFT JOIN prompt_tags pt ON pt.prompt_id = p.prompt_id
LEFT JOIN tags t         ON t.tag_id = pt.tag_id
WHERE ${conditions.join('\n  AND ')}
GROUP BY p.prompt_id, p.title, c.name, m.model_name, u.name, p.created_at
ORDER BY p.created_at DESC
LIMIT 20`,
    params,
    example: { model, category, tag }
  };
};

/** Use case 4 — Users with the most bookmarks (saved prompts). */
const usersWithMostBookmarks = () => ({
  title: 'Users with the most bookmarks',
  concepts: ['INNER JOIN', 'COUNT', 'GROUP BY', 'ORDER BY + LIMIT'],
  explanation: 'Counts rows in the bookmarks junction table per user. Only bookmarks of public prompts are counted.',
  sql: `SELECT
  u.user_id,
  u.name AS user_name,
  COUNT(b.bookmark_id) AS total_bookmarks,
  MAX(b.created_at) AS last_bookmarked_at
FROM users u
INNER JOIN bookmarks b ON b.user_id = u.user_id
INNER JOIN prompts p   ON p.prompt_id = b.prompt_id
WHERE ${PUBLIC}
GROUP BY u.user_id, u.name
ORDER BY total_bookmarks DESC, u.name ASC
LIMIT 10`,
  params: []
});

/** Use case 5 — Average prompt rating by category. */
const avgRatingByCategory = () => ({
  title: 'Average prompt rating by category',
  concepts: ['LEFT JOIN (keeps empty categories)', 'AVG / MIN / MAX', 'COUNT DISTINCT', 'GROUP BY'],
  explanation:
    'LEFT JOINs keep categories with no prompts or no ratings (they show 0). The visibility condition sits in the ON ' +
    'clause, not WHERE, otherwise the LEFT JOIN would silently become an INNER JOIN.',
  sql: `SELECT
  c.category_id,
  c.name AS category_name,
  COUNT(DISTINCT p.prompt_id) AS public_prompts,
  COUNT(r.rating_id) AS ratings_received,
  ROUND(COALESCE(AVG(r.rating_value), 0), 2) AS average_rating,
  COALESCE(MIN(r.rating_value), 0) AS min_rating,
  COALESCE(MAX(r.rating_value), 0) AS max_rating
FROM categories c
LEFT JOIN prompts p ON p.category_id = c.category_id AND ${PUBLIC}
LEFT JOIN ratings r ON r.prompt_id = p.prompt_id
GROUP BY c.category_id, c.name
ORDER BY average_rating DESC, ratings_received DESC, c.name ASC`,
  params: []
});

/**
 * Use case 6 — Monthly prompt creation trend for the last N months.
 * A recursive CTE generates every month, so months with no prompts show 0 instead of disappearing.
 */
const monthlyCreationTrend = ({ months = 6 } = {}) => {
  const n = Math.min(24, Math.max(2, parseInt(months, 10) || 6));
  return {
    title: 'Monthly prompt creation trend',
    concepts: ['WITH RECURSIVE (CTE)', 'DATE_FORMAT', 'LEFT JOIN to fill gaps', 'GROUP BY month'],
    explanation:
      'A recursive common table expression produces one row per month; prompts are LEFT JOINed onto it so empty months ' +
      'appear with a count of 0.',
    sql: `WITH RECURSIVE months AS (
  SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ? MONTH), '%Y-%m-01') AS month_start, 1 AS n
  UNION ALL
  SELECT DATE_FORMAT(DATE_ADD(month_start, INTERVAL 1 MONTH), '%Y-%m-01'), n + 1
  FROM months
  WHERE n < ?
)
SELECT
  DATE_FORMAT(months.month_start, '%Y-%m') AS creation_month,
  COUNT(p.prompt_id) AS prompts_created
FROM months
LEFT JOIN prompts p
  ON p.created_at >= months.month_start
 AND p.created_at < DATE_ADD(months.month_start, INTERVAL 1 MONTH)
 AND ${PUBLIC}
GROUP BY months.month_start
ORDER BY months.month_start ASC`,
    params: [n - 1, n]
  };
};

/** Supporting chart — how many public prompts suggest each model. */
const promptsByModel = () => ({
  title: 'Public prompts per suggested model',
  sql: `SELECT
  m.model_id,
  m.model_name,
  m.provider,
  COUNT(p.prompt_id) AS prompt_count
FROM ai_models m
LEFT JOIN prompts p ON p.model_id = m.model_id AND ${PUBLIC}
GROUP BY m.model_id, m.model_name, m.provider
ORDER BY prompt_count DESC, m.model_name ASC`,
  params: []
});

/** Supporting cards — platform totals. */
const platformMetrics = () => ({
  title: 'Platform totals',
  sql: `SELECT
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM prompts p WHERE ${PUBLIC}) AS public_prompts,
  (SELECT COUNT(*) FROM prompt_versions) AS total_versions,
  (SELECT COUNT(*) FROM categories) AS total_categories,
  (SELECT COUNT(*) FROM tags) AS total_tags,
  (SELECT COUNT(*) FROM likes) AS total_likes,
  (SELECT COUNT(*) FROM bookmarks) AS total_bookmarks,
  (SELECT COUNT(*) FROM comments) AS total_comments,
  (SELECT COUNT(*) FROM ratings) AS total_ratings,
  (SELECT ROUND(COALESCE(AVG(rating_value), 0), 2) FROM ratings) AS average_rating`,
  params: []
});

/** Default example values used in sample_queries.sql and tests for use case 3. */
const USE_CASE_3_EXAMPLE = { category: 'Study & Exams', model: 'Any model with file upload', tag: 'needs-pdf' };

module.exports = {
  PUBLIC,
  topPromptsByEngagement,
  mostActiveCreators,
  filterByModelCategoryTag,
  usersWithMostBookmarks,
  avgRatingByCategory,
  monthlyCreationTrend,
  promptsByModel,
  platformMetrics,
  USE_CASE_3_EXAMPLE
};
