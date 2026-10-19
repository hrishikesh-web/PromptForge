
USE `promptforge_db`;
SET NAMES utf8mb4;


SELECT u.user_id, u.name, u.email, r.role_name FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE u.email = 'hrishikeshkhanna17@gmail.com';


UPDATE users
SET role_id = (SELECT role_id FROM roles WHERE role_name = 'ADMIN'), updated_at = NOW()
WHERE email = 'hrishikeshkhanna17@gmail.com';

INSERT INTO activity_logs (user_id, action, table_name, record_id, metadata, created_at)
SELECT u.user_id, 'UPDATE_USER_ROLE', 'users', u.user_id, JSON_OBJECT('to', 'ADMIN', 'via', 'migration 004'), NOW()
FROM users u
WHERE u.email = 'hrishikeshkhanna17@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM activity_logs l WHERE l.user_id = u.user_id AND l.action = 'UPDATE_USER_ROLE'
                  AND JSON_UNQUOTE(JSON_EXTRACT(l.metadata, '$.via')) = 'migration 004');


SELECT u.user_id, u.name, u.email, r.role_name FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE u.email = 'hrishikeshkhanna17@gmail.com';
