// D-97: a complete profile does not mean "you can apply" while People and Culture still
// have to verify the date of birth or record the employment record or salary.

import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from './ProfilePage';
import Home from '../home/Home';
import ApplyChoosePage from '../apply/ApplyChoosePage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const BLOCKERS = [
  'Your date of birth (1990-01-01) is waiting for People and Culture to verify it. You can apply once it is verified.',
  'People and Culture must complete your employment record (date joined and employment type) before you can apply.',
  'People and Culture must record your salary before you can apply.',
];
const COMPLETE = { complete: true, done: 18, total: 18, required: [], missing: [] };

const profile = (over = {}) => ({
  staffNo: 'AT901',
  firstName: 'Nuru',
  lastName: 'Mfano',
  personal: { nationality: 'Tanzania', mobile: '+255712345678', nida: '19900101-13140-00004-20', maritalStatus: 'Single' },
  workPhone: '',
  bank: {},
  nextOfKin: [],
  existingLfbLoans: [],
  employment: { title: 'Teller', station: '', category: 'Non-management', probation: { onProbation: false } },
  salary: null,
  route: { key: 'nonmgmt', description: 'Credit Analyst, then Head of HR, then CEO, then OPS disburses', limitedCredit: false },
  completeness: COMPLETE,
  applyBlockers: BLOCKERS,
  ...over,
});

const LOCATIONS = {
  'GET /reference-data/countries': () => [200, { data: { countries: ['Tanzania'], default: 'Tanzania' } }],
  'GET /reference-data/regions': () => [200, { data: [] }],
};

describe('apply blockers (D-97)', () => {
  it('saving a complete profile does not say "you can now apply" while People and Culture still have work to do', async () => {
    stubHttp({ 'GET /me/profile': () => [200, { data: profile() }], 'PATCH /me/profile/personal': () => [200, { data: profile() }], ...LOCATIONS });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('You cannot apply for a loan yet')).toBeInTheDocument();
    BLOCKERS.forEach((b) => expect(screen.getByText(b)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Save personal details' }));
    expect(await screen.findByText('Profile complete.')).toBeInTheDocument();
    expect(screen.queryByText('Profile complete. You can now apply for a loan.')).toBeNull();
  });

  it('says "you can now apply" once nothing is in the way', async () => {
    stubHttp({ 'GET /me/profile': () => [200, { data: profile({ applyBlockers: [] }) }], 'PATCH /me/profile/personal': () => [200, { data: profile({ applyBlockers: [] }) }], ...LOCATIONS });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    await userEvent.click(await screen.findByRole('button', { name: 'Save personal details' }));
    expect(await screen.findByText('Profile complete. You can now apply for a loan.')).toBeInTheDocument();
    expect(screen.queryByText('You cannot apply for a loan yet')).toBeNull();
  });

  it('Home and Apply show the reasons before any product is chosen', async () => {
    const elig = { profile: COMPLETE, products: [{ productId: 'pl', name: 'Personal Loan', canApply: false, reasons: [BLOCKERS[2]] }], blockers: [BLOCKERS[2]] };
    stubHttp({
      'GET /me/eligibility': () => [200, { data: elig }],
      'GET /applications': () => [200, { data: [] }],
      'GET /products': () => [200, { data: [{ id: 'pl', name: 'Personal Loan', description: '', minAmount: 500000, maxAmount: 300000000, minTenor: 6, maxTenor: 60 }] }],
    });
    const home = renderAt('/', '/', <Home />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('You cannot apply for a loan yet')).toBeInTheDocument();
    expect(screen.getAllByText(BLOCKERS[2]).length).toBeGreaterThan(0);
    home.unmount();

    renderAt('/apply', '/apply', <ApplyChoosePage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('You cannot apply for a loan yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personal Loan/ })).toBeDisabled();
  });
});
