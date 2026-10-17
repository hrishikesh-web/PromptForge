const { query } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { LIMITS, toId, isBlank, tooLong, mysqlErrorResponse } = require('../utils/validators');

/** GET /api/categories — with counts of public prompts and of all prompts (for admins). */
const getCategories = async (req, res) => {
  try {
    const categories = await query(`
      SELECT
        c.category_id,
        c.name,
        c.description,
        c.created_at,
        COUNT(CASE WHEN p.status = 'published' AND p.is_moderated = FALSE THEN 1 END) AS prompt_count,
        COUNT(p.prompt_id) AS total_prompt_count
      FROM categories c
      LEFT JOIN prompts p ON c.category_id = p.category_id
      GROUP BY c.category_id, c.name, c.description, c.created_at
      ORDER BY c.name ASC
    `);
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('getCategories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load categories.' });
  }
};

const validateCategory = ({ name, description }, partial) => {
  if ((!partial || name !== undefined) && (isBlank(name) || name.trim().length < 2)) return 'Name must be at least 2 characters.';
  return tooLong(name, LIMITS.categoryName, 'Name') || tooLong(description, LIMITS.categoryDescription, 'Description');
};

/** POST /api/categories — ADMIN */
const createCategory = async (req, res) => {
  try {
    const error = validateCategory(req.body, false);
    if (error) return res.status(400).json({ success: false, message: error });
    const name = req.body.name.trim();
    const description = req.body.description ? req.body.description.trim() : null;

    const result = await query('INSERT INTO categories (name, description, created_at) VALUES (?, ?, NOW())', [name, description]);
    await logActivity({ userId: req.user.userId, action: 'CREATE_CATEGORY', tableName: 'categories', recordId: result.insertId, metadata: { name } });
    return res.status(201).json({ success: true, message: `"${name}" created.`, data: { category_id: result.insertId, name, description } });
  } catch (error) {
    const mapped = mysqlErrorResponse(error);
    if (mapped) return res.status(mapped.status).json({ success: false, message: error.code === 'ER_DUP_ENTRY' ? 'A category with this name already exists.' : mapped.message });
    console.error('createCategory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create the category.' });
  }
};

/** PUT /api/categories/:id — ADMIN */
const updateCategory = async (req, res) => {
  try {
    const categoryId = toId(req.params.id);
    const error = validateCategory(req.body, true);
    if (error) return res.status(400).json({ success: false, message: error });

    const result = await query('UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE category_id = ?', [
      req.body.name !== undefined ? req.body.name.trim() : null,
      req.body.description !== undefined && req.body.description !== null ? req.body.description.trim() : null,
      categoryId
    ]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Category not found.' });

    await logActivity({ userId: req.user.userId, action: 'UPDATE_CATEGORY', tableName: 'categories', recordId: categoryId, metadata: { name: req.body.name } });
    return res.status(200).json({ success: true, message: 'Category updated.' });
  } catch (error) {
    const mapped = mysqlErrorResponse(error);
    if (mapped) return res.status(mapped.status).json({ success: false, message: error.code === 'ER_DUP_ENTRY' ? 'A category with this name already exists.' : mapped.message });
    console.error('updateCategory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update the category.' });
  }
};

/**
 * DELETE /api/categories/:id — ADMIN.
 * prompts.category_id is ON DELETE RESTRICT, so a category in use cannot be deleted.
 * We check first to give a clear message instead of a database error.
 */
const deleteCategory = async (req, res) => {
  try {
    const categoryId = toId(req.params.id);
    const rows = await query(
      'SELECT c.name, COUNT(p.prompt_id) AS uses FROM categories c LEFT JOIN prompts p ON p.category_id = c.category_id WHERE c.category_id = ? GROUP BY c.category_id, c.name',
      [categoryId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Category not found.' });
    if (rows[0].uses > 0) {
      return res.status(409).json({
        success: false,
        message: `"${rows[0].name}" is used by ${rows[0].uses} prompt(s). Move them to another category first (foreign key ON DELETE RESTRICT).`
      });
    }
    await query('DELETE FROM categories WHERE category_id = ?', [categoryId]);
    await logActivity({ userId: req.user.userId, action: 'DELETE_CATEGORY', tableName: 'categories', recordId: categoryId, metadata: { name: rows[0].name } });
    return res.status(200).json({ success: true, message: `"${rows[0].name}" deleted.` });
  } catch (error) {
    const mapped = mysqlErrorResponse(error);
    if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message });
    console.error('deleteCategory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete the category.' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
