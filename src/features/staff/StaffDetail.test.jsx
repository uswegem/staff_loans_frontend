import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import StaffDetailPage, { NewStaffPage } from './StaffDetailPage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

// D-100: no salary records; probation end and retirement date are worked out, never entered.
const record = (over = {}) => ({
  id: 's1',
  staffNo: 'LFB0412',
  fullName: 'Neema Mushi',
  firstName: 'Neema',
  lastName: 'Mushi',
  title: 'Customer Service Officer',
  department: 'Branch Network',
  station: 'Mwanza Branch',
  stationHead: null,
  lineManager: null,
  category: 'Non-management',
  employmentType: 'Permanent',
  dateJoined: '2019-03-04',
  contractEndDate: null,
  status: 'active',
  probation: { onProbation: false, endsOn: '2019-09-04', months: 6 },
  retirement: { date: '2049-07-12', age: 60 },
  profile: { completeness: { complete: true, done: 13, total: 13, missing: [] }, personal: { nida: '19890712-14112-00004-21', mobile: '+255713448902' }, bank: { accountNo: '4010 2283 1170' } },
  signIn: null,
  ...over,
});
const DOB = { verified: '1989-07-12', pending: null, lastRejection: null };

describe('staff details (D-100)', () => {
  it('shows the probation end and retirement date read-only, and no salary', async () => {
    stubHttp({ 'GET /staff/s1': () => [200, { data: record() }], 'GET /staff/s1/date-of-birth': () => [200, { data: DOB }] });
    renderAt('/staff/s1', '/staff/:id', <StaffDetailPage />, { permissions: ['staff.manage', 'staff.view'] });
    expect(await screen.findByText('Worked out')).toBeInTheDocument();
    expect(screen.getByText('4 Sep 2019')).toBeInTheDocument();
    expect(screen.getByText('Date joined + 6 months')).toBeInTheDocument();
    expect(screen.getByText('12 Jul 2049')).toBeInTheDocument();
    expect(screen.getByText('Verified date of birth + 60 years')).toBeInTheDocument();
    expect(screen.queryByText('Salary')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Record a change' })).toBeNull();
    expect(screen.queryByLabelText(/Probation end date/)).toBeNull();
    expect(screen.queryByLabelText(/Retirement/)).toBeNull();
  });

  it('says the retirement date is unavailable without a verified date of birth', async () => {
    stubHttp({ 'GET /staff/s1': () => [200, { data: record({ retirement: { date: null, age: 60 } }) }], 'GET /staff/s1/date-of-birth': () => [200, { data: { verified: null, pending: null, lastRejection: null } }] });
    renderAt('/staff/s1', '/staff/:id', <StaffDetailPage />, { permissions: ['staff.manage', 'staff.view'] });
    expect(await screen.findByText('Not available: no verified date of birth')).toBeInTheDocument();
  });

  it('the new staff form asks for no salary and no probation end date', async () => {
    stubHttp({});
    renderAt('/staff/new', '/staff/new', <NewStaffPage />, { permissions: ['staff.manage'] });
    expect(await screen.findByRole('heading', { name: 'Add a staff member' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Basic salary/)).toBeNull();
    expect(screen.queryByLabelText(/Salary effective from/)).toBeNull();
    expect(screen.queryByLabelText(/Probation end date/)).toBeNull();
    expect(screen.getByLabelText(/Date joined/)).toBeInTheDocument();
  });
});
