const { query } = require('../config/db');
const UC = require('../sql/useCases');

/**
 * Every analytics endpoint runs a query from sql/useCases.js and returns
 *   { data, query: { title, sql, params, concepts, explanation } }
 * so the Analytics page can show the exact SQL that produced each result.
 */
const run = (builder, getArgs = () => ({})) => async (req, res) => {
  try {
    const q = builder(getArgs(req));
    const rows = await query(q.sql, q.params);
    return res.status(200).json({
      success: true,
      data: rows,
      query: { title: q.title, sql: q.sql, params: q.params, concepts: q.concepts || [], explanation: q.explanation || '' }
    });
  } catch (error) {
    console.error(`analytics (${builder.name}) error:`, error);
    return res.status(500).json({ success: false, message: 'Failed to run the analytics query.' });
  }
};

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 100) : undefined);

const getGlobalMetrics = async (req, res) => {
  try {
    const q = UC.platformMetrics();
    const [row] = await query(q.sql, q.params);
    return res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error('getGlobalMetrics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load platform totals.' });
  }
};

module.exports = {
  getGlobalMetrics,
  getTopPromptsByEngagement: run(UC.topPromptsByEngagement), // Use case 1
  getMostActiveCreators: run(UC.mostActiveCreators, (req) => ({ month: str(req.query.month) })), // Use case 2
  getPromptsFilteredMulti: run(UC.filterByModelCategoryTag, (req) => ({
    category: str(req.query.category),
    model: str(req.query.model),
    tag: str(req.query.tag)
  })), // Use case 3
  getUsersWithMostBookmarks: run(UC.usersWithMostBookmarks), // Use case 4
  getAvgRatingByCategory: run(UC.avgRatingByCategory), // Use case 5
  getMonthlyCreationTrend: run(UC.monthlyCreationTrend, (req) => ({ months: req.query.months })), // Use case 6
  getPromptsByModel: run(UC.promptsByModel)
};
