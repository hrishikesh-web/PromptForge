const { query } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { LIMITS, toId, isBlank, tooLong, mysqlErrorResponse } = require('../utils/validators');

/**
 * The ai_models table holds the "Suggested model" options for a prompt.
 * Rows like "Any chat model" (provider "Model-agnostic") are valid choices for
 * prompts that work everywhere. context_window is optional information (0 = not applicable).
 */

/** GET /api/models */
const getModels = async (req, res) => {
  try {
    const models = await query(`
      SELECT
        m.model_id,
        m.model_name,
        m.provider,
        m.context_window,
        m.created_at,
        COUNT(CASE WHEN p.status = 'published' AND p.is_moderated = FALSE THEN 1 END) AS prompt_count,
        COUNT(p.prompt_id) AS total_prompt_count
      FROM ai_models m
      LEFT JOIN prompts p ON m.model_id = p.model_id
      GROUP BY m.model_id, m.model_name, m.provider, m.context_window, m.created_at
      ORDER BY (m.provider = 'Model-agnostic') DESC, m.provider ASC, m.model_name ASC
    `);
    return res.status(200).json({ success: true, data: models });
  } catch (error) {
    console.error('getModels error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load AI models.' });
  }
};

const parseContextWindow = (value) => {
  if (value === undefined || value === null || value === '') return { value: undefined };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 100000000) return { error: 'Context window must be a whole number of tokens (0 if unknown).' };
  return { value: n };
};

const validateModel = ({ model_name, provider }, partial) => {
  if ((!partial || model_name !== undefined) && (isBlank(model_name) || model_name.trim().length < 2)) return 'Model name must be at least 2 characters.';
  if ((!partial || provider !== undefined) && isBlank(provider)) return 'Provider is required.';
  return tooLong(model_name, LIMITS.modelName, 'Model name') || tooLong(provider, LIMITS.provider, 'Provider');
};

/** POST /api/models — ADMIN */
const createModel = async (req, res) => {
  try {
    const error = validateModel(req.body, false);
    if (error) return res.status(400).json({ success: false, message: error });
    const cw = parseContextWindow(req.body.context_window);
    if (cw.error) return res.status(400).json({ success: false, message: cw.error });

    const name = req.body.model_name.trim();
    const provider = req.body.provider.trim();
    const result = await query('INSERT INTO ai_models (model_name, provider, context_window, created_at) VALUES (?, ?, ?, NOW())', [
      name,
      provider,
      cw.value ?? 0
    ]);
    await logActivity({ userId: req.user.userId, action: 'CREATE_MODEL', tableName: 'ai_models', recordId: result.insertId, metadata: { model_name: name } });
    return res.status(201).json({ success: true, message: `"${name}" added.`, data: { model_id: result.insertId, model_name: name, provider } });
  } catch (error) {
    const mapped = mysqlErrorResponse(error);
    if (mapped) return res.status(mapped.status).json({ success: false, message: error.code === 'ER_DUP_ENTRY' ? 'A model with this name already exists.' : mapped.message });
    console.error('createModel error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add the AI model.' });
  }
};

/** PUT /api/models/:id — ADMIN */
const updateModel = async (req, res) => {
  try {
    const modelId = toId(req.params.id);
    const error = validateModel(req.body, true);
    if (error) return res.status(400).json({ success: false, message: error });
    const cw = parseContextWindow(req.body.context_window);
    if (cw.error) return res.status(400).json({ success: false, message: cw.error });

    const result = await query(
      `UPDATE ai_models
       SET model_name = COALESCE(?, model_name), provider = COALESCE(?, provider), context_window = COALESCE(?, context_window)
       WHERE model_id = ?`,
      [
        req.body.model_name !== undefined ? req.body.model_name.trim() : null,
        req.body.provider !== undefined ? req.body.provider.trim() : null,
        cw.value ?? null,
        modelId
      ]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Model not found.' });
    await logActivity({ userId: req.user.userId, action: 'UPDATE_MODEL', tableName: 'ai_models', recordId: modelId });
    return res.status(200).json({ success: true, message: 'Model updated.' });
  } catch (error) {
    const mapped = mysqlErrorResponse(error);
    if (mapped) return res.status(mapped.status).json({ success: false, message: error.code === 'ER_DUP_ENTRY' ? 'A model with this name already exists.' : mapped.message });
    console.error('updateModel error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update the AI model.' });
  }
};

/** DELETE /api/models/:id — ADMIN. Blocked while prompts use it (ON DELETE RESTRICT). */
const deleteModel = async (req, res) => {
  try {
    const modelId = toId(req.params.id);
    const rows = await query(
      'SELECT m.model_name, COUNT(p.prompt_id) AS uses FROM ai_models m LEFT JOIN prompts p ON p.model_id = m.model_id WHERE m.model_id = ? GROUP BY m.model_id, m.model_name',
      [modelId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Model not found.' });
    if (rows[0].uses > 0) {
      return res.status(409).json({
        success: false,
        message: `"${rows[0].model_name}" is the suggested model for ${rows[0].uses} prompt(s). Change those prompts first (foreign key ON DELETE RESTRICT).`
      });
    }
    await query('DELETE FROM ai_models WHERE model_id = ?', [modelId]);
    await logActivity({ userId: req.user.userId, action: 'DELETE_MODEL', tableName: 'ai_models', recordId: modelId, metadata: { model_name: rows[0].model_name } });
    return res.status(200).json({ success: true, message: `"${rows[0].model_name}" deleted.` });
  } catch (error) {
    const mapped = mysqlErrorResponse(error);
    if (mapped) return res.status(mapped.status).json({ success: false, message: mapped.message });
    console.error('deleteModel error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete the AI model.' });
  }
};

module.exports = { getModels, createModel, updateModel, deleteModel };
