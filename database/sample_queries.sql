-- =============================================================================
-- PromptForge - the six DBMS SQL use cases (presentation slide 12)
-- -----------------------------------------------------------------------------
-- GENERATED from server/sql/useCases.js by database/library/build.js.
-- The website's Analytics page runs exactly these queries (with ? parameters);
-- here the example parameter values are written in so you can paste them into
-- MySQL Workbench. All queries are read-only SELECTs.
-- =============================================================================

USE `promptforge_db`;

-- -----------------------------------------------------------------------------
-- USE CASE 1: Top 10 prompts by engagement
-- Concepts: derived tables, LEFT JOIN, COALESCE, computed column, ORDER BY + LIMIT
-- Each interaction table is aggregated separately in a derived table first, then joined once
-- per prompt. Joining likes, bookmarks, comments and ratings directly would multiply rows
-- (fan-out) and corrupt counts and averages. Engagement score = likes x 2 + bookmarks x 3 +
-- comments.
-- -----------------------------------------------------------------------------
SELECT
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
WHERE p.status = 'published' AND p.is_moderated = FALSE
ORDER BY engagement_score DESC, avg_rating DESC, p.created_at DESC
LIMIT 10;

-- -----------------------------------------------------------------------------
-- USE CASE 2: Most active prompt creators in a month
-- Concepts: UNION ALL, derived table, conditional aggregation (CASE), date arithmetic, GROUP BY + HAVING
-- Prompt creations and later versions are combined with UNION ALL into one activity list,
-- filtered to the chosen month, then grouped per user. CASE inside COUNT separates the two
-- kinds of activity.
-- For a calendar month use: WHERE a.created_at >= '2026-10-01' AND a.created_at < DATE_ADD('2026-10-01', INTERVAL 1 MONTH)
-- -----------------------------------------------------------------------------
SELECT
  u.user_id,
  u.name AS creator_name,
  COUNT(CASE WHEN a.kind = 'prompt'  THEN 1 END) AS prompts_created,
  COUNT(CASE WHEN a.kind = 'version' THEN 1 END) AS versions_written,
  COUNT(*) AS total_activity
FROM users u
INNER JOIN (
  SELECT 'prompt' AS kind, p.user_id, p.created_at
  FROM prompts p
  WHERE p.status = 'published' AND p.is_moderated = FALSE
  UNION ALL
  SELECT 'version' AS kind, v.created_by AS user_id, v.created_at
  FROM prompt_versions v
  INNER JOIN prompts p ON p.prompt_id = v.prompt_id
  WHERE v.version_number > 1 AND p.status = 'published' AND p.is_moderated = FALSE
) a ON a.user_id = u.user_id
WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.user_id, u.name
HAVING total_activity > 0
ORDER BY total_activity DESC, prompts_created DESC, u.name ASC
LIMIT 10;

-- -----------------------------------------------------------------------------
-- USE CASE 3: Prompts filtered by AI model, category and tag
-- Concepts: multi-table INNER JOIN, EXISTS subquery, GROUP_CONCAT, parameterised filters
-- Joins prompts to users, categories and ai_models (many-to-one) and to tags through the
-- prompt_tags junction table (many-to-many). The tag filter is an EXISTS subquery, so
-- GROUP_CONCAT can still list every tag of each match.
-- Example filters: category = 'Study & Exams', model = 'Any model with file upload', tag = 'needs-pdf'
-- -----------------------------------------------------------------------------
SELECT
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
WHERE p.status = 'published' AND p.is_moderated = FALSE
  AND c.name = 'Study & Exams'
  AND m.model_name = 'Any model with file upload'
  AND EXISTS (SELECT 1 FROM prompt_tags ft INNER JOIN tags ftn ON ftn.tag_id = ft.tag_id
              WHERE ft.prompt_id = p.prompt_id AND ftn.tag_name = 'needs-pdf')
GROUP BY p.prompt_id, p.title, c.name, m.model_name, u.name, p.created_at
ORDER BY p.created_at DESC
LIMIT 20;

-- -----------------------------------------------------------------------------
-- USE CASE 4: Users with the most bookmarks
-- Concepts: INNER JOIN, COUNT, GROUP BY, ORDER BY + LIMIT
-- Counts rows in the bookmarks junction table per user. Only bookmarks of public prompts are
-- counted.
-- -----------------------------------------------------------------------------
SELECT
  u.user_id,
  u.name AS user_name,
  COUNT(b.bookmark_id) AS total_bookmarks,
  MAX(b.created_at) AS last_bookmarked_at
FROM users u
INNER JOIN bookmarks b ON b.user_id = u.user_id
INNER JOIN prompts p   ON p.prompt_id = b.prompt_id
WHERE p.status = 'published' AND p.is_moderated = FALSE
GROUP BY u.user_id, u.name
ORDER BY total_bookmarks DESC, u.name ASC
LIMIT 10;

-- -----------------------------------------------------------------------------
-- USE CASE 5: Average prompt rating by category
-- Concepts: LEFT JOIN (keeps empty categories), AVG / MIN / MAX, COUNT DISTINCT, GROUP BY
-- LEFT JOINs keep categories with no prompts or no ratings (they show 0). The visibility
-- condition sits in the ON clause, not WHERE, otherwise the LEFT JOIN would silently become
-- an INNER JOIN.
-- -----------------------------------------------------------------------------
SELECT
  c.category_id,
  c.name AS category_name,
  COUNT(DISTINCT p.prompt_id) AS public_prompts,
  COUNT(r.rating_id) AS ratings_received,
  ROUND(COALESCE(AVG(r.rating_value), 0), 2) AS average_rating,
  COALESCE(MIN(r.rating_value), 0) AS min_rating,
  COALESCE(MAX(r.rating_value), 0) AS max_rating
FROM categories c
LEFT JOIN prompts p ON p.category_id = c.category_id AND p.status = 'published' AND p.is_moderated = FALSE
LEFT JOIN ratings r ON r.prompt_id = p.prompt_id
GROUP BY c.category_id, c.name
ORDER BY average_rating DESC, ratings_received DESC, c.name ASC;

-- -----------------------------------------------------------------------------
-- USE CASE 6: Monthly prompt creation trend
-- Concepts: WITH RECURSIVE (CTE), DATE_FORMAT, LEFT JOIN to fill gaps, GROUP BY month
-- A recursive common table expression produces one row per month; prompts are LEFT JOINed
-- onto it so empty months appear with a count of 0.
-- -----------------------------------------------------------------------------
WITH RECURSIVE months AS (
  SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01') AS month_start, 1 AS n
  UNION ALL
  SELECT DATE_FORMAT(DATE_ADD(month_start, INTERVAL 1 MONTH), '%Y-%m-01'), n + 1
  FROM months
  WHERE n < 6
)
SELECT
  DATE_FORMAT(months.month_start, '%Y-%m') AS creation_month,
  COUNT(p.prompt_id) AS prompts_created
FROM months
LEFT JOIN prompts p
  ON p.created_at >= months.month_start
 AND p.created_at < DATE_ADD(months.month_start, INTERVAL 1 MONTH)
 AND p.status = 'published' AND p.is_moderated = FALSE
GROUP BY months.month_start
ORDER BY months.month_start ASC;
