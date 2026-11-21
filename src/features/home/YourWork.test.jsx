import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import YourWork from './YourWork';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

describe('Your work on Home', () => {
  it("a reviewer sees what is waiting, with the overdue count, linked to the queue", async () => {
    stubHttp({ 'GET /queue': () => [200, { data: { counts: { waiting: 3, overdue: 1 }, items: [] } }] });
    renderAt('/', '/', <YourWork />, { permissions: ['review.credit'] });
    const link = await screen.findByRole('link', { name: '3 applications waiting for you' });
    expect(link).toHaveAttribute('href', '/queue');
    expect(screen.getByText(/1 overdue/)).toBeInTheDocument();
  });

  it('Operations, People and Culture, product checkers and administrators each see their own line', async () => {
    stubHttp({
      'GET /disbursements': () => [200, { data: { counts: { ready: 1 }, items: [] } }],
      'GET /dob-verifications': () => [200, { data: { items: [{ id: 'd1' }, { id: 'd2' }] } }],
      'GET /admin/products': () => [200, { data: [{ id: 'p1', openChange: { canCheck: true } }, { id: 'p2', openChange: { canCheck: false } }] }],
      'GET /admin/pricing': () => [200, { data: { openChange: null } }],
      'GET /users': () => [200, { data: { items: [], total: 1 } }],
    });
    renderAt('/', '/', <YourWork />, { permissions: ['disb.confirm', 'staff.verifyDob', 'products.approveCredit', 'admin.users'] });
    expect(await screen.findByRole('link', { name: '1 loan ready to disburse' })).toHaveAttribute('href', '/disburse');
    expect(screen.getByRole('link', { name: '2 dates of birth to verify' })).toHaveAttribute('href', '/staff/dob-verifications');
    expect(screen.getByRole('link', { name: '1 product change waiting for your approval' })).toHaveAttribute('href', '/admin/products');
    expect(screen.getByRole('link', { name: '1 account locked' })).toHaveAttribute('href', '/admin/users?status=locked');
  });

  it('shows nothing when nothing is waiting or the person holds no such role', async () => {
    stubHttp({ 'GET /queue': () => [200, { data: { counts: { waiting: 0, overdue: 0 }, items: [] } }] });
    const { container } = renderAt('/', '/', <YourWork />, { permissions: ['review.credit'] });
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toBe('');
  });
});
