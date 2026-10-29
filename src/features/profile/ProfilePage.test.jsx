import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from './ProfilePage';
import Home from '../home/Home';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const missing = [
  { key: 'personal.maritalStatus', label: 'Marital status', tab: 'personal' },
  { key: 'personal.nida', label: 'NIDA number', tab: 'personal' },
  { key: 'bank.accountNo', label: 'Account number', tab: 'bank' },
];

const profile = (over = {}) => ({
  staffNo: 'LFB0596',
  fullName: 'Rehema Ally',
  personal: { nationality: 'Tanzanian', mobile: '+255 744 812 035' },
  workPhone: '',
  bank: { bank: 'Letshego Faidika Bank', branch: 'Dodoma', accountName: 'Rehema Ally', accountNo: '' },
  nextOfKin: [],
  deductions: { medical: 0, other: 0 },
  otherLoans: [],
  existingLfbLoans: [],
  payDeclaredAt: null,
  employment: { title: 'Teller', station: 'Dodoma Branch', category: 'Non-management', employmentType: 'Permanent', dateJoined: '2026-02-02', retirementDate: '2061-05-20', probation: { onProbation: true, endsOn: '2026-08-02' } },
  salary: { basic: 1100000, allowances: 120000 },
  route: { key: 'nonmgmt', description: 'Credit Analyst, then Head of HR, then CEO, then OPS disburses', limitedCredit: false },
  completeness: { complete: false, done: 13, total: 16, missing },
  ...over,
});

describe('My profile (decision 7, FR-05)', () => {
  it('shows what is missing and counts it per tab', async () => {
    stubHttp({ 'GET /me/profile': () => [200, { data: profile() }] });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('You can apply once your profile is complete')).toBeInTheDocument();
    expect(screen.getByText('Missing: Marital status, NIDA number, Account number.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '13 of 16 required details' })).toHaveAttribute('aria-valuenow', '13');
  });

  it('shows the server message next to a bad NIDA number', async () => {
    stubHttp({
      'GET /me/profile': () => [200, { data: profile() }],
      'PATCH /me/profile/personal': () => [400, { code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.', details: { nida: ['A NIDA number has 20 digits, for example 19890712-14112-00004-21.'] } }],
    });
    renderAt('/profile', '/profile', <ProfilePage />);
    await userEvent.type(await screen.findByLabelText(/NIDA number/), '1998052041108');
    await userEvent.click(screen.getByRole('button', { name: 'Save personal details' }));
    expect(await screen.findByText('A NIDA number has 20 digits, for example 19890712-14112-00004-21.')).toBeInTheDocument();
  });

  it('after saving, moves to the next tab with missing details', async () => {
    const calls = stubHttp({
      'GET /me/profile': () => [200, { data: profile() }],
      'PATCH /me/profile/personal': () => [200, { data: profile({ completeness: { complete: false, done: 15, total: 16, missing: [missing[2]] } }) }],
    });
    renderAt('/profile', '/profile', <ProfilePage />);
    await userEvent.type(await screen.findByLabelText(/NIDA number/), '19980520-41108-00031-26');
    await userEvent.click(screen.getByRole('button', { name: 'Save personal details' }));
    expect(await screen.findByRole('button', { name: 'Save bank details' })).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key === 'PATCH /me/profile/personal').config.data).nida).toBe('19980520-41108-00031-26');
  });

  it('pay needs the confirmation tick', async () => {
    const calls = stubHttp({ 'GET /me/profile': () => [200, { data: profile() }], 'GET /products': () => [200, { data: [] }] });
    renderAt('/profile', '/profile', <ProfilePage />);
    await userEvent.click(await screen.findByRole('tab', { name: /Pay and deductions/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save pay and deductions' }));
    expect(screen.getByText('Tick the confirmation to save.')).toHaveAttribute('role', 'alert');
    expect(calls.some((c) => c.key === 'PATCH /me/profile/pay')).toBe(false);
  });
});

describe('Home eligibility (NS-03)', () => {
  it('shows the days before a top-up', async () => {
    stubHttp({
      'GET /me/eligibility': () => [
        200,
        {
          data: {
            profile: { complete: true, done: 16, total: 16, missing: [] },
            products: [
              { productId: 'pl', name: 'Personal Loan', topUpAllowed: true, canApply: false, daysRemaining: 35, nextEligibleDate: '2026-12-03', lastAppliedAt: '2026-06-03', reasons: ['You applied for a Personal Loan on 3 Jun 2026. You can apply for this product again from 3 Dec 2026 (35 days).'] },
              { productId: 'vl', name: 'Vehicle Loan', topUpAllowed: false, canApply: true, daysRemaining: 0, reasons: [] },
            ],
          },
        },
      ],
    });
    renderAt('/', '/', <Home />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('You can apply for a top-up in 35 days (from 3 Dec 2026).')).toBeInTheDocument();
    expect(screen.getByText('In 35 days')).toBeInTheDocument();
    expect(screen.getByText('You can apply')).toBeInTheDocument();
  });
});
