# Database Design & 3NF Normalization Analysis — PromptForge

**System**: PROMPTFORGE — AI Prompt Management Platform  
**RDBMS**: MySQL 8.0+ (InnoDB Storage Engine)  
**Target Normal Form**: Third Normal Form (3NF)  

---

## 1. Relational Schema Normalization Walkthrough

A normalized relational database eliminates redundant data, avoids update anomalies, and ensures data integrity. PromptForge has been designed from first principles to satisfy **First (1NF)**, **Second (2NF)**, and **Third Normal Form (3NF)**.

### First Normal Form (1NF)
**Condition**: Each attribute contains only atomic (indivisible) values, and there are no repeating groups or multivalued columns.
- **Atomic Values**: Attributes such as `name`, `email`, `title`, `provider`, and `rating_value` store singular scalar data.
- **No Repeating Groups**: Rather than storing multiple tags as a delimited string (e.g. `"code,refactor,ai"`) in `prompts`, a distinct `tags` table and a junction table `prompt_tags` resolve keyword associations.
- **Primary Keys**: Every relation has a designated primary key ensuring unique row addressability.

### Second Normal Form (2NF)
**Condition**: The relation is in 1NF, and every non-prime attribute is **fully functionally dependent** on the primary key (no partial functional dependencies on composite keys).
- In composite key tables such as `prompt_tags(prompt_id, tag_id)`:
  - There are no non-prime attributes depending on only `prompt_id` or `tag_id`.
- In interaction tables like `likes(like_id)` and `bookmarks(bookmark_id)`:
  - Surrogate integer keys are used as primary keys with composite uniqueness constraints `UNIQUE(prompt_id, user_id)`.
  - Non-prime attributes such as `created_at` depend on the whole interaction instance.
- In `follows(follow_id)`:
  - Neither `follower_id` nor `following_id` independently determines attributes; uniqueness is enforced via `UNIQUE(follower_id, following_id)`.

### Third Normal Form (3NF)
**Condition**: The relation is in 2NF, and no non-prime attribute is **transitively dependent** on the primary key (i.e. $X \to Y$ and $Y \to Z$ where $Z$ is not a candidate key is forbidden).

#### Case 1: Prompt Categories
- If `prompts` stored `category_name` and `category_description`, the functional dependencies would be:
  $$\text{prompt\_id} \to \text{category\_id} \quad \text{and} \quad \text{category\_id} \to \text{category\_name}$$
  This would constitute a transitive dependency: $\text{prompt\_id} \to \text{category\_name}$.
- **Resolution**: Extracted into a dedicated `categories(category_id, name, description)` relation. `prompts` stores only the foreign key `category_id`.

#### Case 2: AI Models & Providers
- If `prompts` stored `model_name`, `provider`, and `context_window`:
  $$\text{prompt\_id} \to \text{model\_id} \quad \text{and} \quad \text{model\_id} \to (\text{provider}, \text{context\_window})$$
- **Resolution**: Extracted into `ai_models(model_id, model_name, provider, context_window)`.

#### Case 3: Prompt Versions & Historical Lineage
- Storing multiple content iterations in a single `prompts` record violates atomicity or overwrites historical content.
- Storing content in `prompts` while also having a versions table would create redundant transitive data.
- **Resolution**: Every text snapshot belongs to `prompt_versions(version_id, prompt_id, version_number, content, change_notes, created_by, created_at)`. Modifying a prompt creates a new incremental record, preserving complete audit lineage.

---

## 2. Prevention of Modification Anomalies

| Anomaly Type | Un-normalized Vulnerability | 3NF Resolution in PromptForge |
| :--- | :--- | :--- |
| **Insertion Anomaly** | Cannot create a new Category or AI Model without creating an associated prompt first. | Categories and AI Models exist as independent entities and can be provisioned prior to any prompt being published. |
| **Deletion Anomaly** | Deleting the last prompt associated with a category would erase the category and its description from the platform. | Deleting a prompt via `ON DELETE CASCADE` removes only prompt-specific interactions (`likes`, `bookmarks`, `versions`), leaving `categories` and `ai_models` intact. |
| **Update Anomaly** | Changing the provider or context window of "GPT-4o" requires updating hundreds of prompt rows. Any missed row causes data inconsistency. | Updating an AI model attribute in `ai_models` immediately reflects across all referencing prompts via the foreign key join. |

---

## 3. Referential Integrity & Cascading Rules

1. **User Deletion (`ON DELETE CASCADE`)**:
   - When a user deletes their account, their authored `prompts`, `likes`, `bookmarks`, `comments`, and `ratings` are automatically purged via InnoDB cascades.
   - For `activity_logs` and `notifications`, `ON DELETE SET NULL` preserves the historical audit trail without retaining a broken user pointer.
