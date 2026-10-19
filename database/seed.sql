

USE `promptforge_db`;

INSERT INTO `roles` (`role_id`, `role_name`, `description`) VALUES
(1, 'ADMIN', 'Website administrator: moderation, user and role management, taxonomy management'),
(2, 'USER', 'Regular member: create, edit and share prompts; like, bookmark, rate and comment')
ON DUPLICATE KEY UPDATE description = VALUES(description);
