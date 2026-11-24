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
    'GET /pricing': () => [200, { data: { interestBps: 600 } }],
    'POST /applications': () => [201, { data: { id: 'a99' } }],
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
    expect(screen.getByRole('radio', { name: /Car Loan/ })).toHaveAttribute('aria-disabled', 'true');
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
    expect(screen.getByRole('radio', { name: /Car Loan/ })).toHaveAttribute('aria-disabled', 'false');
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

describe('Apply: loan cards', () => {
  const personal = { id: 'p-pl', name: 'Staff Personal Loan', description: 'Personal loan', minAmount: 500000, maxAmount: 300000000, minTenor: 6, maxTenor: 120 };
  const two = () => {
    const calls = stubHttp({
      'GET /products': () => [200, { data: [car, personal] }],
      'GET /me/eligibility': () => [200, { data: { ...elig, products: [{ productId: 'p-car', reasons: [] }, { productId: 'p-pl', reasons: [] }] } }],
      'GET /applications': () => [200, { data: [] }],
      'GET /pricing': () => [200, { data: { interestBps: 600 } }],
      'POST /applications': () => [201, { data: { id: 'a99' } }],
    });
    page();
    return calls;
  };

  it('are radios in a group, with the rate, range, tenure and a Select cue', async () => {
    two();
    const group = await screen.findByRole('radiogroup', { name: 'Choose a loan' });
    const cards = within(group).getAllByRole('radio');
    expect(cards).toHaveLength(2);
    cards.forEach((c) => expect(c).toHaveAttribute('aria-checked', 'false'));
    const pl = within(group).getByRole('radio', { name: /Staff Personal Loan/ });
    expect(await within(pl).findByText('6% p.a. • Reducing balance')).toBeInTheDocument();
    expect(within(pl).getByText('Loan Range')).toBeInTheDocument();
    expect(within(pl).getByText('TZS 500,000 – 300,000,000')).toBeInTheDocument();
    expect(within(pl).getByText('6 – 120 months')).toBeInTheDocument();
    expect(within(pl).getByText('Select loan →')).toBeInTheDocument();
    expect(within(pl).queryByText('Personal loan')).toBeNull();
  });

  it('only one card is a tab stop; arrow keys move between cards and Enter chooses one', async () => {
    const calls = two();
    const [first, second] = await screen.findAllByRole('radio');
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(second).toHaveAttribute('aria-checked', 'true');
    const post = calls.find((c) => c.key === 'POST /applications');
    expect(JSON.parse(post.config.data)).toMatchObject({ productId: 'p-pl' });
  });
});
