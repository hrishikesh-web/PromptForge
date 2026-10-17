const { query } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { findVisiblePrompt, isPublic, visibilityCondition } = require('../utils/visibility');
const { LIMITS, toId, isBlank, tooLong } = require('../utils/validators');
const { attachTags } = require('../utils/tags');

const notFound = (res) => res.status(404).json({ success: false, message: 'Prompt not found.' });
const notPublished = (res) =>
  res.status(400).json({ success: false, message: 'This prompt is not published, so it cannot receive likes, ratings or comments.' });

/** Insert a notification for the prompt owner (never for yourself). */
const notify = async ({ toUserId, fromUser, type, message, entityType, entityId }) => {
  if (!toUserId || toUserId === fromUser.userId) return;
  await query(
    `INSERT INTO notifications (user_id, sender_id, type, message, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [toUserId, fromUser.userId, type, message, entityType, entityId]
  );
};

/** POST /api/prompts/:id/like — toggles a like (UNIQUE(prompt_id, user_id) prevents doubles). */
const toggleLike = async (req, res) => {
  try {
    const promptId = toId(req.params.id);
    const userId = req.user.userId;
    const prompt = await findVisiblePrompt(promptId, req.user);
    if (!prompt) return notFound(res);

    const existing = await query('SELECT like_id FROM likes WHERE prompt_id = ? AND user_id = ?', [promptId, userId]);
    let isLiked = false;

    if (existing.length > 0) {
      await query('DELETE FROM likes WHERE prompt_id = ? AND user_id = ?', [promptId, userId]);
      await logActivity({ userId, action: 'UNLIKE', tableName: 'likes', recordId: promptId });
    } else {
      if (!isPublic(prompt)) return notPublished(res);
      await query('INSERT IGNORE INTO likes (prompt_id, user_id, created_at) VALUES (?, ?, NOW())', [promptId, userId]);
      isLiked = true;
      await logActivity({ userId, action: 'LIKE', tableName: 'likes', recordId: promptId });
      await notify({
        toUserId: prompt.user_id,
        fromUser: req.user,
        type: 'like',
        message: `${req.user.name} liked your prompt "${prompt.title}".`,
        entityType: 'prompt',
        entityId: promptId
      });
    }

    const countResult = await query('SELECT COUNT(*) AS count FROM likes WHERE prompt_id = ?', [promptId]);
    return res.status(200).json({ success: true, isLiked, likeCount: countResult[0].count });
  } catch (error) {
    console.error('toggleLike error:', error);
    return res.status(500).json({ success: false, message: 'Could not update the like.' });
  }
};

/** POST /api/prompts/:id/bookmark — toggles a bookmark (allowed on any prompt you can see). */
const toggleBookmark = async (req, res) => {
  try {
    const promptId = toId(req.params.id);
    const userId = req.user.userId;
    const prompt = await findVisiblePrompt(promptId, req.user);
    if (!prompt) return notFound(res);

    const existing = await query('SELECT bookmark_id FROM bookmarks WHERE prompt_id = ? AND user_id = ?', [promptId, userId]);
    let isBookmarked = false;

    if (existing.length > 0) {
      await query('DELETE FROM bookmarks WHERE prompt_id = ? AND user_id = ?', [promptId, userId]);
      await logActivity({ userId, action: 'UNBOOKMARK', tableName: 'bookmarks', recordId: promptId });
    } else {
      await query('INSERT IGNORE INTO bookmarks (prompt_id, user_id, created_at) VALUES (?, ?, NOW())', [promptId, userId]);
      isBookmarked = true;
      await logActivity({ userId, action: 'BOOKMARK', tableName: 'bookmarks', recordId: promptId });
    }

    const countResult = await query('SELECT COUNT(*) AS count FROM bookmarks WHERE prompt_id = ?', [promptId]);
    return res.status(200).json({ success: true, isBookmarked, bookmarkCount: countResult[0].count });
  } catch (error) {
    console.error('toggleBookmark error:', error);
    return res.status(500).json({ success: false, message: 'Could not update the bookmark.' });
  }
};

/** POST /api/prompts/:id/rate — 1 to 5 stars, one rating per user (upsert). */
const ratePrompt = async (req, res) => {
  try {
    const promptId = toId(req.params.id);
    const userId = req.user.userId;
    const ratingVal = Number(req.body.rating);

    if (!Number.isInteger(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a whole number from 1 to 5.' });
    }

    const prompt = await findVisiblePrompt(promptId, req.user);
    if (!prompt) return notFound(res);
    if (!isPublic(prompt)) return notPublished(res);
    if (prompt.user_id === userId) {
      return res.status(400).json({ success: false, message: "You can't rate your own prompt." });
    }

    await query(
      `INSERT INTO ratings (prompt_id, user_id, rating_value, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE rating_value = VALUES(rating_value), updated_at = NOW()`,
      [promptId, userId, ratingVal]
    );

    await notify({
      toUserId: prompt.user_id,
      fromUser: req.user,
      type: 'rating',
      message: `${req.user.name} rated your prompt "${prompt.title}" ${ratingVal} star${ratingVal === 1 ? '' : 's'}.`,
      entityType: 'prompt',
      entityId: promptId
    });
    await logActivity({ userId, action: 'RATE', tableName: 'ratings', recordId: promptId, metadata: { rating_value: ratingVal } });

    const stats = await query('SELECT COUNT(*) AS count, AVG(rating_value) AS avg_rating FROM ratings WHERE prompt_id = ?', [promptId]);
    return res.status(200).json({
      success: true,
      message: 'Rating saved.',
      userRating: ratingVal,
      avgRating: stats[0].avg_rating ? parseFloat(Number(stats[0].avg_rating).toFixed(1)) : 0,
      ratingCount: stats[0].count
    });
  } catch (error) {
    console.error('ratePrompt error:', error);
    return res.status(500).json({ success: false, message: 'Could not save the rating.' });
  }
};

/** GET /api/prompts/:id/comments — only for prompts the viewer may see. */
const getComments = async (req, res) => {
  try {
    const promptId = toId(req.params.id);
    const prompt = await findVisiblePrompt(promptId, req.user);
    if (!prompt) return notFound(res);

    const comments = await query(
      `SELECT c.comment_id, c.comment_text, c.created_at, u.user_id, u.name AS author_name, r.role_name AS author_role
       FROM comments c
       INNER JOIN users u ON c.user_id = u.user_id
       INNER JOIN roles r ON u.role_id = r.role_id
       WHERE c.prompt_id = ?
       ORDER BY c.created_at ASC`,
      [promptId]
    );
    return res.status(200).json({ success: true, data: comments });
  } catch (error) {
    console.error('getComments error:', error);
    return res.status(500).json({ success: false, message: 'Could not load comments.' });
  }
};

/** POST /api/prompts/:id/comments */
const addComment = async (req, res) => {
  try {
    const promptId = toId(req.params.id);
    const userId = req.user.userId;
    const text = typeof req.body.comment_text === 'string' ? req.body.comment_text.trim() : '';

    if (isBlank(text)) return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
    const lengthError = tooLong(text, LIMITS.comment, 'Comment');
    if (lengthError) return res.status(400).json({ success: false, message: lengthError });

    const prompt = await findVisiblePrompt(promptId, req.user);
    if (!prompt) return notFound(res);
    if (!isPublic(prompt)) return notPublished(res);

    const result = await query('INSERT INTO comments (prompt_id, user_id, comment_text, created_at) VALUES (?, ?, ?, NOW())', [
      promptId,
      userId,
      text
    ]);

    await notify({
      toUserId: prompt.user_id,
      fromUser: req.user,
      type: 'comment',
      message: `${req.user.name} commented on "${prompt.title}".`,
      entityType: 'prompt',
      entityId: promptId
    });
    await logActivity({ userId, action: 'COMMENT', tableName: 'comments', recordId: result.insertId, metadata: { prompt_id: promptId } });

    return res.status(201).json({
      success: true,
      message: 'Comment added.',
      comment: {
        comment_id: result.insertId,
        comment_text: text,
        created_at: new Date(),
        user_id: userId,
        author_name: req.user.name,
        author_role: req.user.role
      }
    });
  } catch (error) {
    console.error('addComment error:', error);
    return res.status(500).json({ success: false, message: 'Could not add the comment.' });
  }
};

/** DELETE /api/comments/:id — the comment's author or an admin. */
const deleteComment = async (req, res) => {
  try {
    const commentId = toId(req.params.id);
    if (!commentId) return res.status(404).json({ success: false, message: 'Comment not found.' });

    const existing = await query('SELECT comment_id, user_id, prompt_id FROM comments WHERE comment_id = ?', [commentId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (existing[0].user_id !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments.' });
    }

    await query('DELETE FROM comments WHERE comment_id = ?', [commentId]);
    await logActivity({
      userId: req.user.userId,
      action: 'DELETE_COMMENT',
      tableName: 'comments',
      recordId: commentId,
      metadata: { prompt_id: existing[0].prompt_id }
    });
    return res.status(200).json({ success: true, message: 'Comment deleted.' });
  } catch (error) {
    console.error('deleteComment error:', error);
    return res.status(500).json({ success: false, message: 'Could not delete the comment.' });
  }
};

/** POST /api/users/:userId/follow — toggles follow (UNIQUE(follower_id, following_id)). */
const toggleFollow = async (req, res) => {
  try {
    const targetUserId = toId(req.params.userId);
    const currentUserId = req.user.userId;

    if (!targetUserId) return res.status(404).json({ success: false, message: 'User not found.' });
    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: "You can't follow yourself." });
    }

    const userRows = await query('SELECT user_id FROM users WHERE user_id = ?', [targetUserId]);
    if (userRows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const existing = await query('SELECT follow_id FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, targetUserId]);
    let isFollowing = false;

    if (existing.length > 0) {
      await query('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, targetUserId]);
      await logActivity({ userId: currentUserId, action: 'UNFOLLOW', tableName: 'follows', recordId: targetUserId });
    } else {
      await query('INSERT IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, NOW())', [currentUserId, targetUserId]);
      isFollowing = true;
      await logActivity({ userId: currentUserId, action: 'FOLLOW', tableName: 'follows', recordId: targetUserId });
      await notify({
        toUserId: targetUserId,
        fromUser: req.user,
        type: 'follow',
        message: `${req.user.name} started following you.`,
        entityType: 'user',
        entityId: currentUserId
      });
    }

    const countResult = await query('SELECT COUNT(*) AS count FROM follows WHERE following_id = ?', [targetUserId]);
    return res.status(200).json({ success: true, isFollowing, followersCount: countResult[0].count });
  } catch (error) {
    console.error('toggleFollow error:', error);
    return res.status(500).json({ success: false, message: 'Could not update follow.' });
  }
};

/**
 * GET /api/bookmarks — the current user's bookmarks.
 * Bookmarked prompts that later became private (draft or moderated) are hidden
 * unless the viewer owns them, using the same visibility rule.
 */
const getUserBookmarks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vis = visibilityCondition(req.user, 'p');

    const bookmarks = await query(
      `SELECT
        p.prompt_id, p.title, p.description, p.status, p.created_at,
        u.user_id AS creator_id, u.name AS creator_name,
        c.category_id, c.name AS category_name,
        m.model_id, m.model_name, m.provider,
        COALESCE(l_stats.like_count, 0) AS like_count,
        COALESCE(b_stats.bookmark_count, 0) AS bookmark_count,
        COALESCE(cm_stats.comment_count, 0) AS comment_count,
        COALESCE(r_stats.rating_count, 0) AS rating_count,
        ROUND(COALESCE(r_stats.avg_rating, 0), 1) AS avg_rating,
        CASE WHEN user_l.like_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_liked,
        TRUE AS user_bookmarked,
        b.created_at AS bookmarked_at,
        (
          SELECT GROUP_CONCAT(CONCAT(t.tag_id, ':', t.tag_name) ORDER BY t.tag_name SEPARATOR '||')
          FROM prompt_tags pt INNER JOIN tags t ON pt.tag_id = t.tag_id
          WHERE pt.prompt_id = p.prompt_id
        ) AS raw_tags
      FROM bookmarks b
      INNER JOIN prompts p ON b.prompt_id = p.prompt_id
      INNER JOIN users u ON p.user_id = u.user_id
      INNER JOIN categories c ON p.category_id = c.category_id
      INNER JOIN ai_models m ON p.model_id = m.model_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS like_count FROM likes GROUP BY prompt_id) l_stats ON p.prompt_id = l_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY prompt_id) b_stats ON p.prompt_id = b_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS comment_count FROM comments GROUP BY prompt_id) cm_stats ON p.prompt_id = cm_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS rating_count, AVG(rating_value) AS avg_rating FROM ratings GROUP BY prompt_id) r_stats ON p.prompt_id = r_stats.prompt_id
      LEFT JOIN likes user_l ON p.prompt_id = user_l.prompt_id AND user_l.user_id = ?
      WHERE b.user_id = ? AND ${vis.sql}
      ORDER BY b.created_at DESC`,
      [userId, userId, ...vis.params]
    );

    const data = bookmarks.map(attachTags);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getUserBookmarks error:', error);
    return res.status(500).json({ success: false, message: 'Could not load bookmarks.' });
  }
};

module.exports = {
  toggleLike,
  toggleBookmark,
  ratePrompt,
  getComments,
  addComment,
  deleteComment,
  toggleFollow,
  getUserBookmarks
};
