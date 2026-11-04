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
let sessionEpoch = 0;
const pending = new Set();

export const currentSessionEpoch = () => sessionEpoch;
export function invalidateSessionRequests() {
  sessionEpoch += 1;
  for (const controller of pending) controller.abort();
  pending.clear();
  refreshing = null;
}
const stale = () => new axios.CanceledError('Request belongs to a previous authentication session');

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function setAccessToken(token) {
  const next = token || null;
  if (accessToken !== next) invalidateSessionRequests();
  accessToken = next;
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
    const epoch = sessionEpoch;
    refreshing = axios
      .post(`${API_BASE}/auth/refresh`, null, { withCredentials: true, headers: csrfHeaders() })
      .then((res) => {
        if (epoch !== sessionEpoch) throw stale();
        const data = res.data.data;
        setAccessToken(data.accessToken);
        onSessionChanged(data);
        return data;
      })
      .finally(() => {
        if (epoch === sessionEpoch || !refreshing) refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.request.use((config) => {
  config._sessionEpoch = sessionEpoch;
  const controller = new AbortController();
  config._sessionController = controller;
  pending.add(controller);
  if (config.signal) {
    if (config.signal.aborted) controller.abort();
    else config.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  config.signal = controller.signal;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  config.headers['Accept-Language'] = language;
  lastActivity = Date.now();
  return config;
});

// Codes that mean "the access token is stale, try a refresh".
const REFRESHABLE = new Set(['NO_TOKEN', 'TOKEN_INVALID']);

api.interceptors.response.use(
  (res) => {
    pending.delete(res.config._sessionController);
    if (res.config._sessionEpoch !== sessionEpoch) return Promise.reject(stale());
    return res;
  },
  async (error) => {
    const { response, config } = error;
    if (config?._sessionController) pending.delete(config._sessionController);
    if (config?._sessionEpoch !== sessionEpoch) return Promise.reject(stale());
    const code = response?.data?.code;
    if (response?.status === 401 && REFRESHABLE.has(code) && config && !config._retried && !config.url.startsWith('/auth/')) {
      config._retried = true;
      try {
        await refreshSession();
        if (config._sessionEpoch !== sessionEpoch) return Promise.reject(stale());
      } catch (refreshError) {
        if (config._sessionEpoch !== sessionEpoch) return Promise.reject(stale());
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
