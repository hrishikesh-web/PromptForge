-- =============================================================================
-- Migration 001 — make USER (role_id 2) the default role for new users
-- -----------------------------------------------------------------------------
-- Problem:  schema.sql created users.role_id with DEFAULT 1, and role 1 is ADMIN.
--           Any INSERT INTO users that forgets role_id would create an admin.
-- Change:   metadata-only ALTER. No rows are changed, no data is lost.
-- Re-run:   SAFE (idempotent) — setting the same default twice changes nothing.
-- Rollback: ALTER TABLE users ALTER COLUMN role_id SET DEFAULT 1;   (not recommended)
--
-- Run (PowerShell, from the promptforge folder):
--   Get-Content database\migrations\001_users_role_default.sql | mysql -u root -p promptforge_db
-- =============================================================================

USE `promptforge_db`;

-- 1) PRE-CHECK: role 2 must be USER. If this does not show "2 | USER", STOP and do not continue.
SELECT role_id, role_name FROM roles ORDER BY role_id;

-- 2) CHANGE
ALTER TABLE users ALTER COLUMN role_id SET DEFAULT 2;

-- 3) VERIFY: expected COLUMN_DEFAULT = 2
SELECT COLUMN_NAME, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id';
