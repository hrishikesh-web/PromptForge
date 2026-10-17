const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { optionalAuth } = require('../middleware/auth');
const { toId } = require('../utils/validators');
const { attachTags } = require('../utils/tags');

/**
 * GET /api/users/:id/profile — public creator profile and published prompts.
 * The email address is only included for the user themself or an admin.
 */
router.get('/:id/profile', optionalAuth, async (req, res) => {
  try {
    const creatorId = toId(req.params.id);
    if (!creatorId) return res.status(404).json({ success: false, message: 'User not found.' });
    const currentUserId = req.user ? req.user.userId : 0;
    const canSeeEmail = req.user && (req.user.userId === creatorId || req.user.role === 'ADMIN');

    const userRows = await query(
      `SELECT
         u.user_id,
         u.name,
         u.email,
         u.bio,
         u.created_at,
         r.role_name AS role,
         (SELECT COUNT(*) FROM follows WHERE following_id = u.user_id) AS followers_count,
         (SELECT COUNT(*) FROM follows WHERE follower_id = u.user_id) AS following_count,
         (SELECT COUNT(*) FROM prompts WHERE user_id = u.user_id AND status = 'published' AND is_moderated = FALSE) AS prompts_count,
         (SELECT COUNT(*) FROM likes l INNER JOIN prompts p ON l.prompt_id = p.prompt_id
            WHERE p.user_id = u.user_id AND p.status = 'published' AND p.is_moderated = FALSE) AS total_likes_received,
         (SELECT COUNT(*) FROM bookmarks b INNER JOIN prompts p ON b.prompt_id = p.prompt_id
            WHERE p.user_id = u.user_id AND p.status = 'published' AND p.is_moderated = FALSE) AS total_bookmarks_received,
         CASE WHEN user_f.follow_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_following
       FROM users u
       INNER JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN follows user_f ON user_f.following_id = u.user_id AND user_f.follower_id = ?
       WHERE u.user_id = ?`,
      [currentUserId, creatorId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const creator = { ...userRows[0] };
    if (!canSeeEmail) delete creator.email;

    const rows = await query(
      `SELECT
         p.prompt_id,
         p.title,
         p.description,
         p.created_at,
         u.user_id AS creator_id,
         u.name AS creator_name,
         c.category_id,
         c.name AS category_name,
         m.model_id,
         m.model_name,
         m.provider,
         COALESCE(l_stats.like_count, 0) AS like_count,
         COALESCE(b_stats.bookmark_count, 0) AS bookmark_count,
         COALESCE(cm_stats.comment_count, 0) AS comment_count,
         COALESCE(r_stats.rating_count, 0) AS rating_count,
         ROUND(COALESCE(r_stats.avg_rating, 0), 1) AS avg_rating,
         CASE WHEN user_l.like_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_liked,
         CASE WHEN user_b.bookmark_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_bookmarked,
         (
           SELECT GROUP_CONCAT(CONCAT(t.tag_id, ':', t.tag_name) ORDER BY t.tag_name SEPARATOR '||')
           FROM prompt_tags pt INNER JOIN tags t ON pt.tag_id = t.tag_id
           WHERE pt.prompt_id = p.prompt_id
         ) AS raw_tags
       FROM prompts p
       INNER JOIN users u ON p.user_id = u.user_id
       INNER JOIN categories c ON p.category_id = c.category_id
       INNER JOIN ai_models m ON p.model_id = m.model_id
       LEFT JOIN (SELECT prompt_id, COUNT(*) AS like_count FROM likes GROUP BY prompt_id) l_stats ON p.prompt_id = l_stats.prompt_id
       LEFT JOIN (SELECT prompt_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY prompt_id) b_stats ON p.prompt_id = b_stats.prompt_id
       LEFT JOIN (SELECT prompt_id, COUNT(*) AS comment_count FROM comments GROUP BY prompt_id) cm_stats ON p.prompt_id = cm_stats.prompt_id
       LEFT JOIN (SELECT prompt_id, COUNT(*) AS rating_count, AVG(rating_value) AS avg_rating FROM ratings GROUP BY prompt_id) r_stats ON p.prompt_id = r_stats.prompt_id
       LEFT JOIN likes user_l ON p.prompt_id = user_l.prompt_id AND user_l.user_id = ?
       LEFT JOIN bookmarks user_b ON p.prompt_id = user_b.prompt_id AND user_b.user_id = ?
       WHERE p.user_id = ? AND p.status = 'published' AND p.is_moderated = FALSE
       ORDER BY p.created_at DESC`,
      [currentUserId, currentUserId, creatorId]
    );

    const prompts = rows.map(attachTags);

    return res.status(200).json({ success: true, creator, prompts });
  } catch (error) {
    console.error('getCreatorProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch creator profile.' });
  }
});

module.exports = router;
