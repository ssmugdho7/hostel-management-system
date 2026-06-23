import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');
const API_ORIGIN = API_BASE.replace(/\/api$/, '');

export const apiBase = API_BASE;
export const apiOrigin = API_ORIGIN;

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

let csrfPromise = null;

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

export async function ensureCsrf() {
  if (!csrfPromise) {
    csrfPromise = (async () => {
      const targets = [`${API_ORIGIN}/sanctum/csrf-cookie`, `${API_BASE}/sanctum/csrf-cookie`];
      for (const target of targets) {
        try {
          const response = await fetch(target, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          if (response.ok) return;
        } catch {
          // try next
        }
      }
    })();
  }
  return csrfPromise;
}

apiClient.interceptors.request.use(async (config) => {
  if ((config.method || 'get').toLowerCase() !== 'get') {
    await ensureCsrf();
    const xsrf = getCookie('XSRF-TOKEN');
    if (xsrf) {
      config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    const message = data?.message || error.message || 'Request failed';
    const apiError = new Error(message);
    apiError.status = error.response?.status;
    apiError.errors = data?.errors || {};
    return Promise.reject(apiError);
  }
);

export default apiClient;
