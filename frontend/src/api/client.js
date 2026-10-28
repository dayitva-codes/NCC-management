const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export function getApiBase() {
  if (!isBrowser) return '/api/v1';
  const isHttps = window.location.protocol === 'https:';
  const stored = localStorage.getItem('ncc_api_base');
  
  // If running on HTTPS or live domain, NEVER allow http:// localhost
  if (isHttps || !isLocalhost) {
    if (!stored || stored.includes('127.0.0.1') || stored.includes('localhost') || stored.startsWith('http://')) {
      localStorage.removeItem('ncc_api_base');
      return '/api/v1';
    }
    return stored;
  }
  
  return stored || 'http://127.0.0.1:8000/api/v1';
}

export function setApiBase(url) {
  if (!url || url === '/api/v1') {
    localStorage.removeItem('ncc_api_base');
  } else {
    localStorage.setItem('ncc_api_base', url.replace(/\/$/, ''));
  }
}

export function getToken() {
  return localStorage.getItem('ncc_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('ncc_token', token);
  else localStorage.removeItem('ncc_token');
}

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

let activeRequestCount = 0;
const bufferListeners = new Set();

/**
 * Subscribe to global network buffer activity
 * @param {Function} listener - receives boolean `isLoading`
 */
export function subscribeBufferLoading(listener) {
  bufferListeners.add(listener);
  return () => bufferListeners.delete(listener);
}

function updateBufferState(delta) {
  activeRequestCount = Math.max(0, activeRequestCount + delta);
  const isLoading = activeRequestCount > 0;
  bufferListeners.forEach((fn) => {
    try { fn(isLoading); } catch (e) {}
  });
}

// High-Performance In-Memory Micro-Cache & In-Flight Request Deduplicator
const apiGetCache = new Map();
const inFlightGets = new Map();
const CACHE_TTL_MS = 3500; // 3.5s micro-cache prevents redundant waterfalls on page mount

if (typeof window !== 'undefined') {
  window.addEventListener('ncc:refresh-data', () => {
    apiGetCache.clear();
    inFlightGets.clear();
  });
}

export function clearApiCache() {
  apiGetCache.clear();
  inFlightGets.clear();
}

/**
 * Global trigger to notify all views that data has changed in the DBMS.
 * Dispatches both 'ncc:data-updated' and 'ncc:refresh-data' for universal reactivity.
 */
export function triggerDataSync(path = 'general') {
  clearApiCache();
  if (typeof window !== 'undefined') {
    const detail = { path, timestamp: Date.now() };
    window.dispatchEvent(new CustomEvent('ncc:data-updated', { detail }));
    window.dispatchEvent(new CustomEvent('ncc:refresh-data', { detail }));
  }
}

export async function apiRequest(path, { method = 'GET', body = null, form = false, auth = true, skipCache = false } = {}) {
  const upperMethod = method.toUpperCase();
  const token = getToken();
  const cacheKey = `${path}::${auth ? token || '' : 'noauth'}`;

  // Serve from hot cache if available for fast repeated GETs
  if (upperMethod === 'GET' && !skipCache) {
    const cached = apiGetCache.get(cacheKey);
    if (cached && (Date.now() - cached.time < CACHE_TTL_MS)) {
      return cached.data;
    }
    // Deduplicate identical in-flight GET requests
    if (inFlightGets.has(cacheKey)) {
      return inFlightGets.get(cacheKey);
    }
  }

  const executeRequest = async () => {
    const headers = {};
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;

    let payload = null;
    if (body) {
      if (body instanceof FormData) {
        payload = body;
      } else if (form) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        payload = new URLSearchParams(body).toString();
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
    }

    const base = getApiBase();
    updateBufferState(1);
    let res;
    try {
      res = await fetch(base + path, { method, headers, body: payload });
    } catch (e) {
      updateBufferState(-1);
      throw new ApiError(
        `Could not reach the API at ${base}. Please verify your backend server or switch endpoint.`,
        0, null
      );
    }

    const data = await res.json().catch(() => ({}));
    updateBufferState(-1);

    if (!res.ok) {
      const detail = data.detail;
      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg).join('; ')
          : `Request failed (${res.status})`;
      throw new ApiError(message, res.status, detail);
    }

    // Cache successful GET requests
    if (upperMethod === 'GET') {
      apiGetCache.set(cacheKey, { data, time: Date.now() });
    }

    // Real-Time Sync: Whenever a mutating operation completes, clear cache & inform app
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod)) {
      triggerDataSync(path);
    }

    return data;
  };

  if (upperMethod === 'GET' && !skipCache) {
    const promise = executeRequest().finally(() => {
      inFlightGets.delete(cacheKey);
    });
    inFlightGets.set(cacheKey, promise);
    return promise;
  }

  return executeRequest();
}

