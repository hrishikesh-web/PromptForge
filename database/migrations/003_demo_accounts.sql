
USE `promptforge_db`;
SET NAMES utf8mb4;

INSERT IGNORE INTO users (role_id, name, email, password_hash, bio, created_at)
SELECT r.role_id, 'Saksham Arora', 'saksham.arora@demo.promptforge.test', '$2a$10$wDLjy6W4rwQTsG2r8v0YEubyreICvNTx4a1X6gjb1NyqT2m273l5O', 'Demo account. Member of the PromptForge project team.', NOW() - INTERVAL 170 DAY + INTERVAL 4 HOUR
FROM roles r WHERE r.role_name = 'USER';
INSERT IGNORE INTO users (role_id, name, email, password_hash, bio, created_at)
SELECT r.role_id, 'Aryan Shresth', 'aryan.shresth@demo.promptforge.test', '$2a$10$wDLjy6W4rwQTsG2r8v0YEubyreICvNTx4a1X6gjb1NyqT2m273l5O', 'Demo account. Member of the PromptForge project team.', NOW() - INTERVAL 170 DAY + INTERVAL 8 HOUR
FROM roles r WHERE r.role_name = 'USER';
INSERT IGNORE INTO users (role_id, name, email, password_hash, bio, created_at)
SELECT r.role_id, 'Dhruv Gangrade', 'dhruv.gangrade@demo.promptforge.test', '$2a$10$wDLjy6W4rwQTsG2r8v0YEubyreICvNTx4a1X6gjb1NyqT2m273l5O', 'Demo account for the PromptForge presentation.', NOW() - INTERVAL 170 DAY + INTERVAL 1 HOUR
FROM roles r WHERE r.role_name = 'USER';
INSERT IGNORE INTO users (role_id, name, email, password_hash, bio, created_at)
SELECT r.role_id, 'Pranav Ranjith', 'pranav.ranjith@demo.promptforge.test', '$2a$10$wDLjy6W4rwQTsG2r8v0YEubyreICvNTx4a1X6gjb1NyqT2m273l5O', 'Demo account for the PromptForge presentation.', NOW() - INTERVAL 170 DAY + INTERVAL 13 HOUR
FROM roles r WHERE r.role_name = 'USER';
INSERT IGNORE INTO users (role_id, name, email, password_hash, bio, created_at)
SELECT r.role_id, 'Devansh Lingala', 'devansh.lingala@demo.promptforge.test', '$2a$10$wDLjy6W4rwQTsG2r8v0YEubyreICvNTx4a1X6gjb1NyqT2m273l5O', 'Demo account for the PromptForge presentation.', NOW() - INTERVAL 170 DAY + INTERVAL 8 HOUR
FROM roles r WHERE r.role_name = 'USER';

SELECT u.user_id, u.name, u.email, r.role_name FROM users u INNER JOIN roles r ON r.role_id = u.role_id
WHERE u.email LIKE '%@demo.promptforge.test' ORDER BY u.user_id;
