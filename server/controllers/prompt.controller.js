const { query, getTransaction } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { visibilityCondition } = require('../utils/visibility');
const { normalizeTagList, normalizeTag, setPromptTags, attachTags } = require('../utils/tags');
const {
  PROMPT_STATUSES,
  LIMITS,
  toId,
  clampInt,
  isBlank,
  tooLong,
  mysqlErrorResponse
} = require('../utils/validators');

/** Escape LIKE wildcards so a search for "100%" matches literally. */
const likeTerm = (text) => `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

const SORTS = {
  newest: 'p.created_at DESC',
  updated: 'p.updated_at DESC',
  popular: 'engagement_score DESC, like_count DESC, p.created_at DESC',
  rating: 'avg_rating DESC, rating_count DESC, p.created_at DESC'
};

/**
 * GET /api/prompts
 * Query params (all optional):
 *   search      – matched against title, description, tag names and creator name
 *   category_id, model_id, tag_id, user_id – integer filters
 *   tag         – tag name filter (normalised, e.g. "open-book")
 *   status      – published (default) | draft | archived | all
 *   sort        – newest (default) | updated | popular | rating
 *   page, limit – pagination (limit 1–50)
 *
 * Visibility is ALWAYS applied first (see utils/visibility.js), so a status
 * filter can only narrow what the user is already allowed to see.
 */
const getPrompts = async (req, res) => {
  try {
    const { search, category_id, model_id, tag_id, user_id, tag } = req.query;
    const status = req.query.status || 'published';
    const sort = SORTS[req.query.sort] ? req.query.sort : 'newest';
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 20, 1, 50);
    const offset = (page - 1) * limit;

    if (status !== 'all' && !PROMPT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter.' });
    }

    const currentUserId = req.user ? req.user.userId : 0;
    const conditions = [];
    const params = [];

    // 1. Who may see what (privacy rule)
    const vis = visibilityCondition(req.user, 'p');
    conditions.push(vis.sql);
    params.push(...vis.params);

    // 2. Status filter
    if (status !== 'all') {
      conditions.push('p.status = ?');
      params.push(status);
    }

    // 3. Keyword search: title, description, any tag name, or creator name
    if (typeof search === 'string' && search.trim()) {
      const term = likeTerm(search.trim().slice(0, 100));
      conditions.push(`(
        p.title LIKE ? OR p.description LIKE ?
        OR EXISTS (SELECT 1 FROM prompt_tags spt INNER JOIN tags st ON st.tag_id = spt.tag_id
                   WHERE spt.prompt_id = p.prompt_id AND st.tag_name LIKE ?)
        OR EXISTS (SELECT 1 FROM users su WHERE su.user_id = p.user_id AND su.name LIKE ?)
      )`);
      params.push(term, term, likeTerm(normalizeTag(search) || search.trim()), term);
    }

    // 4. Exact filters
    const categoryId = toId(category_id);
    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    }
    const modelId = toId(model_id);
    if (modelId) {
      conditions.push('p.model_id = ?');
      params.push(modelId);
    }
    const creatorId = toId(user_id);
    if (creatorId) {
      conditions.push('p.user_id = ?');
      params.push(creatorId);
    }
    const tagId = toId(tag_id);
    if (tagId) {
      conditions.push('EXISTS (SELECT 1 FROM prompt_tags pt_sub WHERE pt_sub.prompt_id = p.prompt_id AND pt_sub.tag_id = ?)');
      params.push(tagId);
    }
    if (typeof tag === 'string' && normalizeTag(tag)) {
      conditions.push(`EXISTS (SELECT 1 FROM prompt_tags ptn INNER JOIN tags tn ON tn.tag_id = ptn.tag_id
                               WHERE ptn.prompt_id = p.prompt_id AND tn.tag_name = ?)`);
      params.push(normalizeTag(tag));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        p.prompt_id,
        p.title,
        p.description,
        p.status,
        p.is_moderated,
        p.created_at,
        p.updated_at,
        u.user_id AS creator_id,
        u.name AS creator_name,
        c.category_id,
        c.name AS category_name,
        m.model_id,
        m.model_name,
        m.provider,
        COALESCE(l_stats.like_count, 0) AS like_count,
        COALESCE(b_stats.bookmark_count, 0) AS bookmark_count,
        COALESCE(c_stats.comment_count, 0) AS comment_count,
        COALESCE(r_stats.rating_count, 0) AS rating_count,
        ROUND(COALESCE(r_stats.avg_rating, 0), 1) AS avg_rating,
        (COALESCE(l_stats.like_count, 0) * 2 + COALESCE(b_stats.bookmark_count, 0) * 3 + COALESCE(c_stats.comment_count, 0)) AS engagement_score,
        CASE WHEN user_l.like_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_liked,
        CASE WHEN user_b.bookmark_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_bookmarked,
        COALESCE(user_r.rating_value, 0) AS user_rating,
        pv.content AS latest_content,
        pv.version_number AS current_version,
        (
          SELECT GROUP_CONCAT(CONCAT(t.tag_id, ':', t.tag_name) ORDER BY t.tag_name SEPARATOR '||')
          FROM prompt_tags pt
          INNER JOIN tags t ON pt.tag_id = t.tag_id
          WHERE pt.prompt_id = p.prompt_id
        ) AS raw_tags
      FROM prompts p
      INNER JOIN users u ON p.user_id = u.user_id
      INNER JOIN categories c ON p.category_id = c.category_id
      INNER JOIN ai_models m ON p.model_id = m.model_id
      LEFT JOIN prompt_versions pv ON p.prompt_id = pv.prompt_id AND pv.version_number = (
        SELECT MAX(v_sub.version_number) FROM prompt_versions v_sub WHERE v_sub.prompt_id = p.prompt_id
      )
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS like_count FROM likes GROUP BY prompt_id) l_stats ON p.prompt_id = l_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY prompt_id) b_stats ON p.prompt_id = b_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS comment_count FROM comments GROUP BY prompt_id) c_stats ON p.prompt_id = c_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS rating_count, AVG(rating_value) AS avg_rating FROM ratings GROUP BY prompt_id) r_stats ON p.prompt_id = r_stats.prompt_id
      LEFT JOIN likes user_l ON p.prompt_id = user_l.prompt_id AND user_l.user_id = ?
      LEFT JOIN bookmarks user_b ON p.prompt_id = user_b.prompt_id AND user_b.user_id = ?
      LEFT JOIN ratings user_r ON p.prompt_id = user_r.prompt_id AND user_r.user_id = ?
      ${whereClause}
      ORDER BY ${SORTS[sort]}
      LIMIT ? OFFSET ?
    `;

    const rows = await query(sql, [currentUserId, currentUserId, currentUserId, ...params, limit, offset]);

    const prompts = rows.map(attachTags);

    // Same WHERE clause (conditions only reference p.*), so the count matches the list.
    const countResult = await query(`SELECT COUNT(*) AS total FROM prompts p ${whereClause}`, params);
    const total = countResult[0].total;

    return res.status(200).json({
      success: true,
      data: prompts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('getPrompts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve prompts.' });
  }
};

