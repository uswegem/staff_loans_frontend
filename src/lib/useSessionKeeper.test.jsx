import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { PreferencesProvider } from '../i18n';
import { makeStore } from '../store';
import useSessionKeeper from './useSessionKeeper';
import SessionTimeoutDialog from '../components/SessionTimeoutDialog';
import SignIn from '../features/auth/SignIn';
import { resetIdleClock } from './idleClock';
import { stubHttp } from '../test/http';
import { notificationsApi } from '../api/products';
import { authApi } from '../api/auth';
import { refreshSession, setAccessToken, startSessionSync } from '../api/client';

const SEC = 1000;
const MIN = 60 * SEC;
const profile = { user: { id: 'u1', fullName: 'Neema Mushi', staffNo: 'LFB0412', mustChangePassword: false }, roles: [], permissions: ['loan.apply'], mfaRequired: false, session: { inactivityTimeoutMin: 10 } };

function Harness() {
  const idle = useSessionKeeper();
  return <SessionTimeoutDialog remaining={idle.remaining} onStay={idle.staySignedIn} onLogOut={idle.logOutNow} />;
}

let store;
let calls;
function start(routes = {}) {
  calls = stubHttp({
    'GET /auth/me': () => [200, { data: profile }],
    'POST /auth/logout': () => [200, { success: true }],
    'GET /notifications/unread-count': () => [200, { data: { unread: 0 } }],
    'POST /auth/refresh': () => [200, { data: { ...profile, accessToken: 'tok2', expiresIn: 900 } }],
    ...routes,
  });
  store = makeStore({ auth: { status: 'signedIn', user: profile.user, roles: [], permissions: profile.permissions, mfaRequired: false, inactivityTimeoutMin: 10, endedReason: null, sessionGeneration: 1 } });
  setAccessToken('tok1');
  render(
    <Provider store={store}>
      <PreferencesProvider>
        <Harness />
      </PreferencesProvider>
    </Provider>
  );
}
const advance = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));
const dialog = () => screen.queryByRole('dialog');
const timer = () => screen.getByRole('timer').textContent;
const posted = (key) => calls.filter((c) => c.key === key);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(new Date('2026-11-10T08:00:00Z'));
  resetIdleClock();
});
afterEach(() => {
  vi.useRealTimers();
  setAccessToken(null);
});

describe('inactivity warning and sign-out (NFR-04, 10 minutes)', () => {
  it('stays signed in with no warning until 8 minutes 30 seconds', async () => {
    start();
    await advance(8 * MIN + 29 * SEC);
    expect(dialog()).toBeNull();
    expect(store.getState().auth.status).toBe('signedIn');
  });

  it('opens the warning at exactly 8:30 with 01:30 left, and counts down every second', async () => {
    start();
    await advance(8 * MIN + 30 * SEC);
    expect(dialog()).not.toBeNull();
    expect(screen.getByText('Your session is about to expire')).toBeInTheDocument();
    expect(timer()).toBe('01:30');
    await advance(SEC);
    expect(timer()).toBe('01:29');
    await advance(59 * SEC);
    expect(timer()).toBe('00:30');
  });

  it('signs out at 10 minutes, ending the server session, with the idle notice', async () => {
    start();
    await advance(10 * MIN);
    expect(posted('POST /auth/logout')).toHaveLength(1);
    expect(store.getState().auth).toMatchObject({ status: 'signedOut', endedReason: 'idle', inactivityTimeoutMin: 10 });
  });

  it('input before the warning resets the clock', async () => {
    start();
    await advance(6 * MIN);
    fireEvent.keyDown(window, { key: 'a' });
    await advance(6 * MIN);
    expect(dialog()).toBeNull();
    await advance(2 * MIN + 30 * SEC);
    expect(dialog()).not.toBeNull();
  });

  it('once the warning is open, moving the mouse or typing does not dismiss it', async () => {
    start();
    await advance(8 * MIN + 30 * SEC);
    fireEvent.pointerMove(window);
    fireEvent.keyDown(window, { key: 'Tab' });
    await advance(2 * SEC);
    expect(timer()).toBe('01:28');
  });

  it('Escape does not close the warning', async () => {
    start();
    await advance(8 * MIN + 30 * SEC);
    fireEvent.keyDown(dialog(), { key: 'Escape' });
    expect(dialog()).not.toBeNull();
  });

  it('Stay signed in confirms the session with the server, then resets the clock', async () => {
    start();
    await advance(8 * MIN + 30 * SEC);
    const before = posted('GET /auth/me').length;
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    await advance(0);
    const check = posted('GET /auth/me').slice(before);
    expect(check).toHaveLength(1);
    expect(check[0].config.headers['X-SLAS-Background']).toBeUndefined(); // counts as activity on the server
    expect(dialog()).toBeNull();
    await advance(8 * MIN);
    expect(dialog()).toBeNull();
    expect(store.getState().auth.status).toBe('signedIn');
  });

  it('Stay signed in cannot restore a session the server already closed', async () => {
    start({ 'GET /auth/me': () => [401, { success: false, code: 'SESSION_IDLE', message: 'You were signed out after a period of inactivity.' }] });
    await advance(8 * MIN + 30 * SEC);
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    await advance(0);
    expect(store.getState().auth).toMatchObject({ status: 'signedOut', endedReason: 'idle' });
  });

  it('Log out now ends the session at once', async () => {
    start();
    await advance(8 * MIN + 40 * SEC);
    fireEvent.click(screen.getByRole('button', { name: 'Log out now' }));
    await advance(0);
    expect(posted('POST /auth/logout')).toHaveLength(1);
    expect(store.getState().auth).toMatchObject({ status: 'signedOut', endedReason: null });
  });

  it('a hidden tab or a sleeping computer is signed out as soon as the page is visible again', async () => {
    start();
    // No timer ticks while asleep: only the clock moves.
    vi.setSystemTime(Date.now() + 11 * MIN);
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    await advance(0);
    expect(store.getState().auth).toMatchObject({ status: 'signedOut', endedReason: 'idle' });
  });

  it('polling and other background requests do not count as activity, and say so to the server', async () => {
    start();
    for (let i = 0; i < 8; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await advance(MIN);
      // eslint-disable-next-line no-await-in-loop
      await act(() => notificationsApi.unreadCount());
    }
    expect(posted('GET /notifications/unread-count').every((c) => c.config.headers['X-SLAS-Background'] === '1')).toBe(true);
    await advance(30 * SEC);
    expect(dialog()).not.toBeNull();
  });

  it('an automatic token refresh does not count as activity', async () => {
    start();
    await advance(5 * MIN);
    await act(() => refreshSession());
    await advance(3 * MIN + 30 * SEC);
    expect(dialog()).not.toBeNull();
  });

  it('input in another tab resets this tab and closes its warning', async () => {
    start();
    await advance(8 * MIN + 30 * SEC);
    expect(dialog()).not.toBeNull();
    const now = String(Date.now());
    window.localStorage.setItem('slas.lastActivity', now);
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: 'slas.lastActivity', newValue: now })));
    expect(dialog()).toBeNull();
  });

  it('all tabs share one deadline: activity recorded earlier by another tab counts here', async () => {
    window.localStorage.setItem('slas.lastActivity', String(Date.now()));
    start();
    await advance(8 * MIN + 30 * SEC);
    expect(timer()).toBe('01:30');
  });
});

