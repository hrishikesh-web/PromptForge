

USE `promptforge_db`;
SET NAMES utf8mb4;


SELECT category_id, name FROM categories ORDER BY category_id;
SELECT model_id, model_name, provider FROM ai_models ORDER BY model_id;
SELECT tag_id, tag_name FROM tags ORDER BY tag_id;


SET @target_exists = (SELECT COUNT(*) FROM categories WHERE name = 'Study & Exams');
UPDATE categories SET name = 'Study & Exams' WHERE name = 'Academic & Research' AND @target_exists = 0;
SET @target_exists = (SELECT COUNT(*) FROM categories WHERE name = 'Coding & Development');
UPDATE categories SET name = 'Coding & Development' WHERE name = 'Software Engineering' AND @target_exists = 0;
SET @target_exists = (SELECT COUNT(*) FROM categories WHERE name = 'Content Creation & Social Media');
UPDATE categories SET name = 'Content Creation & Social Media' WHERE name = 'Marketing & Sales' AND @target_exists = 0;


INSERT INTO categories (name, description) VALUES
  ('Study & Exams', 'Turn lecture material into notes, practice questions, flashcards and clear explanations.'),
  ('Assignments & Projects', 'Plan, review and present your own project work without inventing results.'),
  ('Coding & Development', 'Debug, review, test and build software, from React components to Node.js APIs.'),
  ('Data Analysis & SQL', 'Write and understand SQL, explain database schemas and work with data.'),
  ('Cybersecurity & Labs', 'Learn security concepts and document work in labs you are authorised to use.'),
  ('Photo & Image', 'Reusable editing looks, style descriptions and image-generation briefs.'),
  ('Content Creation & Social Media', 'Captions, short-video scripts, thumbnails and content planning.'),
  ('Gaming', 'Spoiler-safe help with stories and missions, and settings for your hardware.'),
  ('Communication & Career', 'Emails, posts and interview practice that keep your real facts intact.'),
  ('Planning & Productivity', 'Turn messy notes, syllabi and to-do lists into realistic plans.')
ON DUPLICATE KEY UPDATE description = VALUES(description);


INSERT IGNORE INTO ai_models (model_name, provider, context_window) VALUES
  ('Any chat model', 'Model-agnostic', 0),
  ('Any model with file upload', 'Model-agnostic', 0),
  ('Any image-editing model', 'Model-agnostic', 0),
  ('Any image-generation model', 'Model-agnostic', 0);


SET @target_exists = (SELECT COUNT(*) FROM tags WHERE tag_name = 'summary');
UPDATE tags SET tag_name = 'summary' WHERE tag_name = 'summarization' AND @target_exists = 0;
SET @target_exists = (SELECT COUNT(*) FROM tags WHERE tag_name = 'testing');
UPDATE tags SET tag_name = 'testing' WHERE tag_name = 'unit-testing' AND @target_exists = 0;
SET @target_exists = (SELECT COUNT(*) FROM tags WHERE tag_name = 'sql');
UPDATE tags SET tag_name = 'sql' WHERE tag_name = 'sql-generator' AND @target_exists = 0;


INSERT IGNORE INTO tags (tag_name) VALUES
  ('authorised-lab'),
  ('blue-team'),
  ('colour-grade'),
  ('content-planning'),
  ('dbms'),
  ('debugging'),
  ('email'),
  ('exam-prep'),
  ('explanation'),
  ('flashcards'),
  ('frontend'),
  ('image-generation'),
  ('instagram'),
  ('linkedin'),
  ('log-analysis'),
  ('needs-code'),
  ('needs-image'),
  ('needs-pdf'),
  ('needs-slides'),
  ('no-spoilers'),
  ('nodejs'),
  ('open-book'),
  ('pc-settings'),
  ('photo-editing'),
  ('placements'),
  ('planning'),
  ('portfolio'),
  ('presentation'),
  ('question-bank'),
  ('react'),
  ('report-writing'),
  ('review'),
  ('rewriting'),
  ('short-video'),
  ('sql'),
  ('summary'),
  ('testing'),
  ('tryhackme'),
  ('viva'),
  ('youtube');


SELECT c.name, COUNT(p.prompt_id) AS prompts FROM categories c LEFT JOIN prompts p ON p.category_id = c.category_id GROUP BY c.category_id, c.name ORDER BY c.name;
SELECT COUNT(*) AS library_tags_present FROM tags WHERE tag_name IN ('authorised-lab', 'blue-team', 'colour-grade', 'content-planning', 'dbms', 'debugging', 'email', 'exam-prep', 'explanation', 'flashcards', 'frontend', 'image-generation', 'instagram', 'linkedin', 'log-analysis', 'needs-code', 'needs-image', 'needs-pdf', 'needs-slides', 'no-spoilers', 'nodejs', 'open-book', 'pc-settings', 'photo-editing', 'placements', 'planning', 'portfolio', 'presentation', 'question-bank', 'react', 'report-writing', 'review', 'rewriting', 'short-video', 'sql', 'summary', 'testing', 'tryhackme', 'viva', 'youtube');


