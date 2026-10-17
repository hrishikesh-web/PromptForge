const { query, getTransaction } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { normalizeTag, isValidTag } = require('../utils/tags');
const { toId } = require('../utils/validators');

/**
 * GET /api/tags?q=react — all tags with how many PUBLIC prompts use them.
 * `q` narrows the list (used for suggestions while typing).
 */
const getTags = async (req, res) => {
  try {
    const params = [];
    let where = '';
    const q = typeof req.query.q === 'string' ? normalizeTag(req.query.q) : '';
    if (q) {
      where = 'WHERE t.tag_name LIKE ?';
      params.push(`%${q}%`);
    }
    const tags = await query(
      `SELECT
         t.tag_id,
         t.tag_name,
         COUNT(p.prompt_id) AS prompt_count
       FROM tags t
       LEFT JOIN prompt_tags pt ON t.tag_id = pt.tag_id
       LEFT JOIN prompts p ON p.prompt_id = pt.prompt_id AND p.status = 'published' AND p.is_moderated = FALSE
       ${where}
       GROUP BY t.tag_id, t.tag_name
       ORDER BY prompt_count DESC, t.tag_name ASC`,
      params
    );
    return res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error('getTags error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load tags.' });
  }
};

/** POST /api/tags — ADMIN. (Users create tags implicitly by tagging their prompts.) */
const createTag = async (req, res) => {
  try {
    const tag = normalizeTag(req.body.tag_name);
    if (!isValidTag(tag)) {
      return res.status(400).json({ success: false, message: 'Tag must be 2-40 characters: letters, numbers and hyphens.' });
    }
    const existing = await query('SELECT tag_id FROM tags WHERE tag_name = ?', [tag]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `#${tag} already exists.`, data: { tag_id: existing[0].tag_id, tag_name: tag } });
    }
    const result = await query('INSERT INTO tags (tag_name) VALUES (?)', [tag]);
    await logActivity({ userId: req.user.userId, action: 'CREATE_TAG', tableName: 'tags', recordId: result.insertId, metadata: { tag_name: tag } });
    return res.status(201).json({ success: true, message: `#${tag} created.`, data: { tag_id: result.insertId, tag_name: tag } });
  } catch (error) {
    console.error('createTag error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create the tag.' });
  }
};

/**
 * PUT /api/tags/:id  { tag_name, merge? } — ADMIN.
 * Renaming to a name that already exists is refused unless merge=true, in which
 * case every prompt using this tag is moved to the existing tag and this tag is
 * deleted (one transaction). This is how duplicates like "reactjs"/"react" are cleaned up.
 */
const updateTag = async (req, res) => {
  let tx;
  try {
    const tagId = toId(req.params.id);
    const newName = normalizeTag(req.body.tag_name);
    if (!tagId) return res.status(404).json({ success: false, message: 'Tag not found.' });
    if (!isValidTag(newName)) {
      return res.status(400).json({ success: false, message: 'Tag must be 2-40 characters: letters, numbers and hyphens.' });
    }

    tx = await getTransaction();
    const current = await tx.query('SELECT tag_id, tag_name FROM tags WHERE tag_id = ? FOR UPDATE', [tagId]);
    if (current.length === 0) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: 'Tag not found.' });
    }
    if (current[0].tag_name === newName) {
      await tx.rollback();
      return res.status(200).json({ success: true, message: 'No change.' });
    }

    const clash = await tx.query('SELECT tag_id FROM tags WHERE tag_name = ?', [newName]);
    if (clash.length > 0) {
      if (req.body.merge !== true) {
        await tx.rollback();
        return res.status(409).json({
          success: false,
          code: 'TAG_EXISTS',
          message: `#${newName} already exists. Merge #${current[0].tag_name} into it?`
        });
      }
      const targetId = clash[0].tag_id;
      // INSERT IGNORE skips prompts that already have the target tag (composite PK on prompt_tags).
      await tx.query(
        'INSERT IGNORE INTO prompt_tags (prompt_id, tag_id) SELECT prompt_id, ? FROM prompt_tags WHERE tag_id = ?',
        [targetId, tagId]
      );
      await tx.query('DELETE FROM tags WHERE tag_id = ?', [tagId]); // CASCADE removes the old links
      await logActivity({
        userId: req.user.userId,
        action: 'MERGE_TAG',
        tableName: 'tags',
        recordId: targetId,
        metadata: { from: current[0].tag_name, into: newName },
        tx
      });
      await tx.commit();
      return res.status(200).json({ success: true, message: `#${current[0].tag_name} merged into #${newName}.` });
    }

    await tx.query('UPDATE tags SET tag_name = ? WHERE tag_id = ?', [newName, tagId]);
    await logActivity({
      userId: req.user.userId,
      action: 'RENAME_TAG',
      tableName: 'tags',
      recordId: tagId,
      metadata: { from: current[0].tag_name, to: newName },
      tx
    });
    await tx.commit();
    return res.status(200).json({ success: true, message: `Renamed to #${newName}.` });
  } catch (error) {
    if (tx) await tx.rollback().catch(() => {});
    console.error('updateTag error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update the tag.' });
  } finally {
    if (tx) tx.release();
  }
};

/** DELETE /api/tags/:id — ADMIN. Prompts are NOT deleted; only their link to this tag (CASCADE on prompt_tags). */
const deleteTag = async (req, res) => {
  try {
    const tagId = toId(req.params.id);
    const rows = await query(
      'SELECT t.tag_name, COUNT(pt.prompt_id) AS uses FROM tags t LEFT JOIN prompt_tags pt ON pt.tag_id = t.tag_id WHERE t.tag_id = ? GROUP BY t.tag_id, t.tag_name',
      [tagId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tag not found.' });
    await query('DELETE FROM tags WHERE tag_id = ?', [tagId]);
    await logActivity({
      userId: req.user.userId,
      action: 'DELETE_TAG',
      tableName: 'tags',
      recordId: tagId,
      metadata: { tag_name: rows[0].tag_name, links_removed: rows[0].uses }
    });
    return res.status(200).json({ success: true, message: `#${rows[0].tag_name} deleted from ${rows[0].uses} prompt(s).` });
  } catch (error) {
    console.error('deleteTag error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete the tag.' });
  }
};

module.exports = { getTags, createTag, updateTag, deleteTag };
