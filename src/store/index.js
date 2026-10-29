import { configureStore } from '@reduxjs/toolkit';
import auth, { profileUpdated, sessionEnded } from './authSlice';
import { setSessionHandlers } from '../api/client';

export function makeStore(preloadedState) {
  const store = configureStore({ reducer: { auth }, preloadedState });
  // A background refresh brings a fresh profile (permissions may have changed, FR-51).
  setSessionHandlers({
    changed: (data) => store.dispatch(profileUpdated(data)),
    ended: (body) => store.dispatch(sessionEnded(body?.code === 'SESSION_IDLE' ? 'idle' : 'expired')),
  });
  return store;
}
