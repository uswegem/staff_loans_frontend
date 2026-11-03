import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DobVerificationsPage from './DobVerificationsPage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const row = (over = {}) => ({
  id: 'c1',
  staff: { id: 's1', staffNo: 'AT412', name: 'Neema Mushi', title: 'Customer Service Officer' },
  current: '1989-07-12',
  proposed: '1990-01-10',
  submittedBy: 'Neema Mushi',
  submittedById: 'u-neema',
  submittedAt: '2026-11-01T08:00:00Z',
  status: 'pending',
  ...over,
});

describe('date of birth verifications (D-82)', () => {
  it('lists pending changes and approves one', async () => {
    const calls = stubHttp({
      'GET /dob-verifications': () => [200, { data: { items: [row()] } }],
      'POST /dob-verifications/c1/approve': () => [200, { message: 'Date of birth 1990-01-10 verified.' }],
    });
    renderAt('/staff/dob-verifications', '/staff/dob-verifications', <DobVerificationsPage />, { permissions: ['staff.verifyDob'] });
    const r = (await screen.findByText(/^AT412/)).closest('tr');
    expect(within(r).getByText('12 Jul 1989')).toBeInTheDocument();
    expect(within(r).getByText('10 Jan 1990')).toBeInTheDocument();
    await userEvent.click(within(r).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Neema Mushi: Date of birth 1990-01-10 verified.')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /dob-verifications/c1/approve')).toBe(true);
  });

  it('a rejection needs a reason', async () => {
    const calls = stubHttp({
      'GET /dob-verifications': () => [200, { data: { items: [row()] } }],
      'POST /dob-verifications/c1/reject': () => [200, { message: 'Change rejected.' }],
    });
    renderAt('/staff/dob-verifications', '/staff/dob-verifications', <DobVerificationsPage />, { permissions: ['staff.verifyDob'] });
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(within(dialog).getByText('Give a reason for the rejection.')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /dob-verifications/c1/reject')).toBe(false);
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Does not match the NIDA card.');
    expect(within(dialog).queryByText('Give a reason for the rejection.')).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('Neema Mushi: proposed date of birth rejected.')).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key === 'POST /dob-verifications/c1/reject').config.data)).toEqual({ reason: 'Does not match the NIDA card.' });
  });

  it('offers no decision on a change the verifier submitted', async () => {
    stubHttp({ 'GET /dob-verifications': () => [200, { data: { items: [row({ submittedById: 'me' })] } }] });
    renderAt('/staff/dob-verifications', '/staff/dob-verifications', <DobVerificationsPage />, { permissions: ['staff.verifyDob'], userId: 'me' });
    expect(await screen.findByText('You submitted this; another verifier decides it.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  });
});