/**
 * GET /api/prompts/:id — prompt with tags, engagement and full version history.
 * Private prompts return 404 (not 403) so their existence is not revealed.
 */
const getPromptById = async (req, res) => {
  try {
    const promptId = toId(req.params.id);
    if (!promptId) return res.status(404).json({ success: false, message: 'Prompt not found.' });

    const currentUserId = req.user ? req.user.userId : 0;
    const vis = visibilityCondition(req.user, 'p');

    const rows = await query(
      `SELECT
        p.prompt_id,
        p.title,
        p.description,
        p.status,
        p.is_moderated,
        p.created_at,
        p.updated_at,
        u.user_id AS creator_id,
        u.name AS creator_name,
        u.bio AS creator_bio,
        c.category_id,
        c.name AS category_name,
        m.model_id,
        m.model_name,
        m.provider,
        COALESCE(l_stats.like_count, 0) AS like_count,
        COALESCE(b_stats.bookmark_count, 0) AS bookmark_count,
        COALESCE(c_stats.comment_count, 0) AS comment_count,
        COALESCE(r_stats.rating_count, 0) AS rating_count,
        ROUND(COALESCE(r_stats.avg_rating, 0), 1) AS avg_rating,
        CASE WHEN user_l.like_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_liked,
        CASE WHEN user_b.bookmark_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_bookmarked,
        COALESCE(user_r.rating_value, 0) AS user_rating,
        CASE WHEN user_f.follow_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_following_creator
      FROM prompts p
      INNER JOIN users u ON p.user_id = u.user_id
      INNER JOIN categories c ON p.category_id = c.category_id
      INNER JOIN ai_models m ON p.model_id = m.model_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS like_count FROM likes GROUP BY prompt_id) l_stats ON p.prompt_id = l_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS bookmark_count FROM bookmarks GROUP BY prompt_id) b_stats ON p.prompt_id = b_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS comment_count FROM comments GROUP BY prompt_id) c_stats ON p.prompt_id = c_stats.prompt_id
      LEFT JOIN (SELECT prompt_id, COUNT(*) AS rating_count, AVG(rating_value) AS avg_rating FROM ratings GROUP BY prompt_id) r_stats ON p.prompt_id = r_stats.prompt_id
      LEFT JOIN likes user_l ON p.prompt_id = user_l.prompt_id AND user_l.user_id = ?
      LEFT JOIN bookmarks user_b ON p.prompt_id = user_b.prompt_id AND user_b.user_id = ?
      LEFT JOIN ratings user_r ON p.prompt_id = user_r.prompt_id AND user_r.user_id = ?
      LEFT JOIN follows user_f ON user_f.following_id = p.user_id AND user_f.follower_id = ?
      WHERE p.prompt_id = ? AND ${vis.sql}`,
      [currentUserId, currentUserId, currentUserId, currentUserId, promptId, ...vis.params]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }

    const tags = await query(
      `SELECT t.tag_id, t.tag_name
       FROM tags t
       INNER JOIN prompt_tags pt ON t.tag_id = pt.tag_id
       WHERE pt.prompt_id = ?
       ORDER BY t.tag_name`,
      [promptId]
    );

    const versions = await query(
      `SELECT pv.version_id, pv.version_number, pv.content, pv.change_notes, pv.created_at,
              u.user_id AS author_id, u.name AS author_name
       FROM prompt_versions pv
       INNER JOIN users u ON pv.created_by = u.user_id
       WHERE pv.prompt_id = ?
       ORDER BY pv.version_number DESC`,
      [promptId]
    );

    return res.status(200).json({
      success: true,
      data: { ...rows[0], tags, versions, latestVersion: versions[0] || null }
    });
  } catch (error) {
    console.error('getPromptById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve prompt.' });
  }
};

