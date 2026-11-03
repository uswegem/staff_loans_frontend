import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import theme from '../../theme';
import { makeStore } from '../../store';
import SignIn from './SignIn';
import { stubHttp } from '../../test/http';

const session = { accessToken: 't', user: { fullName: 'Juma Kassim', staffNo: 'LFB0233', mustChangePassword: false }, roles: [], permissions: ['review.credit'] };

function renderSignIn() {
  const store = makeStore({ auth: { status: 'signedOut', user: null, roles: [], permissions: [], mfaRequired: false, inactivityTimeoutMin: 15, endedReason: null } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<SignIn />} />
            <Route path="/" element={<p>Home page</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
}

const fill = async (staffNo, password) => {
  if (staffNo) await userEvent.type(screen.getByLabelText('Staff number'), staffNo);
  if (password) await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('Sign in (FR-53)', () => {
  it('shows the prototype copy and the authorised-use notice', () => {
    renderSignIn();
    expect(screen.getByRole('heading', { name: 'Karibu. Sign in to continue.' })).toBeInTheDocument();
    expect(screen.getByText(/For authorised Letshego Faidika Bank staff only/)).toBeInTheDocument();
    expect(screen.getByText(/Forgot your password\?/)).toBeInTheDocument();
  });

  it('validates the staff number format before calling the API', async () => {
    const calls = stubHttp({});
    renderSignIn();
    await fill('AT-637', '');
    expect(screen.getByText('Enter your staff number as on your payslip (employee code), for example AT637.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('clears a field message as soon as the field is corrected, without signing in again', async () => {
    const calls = stubHttp({});
    renderSignIn();
    await fill('AT-637', '');
    const message = 'Enter your staff number as on your payslip (employee code), for example AT637.';
    expect(screen.getByText(message)).toBeInTheDocument();
    const sn = screen.getByLabelText('Staff number');
    await userEvent.clear(sn);
    await userEvent.type(sn, 'AT-6');
    expect(screen.getByText(message)).toBeInTheDocument(); // still wrong: still shown
    await userEvent.clear(sn);
    await userEvent.type(sn, 'AT637');
    expect(screen.queryByText(message)).toBeNull();
    await userEvent.type(screen.getByLabelText('Password'), 'x');
    expect(screen.queryByText('Enter your password.')).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('shows remaining attempts after a wrong password', async () => {
    stubHttp({ 'POST /auth/login': () => [401, { code: 'INVALID_CREDENTIALS', message: 'x', details: { remainingAttempts: 3 } }] });
    renderSignIn();
    await fill('lfb0412', 'wrong');
    expect(await screen.findByText('The staff number or password is not right')).toBeInTheDocument();
    expect(screen.getByText('3 attempts left before the account locks.')).toBeInTheDocument();
  });

  it('shows the locked screen', async () => {
    stubHttp({ 'POST /auth/login': () => [423, { code: 'ACCOUNT_LOCKED', message: 'locked', details: { remainingAttempts: 0 } }] });
    renderSignIn();
    await fill('LFB0412', 'wrong');
    expect(await screen.findByRole('heading', { name: 'Your account is locked' })).toBeInTheDocument();
  });

  it('asks for a one-time code, then signs in', async () => {
    const calls = stubHttp({
      'POST /auth/login': () => [200, { data: { mfaRequired: true, mfaToken: 'm1' } }],
      'POST /auth/mfa/verify': () => [200, { data: session }],
    });
    const store = renderSignIn();
    await fill('LFB0233', 'Sample#2026');
    expect(await screen.findByRole('heading', { name: 'Enter your one-time code' })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Digit 1'));
    await userEvent.paste('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(JSON.parse(calls.at(-1).config.data)).toEqual({ mfaToken: 'm1', code: '123456' });
    expect(store.getState().auth.status).toBe('signedIn');
  });

  it('asks for all six digits', async () => {
    stubHttp({ 'POST /auth/login': () => [200, { data: { mfaRequired: true, mfaToken: 'm1' } }] });
    renderSignIn();
    await fill('LFB0233', 'Sample#2026');
    await screen.findByRole('heading', { name: 'Enter your one-time code' });
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(screen.getByText('Enter all 6 digits.')).toBeInTheDocument();
  });
});
