const { query, getTransaction } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { toId, clampInt } = require('../utils/validators');

/** GET /api/admin/overview — platform counters for the dashboard. */
const getAdminOverview = async (req, res) => {
  try {
    const [row] = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COUNT(*) FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE r.role_name = 'ADMIN') AS totalAdmins,
        (SELECT COUNT(*) FROM prompts) AS totalPrompts,
        (SELECT COUNT(*) FROM prompts WHERE status = 'published' AND is_moderated = FALSE) AS publishedPrompts,
        (SELECT COUNT(*) FROM prompts WHERE status = 'draft') AS draftPrompts,
        (SELECT COUNT(*) FROM prompts WHERE is_moderated = TRUE) AS hiddenPrompts,
        (SELECT COUNT(*) FROM prompt_versions) AS totalVersions,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') AS pendingReports,
        (SELECT COUNT(*) FROM categories) AS totalCategories,
        (SELECT COUNT(*) FROM ai_models) AS totalModels,
        (SELECT COUNT(*) FROM tags) AS totalTags,
        (SELECT COUNT(*) FROM activity_logs) AS totalLogs
    `);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('getAdminOverview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load the overview.' });
  }
};

/** GET /api/admin/users — every user with role and activity counts (never password hashes). */
const getUsers = async (req, res) => {
  try {
    const users = await query(`
      SELECT
        u.user_id, u.name, u.email, u.role_id, r.role_name, u.bio, u.created_at,
        (SELECT COUNT(*) FROM prompts p WHERE p.user_id = u.user_id) AS prompt_count,
        (SELECT COUNT(*) FROM prompt_versions v WHERE v.created_by = u.user_id) AS version_count,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.user_id = u.user_id) AS bookmark_count,
        (SELECT COUNT(*) FROM likes l WHERE l.user_id = u.user_id) AS like_count,
        (SELECT COUNT(*) FROM ratings ra WHERE ra.user_id = u.user_id) AS rating_count
      FROM users u
      INNER JOIN roles r ON u.role_id = r.role_id
      ORDER BY r.role_name = 'ADMIN' DESC, u.created_at DESC
    `);
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load users.' });
  }
};

/** GET /api/admin/roles */
const getRoles = async (req, res) => {
  try {
    const roles = await query('SELECT role_id, role_name, description FROM roles ORDER BY role_id');
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    console.error('getRoles error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load roles.' });
  }
};

const countAdmins = async (runner) => {
  const rows = await runner(
    "SELECT COUNT(*) AS n FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE r.role_name = 'ADMIN'"
  );
  return rows[0].n;
};

/**
 * PUT /api/admin/users/:userId/role  { role_id }
 * Website roles only — this never touches MySQL accounts or privileges.
 * Guards: you cannot change your own role, and the last ADMIN cannot be demoted.
 */
const updateUserRole = async (req, res) => {
  try {
    const targetUserId = toId(req.params.userId);
    const roleId = toId(req.body.role_id);
    if (!targetUserId) return res.status(404).json({ success: false, message: 'User not found.' });
    if (!roleId) return res.status(400).json({ success: false, message: 'Choose a role.' });
    if (targetUserId === req.user.userId) {
      return res.status(400).json({ success: false, message: "You can't change your own role. Ask another admin." });
    }

    const roleRows = await query('SELECT role_id, role_name FROM roles WHERE role_id = ?', [roleId]);
    if (roleRows.length === 0) return res.status(400).json({ success: false, message: 'That role does not exist.' });

    const target = await query(
      'SELECT u.user_id, u.name, r.role_name FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = ?',
      [targetUserId]
    );
    if (target.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    if (target[0].role_name === roleRows[0].role_name) {
      return res.status(200).json({ success: true, message: `${target[0].name} is already ${roleRows[0].role_name}.` });
    }
    if (target[0].role_name === 'ADMIN' && (await countAdmins(query)) <= 1) {
      return res.status(400).json({ success: false, message: 'There must always be at least one admin.' });
    }

    await query('UPDATE users SET role_id = ?, updated_at = NOW() WHERE user_id = ?', [roleId, targetUserId]);
    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE_USER_ROLE',
      tableName: 'users',
      recordId: targetUserId,
      metadata: { from: target[0].role_name, to: roleRows[0].role_name }
    });

    return res.status(200).json({ success: true, message: `${target[0].name} is now ${roleRows[0].role_name}.` });
  } catch (error) {
    console.error('updateUserRole error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update the role.' });
  }
};

/**
 * What deleting this user would remove (shown in the confirmation dialog).
 * "blockingVersions" = versions this user wrote on OTHER people's prompts.
 * prompt_versions.created_by is ON DELETE RESTRICT, so those block deletion.
 */
const deletionImpact = async (runner, userId) => {
  const [row] = await runner(
    `SELECT
       (SELECT COUNT(*) FROM prompts WHERE user_id = ?) AS prompts,
       (SELECT COUNT(*) FROM prompt_versions v INNER JOIN prompts p ON p.prompt_id = v.prompt_id WHERE p.user_id = ?) AS versions_on_own_prompts,
       (SELECT COUNT(*) FROM prompt_versions v INNER JOIN prompts p ON p.prompt_id = v.prompt_id WHERE v.created_by = ? AND p.user_id <> ?) AS blocking_versions,
       (SELECT COUNT(*) FROM likes WHERE user_id = ?) AS likes_given,
       (SELECT COUNT(*) FROM bookmarks WHERE user_id = ?) AS bookmarks,
       (SELECT COUNT(*) FROM ratings WHERE user_id = ?) AS ratings_given,
       (SELECT COUNT(*) FROM comments WHERE user_id = ?) AS comments,
       (SELECT COUNT(*) FROM follows WHERE follower_id = ? OR following_id = ?) AS follows,
       (SELECT COUNT(*) FROM likes l INNER JOIN prompts p ON p.prompt_id = l.prompt_id WHERE p.user_id = ? AND l.user_id <> ?) AS others_likes_on_their_prompts,
       (SELECT COUNT(*) FROM comments c INNER JOIN prompts p ON p.prompt_id = c.prompt_id WHERE p.user_id = ? AND c.user_id <> ?) AS others_comments_on_their_prompts`,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
  );
  return row;
};

/** GET /api/admin/users/:userId/delete-impact */
const getDeleteImpact = async (req, res) => {
  try {
    const userId = toId(req.params.userId);
    const users = await query('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, data: await deletionImpact(query, userId) });
  } catch (error) {
    console.error('getDeleteImpact error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check what would be deleted.' });
  }
};

/**
 * DELETE /api/admin/users/:userId — one transaction:
 *  1. refuse if it's yourself, the last admin, or the user wrote versions of other people's prompts
 *  2. delete the user's prompts (CASCADE removes their versions, tags, likes, comments, ratings, reports)
 *  3. delete the user (CASCADE removes their likes, bookmarks, ratings, comments, follows, notifications;
 *     activity_logs.user_id and reports.reviewed_by become NULL via ON DELETE SET NULL)
 * Deleting prompts first avoids the RESTRICT rule on prompt_versions.created_by.
 */
const deleteUser = async (req, res) => {
  let tx;
  try {
    const targetUserId = toId(req.params.userId);
    if (!targetUserId) return res.status(404).json({ success: false, message: 'User not found.' });
    if (targetUserId === req.user.userId) {
      return res.status(400).json({ success: false, message: "You can't delete your own account." });
    }

    tx = await getTransaction();
    const target = await tx.query(
      'SELECT u.user_id, u.name, u.email, r.role_name FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = ? FOR UPDATE',
      [targetUserId]
    );
    if (target.length === 0) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (target[0].role_name === 'ADMIN' && (await countAdmins(tx.query)) <= 1) {
      await tx.rollback();
      return res.status(400).json({ success: false, message: "The last admin can't be deleted." });
    }

    const impact = await deletionImpact(tx.query, targetUserId);
    if (impact.blocking_versions > 0) {
      await tx.rollback();
      return res.status(409).json({
        success: false,
        message: `${target[0].name} wrote ${impact.blocking_versions} version(s) of other people's prompts. Version history is protected (ON DELETE RESTRICT), so this account can't be deleted. Change the role instead.`,
        impact
      });
    }

    await tx.query('DELETE FROM prompts WHERE user_id = ?', [targetUserId]);
    await tx.query('DELETE FROM users WHERE user_id = ?', [targetUserId]);
    await logActivity({
      userId: req.user.userId,
      action: 'DELETE_USER',
      tableName: 'users',
      recordId: targetUserId,
      metadata: { name: target[0].name, prompts_removed: impact.prompts },
      tx
    });
    await tx.commit();

    return res.status(200).json({ success: true, message: `${target[0].name} was deleted.`, impact });
  } catch (error) {
    if (tx) await tx.rollback().catch(() => {});
    console.error('deleteUser error:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ success: false, message: 'Other records still depend on this user, so nothing was deleted.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to delete the user. Nothing was changed.' });
  } finally {
    if (tx) tx.release();
  }
};

/**
 * PUT /api/admin/prompts/:id/moderation  { hidden: true|false }
 * Directly hide or restore a prompt (reports do the same through updateReportStatus).
 */
const setPromptModeration = async (req, res) => {
  try {
    const promptId = toId(req.params.id);
    const hidden = req.body.hidden === true;
    const rows = await query('SELECT prompt_id, title FROM prompts WHERE prompt_id = ?', [promptId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Prompt not found.' });

    if (hidden) {
      await query("UPDATE prompts SET is_moderated = TRUE, status = 'archived', updated_at = NOW() WHERE prompt_id = ?", [promptId]);
    } else {
      await query("UPDATE prompts SET is_moderated = FALSE, status = 'published', updated_at = NOW() WHERE prompt_id = ?", [promptId]);
    }
    await logActivity({
      userId: req.user.userId,
      action: hidden ? 'HIDE_PROMPT' : 'RESTORE_PROMPT',
      tableName: 'prompts',
      recordId: promptId,
      metadata: { title: rows[0].title }
    });
    return res.status(200).json({ success: true, message: hidden ? 'Prompt hidden.' : 'Prompt restored and published.' });
  } catch (error) {
    console.error('setPromptModeration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update the prompt.' });
  }
};

/** GET /api/admin/logs?limit=&action=&table= — newest first. */
const getActivityLogs = async (req, res) => {
  try {
    const conditions = [];
    const params = [];
    if (typeof req.query.action === 'string' && req.query.action) {
      conditions.push('l.action = ?');
      params.push(req.query.action);
    }
    if (typeof req.query.table === 'string' && req.query.table) {
      conditions.push('l.table_name = ?');
      params.push(req.query.table);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(clampInt(req.query.limit, 100, 1, 500));

    const logs = await query(
      `SELECT l.log_id, l.user_id, u.name AS user_name, l.action, l.table_name, l.record_id, l.metadata, l.created_at
       FROM activity_logs l
       LEFT JOIN users u ON l.user_id = u.user_id
       ${whereClause}
       ORDER BY l.created_at DESC, l.log_id DESC
       LIMIT ?`,
      params
    );
    const actions = await query('SELECT DISTINCT action FROM activity_logs ORDER BY action');
    return res.status(200).json({ success: true, data: logs, actions: actions.map((a) => a.action) });
  } catch (error) {
    console.error('getActivityLogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load activity logs.' });
  }
};

module.exports = {
  getAdminOverview,
  getUsers,
  getRoles,
  updateUserRole,
  getDeleteImpact,
  deleteUser,
  setPromptModeration,
  getActivityLogs
};