/**
 * Shared validation for create and update. `partial` = fields may be omitted.
 */
const validatePromptBody = async (body, { partial }) => {
  const { title, description, content, category_id, model_id, status, change_notes } = body;
  const errors = [];

  if (!partial || title !== undefined) {
    if (isBlank(title) || title.trim().length < 3) errors.push('Title must be at least 3 characters.');
    const e = tooLong(title, LIMITS.title, 'Title');
    if (e) errors.push(e);
  }
  if (!partial || content !== undefined) {
    if (isBlank(content)) errors.push('Prompt content is required.');
    const e = tooLong(content, LIMITS.content, 'Prompt content');
    if (e) errors.push(e);
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') errors.push('Description must be text.');
    const e = tooLong(description, LIMITS.description, 'Description');
    if (e) errors.push(e);
  }
  if (change_notes !== undefined && change_notes !== null) {
    const e = tooLong(change_notes, LIMITS.changeNotes, 'Change notes');
    if (e) errors.push(e);
  }
  if (status !== undefined && !PROMPT_STATUSES.includes(status)) {
    errors.push('Status must be draft, published or archived.');
  }

  const categoryId = category_id !== undefined ? toId(category_id) : null;
  const modelId = model_id !== undefined ? toId(model_id) : null;
  if ((!partial || category_id !== undefined) && !categoryId) errors.push('Choose a valid category.');
  if ((!partial || model_id !== undefined) && !modelId) errors.push('Choose a valid AI model.');

  const tagResult = normalizeTagList(body.tags);
  if (tagResult.error) errors.push(tagResult.error);

  // Referenced rows must exist (friendlier than a foreign-key error).
  if (categoryId) {
    const rows = await query('SELECT category_id FROM categories WHERE category_id = ?', [categoryId]);
    if (rows.length === 0) errors.push('Selected category does not exist.');
  }
  if (modelId) {
    const rows = await query('SELECT model_id FROM ai_models WHERE model_id = ?', [modelId]);
    if (rows.length === 0) errors.push('Selected AI model does not exist.');
  }

  return { errors, categoryId, modelId, tags: tagResult.tags || [] };
};

