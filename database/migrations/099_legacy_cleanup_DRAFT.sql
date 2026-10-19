
USE `promptforge_db`;

SET @confirm_legacy_cleanup = 1;
SET @remove_unused_legacy_models = 0;

SELECT
  u.user_id,
  u.name,
  u.email,
  r.role_name,
  (SELECT COUNT(*) FROM prompts p WHERE p.user_id = u.user_id) AS prompts_owned,
  (SELECT COUNT(*) FROM prompts p
   WHERE p.user_id = u.user_id
     AND p.title NOT IN (
       'Zero-Shot Clean Code & Architecture Refactoring Specialist',
       'Comprehensive Research Paper Synthesizer & Critique',
       'Production-Grade Complex SQL Query Architect',
       'High-Conversion B2B SaaS Cold Outreach Sequence',
       'Deep Reasoning Bug Diagnostician & Root Cause Analyzer',
       'Autonomous React/Node Pair Programming Agent Persona',
       'Automated Exploratory Data Analysis & Statistical Storyteller',
       'Socratic Logic & Fallacy Detector for Academic Arguments'
     )) AS user_created_prompts,
  (SELECT COUNT(*) FROM prompt_versions v
   INNER JOIN prompts p ON p.prompt_id = v.prompt_id
   WHERE v.created_by = u.user_id AND p.user_id <> u.user_id) AS versions_on_others_prompts
FROM users u
INNER JOIN roles r ON r.role_id = u.role_id
WHERE u.email IN (
  'admin@promptforge.io',
  'alex@promptforge.io',
  'sarah@promptforge.io',
  'david@promptforge.io',
  'maya@promptforge.io',
  'lucas@promptforge.io'
)
ORDER BY u.user_id;

SELECT p.prompt_id, p.title, u.email AS owner, p.status, p.created_at
FROM prompts p
INNER JOIN users u ON u.user_id = p.user_id
WHERE u.email IN (
  'admin@promptforge.io',
  'alex@promptforge.io',
  'sarah@promptforge.io',
  'david@promptforge.io',
  'maya@promptforge.io',
  'lucas@promptforge.io'
)
AND p.title NOT IN (
  'Zero-Shot Clean Code & Architecture Refactoring Specialist',
  'Comprehensive Research Paper Synthesizer & Critique',
  'Production-Grade Complex SQL Query Architect',
  'High-Conversion B2B SaaS Cold Outreach Sequence',
  'Deep Reasoning Bug Diagnostician & Root Cause Analyzer',
  'Autonomous React/Node Pair Programming Agent Persona',
  'Automated Exploratory Data Analysis & Statistical Storyteller',
  'Socratic Logic & Fallacy Detector for Academic Arguments'
);

SELECT u.user_id, u.name, u.email
FROM users u
INNER JOIN roles r ON r.role_id = u.role_id
WHERE r.role_name = 'ADMIN'
  AND u.email <> 'admin@promptforge.io';

SET @other_admins = (
  SELECT COUNT(*)
  FROM users u
  INNER JOIN roles r ON r.role_id = u.role_id
  WHERE r.role_name = 'ADMIN'
    AND u.email <> 'admin@promptforge.io'
);

SELECT 'legacy prompts' AS what, COUNT(*) AS rows_affected
FROM prompts p
INNER JOIN users u ON u.user_id = p.user_id
WHERE (u.email, p.title) IN (
  ('alex@promptforge.io', 'Zero-Shot Clean Code & Architecture Refactoring Specialist'),
  ('sarah@promptforge.io', 'Comprehensive Research Paper Synthesizer & Critique'),
  ('david@promptforge.io', 'Production-Grade Complex SQL Query Architect'),
  ('maya@promptforge.io', 'High-Conversion B2B SaaS Cold Outreach Sequence'),
  ('alex@promptforge.io', 'Deep Reasoning Bug Diagnostician & Root Cause Analyzer'),
  ('david@promptforge.io', 'Autonomous React/Node Pair Programming Agent Persona'),
  ('lucas@promptforge.io', 'Automated Exploratory Data Analysis & Statistical Storyteller'),
  ('sarah@promptforge.io', 'Socratic Logic & Fallacy Detector for Academic Arguments')
)
AND NOT EXISTS (
  SELECT 1
  FROM prompt_versions v
  INNER JOIN users vu ON vu.user_id = v.created_by
  WHERE v.prompt_id = p.prompt_id
    AND vu.email NOT IN (
      'admin@promptforge.io',
      'alex@promptforge.io',
      'sarah@promptforge.io',
      'david@promptforge.io',
      'maya@promptforge.io',
      'lucas@promptforge.io'
    )
);

