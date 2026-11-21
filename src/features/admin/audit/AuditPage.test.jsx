import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditPage from './AuditPage';
import { actionName } from '../../../lib/auditActions';
import { renderAt } from '../../../test/render';
import { stubHttp } from '../../../test/http';

const entries = [
  { _id: 'a1', at: '2026-11-21T08:00:00Z', actorStaffNo: 'LFB0233', actorName: 'Juma Kassim', action: 'auth.login', description: 'Password sign-in', status: 'success' },
  { _id: 'a2', at: '2026-11-21T08:05:00Z', actorStaffNo: 'LFB0233', actorName: 'Juma Kassim', action: 'auth.token_refresh', description: 'Token renewed', status: 'success' },
  { _id: 'a3', at: '2026-11-21T08:06:00Z', actorStaffNo: null, action: 'security.invalid_jwt', description: 'Bad token', status: 'failed' },
];

const open = () => {
  const calls = stubHttp({
    'GET /audit': () => [200, { data: { items: entries, total: entries.length, page: 1, limit: 50 } }],
    'GET /audit/people': () => [200, { data: [{ staffNo: 'LFB0233', name: 'Juma Kassim' }] }],
  });
  renderAt('/admin/audit', '/admin/audit', <AuditPage />, { permissions: ['audit.view'] });
  return calls;
};
const lastList = (calls) => calls.filter((c) => c.key === 'GET /audit').at(-1).config.params;

describe('action names', () => {
  it('uses plain names, by exact code or by family', () => {
    expect(actionName('auth.login')).toBe('Signed in');
    expect(actionName('review.approve')).toBe('Decision recorded');
    expect(actionName('profile.contact')).toBe('Profile changed');
    expect(actionName('something.new')).toBe('something.new');
  });
});

describe('Audit log', () => {
  it('shows every entry by default, with names and plain actions', async () => {
    const calls = open();
    const table = await screen.findByRole('table', { name: 'Audit log' });
    await within(table).findAllByText('Juma Kassim (LFB0233)');
    expect(within(table).getByText('Signed in')).toBeInTheDocument();
    expect(within(table).getByText('Session refreshed')).toBeInTheDocument();
    expect(within(table).getByText('Security warning')).toBeInTheDocument();
    expect(within(table).queryByText('auth.login')).toBeNull();
    expect(lastList(calls).action).toBeUndefined();
  });

  it('filters by person and action type', async () => {
    const calls = open();
    await screen.findByRole('table', { name: 'Audit log' });
    await userEvent.type(screen.getByRole('combobox', { name: 'Person' }), 'Juma');
    await userEvent.click(await screen.findByRole('option', { name: 'Juma Kassim (LFB0233)' }));
    await waitFor(() => expect(lastList(calls).actor).toBe('LFB0233'));
    await userEvent.click(screen.getByRole('combobox', { name: 'Action' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Decision recorded' }));
    await waitFor(() => expect(lastList(calls).action).toBe('review.approve,review.return,review.reject'));
  });
});
