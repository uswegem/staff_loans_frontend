// D-93: validation follows what is typed; the address is Region → District → Ward →
// Street → House/Plot Number with cascading lists; P.O. Box is gone.

import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from './ProfilePage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const REQUIRED = [
  'personal.maritalStatus', 'personal.dob', 'personal.nida', 'personal.nationality', 'personal.mobile',
  'personal.address.region', 'personal.address.district', 'personal.address.ward', 'personal.address.street',
  'bank.bank', 'bank.branch', 'bank.accountName', 'bank.accountNo',
];

const profile = (personal = {}, bank = {}) => ({
  staffNo: 'AT901',
  firstName: 'Nuru',
  lastName: 'Mfano',
  personal: { nationality: 'Tanzanian', mobile: '7123456780', ...personal },
  workPhone: '',
  bank: { bank: 'Letshego Faidika Bank', accountName: 'Nuru Mfano', branch: '', accountNo: '', ...bank },
  nextOfKin: [],
  existingLfbLoans: [],
  employment: { title: 'Teller', station: 'Dodoma Branch', category: 'Non-management', employmentType: 'Permanent', dateJoined: '2026-02-02', retirementDate: '2061-05-20', probation: { onProbation: false } },
  salary: { basic: 1100000 },
  route: { key: 'nonmgmt', description: 'Credit Analyst, then Head of HR, then CEO, then OPS disburses', limitedCredit: false },
  completeness: { complete: false, done: 5, total: 13, required: REQUIRED, missing: [{ key: 'personal.address.region', label: 'Region', tab: 'personal' }] },
});

const LOCATIONS = {
  'GET /reference-data/countries': () => [200, { data: { countries: ['Kenya', 'Tanzania', 'Uganda'], default: 'Tanzania' } }],
  'GET /reference-data/regions': () => [200, { data: ['Dodoma', 'Mwanza'] }],
  'GET /reference-data/regions/Dodoma/districts': () => [200, { data: ['Bahi', 'Dodoma'] }],
  'GET /reference-data/regions/Mwanza/districts': () => [200, { data: ['Ilemela', 'Nyamagana'] }],
  'GET /reference-data/regions/Dodoma/districts/Dodoma/wards': () => [200, { data: ['Chamwino', 'Ipagala'] }],
};

const field = (label) => screen.getByLabelText(label, { exact: false });
const invalid = (el) => el.getAttribute('aria-invalid') === 'true';
const pick = async (label, option) => {
  await userEvent.click(field(label));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};