export const api = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', form: true, auth: false,
      body: { grant_type: 'password', username: email, password } }),
  loginWithSupabase: (accessToken) =>
    apiRequest('/auth/supabase', {
      method: 'POST',
      body: { access_token: accessToken },
      auth: false,
    }),
  me: () => apiRequest('/auth/me'),

  createBattalion: (data) => apiRequest('/battalions', { method: 'POST', body: data }),
  listBattalions: () => apiRequest('/battalions', { auth: false }),
  createCollege: (data) => apiRequest('/colleges', { method: 'POST', body: data }),
  listColleges: (battalionId) =>
    apiRequest(`/colleges${battalionId ? `?battalion_id=${battalionId}` : ''}`, { auth: false }),

  registerCadet: (data) => apiRequest('/cadets/register', { method: 'POST', body: data, auth: false }),
  listCadets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/cadets${q ? `?${q}` : ''}`);
  },
  getMyCadetProfile: () => apiRequest('/cadets/me'),
  getCadet: (id) => apiRequest(`/cadets/${id}`),
  updateCadet: (id, data) => apiRequest(`/cadets/${id}`, { method: 'PUT', body: data }),
  getCadetScores: (id) => apiRequest(`/cadets/${id}/scores`),
  getCadetInsight: (id) => apiRequest(`/cadets/${id}/ai-insight`),

  registerMentor: (data) => apiRequest('/mentors/register', { method: 'POST', body: data, auth: false }),
  getMyMentorProfile: () => apiRequest('/mentors/me'),
  listMentors: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/mentors${q ? `?${q}` : ''}`);
  },
  verifyMentor: (userId) => apiRequest(`/mentors/${userId}/verify`, { method: 'POST' }),

  listCriteria: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/evaluations/criteria${q ? `?${q}` : ''}`, { auth: false });
  },
  createCriterion: (data) => apiRequest('/evaluations/criteria', { method: 'POST', body: data }),
  updateCriterion: (id, data) => apiRequest(`/evaluations/criteria/${id}`, { method: 'PUT', body: data }),
  deleteCriterion: (id) => apiRequest(`/evaluations/criteria/${id}`, { method: 'DELETE' }),
  submitEvaluation: (data) => apiRequest('/evaluations/', { method: 'POST', body: data }),

  getLeaderboard: (battalionId, limit = 10) =>
    apiRequest(`/leaderboard?${battalionId ? `battalion_id=${battalionId}&` : ''}limit=${limit}`),
  getBattalionDashboard: (id) => apiRequest(`/dashboard/battalion/${id}`),

  // NCC MCQ Certificate Mock Test APIs
  getNCCTopics: () => apiRequest('/ncc-mock-tests/topics'),
  startNCCSession: (data) => apiRequest('/ncc-mock-tests/sessions', { method: 'POST', body: data }),
  getNCCSession: (id) => apiRequest(`/ncc-mock-tests/sessions/${id}`),
  saveNCCAnswer: (sessionId, data) => apiRequest(`/ncc-mock-tests/sessions/${sessionId}/answer`, { method: 'PUT', body: data }),
  submitNCCSession: (id) => apiRequest(`/ncc-mock-tests/sessions/${id}/submit`, { method: 'POST' }),
  getNCCSessionResults: (id) => apiRequest(`/ncc-mock-tests/sessions/${id}/results`),
  getNCCAnalytics: () => apiRequest('/ncc-mock-tests/analytics/cadet/me'),
  getNCCItemAnalysis: () => apiRequest('/ncc-mock-tests/analytics/item-analysis'),
  getCadetSessions: (cadetId) => apiRequest(`/ncc-mock-tests/cadets/${cadetId}/sessions`),
  getOfficerExamOverview: () => apiRequest('/ncc-mock-tests/analytics/officer-overview'),

  // NCC MCQ Admin Customization & Operations
  getNCCTestConfig: () => apiRequest('/ncc-mock-tests/config'),
  updateNCCTestConfig: (data) => apiRequest('/ncc-mock-tests/admin/config', { method: 'PUT', body: data }),
  listAdminQuestions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/ncc-mock-tests/admin/questions${q ? `?${q}` : ''}`);
  },
  createAdminQuestion: (data) => apiRequest('/ncc-mock-tests/admin/questions', { method: 'POST', body: data }),
  getAdminQuestion: (id) => apiRequest(`/ncc-mock-tests/admin/questions/${id}`),
  updateAdminQuestion: (id, data) => apiRequest(`/ncc-mock-tests/admin/questions/${id}`, { method: 'PUT', body: data }),
  deleteAdminQuestion: (id) => apiRequest(`/ncc-mock-tests/admin/questions/${id}`, { method: 'DELETE' }),
  createAdminTopic: (data) => apiRequest('/ncc-mock-tests/admin/topics', { method: 'POST', body: data }),
  updateAdminTopic: (code, data) => apiRequest(`/ncc-mock-tests/admin/topics/${code}`, { method: 'PUT', body: data }),
  deleteAdminTopic: (code) => apiRequest(`/ncc-mock-tests/admin/topics/${code}`, { method: 'DELETE' }),
  listAdminSessions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/ncc-mock-tests/admin/sessions${q ? `?${q}` : ''}`);
  },
  deleteAdminSession: (id) => apiRequest(`/ncc-mock-tests/admin/sessions/${id}`, { method: 'DELETE' }),
  importNCCQuestionsCSV: (formData) => apiRequest('/ncc-mock-tests/questions/import-csv', { method: 'POST', body: formData }),

  // Real-Time Operations: Attendance Muster & Training Tasks
  getAttendance: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/ops/attendance${q ? `?${q}` : ''}`);
  },
  getMyAttendanceStats: () => apiRequest('/ops/attendance/cadet/me'),
  saveBulkAttendance: (data) => apiRequest('/ops/attendance/bulk', { method: 'POST', body: data }),
  listTrainingTasks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/ops/tasks${q ? `?${q}` : ''}`);
  },
  createTrainingTask: (data) => apiRequest('/ops/tasks', { method: 'POST', body: data }),
  updateTrainingTask: (id, data) => apiRequest(`/ops/tasks/${id}`, { method: 'PUT', body: data }),
  deleteTrainingTask: (id) => apiRequest(`/ops/tasks/${id}`, { method: 'DELETE' }),

  // Official NCC Books & Syllabus Library APIs
  listStudyMaterials: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/library${q ? `?${q}` : ''}`);
  },
  getStudyMaterial: (id) => apiRequest(`/library/${id}`),
  createStudyMaterial: (data) => apiRequest('/library', { method: 'POST', body: data }),
  updateStudyMaterial: (id, data) => apiRequest(`/library/${id}`, { method: 'PUT', body: data }),
  deleteStudyMaterial: (id) => apiRequest(`/library/${id}`, { method: 'DELETE' }),
};


export { ApiError };