2. **Category & Model Deletion (`ON DELETE RESTRICT`)**:
   - Prevents accidental deletion of categories or models that are currently in use by active prompts. The platform administrator must reclassify prompts before dropping a category or model.
3. **Self-Follow Prevention**:
   - Handled via relational check constraint: `CHECK (follower_id <> following_id)`.
4. **Rating Domain Enforcement**:
   - Enforced at the database engine level: `CHECK (rating_value BETWEEN 1 AND 5)`.

---

## 4. Indexing Strategy & Performance Optimization

All indexes are defined in `database/indexes.sql` to optimize query execution plans:

| Index Name | Table | Columns | Type | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `idx_prompts_title` | `prompts` | `title` | B-Tree | Accelerates keyword search (`WHERE title LIKE ?`). |
| `idx_prompts_category_id` | `prompts` | `category_id` | B-Tree | Speeds up category filtering and aggregations. |
| `idx_prompts_model_id` | `prompts` | `model_id` | B-Tree | Optimizes target model filtering. |
| `idx_prompts_user_id` | `prompts` | `user_id` | B-Tree | Powers "My Prompts" and creator portfolio retrieval. |
| `idx_prompts_created_at` | `prompts` | `created_at DESC` | B-Tree | Used by default chronological ordering and monthly trends. |
| `idx_prompts_status_moderated`| `prompts` | `status, is_moderated` | Composite | High-efficiency index for filtering public, approved prompts. |
| `idx_versions_prompt_ver` | `prompt_versions`| `prompt_id, version_number DESC` | Composite | Instant retrieval of latest version and rollback candidate lookup. |
| `idx_prompt_tags_tag_id` | `prompt_tags` | `tag_id, prompt_id` | Composite | Reverse lookup from tag to prompts in multi-tag filtering. |
| `idx_likes_prompt_id` | `likes` | `prompt_id` | B-Tree | Accelerates like count aggregation. |
| `idx_bookmarks_user_id` | `bookmarks` | `user_id` | B-Tree | Powers user bookmarks list and leaderboard queries. |
| `idx_comments_prompt_created` | `comments` | `prompt_id, created_at ASC` | Composite | Chronological comment stream rendering. |
| `idx_ratings_prompt_id` | `ratings` | `prompt_id, rating_value` | Composite | Accelerates average rating calculations (`AVG(rating_value)`). |
| `idx_notifications_user_read` | `notifications` | `user_id, is_read, created_at DESC` | Composite | Powers unread badge count and notification feed. |
| `idx_reports_status` | `reports` | `status, created_at DESC` | Composite | Accelerates admin moderation queue retrieval. |
| `idx_activity_logs_user_time` | `activity_logs` | `user_id, created_at DESC` | Composite | Powers chronological user audit log inspection. |

---

## 5. Transaction Management & Atomicity

PromptForge utilizes raw MySQL transactions (`START TRANSACTION`, `COMMIT`, `ROLLBACK`) managed through `server/config/db.js` helper:

```javascript
const tx = await getTransaction();
try {
  // 1. Insert prompt
  // 2. Insert initial version
  // 3. Associate tags
  // 4. Record audit log
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
} finally {
  tx.release();
}
```

### Critical Transactional Operations:
1. **Prompt Creation**:
   - `INSERT INTO prompts`
   - `INSERT INTO prompt_versions` (v1)
   - `INSERT INTO prompt_tags` (tag associations)
   - `INSERT INTO activity_logs`
   - *Atomicity Guarantee*: If tag association fails, the prompt record is not orphaned.
2. **Prompt Versioning & Editing**:
   - Update `prompts` metadata (`title`, `category_id`, etc.)
   - If content changed, query `MAX(version_number)`, insert new version `v(N+1)`
   - Re-sync `prompt_tags`
   - Log activity
   - *Atomicity Guarantee*: Old version is never overwritten; if update fails, version number is not incremented.
3. **Non-Destructive Rollback**:
   - Retrieve historical content from `prompt_versions WHERE version_number = target`
   - Insert new version `v(latest + 1)` with notes `Rollback to vX`
   - Update prompt timestamp and log activity
   - *Audit Guarantee*: Full history is preserved.
4. **Moderation Report Resolution**:
   - Update `reports.status = 'approved'` and `reviewed_by`
   - Update `prompts.is_moderated = TRUE` and `status = 'archived'`
   - Log moderation activity
   - *Consistency Guarantee*: Prompt is never flagged without the report being resolved.
