-- =============================================================================
-- PROMPTFORGE — AI PROMPT MANAGEMENT PLATFORM
-- Database Schema Definition (MySQL 8+)
-- Designed in compliance with Third Normal Form (3NF)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `promptforge_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `promptforge_db`;

-- -----------------------------------------------------------------------------
-- 1. ROLES
-- Role-based access control definition (Admin, User/Creator)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `follows`;
DROP TABLE IF EXISTS `ratings`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `bookmarks`;
DROP TABLE IF EXISTS `likes`;
DROP TABLE IF EXISTS `prompt_tags`;
DROP TABLE IF EXISTS `tags`;
DROP TABLE IF EXISTS `prompt_versions`;
DROP TABLE IF EXISTS `prompts`;
DROP TABLE IF EXISTS `ai_models`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

CREATE TABLE `roles` (
    `role_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. USERS
-- Registered accounts with role-based access
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL DEFAULT 2,  -- 2 = USER. Never default to ADMIN (role 1).
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `bio` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) 
        REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. CATEGORIES
-- Functional grouping for AI prompts (e.g. Code, Writing, Marketing)
-- -----------------------------------------------------------------------------
CREATE TABLE `categories` (
    `category_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. AI_MODELS
-- Target LLMs supported by prompts (e.g. GPT-4o, Claude 3.5, Gemini 1.5 Pro)
-- -----------------------------------------------------------------------------
CREATE TABLE `ai_models` (
    `model_id` INT AUTO_INCREMENT PRIMARY KEY,
    `model_name` VARCHAR(100) NOT NULL UNIQUE,
    `provider` VARCHAR(100) NOT NULL,
    `context_window` INT NOT NULL DEFAULT 4096,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. PROMPTS
-- Core prompt metadata entity
-- -----------------------------------------------------------------------------
CREATE TABLE `prompts` (
    `prompt_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `category_id` INT NOT NULL,
    `model_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
    `is_moderated` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_prompts_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_prompts_category` FOREIGN KEY (`category_id`) 
        REFERENCES `categories` (`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_prompts_model` FOREIGN KEY (`model_id`) 
        REFERENCES `ai_models` (`model_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. PROMPT_VERSIONS
-- Version history to track iterations and support rollback without overwriting history
-- -----------------------------------------------------------------------------
CREATE TABLE `prompt_versions` (
    `version_id` INT AUTO_INCREMENT PRIMARY KEY,
    `prompt_id` INT NOT NULL,
    `version_number` INT NOT NULL,
    `content` LONGTEXT NOT NULL,
    `change_notes` TEXT NULL,
    `created_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `uq_prompt_version_number` UNIQUE (`prompt_id`, `version_number`),
    CONSTRAINT `fk_versions_prompt` FOREIGN KEY (`prompt_id`) 
        REFERENCES `prompts` (`prompt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_versions_creator` FOREIGN KEY (`created_by`) 
        REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. TAGS
-- Independent keywords for flexible categorization
-- -----------------------------------------------------------------------------
CREATE TABLE `tags` (
    `tag_id` INT AUTO_INCREMENT PRIMARY KEY,
    `tag_name` VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. PROMPT_TAGS
-- Many-to-Many junction table resolving Prompts <-> Tags
-- -----------------------------------------------------------------------------
CREATE TABLE `prompt_tags` (
    `prompt_id` INT NOT NULL,
    `tag_id` INT NOT NULL,
    PRIMARY KEY (`prompt_id`, `tag_id`),
    CONSTRAINT `fk_prompt_tags_prompt` FOREIGN KEY (`prompt_id`) 
        REFERENCES `prompts` (`prompt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_prompt_tags_tag` FOREIGN KEY (`tag_id`) 
        REFERENCES `tags` (`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. LIKES
-- Engagement tracking with uniqueness constraint
-- -----------------------------------------------------------------------------
CREATE TABLE `likes` (
    `like_id` INT AUTO_INCREMENT PRIMARY KEY,
    `prompt_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `uq_user_prompt_like` UNIQUE (`prompt_id`, `user_id`),
    CONSTRAINT `fk_likes_prompt` FOREIGN KEY (`prompt_id`) 
        REFERENCES `prompts` (`prompt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. BOOKMARKS
-- User-saved prompts collection
-- -----------------------------------------------------------------------------
CREATE TABLE `bookmarks` (
    `bookmark_id` INT AUTO_INCREMENT PRIMARY KEY,
    `prompt_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `uq_user_prompt_bookmark` UNIQUE (`prompt_id`, `user_id`),
    CONSTRAINT `fk_bookmarks_prompt` FOREIGN KEY (`prompt_id`) 
        REFERENCES `prompts` (`prompt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_bookmarks_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. COMMENTS
-- User feedback on prompts
-- -----------------------------------------------------------------------------
CREATE TABLE `comments` (
    `comment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `prompt_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `comment_text` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_comments_prompt` FOREIGN KEY (`prompt_id`) 
        REFERENCES `prompts` (`prompt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. RATINGS
-- Prompt rating (1 to 5 stars) required for PPT SQL use case
-- -----------------------------------------------------------------------------
CREATE TABLE `ratings` (
    `rating_id` INT AUTO_INCREMENT PRIMARY KEY,
    `prompt_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `rating_value` TINYINT NOT NULL CHECK (`rating_value` BETWEEN 1 AND 5),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `uq_user_prompt_rating` UNIQUE (`prompt_id`, `user_id`),
    CONSTRAINT `fk_ratings_prompt` FOREIGN KEY (`prompt_id`) 
        REFERENCES `prompts` (`prompt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_ratings_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. FOLLOWS
-- Follower-following social graph between users
-- -----------------------------------------------------------------------------
CREATE TABLE `follows` (
    `follow_id` INT AUTO_INCREMENT PRIMARY KEY,
    `follower_id` INT NOT NULL,
    `following_id` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `uq_follow_pair` UNIQUE (`follower_id`, `following_id`),
    CONSTRAINT `fk_follows_follower` FOREIGN KEY (`follower_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_follows_following` FOREIGN KEY (`following_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. NOTIFICATIONS
-- User-specific alerts for social actions and system events
-- -----------------------------------------------------------------------------
CREATE TABLE `notifications` (
    `notification_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `sender_id` INT NULL,
    `type` VARCHAR(50) NOT NULL,
    `message` TEXT NOT NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id` INT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_notifications_sender` FOREIGN KEY (`sender_id`) 
        REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. REPORTS
-- Moderation reports submitted by users
-- -----------------------------------------------------------------------------
CREATE TABLE `reports` (
    `report_id` INT AUTO_INCREMENT PRIMARY KEY,
    `prompt_id` INT NOT NULL,
    `reporter_id` INT NOT NULL,
    `reason` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `reviewed_by` INT NULL,
    `reviewed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_reports_prompt` FOREIGN KEY (`prompt_id`) 
        REFERENCES `prompts` (`prompt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) 
        REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reports_reviewer` FOREIGN KEY (`reviewed_by`) 
        REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. ACTIVITY_LOGS
-- Comprehensive audit trail and traceability for all important mutations
-- -----------------------------------------------------------------------------
CREATE TABLE `activity_logs` (
    `log_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `action` VARCHAR(50) NOT NULL,
    `table_name` VARCHAR(50) NOT NULL,
    `record_id` INT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
