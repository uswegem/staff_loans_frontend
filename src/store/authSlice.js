// Ported from Ess-Frontend/src/slice/authSlice.js and src/slice/userInfo.js, adapted for SLAS:
// one slice holds the session profile (user, roles, permissions). Tokens are not
// kept in Redux or localStorage: the access token stays in the API client's memory.

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'checking', // checking | signedOut | signedIn
  user: null,
  roles: [],
  permissions: [],
  mfaRequired: false,
  inactivityTimeoutMin: 15,
  endedReason: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted(state, { payload }) {
      state.status = 'signedIn';
      state.user = payload.user;
      state.roles = payload.roles || [];
      state.permissions = payload.permissions || [];
      state.mfaRequired = !!payload.mfaRequired;
      state.inactivityTimeoutMin = payload.session?.inactivityTimeoutMin || state.inactivityTimeoutMin;
      state.endedReason = null;
    },
    profileUpdated(state, { payload }) {
      if (state.status !== 'signedIn') return;
      state.user = payload.user;
      state.roles = payload.roles || [];
      state.permissions = payload.permissions || [];
      state.mfaRequired = !!payload.mfaRequired;
    },
    sessionEnded(state, { payload }) {
      return { ...initialState, status: 'signedOut', endedReason: payload || null };
    },
  },
});

export const { sessionStarted, profileUpdated, sessionEnded } = authSlice.actions;
export default authSlice.reducer;

export const selectAuth = (s) => s.auth;
export const selectCan = (permission) => (s) => s.auth.permissions.includes(permission);
export const canAny = (permissions, held) => permissions.some((p) => held.includes(p));
