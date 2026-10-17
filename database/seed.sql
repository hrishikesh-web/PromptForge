-- =============================================================================
-- PROMPTFORGE - base seed for a FRESH database (used only by `npm run db:setup`)
-- -----------------------------------------------------------------------------
-- Only the two roles are created here. All demo content (categories, models,
-- tags, demo accounts, the prompt library and demo activity) comes from the
-- migrations in database/migrations/, which db:setup runs right after this file.
-- That way a fresh install and your existing database get exactly the same data.
--
-- No user passwords are stored in this repository:
--   * register your own account on the website, then make it ADMIN with
--       cd server  ->  npm run admin:promote -- you@example.com
--   * set a local password for the demo accounts with
--       cd server  ->  npm run demo:passwords
-- =============================================================================

USE `promptforge_db`;

INSERT INTO `roles` (`role_id`, `role_name`, `description`) VALUES
(1, 'ADMIN', 'Website administrator: moderation, user and role management, taxonomy management'),
(2, 'USER', 'Regular member: create, edit and share prompts; like, bookmark, rate and comment')
ON DUPLICATE KEY UPDATE description = VALUES(description);
