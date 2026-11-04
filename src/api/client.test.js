import { beforeEach, describe, expect, it } from 'vitest';
import { api, hasAccessToken, setAccessToken, setSessionHandlers, currentSessionEpoch, invalidateSessionRequests } from './client';
import { stubHttp } from '../test/http';

const profile = { accessToken: 'new-token', user: { fullName: 'Neema Mushi' }, roles: [], permissions: ['loan.apply'] };

describe('API client (ported refresh interceptor)', () => {
  beforeEach(() => {
    setAccessToken('old-token');
    localStorage.clear();
    document.cookie = 'XSRF-TOKEN=csrf-abc';
  });

  it('sends the access token from memory and never writes tokens to localStorage', async () => {
    const calls = stubHttp({ 'GET /auth/me': () => [200, { data: {} }] });
    await api.get('/auth/me');
    expect(calls[0].config.headers.Authorization).toBe('Bearer old-token');
    expect(localStorage.length).toBe(0);
  });

  it('refreshes once for concurrent 401s, then retries each request', async () => {
    let refreshes = 0;
    const calls = stubHttp({
      'GET /users': (config) => (config.headers.Authorization === 'Bearer new-token' ? [200, { data: 'ok' }] : [401, { code: 'TOKEN_INVALID' }]),
      'POST /auth/refresh': (config) => {
        refreshes += 1;
        expect(config.headers['X-XSRF-TOKEN']).toBe('csrf-abc');
        expect(config.withCredentials).toBe(true);
        return [200, { data: profile }];
      },
    });
    const results = await Promise.all([api.get('/users'), api.get('/users'), api.get('/users')]);
    expect(results.map((r) => r.data.data)).toEqual(['ok', 'ok', 'ok']);
    expect(refreshes).toBe(1);
    expect(calls.filter((c) => c.key === 'GET /users')).toHaveLength(6);
  });

  it('ends the session when refresh fails', async () => {
    let ended = null;
    setSessionHandlers({ ended: (body) => { ended = body || true; } });
    stubHttp({
      'GET /users': () => [401, { code: 'TOKEN_INVALID' }],
      'POST /auth/refresh': () => [401, { code: 'REFRESH_INVALID' }],
    });
    await expect(api.get('/users')).rejects.toBeTruthy();
    expect(hasAccessToken()).toBe(false);
    expect(ended).toBeTruthy();
  });

  it('invalidates the request generation when the logged-in identity changes', () => {
    const before = currentSessionEpoch();
    setAccessToken('AT637-session');
    expect(currentSessionEpoch()).toBeGreaterThan(before);
    const after = currentSessionEpoch();
    setAccessToken('AT637-session');
    expect(currentSessionEpoch()).toBe(after);
    setAccessToken('AT656-session');
    expect(currentSessionEpoch()).toBeGreaterThan(after);
  });

  it("never exposes an old user's delayed API response after account switching", async () => {
    let release;
    const previousAdapter = api.defaults.adapter;
    api.defaults.adapter = (config) => new Promise((resolve) => {
      release = () => resolve({ config, status: 200, statusText: 'OK', headers: {}, data: { data: { salary: 900000 } } });
    });
    try {
      setAccessToken('AT637-session');
      const request = api.get('/applications/AT637');
      await Promise.resolve();
      await Promise.resolve();
      setAccessToken('AT656-session');
      release();
      await expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    } finally {
      api.defaults.adapter = previousAdapter;
    }
  });

  it('invalidates pending requests explicitly on session termination', () => {
    const before = currentSessionEpoch();
    invalidateSessionRequests();
    expect(currentSessionEpoch()).toBe(before + 1);
  });

  it('does not try to refresh on a failed sign-in', async () => {
    const calls = stubHttp({ 'POST /auth/login': () => [401, { code: 'INVALID_CREDENTIALS' }] });
    await expect(api.post('/auth/login', {})).rejects.toBeTruthy();
    expect(calls.map((c) => c.key)).toEqual(['POST /auth/login']);
  });
});
