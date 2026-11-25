// Ported from Ess-Frontend/src/services/authService.js, adapted for SLAS:
// staff-number sign-in, MFA steps, cookie refresh and CSRF on logout.

import { api, csrf, refreshSession, setAccessToken, notifyOtherTabsSessionEnded, BACKGROUND } from './client';

const data = (p) => p.then((r) => r.data.data);

export const authApi = {
  login: (userName, password) => data(api.post('/auth/login', { userName, password })),
  mfaVerify: (mfaToken, code) => data(api.post('/auth/mfa/verify', { mfaToken, code })),
  mfaEnrolStart: (mfaToken) => data(api.post('/auth/mfa/enrol/start', { mfaToken })),
  mfaEnrolConfirm: (mfaToken, code) => data(api.post('/auth/mfa/enrol/confirm', { mfaToken, code })),
  me: ({ background = false } = {}) => data(api.get('/auth/me', background ? BACKGROUND : undefined)),
  savePreferences: (prefs) => data(api.patch('/auth/preferences', prefs)),
  changePassword: (currentPassword, newPassword) => data(api.post('/auth/change-password', { currentPassword, newPassword })),
  refresh: () => refreshSession(),
  /**
   * Ends the session on the server: the refresh token is revoked and its cookie deleted, so
   * reloading the page does not sign the person back in. The body is {} (never null, which
   * strict JSON parsing refuses). A network or server error is retried once.
   * reason: 'idle' (or another automatic reason) ends the session in this browser even when
   * the server cannot be reached; a person signing out (no reason) gets the error instead, so
   * the app never shows the sign-in page while the session is still running.
   */
  async logout(reason) {
    let failure = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await api.post('/auth/logout', {}, { headers: csrf.headers() });
        failure = null;
        break;
      } catch (err) {
        failure = err;
        const status = err?.response?.status;
        if (status && status < 500) break; // a refusal will not change on a retry
      }
    }
    if (failure && !reason) throw failure;
    setAccessToken(null);
    notifyOtherTabsSessionEnded(reason);
  },
};
