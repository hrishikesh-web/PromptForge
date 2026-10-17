# Entity Relationship Diagram (ERD) — PromptForge

**Platform**: PROMPTFORGE — AI Prompt Management Platform  
**Database Engine**: MySQL 8.0+ (InnoDB)  
**Normalization Target**: Third Normal Form (3NF)  

---

## 1. Relational Architecture Diagram

The relational model consists of **16 normalized entities** designed in accordance with Third Normal Form (3NF) to eliminate data redundancy and preserve full referential integrity.

```mermaid
erDiagram
    ROLES ||--o{ USERS : "assigned to"
    USERS ||--o{ PROMPTS : "creates"
    USERS ||--o{ PROMPT_VERSIONS : "authors"
    USERS ||--o{ LIKES : "gives"
    USERS ||--o{ BOOKMARKS : "saves"
    USERS ||--o{ COMMENTS : "posts"
    USERS ||--o{ RATINGS : "rates"
    USERS ||--o{ FOLLOWS : "follower"
    USERS ||--o{ FOLLOWS : "following"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ REPORTS : "files"
    USERS ||--o{ REPORTS : "reviews"
    USERS ||--o{ ACTIVITY_LOGS : "generates"

    CATEGORIES ||--o{ PROMPTS : "classifies"
    AI_MODELS ||--o{ PROMPTS : "targets"

    PROMPTS ||--o{ PROMPT_VERSIONS : "has history"
    PROMPTS ||--o{ PROMPT_TAGS : "tagged with"
    TAGS ||--o{ PROMPT_TAGS : "applied to"
    PROMPTS ||--o{ LIKES : "receives"
    PROMPTS ||--o{ BOOKMARKS : "bookmarked in"
    PROMPTS ||--o{ COMMENTS : "discussed in"
    PROMPTS ||--o{ RATINGS : "evaluated in"
    PROMPTS ||--o{ REPORTS : "flagged in"

    ROLES {
        int role_id PK
        string role_name UK
        string description
        datetime created_at
    }

    USERS {
        int user_id PK
        int role_id FK
        string name
        string email UK
        string password_hash
        string bio
        datetime created_at
        datetime updated_at
    }

    CATEGORIES {
        int category_id PK
        string name UK
        string description
        datetime created_at
    }

    AI_MODELS {
        int model_id PK
        string model_name UK
        string provider
        int context_window
        datetime created_at
    }

    PROMPTS {
        int prompt_id PK
        int user_id FK
        int category_id FK
        int model_id FK
        string title
        string description
        enum status
        boolean is_moderated
        datetime created_at
        datetime updated_at
    }

    PROMPT_VERSIONS {
        int version_id PK
        int prompt_id FK
        int version_number
        text content
        string change_notes
        int created_by FK
        datetime created_at
    }

    TAGS {
        int tag_id PK
        string tag_name UK
    }

    PROMPT_TAGS {
        int prompt_id PK, FK
        int tag_id PK, FK
    }

    LIKES {
        int like_id PK
        int prompt_id FK
        int user_id FK
        datetime created_at
    }

    BOOKMARKS {
        int bookmark_id PK
        int prompt_id FK
        int user_id FK
        datetime created_at
    }

    COMMENTS {
        int comment_id PK
        int prompt_id FK
        int user_id FK
        text comment_text
        datetime created_at
        datetime updated_at
    }

    RATINGS {
        int rating_id PK
        int prompt_id FK
        int user_id FK
        int rating_value
        datetime created_at
        datetime updated_at
    }

    FOLLOWS {
        int follow_id PK
        int follower_id FK
        int following_id FK
        datetime created_at
    }

    NOTIFICATIONS {
        int notification_id PK
        int user_id FK
        int sender_id FK
        string type
        text message
        string entity_type
        int entity_id
        boolean is_read
        datetime created_at
    }

    REPORTS {
        int report_id PK
        int prompt_id FK
        int reporter_id FK
        string reason
        text description
        enum status
        int reviewed_by FK
        datetime reviewed_at
        datetime created_at
    }

    ACTIVITY_LOGS {
        int log_id PK
        int user_id FK
        string action
        string table_name
        int record_id
        json metadata
        datetime created_at
    }
```

---

## 2. Entity Dictionary & Referential Integrity Rules

### 1. `roles`
- **Primary Key**: `role_id` (INT, AUTO_INCREMENT)
- **Alternate/Candidate Key**: `role_name` (VARCHAR(50), UNIQUE)
- **Purpose**: Defines system privileges (`ADMIN`, `USER`).

