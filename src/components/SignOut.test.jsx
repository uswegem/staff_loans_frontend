import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountMenu from './AccountMenu';
import { authApi } from '../api/auth';
import { hasAccessToken, setAccessToken } from '../api/client';
import { renderAt } from '../test/render';
import { stubHttp } from '../test/http';

// Sign-out must end the session on the server, or reloading the page signs the person back in.
describe('sign out', () => {
  it('sends {} (never null, which the API refuses) with the CSRF header', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-abc';
    const calls = stubHttp({ 'POST /auth/logout': () => [200, { success: true }] });
    setAccessToken('t');
    await authApi.logout();
    const call = calls.find((c) => c.key === 'POST /auth/logout');
    expect(call.config.data).toBe('{}');
    expect(call.config.headers['X-XSRF-TOKEN']).toBe('csrf-abc');
    expect(hasAccessToken()).toBe(false);
  });

  it('retries a server error once', async () => {
    let n = 0;
    stubHttp({ 'POST /auth/logout': () => { n += 1; return n === 1 ? [503, {}] : [200, { success: true }]; } });
    await authApi.logout();
    expect(n).toBe(2);
  });

  it('a failed sign-out keeps the person signed in and says so, instead of showing the sign-in page', async () => {
    stubHttp({ 'POST /auth/logout': () => [500, {}] });
    setAccessToken('t');
    renderAt('/', '/', <AccountMenu />, { permissions: ['loan.apply'] });
    await userEvent.click(screen.getByRole('button', { name: /Account menu for/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't sign you out. Check your connection and try again.");
    expect(screen.queryByText('Elsewhere')).toBeNull();
    expect(hasAccessToken()).toBe(true);
  });

  it('a successful sign-out goes to the sign-in page', async () => {
    stubHttp({ 'POST /auth/logout': () => [200, { success: true }] });
    renderAt('/', '/', <AccountMenu />, { permissions: ['loan.apply'] });
    await userEvent.click(screen.getByRole('button', { name: /Account menu for/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument(); // /login, outside this test route
  });

  it('an automatic sign-out (idle) still ends the session in this browser when the server cannot be reached', async () => {
    stubHttp({ 'POST /auth/logout': () => [503, {}] });
    setAccessToken('t');
    await authApi.logout('idle');
    expect(hasAccessToken()).toBe(false);
  });
});
