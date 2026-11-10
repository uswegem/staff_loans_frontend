import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi } from '../api/auth';
import { currentSessionEpoch, lastApiActivity } from '../api/client';
import { profileUpdated, sessionEnded } from '../store/authSlice';
import { lastActivity, markActivity, onOtherTabActivity } from './idleClock';

/** The warning opens this many seconds before the limit (UAT requirement, 10 Nov 2026). */
export const WARNING_SECONDS = 90;
const TICK_MS = 1000;
// While the user works without calling the API (reading a long agreement), a visible tab
// tells the server at most this often, so the server's idle clock never runs out first.
const KEEPALIVE_AFTER_MS = 60 * 1000;
const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

/**
 * Inactivity sign-out (BRD NFR-04, DECISIONS D-16), configured by Settings
 * (inactivityTimeoutMin, 10 minutes by default):
 * - only keyboard, pointer, touch and scroll input counts; API calls, polling and token
 *   refresh do not. Input is shared by every tab of the browser (idleClock);
 * - elapsed time is measured from the last input, so a hidden tab or a sleeping computer
 *   is checked again as soon as the page is visible;
 * - WARNING_SECONDS before the limit, { remaining } counts down and input no longer
 *   counts: only staySignedIn(), after the server confirms the session, resets the clock;
 * - at the limit the session is ended on the server, in every tab, with the idle notice.
 */
export default function useSessionKeeper() {
  const dispatch = useDispatch();
  const timeoutMin = useSelector((st) => st.auth.inactivityTimeoutMin);
  const limitMs = timeoutMin * 60 * 1000;
  const warnAtMs = Math.max(0, limitMs - WARNING_SECONDS * 1000);
  const [remaining, setRemaining] = useState(null);
  const warning = useRef(false);
  const ended = useRef(false);
  const pinging = useRef(false);

  const end = useCallback(
    async (reason) => {
      if (ended.current) return;
      ended.current = true;
      warning.current = false;
      setRemaining(null);
      await authApi.logout(reason).catch(() => {});
      dispatch(sessionEnded(reason));
    },
    [dispatch]
  );

  const check = useCallback(() => {
    if (ended.current) return;
    const idle = Date.now() - lastActivity();
    if (idle >= limitMs) {
      end('idle');
    } else if (idle >= warnAtMs) {
      warning.current = true;
      setRemaining(Math.ceil((limitMs - idle) / 1000));
    } else if (warning.current) {
      // Another tab chose to stay signed in.
      warning.current = false;
      setRemaining(null);
    }
  }, [limitMs, warnAtMs, end]);

  useEffect(() => {
    ended.current = false;
    markActivity(Date.now(), { force: true }); // signing in or opening the app is input

    const onInput = () => {
      if (!warning.current) markActivity();
    };
    INPUT_EVENTS.forEach((e) => window.addEventListener(e, onInput, { passive: true, capture: true }));

    let mounted = true;
    const refreshProfile = () => {
      const epoch = currentSessionEpoch();
      return authApi
        .me({ background: true })
        .then((p) => {
          if (mounted && epoch === currentSessionEpoch()) dispatch(profileUpdated(p));
        })
        .catch(() => {});
    };
    const keepServerInStep = () => {
      const now = Date.now();
      if (pinging.current || warning.current || document.visibilityState !== 'visible') return;
      if (lastActivity() <= lastApiActivity() || now - lastApiActivity() < KEEPALIVE_AFTER_MS) return;
      pinging.current = true;
      authApi
        .me()
        .then((p) => mounted && dispatch(profileUpdated(p)))
        .catch(() => {})
        .finally(() => {
          pinging.current = false;
        });
    };

    const timer = setInterval(() => {
      check();
      keepServerInStep();
    }, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const onFocus = () => {
      check();
      if (!ended.current) refreshProfile(); // permissions may have changed (FR-51)
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    const offOtherTabs = onOtherTabActivity(check);
    check();

    return () => {
      mounted = false;
      clearInterval(timer);
      INPUT_EVENTS.forEach((e) => window.removeEventListener(e, onInput, { capture: true }));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      offOtherTabs();
    };
  }, [check, dispatch]);

  /** Confirms the session with the server, then resets the clock in every tab. */
  const staySignedIn = useCallback(async () => {
    try {
      await authApi.me(); // a request the user made: the server records the activity
    } catch {
      // The session already ended (idle or revoked): the API client has signed out.
      return false;
    }
    markActivity(Date.now(), { force: true });
    warning.current = false;
    setRemaining(null);
    return true;
  }, []);

  const logOutNow = useCallback(() => end(null), [end]);

  return { remaining, staySignedIn, logOutNow };
}
