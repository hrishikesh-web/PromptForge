
USE `promptforge_db`;

CREATE INDEX `idx_prompts_title`
    ON `prompts` (`title`);

CREATE INDEX `idx_prompts_category_id`
    ON `prompts` (`category_id`);

CREATE INDEX `idx_prompts_model_id`
    ON `prompts` (`model_id`);

CREATE INDEX `idx_prompts_user_id`
    ON `prompts` (`user_id`);

CREATE INDEX `idx_prompts_created_at`
    ON `prompts` (`created_at` DESC);

CREATE INDEX `idx_prompts_status_moderated`
    ON `prompts` (`status`, `is_moderated`);

CREATE INDEX `idx_versions_prompt_ver`
    ON `prompt_versions` (`prompt_id`, `version_number` DESC);

CREATE INDEX `idx_prompt_tags_tag_id`
    ON `prompt_tags` (`tag_id`, `prompt_id`);

CREATE INDEX `idx_likes_prompt_id`
    ON `likes` (`prompt_id`);

CREATE INDEX `idx_likes_user_id`
    ON `likes` (`user_id`);

CREATE INDEX `idx_bookmarks_prompt_id`
    ON `bookmarks` (`prompt_id`);

CREATE INDEX `idx_bookmarks_user_id`
    ON `bookmarks` (`user_id`);

CREATE INDEX `idx_comments_prompt_created`
    ON `comments` (`prompt_id`, `created_at` ASC);

CREATE INDEX `idx_ratings_prompt_id`
    ON `ratings` (`prompt_id`, `rating_value`);

CREATE INDEX `idx_follows_follower`
    ON `follows` (`follower_id`);

CREATE INDEX `idx_follows_following`
    ON `follows` (`following_id`);

CREATE INDEX `idx_notifications_user_read`
    ON `notifications` (`user_id`, `is_read`, `created_at` DESC);

CREATE INDEX `idx_reports_status`
    ON `reports` (`status`, `created_at` DESC);

CREATE INDEX `idx_activity_logs_user_time`
    ON `activity_logs` (`user_id`, `created_at` DESC);

CREATE INDEX `idx_activity_logs_action`
    ON `activity_logs` (`action`, `created_at` DESC);
