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

export async function apiRequest(path, { method = 'GET', body = null, form = false, auth = true } = {}) {
  const headers = {};
  if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  let payload = null;
  if (body) {
    if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      payload = new URLSearchParams(body).toString();
    } else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  const base = getApiBase();
  let res;
  try {
    res = await fetch(base + path, { method, headers, body: payload });
  } catch (e) {
    throw new ApiError(
      `Could not reach the API at ${base}. Please verify your backend server or switch endpoint.`,
      0, null
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data.detail;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map(d => d.msg).join('; ')
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, detail);
  }

  return data;
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
  getCadetScores: (id) => apiRequest(`/cadets/${id}/scores`),
  getCadetInsight: (id) => apiRequest(`/cadets/${id}/ai-insight`),

  registerMentor: (data) => apiRequest('/mentors/register', { method: 'POST', body: data, auth: false }),
  listMentors: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/mentors${q ? `?${q}` : ''}`);
  },
  verifyMentor: (userId) => apiRequest(`/mentors/${userId}/verify`, { method: 'POST' }),

  listCriteria: () => apiRequest('/evaluations/criteria', { auth: false }),
  submitEvaluation: (data) => apiRequest('/evaluations/', { method: 'POST', body: data }),

  getLeaderboard: (battalionId, limit = 10) =>
    apiRequest(`/leaderboard?${battalionId ? `battalion_id=${battalionId}&` : ''}limit=${limit}`),
  getBattalionDashboard: (id) => apiRequest(`/dashboard/battalion/${id}`),
};


export { ApiError };
