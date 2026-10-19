
USE `promptforge_db`;

SELECT role_id, role_name FROM roles ORDER BY role_id;


ALTER TABLE users ALTER COLUMN role_id SET DEFAULT 2;

SELECT COLUMN_NAME, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id';
