// All requests go to /api, which Vite proxies to the Express server on port 5000.
const BASE_URL = '/api';
const TOKEN_KEY = 'promptforge_token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
};

/** Build "?a=1&b=2", skipping empty values. */
const qs = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') q.append(key, val);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

/**
 * fetch wrapper: adds the JWT, sends JSON, and throws an Error with
 * `.status` and `.data` when the server answers with an error.
 */
async function request(endpoint, options = {}) {
  const token = tokenStore.get();
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  };
  if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch {
    const error = new Error("Failed to fetch: can't reach the PromptForge server.");
    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallback =
      response.status === 502 || response.status === 504
        ? "Failed to fetch: can't reach the PromptForge server."
        : `Request failed (${response.status}).`;
    const error = new Error(data.message || fallback);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body }),
  getDemoAccounts: () => request('/auth/demo-accounts'),

  // Prompts
  getPrompts: (params = {}) => request(`/prompts${qs(params)}`),
  getPromptById: (id) => request(`/prompts/${id}`),
  createPrompt: (body) => request('/prompts', { method: 'POST', body }),
  updatePrompt: (id, body) => request(`/prompts/${id}`, { method: 'PUT', body }),
  rollbackPromptVersion: (id, versionNumber) => request(`/prompts/${id}/rollback/${versionNumber}`, { method: 'POST' }),
  deletePrompt: (id) => request(`/prompts/${id}`, { method: 'DELETE' }),

  // Interactions
  toggleLike: (id) => request(`/prompts/${id}/like`, { method: 'POST' }),
  toggleBookmark: (id) => request(`/prompts/${id}/bookmark`, { method: 'POST' }),
  getBookmarks: () => request('/bookmarks'),
  ratePrompt: (id, rating) => request(`/prompts/${id}/rate`, { method: 'POST', body: { rating } }),
  getComments: (id) => request(`/prompts/${id}/comments`),
  addComment: (id, comment_text) => request(`/prompts/${id}/comments`, { method: 'POST', body: { comment_text } }),
  deleteComment: (commentId) => request(`/comments/${commentId}`, { method: 'DELETE' }),
  toggleFollow: (userId) => request(`/users/${userId}/follow`, { method: 'POST' }),

  // Taxonomy (read: everyone; write: ADMIN only, enforced by the server)
  getCategories: () => request('/categories'),
  createCategory: (body) => request('/categories', { method: 'POST', body }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: 'PUT', body }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  getModels: () => request('/models'),
  createModel: (body) => request('/models', { method: 'POST', body }),
  updateModel: (id, body) => request(`/models/${id}`, { method: 'PUT', body }),
  deleteModel: (id) => request(`/models/${id}`, { method: 'DELETE' }),

  getTags: (q) => request(`/tags${qs({ q })}`),
  createTag: (tag_name) => request('/tags', { method: 'POST', body: { tag_name } }),
  updateTag: (id, tag_name, merge = false) => request(`/tags/${id}`, { method: 'PUT', body: { tag_name, merge } }),
  deleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),

  // Creator profile
  getCreatorProfile: (id) => request(`/users/${id}/profile`),

  // Notifications
  getNotifications: () => request('/notifications'),
  getUnreadNotificationsCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'PUT' }),

  // Reports
  createReport: (body) => request('/reports', { method: 'POST', body }),
  getAdminReports: (params = {}) => request(`/reports${qs(params)}`),
  updateReportStatus: (id, status) => request(`/reports/${id}/status`, { method: 'PUT', body: { status } }),

  // Admin
  getAdminOverview: () => request('/admin/overview'),
  getAdminRoles: () => request('/admin/roles'),
  getAdminUsers: () => request('/admin/users'),
  updateUserRole: (userId, role_id) => request(`/admin/users/${userId}/role`, { method: 'PUT', body: { role_id } }),
  getUserDeleteImpact: (userId) => request(`/admin/users/${userId}/delete-impact`),
  deleteUser: (userId) => request(`/admin/users/${userId}`, { method: 'DELETE' }),
  setPromptModeration: (promptId, hidden) => request(`/admin/prompts/${promptId}/moderation`, { method: 'PUT', body: { hidden } }),
  getAdminLogs: (params = {}) => request(`/admin/logs${qs(params)}`),

  // Analytics (the six DBMS SQL use cases)
  getAnalyticsMetrics: () => request('/analytics/metrics'),
  getTopEngagementPrompts: () => request('/analytics/top-engagement'),
  getActiveCreators: (params = {}) => request(`/analytics/active-creators${qs(params)}`),
  getFilteredPromptsMulti: (params) => request(`/analytics/filter-multi${qs(params)}`),
  getMostBookmarksUsers: () => request('/analytics/most-bookmarks'),
  getRatingByCategory: () => request('/analytics/rating-by-category'),
  getMonthlyTrend: () => request('/analytics/monthly-trend'),
  getModelDistribution: () => request('/analytics/by-model'),

  checkHealth: () => request('/health')
};
