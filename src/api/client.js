// Ported from Ess-Frontend/src/ApiFunction.js (commit at clone time), adapted for SLAS:
// - the access token lives in memory only; nothing about the session is written to
//   localStorage (only the interface language and theme are, D-94)
// - the refresh token is an httpOnly cookie the browser sends to /api/v1/auth;
//   requests go withCredentials and refresh echoes the XSRF-TOKEN cookie (CSRF)
// - single-flight refresh: concurrent 401s wait for one refresh, then retry once
// - tenant, membership and permission caching removed (the server is the source)

import axios from 'axios';
import { translate } from '../i18n';

export const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

let accessToken = null;
let refreshing = null;
let onSessionChanged = () => {};
let onSessionEnded = () => {};
let lastActivity = 0;
let language = 'en';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function setAccessToken(token) {
  accessToken = token || null;
}
export const hasAccessToken = () => !!accessToken;
/** Messages from the API come back in this language (D-94). */
export function setApiLanguage(lang) {
  language = lang === 'sw' ? 'sw' : 'en';
}
export const lastApiActivity = () => lastActivity;

/** Lets the store react when a refresh brings a new profile, or the session ends. */
export function setSessionHandlers({ changed, ended }) {
  if (changed) onSessionChanged = changed;
  if (ended) onSessionEnded = ended;
}

export function readCookie(name) {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}

const csrfHeaders = () => ({ 'X-XSRF-TOKEN': readCookie('XSRF-TOKEN') });

/** Calls /auth/refresh once even if many requests ask at the same time. */
export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_BASE}/auth/refresh`, null, { withCredentials: true, headers: csrfHeaders() })
      .then((res) => {
        const data = res.data.data;
        setAccessToken(data.accessToken);
        onSessionChanged(data);
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  config.headers['Accept-Language'] = language;
  lastActivity = Date.now();
  return config;
});

// Codes that mean "the access token is stale, try a refresh".
const REFRESHABLE = new Set(['NO_TOKEN', 'TOKEN_INVALID']);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    const code = response?.data?.code;
    if (response?.status === 401 && REFRESHABLE.has(code) && config && !config._retried && !config.url.startsWith('/auth/')) {
      config._retried = true;
      try {
        await refreshSession();
      } catch (refreshError) {
        setAccessToken(null);
        onSessionEnded(refreshError.response?.data);
        return Promise.reject(error);
      }
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    }
    if (response?.status === 401 && ['SESSION_ENDED', 'SESSION_IDLE', 'ACCOUNT_INACTIVE'].includes(code)) {
      setAccessToken(null);
      onSessionEnded(response.data);
    }
    return Promise.reject(error);
  }
);

/** Turns an axios error into { message, code, details } for forms and banners. */
export function apiError(err) {
  const body = err?.response?.data;
  if (body && body.message) return { message: body.message, code: body.code, details: body.details || {}, status: err.response.status };
  if (err?.request && !err?.response) return { message: translate('Staff Loans cannot be reached. Check your connection to the LFB network.'), code: 'NETWORK', details: {} };
  return { message: translate('Something went wrong. Try again.'), code: 'UNKNOWN', details: {} };
}

export const csrf = { headers: csrfHeaders };
