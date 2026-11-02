// Ported from Ess-Frontend/src/services/authService.js, adapted for SLAS:
// staff-number sign-in, MFA steps, cookie refresh and CSRF on logout.

import { api, csrf, refreshSession, setAccessToken } from './client';

const data = (p) => p.then((r) => r.data.data);

export const authApi = {
  login: (staffNo, password) => data(api.post('/auth/login', { staffNo, password })),
  mfaVerify: (mfaToken, code) => data(api.post('/auth/mfa/verify', { mfaToken, code })),
  mfaEnrolStart: (mfaToken) => data(api.post('/auth/mfa/enrol/start', { mfaToken })),
  mfaEnrolConfirm: (mfaToken, code) => data(api.post('/auth/mfa/enrol/confirm', { mfaToken, code })),
  me: () => data(api.get('/auth/me')),
  savePreferences: (prefs) => data(api.patch('/auth/preferences', prefs)),
  changePassword: (currentPassword, newPassword) => data(api.post('/auth/change-password', { currentPassword, newPassword })),
  refresh: () => refreshSession(),
  async logout() {
    try {
      await api.post('/auth/logout', null, { headers: csrf.headers() });
    } finally {
      setAccessToken(null);
    }
  },
};
