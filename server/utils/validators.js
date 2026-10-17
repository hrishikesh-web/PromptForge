/**
 * Small input helpers so controllers validate consistently.
 */
const PROMPT_STATUSES = ['draft', 'published', 'archived'];

const LIMITS = {
  title: 255,
  description: 1000,
  content: 20000,
  changeNotes: 255,
  comment: 2000,
  reportReason: 100,
  reportDescription: 1000,
  categoryName: 100,
  categoryDescription: 500,
  modelName: 100,
  provider: 100,
  userName: 100,
  bio: 500,
  email: 150
};

/** Parse a positive integer id; returns null when invalid. */
const toId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Parse an integer and clamp it into [min, max]; falls back to def. */
const clampInt = (value, def, min, max) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

const isBlank = (value) => typeof value !== 'string' || value.trim() === '';

/** Returns an error message if a string field is too long, otherwise null. */
const tooLong = (value, max, label) =>
  typeof value === 'string' && value.length > max ? `${label} must not exceed ${max} characters.` : null;

/** Translate common MySQL constraint errors into friendly HTTP responses. */
const mysqlErrorResponse = (error) => {
  switch (error && error.code) {
    case 'ER_DUP_ENTRY':
      return { status: 409, message: 'A record with this name already exists.' };
    case 'ER_NO_REFERENCED_ROW_2':
      return { status: 400, message: 'A referenced record (category, model or user) does not exist.' };
    case 'ER_ROW_IS_REFERENCED_2':
      return { status: 409, message: 'This record is still referenced by other data and cannot be deleted.' };
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return { status: 400, message: 'A value violates a database constraint.' };
    case 'ER_DATA_TOO_LONG':
      return { status: 400, message: 'One of the values is too long.' };
    default:
      return null;
  }
};

module.exports = { PROMPT_STATUSES, LIMITS, toId, clampInt, isBlank, tooLong, mysqlErrorResponse };
