-- =============================================================================
-- 099 - LEGACY SEED CLEANUP  (DRAFT - DO NOT RUN WITHOUT REVIEW AND APPROVAL)
-- -----------------------------------------------------------------------------
-- Removes the OLD generic demo content created by the original seed.sql:
--   accounts  admin@, alex@, sarah@, david@, maya@, lucas@promptforge.io
--   their 8 original prompts, 2 unused old categories, unused old tags.
--
-- It is written to protect YOUR data:
--   * A legacy prompt is NOT deleted if anyone outside the legacy accounts wrote one
--     of its versions (for example you edited it).
--   * A legacy account is NOT deleted while it still owns any prompt (including prompts
--     YOU created while logged in as it) or authored any version. Those prompts are
--     never reassigned automatically: the PRE-CHECK lists them so you can decide.
--   * admin@promptforge.io is only deleted if another ADMIN already exists.
--   * Categories, tags and models are only deleted when nothing uses them.
--
-- HOW TO USE
--   1. Back up:   mysqldump -u root -p promptforge_db > backup_before_cleanup.sql
--   2. Run this file once AS IT IS (@confirm_legacy_cleanup = 0): it only shows the
--      PRE-CHECK results and deletes nothing.
--   3. Review the results. Only if you approve, change the 0 below to 1 and run it again:
--        npm run db:migrate -- 099_legacy_cleanup_DRAFT.sql --allow-cleanup
--   Re-running after a cleanup is harmless (there is nothing left to delete).
--   Undo = restore the backup:  mysql -u root -p promptforge_db < backup_before_cleanup.sql
-- =============================================================================

USE `promptforge_db`;

SET @confirm_legacy_cleanup = 1;          -- 0 = report only. 1 = actually delete (after approval).
SET @remove_unused_legacy_models = 0;     -- 1 = also delete old model rows (GPT-4o etc.) that no prompt uses.

-- -----------------------------------------------------------------------------
-- PRE-CHECK A: legacy accounts and what they own
-- "user_created_prompts" = prompts NOT from the original seed (e.g. ones you made while
-- logged in as that account). Any non-zero value keeps that account.
-- -----------------------------------------------------------------------------
SELECT
  u.user_id, u.name, u.email, r.role_name,
  (SELECT COUNT(*) FROM prompts p WHERE p.user_id = u.user_id) AS prompts_owned,
  (SELECT COUNT(*) FROM prompts p WHERE p.user_id = u.user_id AND p.title NOT IN (
     'Zero-Shot Clean Code & Architecture Refactoring Specialist',
     'Comprehensive Research Paper Synthesizer & Critique',
     'Production-Grade Complex SQL Query Architect',
     'High-Conversion B2B SaaS Cold Outreach Sequence',
     'Deep Reasoning Bug Diagnostician & Root Cause Analyzer',
     'Autonomous React/Node Pair Programming Agent Persona',
     'Automated Exploratory Data Analysis & Statistical Storyteller',
     'Socratic Logic & Fallacy Detector for Academic Arguments')) AS user_created_prompts,
  (SELECT COUNT(*) FROM prompt_versions v INNER JOIN prompts p ON p.prompt_id = v.prompt_id
     WHERE v.created_by = u.user_id AND p.user_id <> u.user_id) AS versions_on_others_prompts
FROM users u INNER JOIN roles r ON r.role_id = u.role_id
WHERE u.email IN ('admin@promptforge.io', 'alex@promptforge.io', 'sarah@promptforge.io',
                  'david@promptforge.io', 'maya@promptforge.io', 'lucas@promptforge.io')
ORDER BY u.user_id;