/**
 * POST /api/prompts — atomic transaction:
 * prompt row + version 1 + tags + activity log either ALL succeed or NONE do.
 */
const createPrompt = async (req, res) => {
  let tx;
  try {
    const { title, description, content } = req.body;
    const status = req.body.status || 'published';
    const v = await validatePromptBody({ ...req.body, status }, { partial: false });
    if (v.errors.length > 0) {
      return res.status(400).json({ success: false, message: v.errors[0], errors: v.errors });
    }

    const userId = req.user.userId;
    tx = await getTransaction();

    const insert = await tx.query(
      `INSERT INTO prompts (user_id, category_id, model_id, title, description, status, is_moderated, created_at)
       VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
      [userId, v.categoryId, v.modelId, title.trim(), description ? description.trim() : null, status]
    );
    const promptId = insert.insertId;

    await tx.query(
      `INSERT INTO prompt_versions (prompt_id, version_number, content, change_notes, created_by, created_at)
       VALUES (?, 1, ?, 'Initial version', ?, NOW())`,
      [promptId, content, userId]
    );

    await setPromptTags(tx, promptId, v.tags);

    await logActivity({
      userId,
      action: 'CREATE_PROMPT',
      tableName: 'prompts',
      recordId: promptId,
      metadata: { title: title.trim(), category_id: v.categoryId, status },
      tx
    });

    await tx.commit();
    return res.status(201).json({ success: true, message: 'Prompt created successfully.', promptId });
  } catch (error) {
    if (tx) await tx.rollback().catch(() => {});
    console.error('createPrompt error:', error);
    const mapped = mysqlErrorResponse(error);
    return res
      .status(mapped ? mapped.status : 500)
      .json({ success: false, message: mapped ? mapped.message : 'Failed to create prompt.' });
  } finally {
    if (tx) tx.release();
  }
};

/**
 * PUT /api/prompts/:id — owner or admin only.
 * Changing the content NEVER overwrites history: it inserts version N+1.
 */
const updatePrompt = async (req, res) => {
  let tx;
  try {
    const promptId = toId(req.params.id);
    if (!promptId) return res.status(404).json({ success: false, message: 'Prompt not found.' });

    const { title, description, content, status, change_notes, tags } = req.body;
    const v = await validatePromptBody(req.body, { partial: true });
    if (v.errors.length > 0) {
      return res.status(400).json({ success: false, message: v.errors[0], errors: v.errors });
    }

    const userId = req.user.userId;
    tx = await getTransaction();

    // Lock the row so two simultaneous edits cannot both create the same version number.
    const existing = await tx.query('SELECT prompt_id, user_id FROM prompts WHERE prompt_id = ? FOR UPDATE', [promptId]);
    if (existing.length === 0) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }
    if (existing[0].user_id !== userId && req.user.role !== 'ADMIN') {
      await tx.rollback();
      return res.status(403).json({ success: false, message: 'Only the creator or an admin can edit this prompt.' });
    }

    await tx.query(
      `UPDATE prompts
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           category_id = COALESCE(?, category_id),
           model_id = COALESCE(?, model_id),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE prompt_id = ?`,
      [
        title !== undefined ? title.trim() : null,
        description !== undefined && description !== null ? description.trim() : null,
        v.categoryId,
        v.modelId,
        status || null,
        promptId
      ]
    );

    let newVersion = null;
    if (typeof content === 'string' && content.trim() !== '') {
      const latest = await tx.query(
        'SELECT version_number, content FROM prompt_versions WHERE prompt_id = ? ORDER BY version_number DESC LIMIT 1',
        [promptId]
      );
      if (!latest[0] || latest[0].content.trim() !== content.trim()) {
        newVersion = latest[0] ? latest[0].version_number + 1 : 1;
        await tx.query(
          `INSERT INTO prompt_versions (prompt_id, version_number, content, change_notes, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [promptId, newVersion, content, (change_notes && change_notes.trim()) || `Updated to v${newVersion}`, userId]
        );
      }
    }

    if (Array.isArray(tags)) {
      await setPromptTags(tx, promptId, v.tags);
    }

    await logActivity({
      userId,
      action: 'UPDATE_PROMPT',
      tableName: 'prompts',
      recordId: promptId,
      metadata: { new_version: newVersion, change_notes: change_notes || null },
      tx
    });

    await tx.commit();
    return res.status(200).json({ success: true, message: 'Prompt updated successfully.', newVersion });
  } catch (error) {
    if (tx) await tx.rollback().catch(() => {});
    console.error('updatePrompt error:', error);
    const mapped = mysqlErrorResponse(error);
    return res
      .status(mapped ? mapped.status : 500)
      .json({ success: false, message: mapped ? mapped.message : 'Failed to update prompt.' });
  } finally {
    if (tx) tx.release();
  }
};

