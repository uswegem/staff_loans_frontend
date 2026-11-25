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
  const two = (pricing = { interestBps: 600 }, { hold = false } = {}) => {
    const calls = stubHttp({
      'GET /products': () => [200, { data: [car, personal] }],
      'GET /me/eligibility': () => [200, { data: { ...elig, products: [{ productId: 'p-car', reasons: [] }, { productId: 'p-pl', reasons: [] }] } }],
      'GET /applications': () => [200, { data: [] }],
      'GET /pricing': () => [200, { data: pricing }],
      // hold: the request stays open, so the selected card can be checked before navigating.
      'POST /applications': () => (hold ? new Promise(() => {}) : [201, { data: { id: 'a99' } }]),
    });
    page();
    return calls;
  };

  it('show the compact facility card: icon, name, rate pill, five rows and the eligibility note', async () => {
    two({ interestBps: 600, processingFeeBps: 100, processingFeeTopUpBps: 50, insuranceBps: 60 });
    const group = await screen.findByRole('radiogroup', { name: 'Choose a loan' });
    const cards = within(group).getAllByRole('radio');
    expect(cards).toHaveLength(2);
    cards.forEach((c) => expect(c).toHaveAttribute('aria-checked', 'false'));
    const pl = within(group).getByRole('radio', { name: /Staff Personal Loan/ });
    // Name from the product (shown in capitals by style), the right icon, decorative.
    expect(within(pl).getByRole('heading', { name: 'Staff Personal Loan' })).toBeInTheDocument();
    expect(pl.querySelector('svg[data-icon="wallet"]')).toHaveAttribute('aria-hidden', 'true');
    expect(within(group).getByRole('radio', { name: /Car Loan/ }).querySelector('svg[data-icon="car"]')).not.toBeNull();
    // The rate pill under the name, with the method.
    expect(await within(pl).findByText('6% p.a.')).toBeInTheDocument();
    expect(within(pl).getByText('(Reducing Balance)')).toBeInTheDocument();
    // Five rows, in order.
    const rows = [...pl.querySelectorAll('dl > div')].map((d) => [d.querySelector('dt').textContent, d.querySelector('dd').textContent]);
    expect(rows).toEqual([
      ['Maximum Amount', 'TZS 300,000,000'],
      ['Minimum Amount', 'TZS 500,000'],
      ['Term (Months)', '6–120'],
      ['Processing Fee', '1%'],
      ['Insurance', '0.6% p.a.'],
    ]);
    expect(within(pl).getByText('Your maximum eligibility is calculated after payslip upload.')).toBeInTheDocument();
    // Nothing old or duplicated: no description, subheading, separate rate or tenure rows, cue.
    expect(within(pl).queryByText('Personal loan')).toBeNull();
    expect(within(pl).queryByText(/financing facility/i)).toBeNull();
    expect(within(pl).queryByText('Interest Rate')).toBeNull();
    expect(within(pl).queryByText(/Tenure|Loan Range|Select loan/)).toBeNull();
    expect(within(pl).getAllByText(/^6% p\.a\.$/)).toHaveLength(1);
    // The helper under the grid stays.
    expect(screen.getByText('Your own maximum is worked out from the payslip you attach on the next step.')).toBeInTheDocument();
  });

  it('leave out what is not configured, and show configured zeros', async () => {
    two({ interestBps: 600, processingFeeBps: 0 });
    const pl = await screen.findByRole('radio', { name: /Staff Personal Loan/ });
    await within(pl).findByText('6% p.a.');
    const labels = [...pl.querySelectorAll('dt')].map((d) => d.textContent);
    expect(labels).toEqual(['Maximum Amount', 'Minimum Amount', 'Term (Months)', 'Processing Fee']);
    expect(within(pl).getByText('0%')).toBeInTheDocument();
    expect(pl.textContent).not.toMatch(/undefined|null|NaN/);
  });

  it('still show the cards when the pricing cannot be loaded, without a rate', async () => {
    stubHttp({
      'GET /products': () => [200, { data: [personal] }],
      'GET /me/eligibility': () => [200, { data: { ...elig, products: [{ productId: 'p-pl', reasons: [] }] } }],
      'GET /applications': () => [200, { data: [] }],
      'GET /pricing': () => [404, { message: 'No pricing is in force.' }],
    });
    page();
    const pl = await screen.findByRole('radio', { name: /Staff Personal Loan/ });
    expect(within(pl).queryByText(/p\.a\./)).toBeNull();
    expect([...pl.querySelectorAll('dt')].map((d) => d.textContent)).toEqual(['Maximum Amount', 'Minimum Amount', 'Term (Months)']);
    expect(pl.textContent).not.toMatch(/undefined|null|NaN/);
  });

  it('one card at a time: choosing a card marks it selected and starts the application', async () => {
    const calls = two(undefined, { hold: true });
    const pl = await screen.findByRole('radio', { name: /Staff Personal Loan/ });
    const car2 = screen.getByRole('radio', { name: /Car Loan/ });
    await userEvent.click(pl);
    expect(pl).toHaveAttribute('aria-checked', 'true');
    expect(car2).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(pl).toHaveAttribute('aria-busy', 'true');
    expect(pl.querySelector('svg[data-icon]')).not.toBeNull();
    // While it starts, no other card can be chosen.
    expect(car2).toHaveAttribute('aria-disabled', 'true');
    expect(JSON.parse(calls.find((c) => c.key === 'POST /applications').config.data)).toEqual({ productId: 'p-pl' });
  });

  it('keeps the loading, empty and error states', async () => {
    stubHttp({
      'GET /products': () => new Promise(() => {}),
      'GET /me/eligibility': () => [200, { data: elig }],
      'GET /applications': () => [200, { data: [] }],
      'GET /pricing': () => [200, { data: { interestBps: 600 } }],
    });
    const { unmount } = page();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    unmount();

    stubHttp({
      'GET /products': () => [200, { data: [] }],
      'GET /me/eligibility': () => [200, { data: { ...elig, products: [] } }],
      'GET /applications': () => [200, { data: [] }],
      'GET /pricing': () => [200, { data: { interestBps: 600 } }],
    });
    const empty = page();
    const group = await screen.findByRole('radiogroup', { name: 'Choose a loan' });
    expect(within(group).queryAllByRole('radio')).toHaveLength(0);
    empty.unmount();

    stubHttp({
      'GET /products': () => [500, { message: 'The service is not available.' }],
      'GET /me/eligibility': () => [200, { data: elig }],
      'GET /applications': () => [200, { data: [] }],
      'GET /pricing': () => [200, { data: { interestBps: 600 } }],
    });
    page();
    expect(await screen.findByRole('alert')).toHaveTextContent('The service is not available.');
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
