/**
 * Local demonstration mode.
 *
 * Demo accounts use addresses on the reserved ".test" domain (RFC 2606), so they
 * can never belong to a real person or receive email. Their passwords are NOT in
 * the repository: run `npm run demo:passwords` locally to set them.
 *
 * When DEMO_MODE=true (and NODE_ENV is not production), the login page may list
 * the demo accounts' names and emails — never passwords, and never ADMIN accounts.
 */
const DEMO_EMAIL_DOMAIN = 'demo.promptforge.test';

const isDemoMode = () =>
  String(process.env.DEMO_MODE || 'false').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';

const isDemoEmail = (email) => typeof email === 'string' && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);

module.exports = { DEMO_EMAIL_DOMAIN, isDemoMode, isDemoEmail };
