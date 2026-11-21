import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersPage, { generatePassword } from './UsersPage';
import { renderAt } from '../../../test/render';
import { stubHttp } from '../../../test/http';

const user = { id: 'u1', fullName: 'Juma Kassim', staffNo: 'LFB0233', title: 'Analyst', status: 'active', lastLoginAt: null, assignments: [], permissions: ['a', 'b'], mfa: { required: true, enabled: true } };

const open = (path = '/admin/users', { mfaEnabled = false } = {}) => {
  const calls = stubHttp({
    'GET /users': () => [200, { data: { items: [user], total: 1, page: 1, limit: 25, mfaEnabled } }],
    'GET /roles': () => [200, { data: [] }],
    'GET /permissions': () => [200, { data: [] }],
    'GET /users/candidates': () => [200, { data: [{ staffNo: 'LFB0300', name: 'Neema Said', station: 'Head Office' }] }],
    'POST /users': (config) => [201, { data: { ...user, fullName: 'Neema Said', staffNo: JSON.parse(config.data).staffNo } }],
  });
  renderAt(path, '/admin/users', <UsersPage />, { permissions: ['admin.users'] });
  return calls;
};

describe('generatePassword', () => {
  it('meets the policy: 12 characters with lower case, capitals, numbers and a symbol', () => {
    for (let i = 0; i < 50; i += 1) {
      const p = generatePassword();
      expect(p).toHaveLength(12);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[^a-zA-Z0-9]/);
    }
  });
});

describe('Users and roles', () => {
  it('hides MFA while one-time codes are off, and has no Permissions column or duplicate roles button', async () => {
    open();
    await screen.findByText('Juma Kassim');
    const table = screen.getByRole('table', { name: 'Users' });
    expect(within(table).queryByRole('columnheader', { name: 'MFA' })).toBeNull();
    expect(within(table).queryByRole('columnheader', { name: 'Permissions' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Roles and permissions' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for Juma Kassim' }));
    expect(screen.queryByRole('menuitem', { name: 'Reset MFA' })).toBeNull();
  });

  it('shows MFA when it is switched on', async () => {
    open('/admin/users', { mfaEnabled: true });
    await screen.findByText('Juma Kassim');
    expect(screen.getByRole('columnheader', { name: 'MFA' })).toBeInTheDocument();
  });

  it('opens on ?status=locked and filters by status chips', async () => {
    const calls = open('/admin/users?status=locked');
    await screen.findByText('Juma Kassim');
    await waitFor(() => expect(calls.filter((c) => c.key === 'GET /users').at(-1).config.params.status).toBe('locked'));
    expect(screen.getByRole('button', { name: 'Locked' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => expect(calls.filter((c) => c.key === 'GET /users').at(-1).config.params.status).toBeUndefined());
  });

  it('Add user picks a staff record without a sign-in and can generate a password', async () => {
    const calls = open();
    await screen.findByText('Juma Kassim');
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('combobox', { name: /Staff member/ }), 'Nee');
    await userEvent.click(await screen.findByRole('option', { name: /Neema Said/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Generate' }));
    const password = within(dialog).getByLabelText(/Temporary password/);
    expect(password.value).toHaveLength(12);
    await userEvent.click(within(dialog).getByRole('button', { name: /^(Create|Add|Save)/ }));
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /users')).toBe(true));
    const body = JSON.parse(calls.find((c) => c.key === 'POST /users').config.data);
    expect(body).toMatchObject({ staffNo: 'LFB0300', temporaryPassword: password.value });
  });
});
