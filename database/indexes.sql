-- =============================================================================
-- PROMPTFORGE — AI PROMPT MANAGEMENT PLATFORM
-- Indexing Strategy (MySQL 8+)
-- Documenting the explicit engineering rationale for each index
-- =============================================================================

USE `promptforge_db`;

-- 1. Prompts Indexing
-- -----------------------------------------------------------------------------
-- Rationale: High-frequency search queries filter prompts by title prefix or keyword.
CREATE INDEX `idx_prompts_title` 
    ON `prompts` (`title`);

-- Rationale: Direct equality filtering on category in the Explore Prompts page and 
-- Category-based aggregations (e.g. "Average prompt rating by category").
CREATE INDEX `idx_prompts_category_id` 
    ON `prompts` (`category_id`);

-- Rationale: Fast filtering by LLM target (e.g. GPT-4o, Claude 3.5 Sonnet).
CREATE INDEX `idx_prompts_model_id` 
    ON `prompts` (`model_id`);

-- Rationale: Enables instantaneous retrieval of creator portfolios and "My Prompts" page.
CREATE INDEX `idx_prompts_user_id` 
    ON `prompts` (`user_id`);

-- Rationale: Date-range aggregations ("Monthly prompt creation trend", "Most active creators in a month")
-- and default "Newest" sort order.
CREATE INDEX `idx_prompts_created_at` 
    ON `prompts` (`created_at` DESC);

-- Rationale: Composite index to filter public, unflagged prompts efficiently during explore queries.
CREATE INDEX `idx_prompts_status_moderated` 
    ON `prompts` (`status`, `is_moderated`);

-- 2. Prompt Versions Indexing
-- -----------------------------------------------------------------------------
-- Rationale: Facilitates instant lookup of specific versions and ordered history retrieval.
CREATE INDEX `idx_versions_prompt_ver` 
    ON `prompt_versions` (`prompt_id`, `version_number` DESC);

-- 3. Prompt Tags Junction Indexing
-- -----------------------------------------------------------------------------
-- Rationale: Primary key already indexes (prompt_id, tag_id). This secondary index 
-- provides reverse lookup from a tag to all associated prompts (used in tag filtering).
CREATE INDEX `idx_prompt_tags_tag_id` 
    ON `prompt_tags` (`tag_id`, `prompt_id`);

-- 4. Engagement Indexing (Likes, Bookmarks, Comments, Ratings)
-- -----------------------------------------------------------------------------
-- Rationale: Speeds up counting prompt likes and joins in "Top 10 prompts by engagement".
CREATE INDEX `idx_likes_prompt_id` 
    ON `likes` (`prompt_id`);

-- Rationale: Speeds up checking if current user liked a prompt and listing user's liked prompts.
CREATE INDEX `idx_likes_user_id` 
    ON `likes` (`user_id`);

-- Rationale: Speeds up counting bookmarks and joins in "Top 10 prompts by engagement".
CREATE INDEX `idx_bookmarks_prompt_id` 
    ON `bookmarks` (`prompt_id`);

-- Rationale: Powers the "Bookmarks" page and the "Users with most bookmarks" analytic query.
CREATE INDEX `idx_bookmarks_user_id` 
    ON `bookmarks` (`user_id`);

-- Rationale: Composite index for chronological comment rendering under a prompt.
CREATE INDEX `idx_comments_prompt_created` 
    ON `comments` (`prompt_id`, `created_at` ASC);

-- Rationale: Accelerates the "Average prompt rating by category" calculation and prompt rating stats.
CREATE INDEX `idx_ratings_prompt_id` 
    ON `ratings` (`prompt_id`, `rating_value`);

-- 5. Social Graph (Follows) Indexing
-- -----------------------------------------------------------------------------
-- Rationale: Finding who a user is following.
CREATE INDEX `idx_follows_follower` 
    ON `follows` (`follower_id`);

-- Rationale: Counting and displaying followers for a creator profile.
CREATE INDEX `idx_follows_following` 
    ON `follows` (`following_id`);

-- 6. Notifications Indexing
-- -----------------------------------------------------------------------------
-- Rationale: Composite index to rapidly retrieve unread notifications badge count and user inbox.
CREATE INDEX `idx_notifications_user_read` 
    ON `notifications` (`user_id`, `is_read`, `created_at` DESC);

-- 7. Moderation Reports Indexing
-- -----------------------------------------------------------------------------
-- Rationale: Admin dashboard filters reports by 'pending' status for immediate moderation review.
CREATE INDEX `idx_reports_status` 
    ON `reports` (`status`, `created_at` DESC);

-- 8. Activity Logs Indexing
-- -----------------------------------------------------------------------------
-- Rationale: Audit log exploration by action type and time ordering.
CREATE INDEX `idx_activity_logs_user_time` 
    ON `activity_logs` (`user_id`, `created_at` DESC);

CREATE INDEX `idx_activity_logs_action` 
    ON `activity_logs` (`action`, `created_at` DESC);
