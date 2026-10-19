
USE `promptforge_db`;

SELECT
  p.prompt_id,
  p.title,
  u.name AS creator_name,
  c.name AS category_name,
  COALESCE(l.like_count, 0) AS like_count,
  COALESCE(b.bookmark_count, 0) AS bookmark_count,
  COALESCE(cm.comment_count, 0) AS comment_count,
  ROUND(COALESCE(r.avg_rating, 0), 2) AS avg_rating,
  COALESCE(l.like_count, 0) * 2 + COALESCE(b.bookmark_count, 0) * 3 + COALESCE(cm.comment_count, 0) AS engagement_score
FROM prompts p
INNER JOIN users u ON u.user_id = p.user_id
INNER JOIN categories c ON c.category_id = p.category_id
LEFT JOIN (
  SELECT prompt_id, COUNT(*) AS like_count
  FROM likes
  GROUP BY prompt_id
) l ON l.prompt_id = p.prompt_id
LEFT JOIN (
  SELECT prompt_id, COUNT(*) AS bookmark_count
  FROM bookmarks
  GROUP BY prompt_id
) b ON b.prompt_id = p.prompt_id
LEFT JOIN (
  SELECT prompt_id, COUNT(*) AS comment_count
  FROM comments
  GROUP BY prompt_id
) cm ON cm.prompt_id = p.prompt_id
LEFT JOIN (
  SELECT prompt_id, AVG(rating_value) AS avg_rating
  FROM ratings
  GROUP BY prompt_id
) r ON r.prompt_id = p.prompt_id
WHERE p.status = 'published'
  AND p.is_moderated = FALSE
ORDER BY engagement_score DESC, avg_rating DESC, p.created_at DESC
LIMIT 10;

SELECT
  u.user_id,
  u.name AS creator_name,
  COUNT(CASE WHEN a.kind = 'prompt' THEN 1 END) AS prompts_created,
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
  WHERE v.version_number > 1
    AND p.status = 'published'
    AND p.is_moderated = FALSE
) a ON a.user_id = u.user_id
WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.user_id, u.name
HAVING total_activity > 0
ORDER BY total_activity DESC, prompts_created DESC, u.name ASC
LIMIT 10;

SELECT
  p.prompt_id,
  p.title,
  c.name AS category_name,
  m.model_name,
  u.name AS creator_name,
  GROUP_CONCAT(DISTINCT t.tag_name ORDER BY t.tag_name SEPARATOR ', ') AS tags
FROM prompts p
INNER JOIN users u ON u.user_id = p.user_id
INNER JOIN categories c ON c.category_id = p.category_id
INNER JOIN ai_models m ON m.model_id = p.model_id
LEFT JOIN prompt_tags pt ON pt.prompt_id = p.prompt_id
LEFT JOIN tags t ON t.tag_id = pt.tag_id
WHERE p.status = 'published'
  AND p.is_moderated = FALSE
  AND c.name = 'Study & Exams'
  AND m.model_name = 'Any model with file upload'
  AND EXISTS (
    SELECT 1
    FROM prompt_tags ft
    INNER JOIN tags ftn ON ftn.tag_id = ft.tag_id
    WHERE ft.prompt_id = p.prompt_id
      AND ftn.tag_name = 'needs-pdf'
  )
GROUP BY p.prompt_id, p.title, c.name, m.model_name, u.name, p.created_at
ORDER BY p.created_at DESC
LIMIT 20;

SELECT
  u.user_id,
  u.name AS user_name,
  COUNT(b.bookmark_id) AS total_bookmarks,
  MAX(b.created_at) AS last_bookmarked_at
FROM users u
INNER JOIN bookmarks b ON b.user_id = u.user_id
INNER JOIN prompts p ON p.prompt_id = b.prompt_id
WHERE p.status = 'published'
  AND p.is_moderated = FALSE
GROUP BY u.user_id, u.name
ORDER BY total_bookmarks DESC, u.name ASC
LIMIT 10;

SELECT
  c.category_id,
  c.name AS category_name,
  COUNT(DISTINCT p.prompt_id) AS public_prompts,
  COUNT(r.rating_id) AS ratings_received,
  ROUND(COALESCE(AVG(r.rating_value), 0), 2) AS average_rating,
  COALESCE(MIN(r.rating_value), 0) AS min_rating,
  COALESCE(MAX(r.rating_value), 0) AS max_rating
FROM categories c
LEFT JOIN prompts p
  ON p.category_id = c.category_id
  AND p.status = 'published'
  AND p.is_moderated = FALSE
LEFT JOIN ratings r ON r.prompt_id = p.prompt_id
GROUP BY c.category_id, c.name
ORDER BY average_rating DESC, ratings_received DESC, c.name ASC;

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
  AND p.status = 'published'
  AND p.is_moderated = FALSE
GROUP BY months.month_start
ORDER BY months.month_start ASC;