### 2. `users`
- **Primary Key**: `user_id` (INT, AUTO_INCREMENT)
- **Candidate Key**: `email` (VARCHAR(150), UNIQUE)
- **Foreign Keys**: `role_id` -> `roles(role_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- **Purpose**: Represents registered user and creator accounts.

### 3. `categories`
- **Primary Key**: `category_id` (INT, AUTO_INCREMENT)
- **Candidate Key**: `name` (VARCHAR(100), UNIQUE)
- **Purpose**: Standardizes taxonomy for prompts (Software Engineering, Academic & Research, etc.).

### 4. `ai_models`
- **Primary Key**: `model_id` (INT, AUTO_INCREMENT)
- **Candidate Key**: `model_name` (VARCHAR(100), UNIQUE)
- **Purpose**: Tracks target LLMs (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) with context window attributes.

### 5. `prompts`
- **Primary Key**: `prompt_id` (INT, AUTO_INCREMENT)
- **Foreign Keys**:
  - `user_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `category_id` -> `categories(category_id)` ON DELETE RESTRICT ON UPDATE CASCADE
  - `model_id` -> `ai_models(model_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- **Purpose**: Core prompt entity managing metadata, publication state, and moderation flags.

### 6. `prompt_versions`
- **Primary Key**: `version_id` (INT, AUTO_INCREMENT)
- **Composite Unique Key**: `(prompt_id, version_number)`
- **Foreign Keys**:
  - `prompt_id` -> `prompts(prompt_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `created_by` -> `users(user_id)` ON DELETE RESTRICT ON UPDATE CASCADE
- **Purpose**: Implements non-destructive versioning. Modifications append a new incremental version without deleting history.

### 7. `tags`
- **Primary Key**: `tag_id` (INT, AUTO_INCREMENT)
- **Candidate Key**: `tag_name` (VARCHAR(50), UNIQUE)
- **Purpose**: Atomic keywords for search and discovery.

### 8. `prompt_tags`
- **Composite Primary Key**: `(prompt_id, tag_id)`
- **Foreign Keys**:
  - `prompt_id` -> `prompts(prompt_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `tag_id` -> `tags(tag_id)` ON DELETE CASCADE ON UPDATE CASCADE
- **Purpose**: Resolves the Many-to-Many relationship between Prompts and Tags.

### 9. `likes`
- **Primary Key**: `like_id` (INT, AUTO_INCREMENT)
- **Composite Unique Key**: `(prompt_id, user_id)` (prevents duplicate likes)
- **Foreign Keys**:
  - `prompt_id` -> `prompts(prompt_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `user_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE

### 10. `bookmarks`
- **Primary Key**: `bookmark_id` (INT, AUTO_INCREMENT)
- **Composite Unique Key**: `(prompt_id, user_id)` (prevents duplicate bookmarks)
- **Foreign Keys**:
  - `prompt_id` -> `prompts(prompt_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `user_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE

### 11. `comments`
- **Primary Key**: `comment_id` (INT, AUTO_INCREMENT)
- **Foreign Keys**:
  - `prompt_id` -> `prompts(prompt_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `user_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE

### 12. `ratings`
- **Primary Key**: `rating_id` (INT, AUTO_INCREMENT)
- **Composite Unique Key**: `(prompt_id, user_id)` (one active rating per user per prompt)
- **Domain Constraint**: `CHECK (rating_value BETWEEN 1 AND 5)`
- **Foreign Keys**:
  - `prompt_id` -> `prompts(prompt_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `user_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE

### 13. `follows`
- **Primary Key**: `follow_id` (INT, AUTO_INCREMENT)
- **Composite Unique Key**: `(follower_id, following_id)`
- **Tuple Constraint**: `CHECK (follower_id <> following_id)` (prevents self-following)
- **Foreign Keys**:
  - `follower_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `following_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE

### 14. `notifications`
- **Primary Key**: `notification_id` (INT, AUTO_INCREMENT)
- **Foreign Keys**:
  - `user_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `sender_id` -> `users(user_id)` ON DELETE SET NULL ON UPDATE CASCADE

### 15. `reports`
- **Primary Key**: `report_id` (INT, AUTO_INCREMENT)
- **Foreign Keys**:
  - `prompt_id` -> `prompts(prompt_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `reporter_id` -> `users(user_id)` ON DELETE CASCADE ON UPDATE CASCADE
  - `reviewed_by` -> `users(user_id)` ON DELETE SET NULL ON UPDATE CASCADE

### 16. `activity_logs`
- **Primary Key**: `log_id` (INT, AUTO_INCREMENT)
- **Foreign Keys**:
  - `user_id` -> `users(user_id)` ON DELETE SET NULL ON UPDATE CASCADE
- **Purpose**: System-wide traceability and audit trail for all transactional mutations.
