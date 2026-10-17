const { query, getTransaction } = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { findVisiblePrompt } = require('../utils/visibility');
const { LIMITS, toId, isBlank, tooLong } = require('../utils/validators');

const REPORT_REASONS = [
  'Misleading or incorrect output',
  'Harmful or unsafe instructions',
  'Encourages academic dishonesty',
  'Spam or duplicate content',
  'Copied without credit',
  'Other'
];

/** POST /api/reports — any signed-in user can report a prompt they can see (not their own). */
const createReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const promptId = toId(req.body.prompt_id);
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

    if (!promptId || isBlank(reason) || isBlank(description)) {
      return res.status(400).json({ success: false, message: 'Choose a reason and describe the problem.' });
    }
    const lengthError =
      tooLong(reason, LIMITS.reportReason, 'Reason') || tooLong(description, LIMITS.reportDescription, 'Description');
    if (lengthError) return res.status(400).json({ success: false, message: lengthError });

    const prompt = await findVisiblePrompt(promptId, req.user);
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found.' });
    if (prompt.user_id === userId) {
      return res.status(400).json({ success: false, message: "You can't report your own prompt." });
    }

    const pending = await query(
      "SELECT report_id FROM reports WHERE prompt_id = ? AND reporter_id = ? AND status = 'pending'",
      [promptId, userId]
    );
    if (pending.length > 0) {
      return res.status(409).json({ success: false, message: 'You already have a pending report for this prompt.' });
    }

    const result = await query(
      `INSERT INTO reports (prompt_id, reporter_id, reason, description, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [promptId, userId, reason, description]
    );

    await logActivity({
      userId,
      action: 'SUBMIT_REPORT',
      tableName: 'reports',
      recordId: result.insertId,
      metadata: { prompt_id: promptId, reason }
    });

    return res.status(201).json({ success: true, message: 'Report sent to the moderators.', reportId: result.insertId });
  } catch (error) {
    console.error('createReport error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
};

/** GET /api/reports?status=pending|approved|rejected — ADMIN only (enforced in routes). */
const getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let whereClause = '';
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      whereClause = 'WHERE r.status = ?';
      params.push(status);
    }

    const reports = await query(
      `SELECT
        r.report_id,
        r.prompt_id,
        p.title AS prompt_title,
        p.status AS prompt_status,
        p.is_moderated AS prompt_is_moderated,
        owner.name AS prompt_owner_name,
        r.reason,
        r.description,
        r.status,
        r.created_at,
        r.reviewed_at,
        reporter.user_id AS reporter_id,
        reporter.name AS reporter_name,
        reviewer.name AS reviewer_name
      FROM reports r
      INNER JOIN prompts p ON r.prompt_id = p.prompt_id
      INNER JOIN users owner ON p.user_id = owner.user_id
      INNER JOIN users reporter ON r.reporter_id = reporter.user_id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.user_id
      ${whereClause}
      ORDER BY FIELD(r.status, 'pending', 'approved', 'rejected'), r.created_at DESC`,
      params
    );
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error('getReports error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reports.' });
  }
};

/**
 * PUT /api/reports/:id/status — ADMIN only. One transaction:
 *  approved -> report closed AND prompt hidden (is_moderated = TRUE, status = 'archived')
 *  rejected -> report closed; the prompt is un-hidden ONLY if no other approved
 *              report still applies to it (fixes a bug where dismissing one report
 *              restored a prompt that another report had correctly removed).
 */
const updateReportStatus = async (req, res) => {
  let tx;
  try {
    const reportId = toId(req.params.id);
    const { status } = req.body;
    if (!reportId) return res.status(404).json({ success: false, message: 'Report not found.' });
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'." });
    }

    const adminId = req.user.userId;
    tx = await getTransaction();

    const reportRows = await tx.query('SELECT report_id, prompt_id FROM reports WHERE report_id = ? FOR UPDATE', [reportId]);
    if (reportRows.length === 0) {
      await tx.rollback();
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    const report = reportRows[0];

    await tx.query('UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE report_id = ?', [
      status,
      adminId,
      reportId
    ]);

    if (status === 'approved') {
      await tx.query("UPDATE prompts SET is_moderated = TRUE, status = 'archived' WHERE prompt_id = ?", [report.prompt_id]);
    } else {
      const others = await tx.query(
        "SELECT COUNT(*) AS n FROM reports WHERE prompt_id = ? AND status = 'approved' AND report_id <> ?",
        [report.prompt_id, reportId]
      );
      if (others[0].n === 0) {
        await tx.query('UPDATE prompts SET is_moderated = FALSE WHERE prompt_id = ?', [report.prompt_id]);
      }
    }

    await logActivity({
      userId: adminId,
      action: 'MODERATE_REPORT',
      tableName: 'reports',
      recordId: reportId,
      metadata: { status, prompt_id: report.prompt_id },
      tx
    });

    await tx.commit();
    return res.status(200).json({
      success: true,
      message: status === 'approved' ? 'Report approved. The prompt is now hidden.' : 'Report dismissed.'
    });
  } catch (error) {
    if (tx) await tx.rollback().catch(() => {});
    console.error('updateReportStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update the report.' });
  } finally {
    if (tx) tx.release();
  }
};

module.exports = { createReport, getReports, updateReportStatus, REPORT_REASONS };