-- PRE-CHECK B: prompts owned by legacy accounts that are NOT original seed prompts.
-- These will be KEPT. If they are yours, tell me and we can plan an approved reassignment.
SELECT p.prompt_id, p.title, u.email AS owner, p.status, p.created_at
FROM prompts p INNER JOIN users u ON u.user_id = p.user_id
WHERE u.email IN ('admin@promptforge.io', 'alex@promptforge.io', 'sarah@promptforge.io',
                  'david@promptforge.io', 'maya@promptforge.io', 'lucas@promptforge.io')
  AND p.title NOT IN (
     'Zero-Shot Clean Code & Architecture Refactoring Specialist',
     'Comprehensive Research Paper Synthesizer & Critique',
     'Production-Grade Complex SQL Query Architect',
     'High-Conversion B2B SaaS Cold Outreach Sequence',
     'Deep Reasoning Bug Diagnostician & Root Cause Analyzer',
     'Autonomous React/Node Pair Programming Agent Persona',
     'Automated Exploratory Data Analysis & Statistical Storyteller',
     'Socratic Logic & Fallacy Detector for Academic Arguments');

-- PRE-CHECK C: admins other than the legacy admin (must be at least 1 to remove admin@promptforge.io)
SELECT u.user_id, u.name, u.email FROM users u INNER JOIN roles r ON r.role_id = u.role_id
WHERE r.role_name = 'ADMIN' AND u.email <> 'admin@promptforge.io';
SET @other_admins = (SELECT COUNT(*) FROM users u INNER JOIN roles r ON r.role_id = u.role_id
                     WHERE r.role_name = 'ADMIN' AND u.email <> 'admin@promptforge.io');

-- PRE-CHECK D: rows that WOULD be deleted by each step (with the current switches)
SELECT 'legacy prompts' AS what, COUNT(*) AS rows_affected
FROM prompts p INNER JOIN users u ON u.user_id = p.user_id
WHERE (u.email, p.title) IN (
  ('alex@promptforge.io',  'Zero-Shot Clean Code & Architecture Refactoring Specialist'),
  ('sarah@promptforge.io', 'Comprehensive Research Paper Synthesizer & Critique'),
  ('david@promptforge.io', 'Production-Grade Complex SQL Query Architect'),
  ('maya@promptforge.io',  'High-Conversion B2B SaaS Cold Outreach Sequence'),
  ('alex@promptforge.io',  'Deep Reasoning Bug Diagnostician & Root Cause Analyzer'),
  ('david@promptforge.io', 'Autonomous React/Node Pair Programming Agent Persona'),
  ('lucas@promptforge.io', 'Automated Exploratory Data Analysis & Statistical Storyteller'),
  ('sarah@promptforge.io', 'Socratic Logic & Fallacy Detector for Academic Arguments'))
  AND NOT EXISTS (SELECT 1 FROM prompt_versions v INNER JOIN users vu ON vu.user_id = v.created_by
                  WHERE v.prompt_id = p.prompt_id
                    AND vu.email NOT IN ('admin@promptforge.io', 'alex@promptforge.io', 'sarah@promptforge.io',
                                         'david@promptforge.io', 'maya@promptforge.io', 'lucas@promptforge.io'));

START TRANSACTION;

-- STEP 1: original seed prompts (CASCADE removes their versions, tags, likes, bookmarks,
-- comments, ratings and reports). Prompts someone else edited are kept.
DELETE p FROM prompts p
INNER JOIN users u ON u.user_id = p.user_id
WHERE @confirm_legacy_cleanup = 1
  AND (u.email, p.title) IN (
    ('alex@promptforge.io',  'Zero-Shot Clean Code & Architecture Refactoring Specialist'),
    ('sarah@promptforge.io', 'Comprehensive Research Paper Synthesizer & Critique'),
    ('david@promptforge.io', 'Production-Grade Complex SQL Query Architect'),
    ('maya@promptforge.io',  'High-Conversion B2B SaaS Cold Outreach Sequence'),
    ('alex@promptforge.io',  'Deep Reasoning Bug Diagnostician & Root Cause Analyzer'),
    ('david@promptforge.io', 'Autonomous React/Node Pair Programming Agent Persona'),
    ('lucas@promptforge.io', 'Automated Exploratory Data Analysis & Statistical Storyteller'),
    ('sarah@promptforge.io', 'Socratic Logic & Fallacy Detector for Academic Arguments'))
  AND NOT EXISTS (SELECT 1 FROM prompt_versions v INNER JOIN users vu ON vu.user_id = v.created_by
                  WHERE v.prompt_id = p.prompt_id
                    AND vu.email NOT IN ('admin@promptforge.io', 'alex@promptforge.io', 'sarah@promptforge.io',
                                         'david@promptforge.io', 'maya@promptforge.io', 'lucas@promptforge.io'));