describe('across tabs', () => {
  it('an idle sign-out in one tab tells the other tabs why', async () => {
    const other = new BroadcastChannel('slas-session');
    const got = [];
    other.onmessage = (e) => got.push(e.data);
    const stop = startSessionSync(() => {});
    vi.useRealTimers();
    stubHttp({ 'POST /auth/logout': () => [200, {}] });
    await authApi.logout('idle');
    await new Promise((r) => setTimeout(r, 50));
    expect(got).toEqual([{ type: 'SESSION_ENDED', reason: 'idle' }]);
    other.close();
    stop();
  });

  it('a tab told by another tab signs out with the same reason', async () => {
    vi.useRealTimers();
    const reasons = [];
    const stop = startSessionSync((reason) => reasons.push(reason));
    const other = new BroadcastChannel('slas-session');
    other.postMessage({ type: 'SESSION_ENDED', reason: 'idle' });
    other.postMessage({ type: 'SESSION_ENDED' });
    await new Promise((r) => setTimeout(r, 50));
    expect(reasons).toEqual(['idle', 'expired']);
    other.close();
    stop();
  });
});

describe('sign-in notice after an idle sign-out', () => {
  function renderSignIn(language) {
    vi.useRealTimers();
    try {
      window.localStorage.setItem('slas.preferences', JSON.stringify({ language }));
    } catch {
      // ignore
    }
    const s = makeStore({ auth: { status: 'signedOut', user: null, roles: [], permissions: [], mfaRequired: false, inactivityTimeoutMin: 10, endedReason: 'idle', sessionGeneration: 2 } });
    render(
      <Provider store={s}>
        <PreferencesProvider>
          <MemoryRouter>
            <SignIn />
          </MemoryRouter>
        </PreferencesProvider>
      </Provider>
    );
  }

  it('says the session expired after 10 minutes of inactivity', () => {
    renderSignIn('en');
    expect(screen.getByText('Your session expired after 10 minutes of inactivity. Please sign in again.')).toBeInTheDocument();
  });

  it('says it in Swahili too', () => {
    renderSignIn('sw');
    expect(screen.getByText('Muda wako wa kuingia umeisha baada ya dakika 10 bila kutumia mfumo. Tafadhali ingia tena.')).toBeInTheDocument();
    window.localStorage.removeItem('slas.preferences');
  });
});