START TRANSACTION;

DELETE p
FROM prompts p
INNER JOIN users u ON u.user_id = p.user_id
WHERE @confirm_legacy_cleanup = 1
  AND (u.email, p.title) IN (
    ('alex@promptforge.io', 'Zero-Shot Clean Code & Architecture Refactoring Specialist'),
    ('sarah@promptforge.io', 'Comprehensive Research Paper Synthesizer & Critique'),
    ('david@promptforge.io', 'Production-Grade Complex SQL Query Architect'),
    ('maya@promptforge.io', 'High-Conversion B2B SaaS Cold Outreach Sequence'),
    ('alex@promptforge.io', 'Deep Reasoning Bug Diagnostician & Root Cause Analyzer'),
    ('david@promptforge.io', 'Autonomous React/Node Pair Programming Agent Persona'),
    ('lucas@promptforge.io', 'Automated Exploratory Data Analysis & Statistical Storyteller'),
    ('sarah@promptforge.io', 'Socratic Logic & Fallacy Detector for Academic Arguments')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM prompt_versions v
    INNER JOIN users vu ON vu.user_id = v.created_by
    WHERE v.prompt_id = p.prompt_id
      AND vu.email NOT IN (
        'admin@promptforge.io',
        'alex@promptforge.io',
        'sarah@promptforge.io',
        'david@promptforge.io',
        'maya@promptforge.io',
        'lucas@promptforge.io'
      )
  );

DELETE u
FROM users u
WHERE @confirm_legacy_cleanup = 1
  AND u.email IN (
    'alex@promptforge.io',
    'sarah@promptforge.io',
    'david@promptforge.io',
    'maya@promptforge.io',
    'lucas@promptforge.io',
    'admin@promptforge.io'
  )
  AND NOT EXISTS (SELECT 1 FROM prompts p WHERE p.user_id = u.user_id)
  AND NOT EXISTS (SELECT 1 FROM prompt_versions v WHERE v.created_by = u.user_id)
  AND (u.email <> 'admin@promptforge.io' OR @other_admins > 0);

DELETE FROM activity_logs
WHERE @confirm_legacy_cleanup = 1
  AND user_id IS NULL
  AND (action, created_at) IN (
    ('CREATE', '2026-02-05 10:15:00'),
    ('UPDATE_VERSION', '2026-02-06 14:20:00'),
    ('LIKE', '2026-02-07 10:00:00'),
    ('BOOKMARK', '2026-02-07 10:05:00'),
    ('COMMENT', '2026-02-07 11:00:00'),
    ('CREATE', '2026-02-14 15:45:00'),
    ('REPORT', '2026-02-25 15:30:00')
  );

DELETE c
FROM categories c
WHERE @confirm_legacy_cleanup = 1
  AND c.name IN ('Creative Writing', 'System Prompts & Agents')
  AND NOT EXISTS (
    SELECT 1 FROM prompts p WHERE p.category_id = c.category_id
  );

DELETE t
FROM tags t
WHERE @confirm_legacy_cleanup = 1
  AND t.tag_name IN (
    'code-refactor',
    'reasoning',
    'chain-of-thought',
    'seo',
    'few-shot',
    'agent-instructions',
    'copywriting'
  )
  AND NOT EXISTS (
    SELECT 1 FROM prompt_tags pt WHERE pt.tag_id = t.tag_id
  );

DELETE m
FROM ai_models m
WHERE @confirm_legacy_cleanup = 1
  AND @remove_unused_legacy_models = 1
  AND m.model_name IN (
    'GPT-4o',
    'Claude 3.5 Sonnet',
    'Gemini 1.5 Pro',
    'Llama 3.3 70B',
    'DeepSeek R1',
    'Mistral Large'
  )
  AND NOT EXISTS (
    SELECT 1 FROM prompts p WHERE p.model_id = m.model_id
  );

COMMIT;

SELECT @confirm_legacy_cleanup AS cleanup_was_enabled;

SELECT u.email
FROM users u
WHERE u.email LIKE '%@promptforge.io'
ORDER BY u.email;

SELECT 'users' AS t, COUNT(*) AS n FROM users
UNION ALL
SELECT 'prompts', COUNT(*) FROM prompts
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'ai_models', COUNT(*) FROM ai_models;
