# PromptForge API

Base URL: `http://localhost:5000/api`. JSON in and out. Authenticated routes need `Authorization: Bearer <token>`
(the token comes from `/auth/login` or `/auth/register`). Errors look like `{ "success": false, "message": "…" }`.

Access: **Public** = anyone, **User** = signed in, **Admin** = role ADMIN (checked on the server).
"Visible" = published and not hidden, or your own prompt, or you are an admin (`server/utils/visibility.js`).

## Auth
| Method | Path | Access | Notes |
| :--- | :--- | :--- | :--- |
| POST | `/auth/register` | Public | `{ name, email, password (8-72), confirmPassword, bio? }`. Always creates role USER |
| POST | `/auth/login` | Public | `{ email, password }`. Throttled after 8 failures per email+IP for 15 min |
| GET | `/auth/me` | User | Your profile and counters |
| PUT | `/auth/profile` | User | `{ name?, bio? }` |
| GET | `/auth/demo-accounts` | Public, demo mode only | 404 unless `DEMO_MODE=true` and not production. Names/emails of demo USERs, never passwords |

## Prompts
| Method | Path | Access | Notes |
| :--- | :--- | :--- | :--- |
| GET | `/prompts` | Public (optional token) | Query: `search` (title, description, tag, creator), `category_id`, `model_id`, `tag_id`, `tag`, `user_id`, `status` (published default, draft, archived, all), `sort` (newest, updated, popular, rating), `page`, `limit` (≤50). Only visible prompts |
| GET | `/prompts/:id` | Public (optional token) | With tags, all versions, `latestVersion`. 404 if not visible |
| POST | `/prompts` | User | `{ title, description?, content, category_id, model_id, tags[] (≤5), status }`. Transaction: prompt + version 1 + tags + log |
| PUT | `/prompts/:id` | Owner or Admin | Partial update. New content creates version N+1. `change_notes?` |
| POST | `/prompts/:id/rollback/:version` | Owner or Admin | Copies that version into a new version |
| DELETE | `/prompts/:id` | Owner or Admin | CASCADE removes versions, tags, interactions, reports |

## Interactions
| Method | Path | Access | Notes |
| :--- | :--- | :--- | :--- |
| POST | `/prompts/:id/like` | User | Toggle. Published prompts only |
| POST | `/prompts/:id/bookmark` | User | Toggle. Any visible prompt |
| GET | `/bookmarks` | User | Your bookmarks (still-visible prompts) |
| POST | `/prompts/:id/rate` | User | `{ rating: 1-5 }`. Not your own prompt; upsert |
| GET | `/prompts/:id/comments` | Public (optional token) | Visible prompts only |
| POST | `/prompts/:id/comments` | User | `{ comment_text }` (≤2000). Published prompts only |
| DELETE | `/comments/:id` | Author or Admin | |
| POST | `/users/:id/follow` | User | Toggle |
| GET | `/users/:id/profile` | Public | Email only shown to that user or an admin |

## Taxonomy
| Method | Path | Access |
| :--- | :--- | :--- |
| GET | `/categories`, `/models`, `/tags?q=` | Public |
| POST/PUT/DELETE | `/categories[/:id]`, `/models[/:id]` | Admin. Delete refused (409) while prompts use it |
| POST | `/tags` | Admin |
| PUT | `/tags/:id` `{ tag_name, merge? }` | Admin. 409 `TAG_EXISTS` unless `merge: true` |
| DELETE | `/tags/:id` | Admin. Removes the tag from prompts, not the prompts |

## Notifications and reports
| Method | Path | Access |
| :--- | :--- | :--- |
| GET | `/notifications`, `/notifications/unread-count` | User |
| PUT | `/notifications/:id/read`, `/notifications/mark-all-read` | User |
| POST | `/reports` `{ prompt_id, reason, description }` | User (not own prompt, one pending per prompt) |
| GET | `/reports?status=` | Admin |
| PUT | `/reports/:id/status` `{ status: approved, rejected }` | Admin. Approve hides the prompt |

## Admin
| Method | Path | Notes |
| :--- | :--- | :--- |
| GET | `/admin/overview`, `/admin/roles`, `/admin/users`, `/admin/logs?action=&limit=` | |
| PUT | `/admin/users/:id/role` `{ role_id }` | Not yourself; never removes the last admin |
| GET | `/admin/users/:id/delete-impact` | What a deletion would remove |
| DELETE | `/admin/users/:id` | Transaction; refused (409) if the user wrote versions of others' prompts |
| PUT | `/admin/prompts/:id/moderation` `{ hidden }` | Hide (archive) or restore (publish) |

## Analytics (public, public prompts only)
`/analytics/metrics`, `/analytics/top-engagement`, `/analytics/active-creators?month=YYYY-MM`,
`/analytics/filter-multi?category=&model=&tag=`, `/analytics/most-bookmarks`, `/analytics/rating-by-category`,
`/analytics/monthly-trend?months=`, `/analytics/by-model`. Each returns `{ data, query: { title, sql, params, concepts, explanation } }`.

## Health
`GET /health` → `{ status, database: { connected } }`
