/**
 * Runs the six DBMS SQL use cases against YOUR local MySQL (read-only SELECTs).
 * Uses exactly the same SQL as the website (server/sql/useCases.js).
 *
 *   cd server
 *   npm run test:sql
 */
const { connect } = require('../db/sqlRunner');
const UC = require('../sql/useCases');

const cases = [
  ['1. Top 10 prompts by engagement', UC.topPromptsByEngagement(), (rows) => rows.length > 0],
  ['2. Most active creators (last 30 days)', UC.mostActiveCreators(), (rows) => rows.length > 0],
  [`3. Filter: ${UC.USE_CASE_3_EXAMPLE.category} + ${UC.USE_CASE_3_EXAMPLE.model} + #${UC.USE_CASE_3_EXAMPLE.tag}`, UC.filterByModelCategoryTag(UC.USE_CASE_3_EXAMPLE), (rows) => rows.length > 0],
  ['4. Users with the most bookmarks', UC.usersWithMostBookmarks(), (rows) => rows.length > 0],
  ['5. Average rating by category', UC.avgRatingByCategory(), (rows) => rows.length > 0],
  ['6. Monthly creation trend (6 months)', UC.monthlyCreationTrend({ months: 6 }), (rows) => rows.length === 6]
];

(async () => {
  const conn = await connect(true);
  let failed = 0;
  try {
    await conn.query('SET SESSION TRANSACTION READ ONLY');
    for (const [label, q, ok] of cases) {
      try {
        const [rows] = await conn.query(q.sql, q.params);
        const pass = ok(rows);
        if (!pass) failed++;
        console.log(`${pass ? '✔' : '⚠'} ${label}: ${rows.length} row(s)${pass ? '' : ' (expected data - did you run migrations 005 and 006?)'}`);
        if (rows.length) console.table(rows.slice(0, 5));
      } catch (err) {
        failed++;
        console.error(`✖ ${label}: ${err.sqlMessage || err.message}`);
      }
    }
  } finally {
    await conn.end();
  }
  console.log(failed ? `\n${failed} use case(s) need attention.` : '\nAll six use cases returned data.');
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('Could not connect to MySQL:', err.message);
  process.exit(1);
});
