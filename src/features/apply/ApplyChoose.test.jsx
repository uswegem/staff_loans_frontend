import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplyChoosePage from './ApplyChoosePage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const car = { id: 'p-car', name: 'Car Loan', description: 'Loan Facility for Staff to buy cars', minAmount: 500000, maxAmount: 200000000, minTenor: 1, maxTenor: 60 };
const elig = { profile: { complete: true, missing: [] }, blockers: [], products: [{ productId: 'p-car', reasons: [] }] };
const open = { id: 'a11', ref: 'SL-2026-00011', product: 'Car Loan', productId: 'p-car', status: 'pending_credit', statusLabel: 'Pending Credit Review', open: true, withdrawable: true };

function stubs(apps) {
  let mine = apps;
  const calls = stubHttp({
    'GET /products': () => [200, { data: [car] }],
    'GET /me/eligibility': () => [200, { data: elig }],
    'GET /applications': () => [200, { data: mine }],
    'POST /applications/a11/withdraw': () => {
      mine = mine.map((a) => ({ ...a, status: 'withdrawn', open: false, withdrawable: false }));
      return [200, { data: { id: 'a11', status: 'withdrawn' } }];
    },
  });
  return calls;
}

const page = () => renderAt('/apply', '/apply', <ApplyChoosePage />, { permissions: ['loan.apply'] });

describe('Apply: open application of the same product', () => {
  it('names the open application, blocks the product and offers Continue and Withdraw', async () => {
    stubs([open]);
    page();
    const alert = (await screen.findByText('Open Car Loan application SL-2026-00011')).closest('[role="alert"]');
    expect(within(alert).getByText(/Pending Credit Review/)).toBeInTheDocument();
    expect(within(alert).getByRole('link', { name: 'View' })).toHaveAttribute('href', '/applications/a11');
    expect(within(alert).getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Car Loan/ })).toBeDisabled();
  });

  it('withdraws from the dialog without leaving the page, with the reason, then frees the product', async () => {
    const calls = stubs([open]);
    page();
    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Withdraw Car Loan application SL-2026-00011?')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Reason (optional)'), 'Applying for a bigger amount');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Withdraw' }));

    expect(await screen.findByText('SL-2026-00011 is withdrawn. You can apply for Car Loan again.')).toBeInTheDocument();
    const post = calls.find((c) => c.key === 'POST /applications/a11/withdraw');
    expect(JSON.parse(post.config.data)).toEqual({ reason: 'Applying for a bigger amount' });
    expect(screen.queryByText('Open Car Loan application SL-2026-00011')).toBeNull();
    expect(screen.getByRole('button', { name: /Car Loan/ })).toBeEnabled();
  });

  it('Keep it closes the dialog and withdraws nothing', async () => {
    const calls = stubs([open]);
    page();
    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(calls.some((c) => c.key.startsWith('POST'))).toBe(false);
    expect(screen.getByText('Open Car Loan application SL-2026-00011')).toBeInTheDocument();
  });

  it('a draft continues in the wizard and explains no agreement is voided', async () => {
    stubs([{ ...open, status: 'draft', statusLabel: 'Draft' }]);
    page();
    expect(await screen.findByRole('link', { name: 'Continue it' })).toHaveAttribute('href', '/apply/a11');
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(screen.getByText('The draft closes and is not sent for review. You can apply again straight away.')).toBeInTheDocument();
  });

  it('an application waiting for disbursement cannot be withdrawn here', async () => {
    stubs([{ ...open, status: 'pending_disbursement', statusLabel: 'Approved, awaiting disbursement', withdrawable: false }]);
    page();
    expect(await screen.findByText(/It can no longer be withdrawn/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
  });
});
