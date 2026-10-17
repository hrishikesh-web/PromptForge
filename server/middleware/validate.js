/**
 * Input validation helper middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required.`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rules.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${field} must be a valid email address.`);
          }
        }

        if (rules.type === 'number' && isNaN(Number(value))) {
          errors.push(`${field} must be a number.`);
        }

        if (rules.min && typeof value === 'string' && value.length < rules.min) {
          errors.push(`${field} must be at least ${rules.min} characters.`);
        }

        if (rules.max && typeof value === 'string' && value.length > rules.max) {
          errors.push(`${field} must not exceed ${rules.max} characters.`);
        }

        if (rules.minVal && Number(value) < rules.minVal) {
          errors.push(`${field} must be at least ${rules.minVal}.`);
        }

        if (rules.maxVal && Number(value) > rules.maxVal) {
          errors.push(`${field} must not exceed ${rules.maxVal}.`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

module.exports = { validate };
