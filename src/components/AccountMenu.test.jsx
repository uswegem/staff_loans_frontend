import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { PreferencesProvider } from '../i18n';
import { makeStore } from '../store';
import AccountMenu from './AccountMenu';

const roles = (...names) => names.map((name, i) => ({ id: `r${i}`, code: name.toLowerCase().replace(/\W+/g, '_'), name }));

function renderMenu(user, held) {
  const store = makeStore({ auth: { status: 'signedIn', user: { id: 'u1', staffNo: 'LFB0010', mustChangePassword: false, ...user }, roles: held, permissions: [], mfaRequired: true, inactivityTimeoutMin: 15, endedReason: null } });
  render(
    <Provider store={store}>
      <PreferencesProvider>
        <MemoryRouter>
          <AccountMenu />
        </MemoryRouter>
      </PreferencesProvider>
    </Provider>
  );
  return screen.getByRole('button', { name: /Account menu for/ });
}

describe('header shows the job title, not a system role', () => {
  it('shows the HR job title when the only other role differs from it', () => {
    const btn = renderMenu({ fullName: 'Uswege Mwaipyana', title: 'Head of Operations' }, roles('Staff', 'Head of People and Culture'));
    expect(btn).toHaveTextContent('Head of Operations');
    expect(btn).not.toHaveTextContent('Head of People and Culture');
  });

  it('shows the job title for someone holding several roles', () => {
    const btn = renderMenu({ fullName: 'Asha Mfinanga', title: 'Head of Operations' }, roles('Staff', 'OPS', 'Head of People and Culture', 'P&C Manager'));
    expect(btn).toHaveTextContent('Head of Operations');
    for (const r of ['OPS', 'Head of People and Culture', 'P&C Manager']) expect(btn).not.toHaveTextContent(r);
  });

  it('shows the staff number when HR has not recorded a job title', () => {
    const btn = renderMenu({ fullName: 'Neema Mushi', title: '' }, roles('Staff', 'Credit Analyst'));
    expect(btn).toHaveTextContent('LFB0010');
    expect(btn).not.toHaveTextContent('Credit Analyst');
  });
});