-- STEP 2: legacy accounts that now own nothing and wrote no versions.
-- CASCADE removes their likes, bookmarks, ratings, comments, follows and notifications;
-- activity_logs.user_id and reports.reviewed_by become NULL (ON DELETE SET NULL).
DELETE u FROM users u
WHERE @confirm_legacy_cleanup = 1
  AND u.email IN ('alex@promptforge.io', 'sarah@promptforge.io', 'david@promptforge.io',
                  'maya@promptforge.io', 'lucas@promptforge.io', 'admin@promptforge.io')
  AND NOT EXISTS (SELECT 1 FROM prompts p WHERE p.user_id = u.user_id)
  AND NOT EXISTS (SELECT 1 FROM prompt_versions v WHERE v.created_by = u.user_id)
  AND (u.email <> 'admin@promptforge.io' OR @other_admins > 0);

-- STEP 3: the 7 original seed activity-log rows (identified by their fixed seed timestamps)
-- once their user has been removed.
DELETE FROM activity_logs
WHERE @confirm_legacy_cleanup = 1
  AND user_id IS NULL
  AND (action, created_at) IN (
    ('CREATE', '2026-02-05 10:15:00'), ('UPDATE_VERSION', '2026-02-06 14:20:00'),
    ('LIKE', '2026-02-07 10:00:00'), ('BOOKMARK', '2026-02-07 10:05:00'),
    ('COMMENT', '2026-02-07 11:00:00'), ('CREATE', '2026-02-14 15:45:00'),
    ('REPORT', '2026-02-25 15:30:00'));

-- STEP 4: old categories the library does not use, only if empty.
DELETE c FROM categories c
WHERE @confirm_legacy_cleanup = 1
  AND c.name IN ('Creative Writing', 'System Prompts & Agents')
  AND NOT EXISTS (SELECT 1 FROM prompts p WHERE p.category_id = c.category_id);

-- STEP 5: old tags the library does not use, only if no prompt still has them.
DELETE t FROM tags t
WHERE @confirm_legacy_cleanup = 1
  AND t.tag_name IN ('code-refactor', 'reasoning', 'chain-of-thought', 'seo', 'few-shot', 'agent-instructions', 'copywriting')
  AND NOT EXISTS (SELECT 1 FROM prompt_tags pt WHERE pt.tag_id = t.tag_id);

-- STEP 6 (optional switch): old model rows that no prompt uses.
DELETE m FROM ai_models m
WHERE @confirm_legacy_cleanup = 1 AND @remove_unused_legacy_models = 1
  AND m.model_name IN ('GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro', 'Llama 3.3 70B', 'DeepSeek R1', 'Mistral Large')
  AND NOT EXISTS (SELECT 1 FROM prompts p WHERE p.model_id = m.model_id);

COMMIT;

-- VERIFY
SELECT @confirm_legacy_cleanup AS cleanup_was_enabled;
SELECT u.email FROM users u WHERE u.email LIKE '%@promptforge.io' ORDER BY u.email;
SELECT 'users' AS t, COUNT(*) AS n FROM users UNION ALL SELECT 'prompts', COUNT(*) FROM prompts
UNION ALL SELECT 'categories', COUNT(*) FROM categories UNION ALL SELECT 'tags', COUNT(*) FROM tags
UNION ALL SELECT 'ai_models', COUNT(*) FROM ai_models;
