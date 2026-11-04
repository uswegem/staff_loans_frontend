import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi } from '../api/auth';
import { currentSessionEpoch, lastApiActivity } from '../api/client';
import { profileUpdated, sessionEnded } from '../store/authSlice';

const CHECK_EVERY_MS = 30 * 1000;
const KEEPALIVE_AFTER_MS = 4 * 60 * 1000;
const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'];

/**
 * Inactivity timeout (BRD NFR-04, DECISIONS D-16):
 * - signs out after the configured minutes without keyboard, mouse or touch input;
 * - while the user is active but not calling the API (reading a long agreement), pings
 *   /auth/me so the server session stays open, which also picks up permission changes;
 * - refreshes the profile when the window regains focus (FR-51).
 */
export default function useSessionKeeper() {
  const dispatch = useDispatch();
  const timeoutMin = useSelector((st) => st.auth.inactivityTimeoutMin);
  const lastInput = useRef(Date.now());

  useEffect(() => {
    const mark = () => {
      lastInput.current = Date.now();
    };
    INPUT_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    let active = true;
    const refreshProfile = () => {
      const epoch = currentSessionEpoch();
      return authApi.me().then((p) => {
        if (active && epoch === currentSessionEpoch()) dispatch(profileUpdated(p));
      }).catch(() => {});
    };

    const timer = setInterval(async () => {
      const now = Date.now();
      if (now - lastInput.current > timeoutMin * 60 * 1000) {
        clearInterval(timer);
        await authApi.logout().catch(() => {});
        dispatch(sessionEnded('idle'));
        return;
      }
      if (lastInput.current > lastApiActivity() && now - lastApiActivity() > KEEPALIVE_AFTER_MS) refreshProfile();
    }, CHECK_EVERY_MS);

    window.addEventListener('focus', refreshProfile);
    return () => {
      active = false;
      clearInterval(timer);
      INPUT_EVENTS.forEach((e) => window.removeEventListener(e, mark));
      window.removeEventListener('focus', refreshProfile);
    };
  }, [dispatch, timeoutMin]);
}