/**
 * POST /api/prompts/:id/rollback/:versionNumber — non-destructive:
 * copies the old content into a NEW version instead of deleting newer ones.
 */
const rollbackPromptVersion = async (req, res) => {
  let tx;
  try {
    const promptId = toId(req.params.id);
    const targetVersionNumber = toId(req.params.versionNumber);
    if (!promptId || !targetVersionNumber) {
      return res.status(404).json({ success: false, message: 'Version not found.' });
    }

    const userId = req.user.userId;
    tx = await getTransaction();

    const promptRows = await tx.query('SELECT prompt_id, user_id FROM prompts WHERE prompt_id = ? FOR UPDATE', [promptId]);
    if (promptRows.length === 0) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }
    if (promptRows[0].user_id !== userId && req.user.role !== 'ADMIN') {
      await tx.rollback();
      return res.status(403).json({ success: false, message: 'Only the creator or an admin can restore versions.' });
    }

    const historyRows = await tx.query(
      'SELECT content FROM prompt_versions WHERE prompt_id = ? AND version_number = ?',
      [promptId, targetVersionNumber]
    );
    if (historyRows.length === 0) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: `Version ${targetVersionNumber} does not exist.` });
    }

    const maxRows = await tx.query('SELECT MAX(version_number) AS max_ver FROM prompt_versions WHERE prompt_id = ?', [promptId]);
    const nextVer = (maxRows[0].max_ver || 0) + 1;

    await tx.query(
      `INSERT INTO prompt_versions (prompt_id, version_number, content, change_notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [promptId, nextVer, historyRows[0].content, `Restored from version ${targetVersionNumber}`, userId]
    );
    await tx.query('UPDATE prompts SET updated_at = NOW() WHERE prompt_id = ?', [promptId]);

    await logActivity({
      userId,
      action: 'ROLLBACK_VERSION',
      tableName: 'prompt_versions',
      recordId: promptId,
      metadata: { restored_from_version: targetVersionNumber, new_version: nextVer },
      tx
    });

    await tx.commit();
    return res.status(200).json({
      success: true,
      message: `Restored version ${targetVersionNumber} as v${nextVer}.`,
      newVersionNumber: nextVer
    });
  } catch (error) {
    if (tx) await tx.rollback().catch(() => {});
    console.error('rollbackPromptVersion error:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore version.' });
  } finally {
    if (tx) tx.release();
  }
};

/**
 * DELETE /api/prompts/:id — owner or admin. ON DELETE CASCADE removes the
 * prompt's versions, tag links, likes, bookmarks, comments, ratings and reports.
 */
const deletePrompt = async (req, res) => {
  try {
    const promptId = toId(req.params.id);
    if (!promptId) return res.status(404).json({ success: false, message: 'Prompt not found.' });

    const existing = await query('SELECT prompt_id, user_id, title FROM prompts WHERE prompt_id = ?', [promptId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Prompt not found.' });
    }
    if (existing[0].user_id !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the creator or an admin can delete this prompt.' });
    }

    await query('DELETE FROM prompts WHERE prompt_id = ?', [promptId]);

    await logActivity({
      userId: req.user.userId,
      action: 'DELETE_PROMPT',
      tableName: 'prompts',
      recordId: promptId,
      metadata: { deleted_title: existing[0].title }
    });

    return res.status(200).json({ success: true, message: 'Prompt deleted.' });
  } catch (error) {
    console.error('deletePrompt error:', error);
    const mapped = mysqlErrorResponse(error);
    return res
      .status(mapped ? mapped.status : 500)
      .json({ success: false, message: mapped ? mapped.message : 'Failed to delete prompt.' });
  }
};

module.exports = {
  getPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  rollbackPromptVersion,
  deletePrompt
};