describe('profile validation (D-93)', () => {
  it('a required field is red while empty and turns normal as soon as a valid value is typed', async () => {
    stubHttp({ 'GET /me/profile': () => [200, { data: profile() }], ...LOCATIONS });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    const nida = await screen.findByLabelText(/NIDA number/);
    expect(invalid(nida)).toBe(true);
    expect(screen.getAllByText('Required to apply.').length).toBeGreaterThan(0);

    await userEvent.type(nida, '1980063013140000');
    expect(nida).toHaveValue('19800630-13140-000');
    expect(invalid(nida)).toBe(true);
    expect(screen.getByText(/Enter the 20-digit NIDA number/)).toBeInTheDocument();

    await userEvent.type(nida, '0420');
    expect(nida).toHaveValue('19800630-13140-00004-20');
    expect(invalid(nida)).toBe(false);
    expect(screen.queryByText(/Enter the 20-digit NIDA number/)).toBeNull();
  });

  it('shows a wrong existing phone number as invalid without changing it, and accepts a pasted 0… number', async () => {
    stubHttp({ 'GET /me/profile': () => [200, { data: profile() }], ...LOCATIONS });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    const mobile = await screen.findByLabelText(/Mobile phone/);
    expect(mobile).toHaveValue('7123456780');
    expect(invalid(mobile)).toBe(true);
    expect(screen.getByText(/Enter nine digits after \+255/)).toBeInTheDocument();

    await userEvent.clear(mobile);
    await userEvent.click(mobile);
    await userEvent.paste('0712345678');
    expect(mobile).toHaveValue('712 345 678');
    expect(invalid(mobile)).toBe(false);
  });

  it('has no P.O. Box; region loads districts, district loads wards, and a new region clears both', async () => {
    const calls = stubHttp({ 'GET /me/profile': () => [200, { data: profile({ residence: 'Area D, Dodoma' }) }], 'PATCH /me/profile/personal': () => [200, { data: profile() }], ...LOCATIONS });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText(/You gave your residence earlier as "Area D, Dodoma"/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/P\.O\. Box/)).toBeNull();
    expect(field('District')).toBeDisabled();

    await pick('Region', 'Dodoma');
    await pick('District', 'Dodoma');
    await pick('Ward', 'Ipagala');
    expect(field('Ward')).toHaveValue('Ipagala');

    await pick('Region', 'Mwanza');
    expect(field('District')).toHaveValue('');
    expect(field('Ward')).toHaveValue('');
    expect(field('Ward')).toBeDisabled();
    expect(calls.some((c) => c.key === 'GET /reference-data/regions/Mwanza/districts')).toBe(true);
  });

  it('House/Plot Number is optional: never red, and the address saves without it', async () => {
    const calls = stubHttp({ 'GET /me/profile': () => [200, { data: profile() }], 'PATCH /me/profile/personal': () => [200, { data: profile() }], ...LOCATIONS });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    const house = await screen.findByLabelText(/House\/Plot Number/);
    expect(invalid(house)).toBe(false);
    const street = field('Street');
    expect(invalid(street)).toBe(true);
    await pick('Region', 'Dodoma');
    await pick('District', 'Dodoma');
    await pick('Ward', 'Chamwino');
    await userEvent.type(street, 'Mtaa wa Uhuru');
    expect(invalid(street)).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Save personal details' }));
    const body = JSON.parse(calls.find((c) => c.key === 'PATCH /me/profile/personal').config.data);
    expect(body.address).toEqual({ region: 'Dodoma', district: 'Dodoma', ward: 'Chamwino', street: 'Mtaa wa Uhuru', house: '' });
    expect(body).not.toHaveProperty('poBox');
    expect(body).not.toHaveProperty('residence');
  });

  it('defaults nationality to Tanzania for a new profile and offers a searchable country list', async () => {
    stubHttp({ 'GET /me/profile': () => [200, { data: { ...profile(), personal: { mobile: '' } } }], ...LOCATIONS });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    const nat = await screen.findByLabelText(/Nationality/);
    expect(nat).toHaveValue('Tanzania');
    await userEvent.clear(nat);
    await userEvent.type(nat, 'ken');
    const list = await screen.findByRole('listbox');
    expect(within(list).getByRole('option', { name: 'Kenya' })).toBeInTheDocument();
    expect(within(list).queryByRole('option', { name: 'Uganda' })).toBeNull();
  });

  it('bank: Branch and Account number turn normal once valid; a wrong account number gets its own message', async () => {
    stubHttp({ 'GET /me/profile': () => [200, { data: profile() }], ...LOCATIONS });
    renderAt('/profile', '/profile', <ProfilePage />, { permissions: ['loan.apply'] });
    await userEvent.click(await screen.findByRole('tab', { name: /Bank details/ }));
    const branch = field('Branch');
    const acct = field('Account number');
    expect(invalid(branch)).toBe(true);
    expect(invalid(acct)).toBe(true);
    await userEvent.type(branch, 'Dodoma');
    await userEvent.type(acct, '12a');
    expect(invalid(branch)).toBe(false);
    expect(screen.getByText('Enter the account number: 6 to 20 digits.')).toBeInTheDocument();
    await userEvent.clear(acct);
    await userEvent.type(acct, '4010 2283 1170');
    expect(invalid(acct)).toBe(false);
    expect(screen.queryByText('Required to apply.')).toBeNull();
  });
});
