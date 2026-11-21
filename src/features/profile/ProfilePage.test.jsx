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
    // One line with a link to the first tab with gaps; the tab badges say where the rest are.
    expect(await screen.findByText(/^3 details left\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Personal details' })).toBeInTheDocument();
    expect(screen.queryByText(/^Missing:/)).toBeNull();
    expect(screen.getByRole('tab', { name: /Personal details\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Bank details\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '13 of 16 required details' })).toHaveAttribute('aria-valuenow', '13');
  });

  it('shows the server message next to a bad NIDA number', async () => {
    stubHttp({
      'GET /me/profile': () => [200, { data: profile() }],
      'PATCH /me/profile/personal': () => [400, { code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.', details: { nida: ['A NIDA number has 20 digits, for example 19890712-14112-00004-21.'] } }],
    });
    renderAt('/profile', '/profile', <ProfilePage />);
    await userEvent.type(await screen.findByLabelText(/NIDA number/), '1998052041108');
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText('A NIDA number has 20 digits, for example 19890712-14112-00004-21.')).toBeInTheDocument();
  });

  it('after saving, moves to the next tab with missing details', async () => {
    const calls = stubHttp({
      'GET /me/profile': () => [200, { data: profile() }],
      'PATCH /me/profile/personal': () => [200, { data: profile({ completeness: { complete: false, done: 15, total: 16, missing: [missing[2]] } }) }],
    });
    renderAt('/profile', '/profile', <ProfilePage />);
    await userEvent.type(await screen.findByLabelText(/NIDA number/), '19980520-41108-00031-26');
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByRole('button', { name: 'Save and continue' })).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key === 'PATCH /me/profile/personal').config.data).nida).toBe('19980520-41108-00031-26');
  });

  it('a new date of birth waits for People and Culture; the verified one stays in use (D-82)', async () => {
    const dateOfBirth = { verified: '1989-07-12', verifiedAt: '2026-10-01T08:00:00Z', verifiedBy: 'Grace Mollel', pending: { id: 'c1', proposed: '1990-01-10', submittedAt: '2026-11-01T08:00:00Z', submittedBy: 'Asha Mfinanga', submittedById: 'u-test' }, lastRejection: null };
    const calls = stubHttp({ 'GET /me/profile': () => [200, { data: profile({ dateOfBirth }) }], 'POST /dob-verifications/c1/withdraw': () => [200, {}] });
    renderAt('/profile', '/profile', <ProfilePage />);
    expect(await screen.findByText('Waiting for People and Culture')).toBeInTheDocument();
    expect(screen.getByText('12 Jul 1989')).toBeInTheDocument();
    expect(screen.getByText(/The verified date above stays in use until it is approved./)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of birth/)).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    expect(calls.some((c) => c.key === 'POST /dob-verifications/c1/withdraw')).toBe(true);
  });

  it('keeps only existing staff loans: the limit comes from the payslip (D-80)', async () => {
    const calls = stubHttp({ 'GET /me/profile': () => [200, { data: profile() }], 'GET /products': () => [200, { data: [] }], 'PATCH /me/profile/pay': () => [200, { data: profile() }] });
    renderAt('/profile', '/profile', <ProfilePage />);
    await userEvent.click(await screen.findByRole('tab', { name: /Pay and staff loans/ }));
    expect(screen.queryByLabelText('Medical aid')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    // Save appears once something has changed.
    expect(screen.queryByRole('button', { name: 'Save existing staff loans' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Add a staff loan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save existing staff loans' }));
    expect(JSON.parse(calls.find((c) => c.key === 'PATCH /me/profile/pay').config.data)).toEqual({ existingLfbLoans: [{ description: 'Staff loan (paper)', instalment: null, productId: null, disbursedOn: null }] });
  });
});

describe('unsaved changes', () => {
  it('switching tab with unsaved input asks first; Stay keeps it, Discard drops it', async () => {
    const calls = stubHttp({ 'GET /me/profile': () => [200, { data: profile() }] });
    renderAt('/profile', '/profile', <ProfilePage />);
    const nida = await screen.findByLabelText(/NIDA number/);
    await userEvent.type(nida, '19980520');
    await userEvent.click(screen.getByRole('tab', { name: /Bank details/ }));
    expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toHaveTextContent('You have unsaved changes in Personal details. Save them first?');
    await userEvent.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.getByLabelText(/NIDA number/)).toHaveValue('19980520');
    await userEvent.click(screen.getByRole('tab', { name: /Bank details/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(await screen.findByLabelText(/Account number/)).toBeInTheDocument();
    expect(calls.some((c) => c.key.startsWith('PATCH'))).toBe(false);
  });

  it('Save in the dialog saves the tab, then opens the tab asked for', async () => {
    const calls = stubHttp({
      'GET /me/profile': () => [200, { data: profile() }],
      'PATCH /me/profile/personal': () => [200, { data: profile() }],
    });
    renderAt('/profile', '/profile', <ProfilePage />);
    await userEvent.type(await screen.findByLabelText(/NIDA number/), '19980520-41108-00031-26');
    await userEvent.click(screen.getByRole('tab', { name: /Next of kin/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByLabelText(/Relationship/)).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key === 'PATCH /me/profile/personal').config.data).nida).toBe('19980520-41108-00031-26');
  });

  it('starts the bank details from the LFB account and their name', async () => {
    stubHttp({ 'GET /me/profile': () => [200, { data: profile({ firstName: 'Rehema', lastName: 'Ally', bank: { bank: '', branch: '', accountName: '', accountNo: '' } }) }] });
    renderAt('/profile', '/profile', <ProfilePage />);
    await userEvent.click(await screen.findByRole('tab', { name: /Bank details/ }));
    expect(screen.getByLabelText(/^Bank/)).toHaveValue('Letshego Faidika Bank');
    expect(screen.getByLabelText(/Account name/)).toHaveValue('Rehema Ally');
    expect(screen.queryByText(/Your LFB account is filled in for you/)).toBeNull();
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
    // A product open to them offers Apply straight away (it starts the application).
    expect(screen.getByRole('button', { name: 'Apply for Vehicle Loan' })).toBeInTheDocument();
  });
});
