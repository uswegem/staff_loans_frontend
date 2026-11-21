import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './Home';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const product = (over = {}) => ({ productId: 'vl', name: 'Vehicle Loan', topUpAllowed: false, canApply: true, daysRemaining: 0, reasons: [], openApplication: null, ...over });
const eligibility = (products, profile = { complete: true, done: 18, total: 18, missing: [] }) => ({ profile, products, blockers: [] });

const open = (data, routes = {}) => {
  const calls = stubHttp({ 'GET /me/eligibility': () => [200, { data }], 'GET /applications': () => [200, { data: [] }], ...routes });
  renderAt('/', '/', <Home />, { permissions: ['loan.apply'] });
  return calls;
};

describe('Home: loans you can apply for', () => {
  it('a product with an open application links to it instead of saying "You can apply"', async () => {
    open(eligibility([
      product({ productId: 'pl', name: 'Personal Loan', canApply: false, openApplication: { id: 'a27', ref: 'SL-2026-00027', status: 'returned' }, reasons: ['You already have an open Personal Loan application (SL-2026-00027). Finish or withdraw it first.'] }),
      product(),
    ]));
    const link = await screen.findByRole('link', { name: 'Open: SL-2026-00027' });
    expect(link).toHaveAttribute('href', '/apply/a27');
    expect(screen.queryByText(/You already have an open Personal Loan application/)).toBeNull();
    expect(screen.queryByText('You can apply')).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Details' })).toBeNull();
  });

  it('Apply starts that product straight away', async () => {
    const calls = open(eligibility([product()]), { 'POST /applications': () => [201, { data: { id: 'new1' } }] });
    await userEvent.click(await screen.findByRole('button', { name: 'Apply for Vehicle Loan' }));
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument(); // navigated to /apply/new1
    expect(JSON.parse(calls.find((c) => c.key === 'POST /applications').config.data)).toEqual({ productId: 'vl' });
  });

  it('while the profile is incomplete: one line, no repeated row per product, no profile card when complete', async () => {
    open(eligibility([product({ canApply: false, reasons: ['Add your date of birth'] }), product({ productId: 'pl', name: 'Personal Loan', canApply: false, reasons: ['Add your date of birth'] })], { complete: false, done: 2, total: 18, missing: [{ key: 'personal.dob', label: 'Date of birth' }] }));
    expect(await screen.findByText('You can apply once your profile is complete and People and Culture have verified your date of birth.')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Loans you can apply for' })).toBeNull();
    expect(screen.queryByText(/^Missing:/)).toBeNull();
  });

  it('hides the profile card once the profile is complete', async () => {
    open(eligibility([product()]));
    await screen.findByRole('table', { name: 'Loans you can apply for' });
    expect(screen.queryByRole('heading', { name: 'My profile' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Your access' })).toBeNull();
  });
});
