import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VersionPage from './VersionPage';
import { formatCompareValue } from './compareFormat';
import { renderAt } from '../../../test/render';
import { stubHttp } from '../../../test/http';

const baseValues = {
  name: 'Personal Loan',
  description: '',
  minAmount: 500000,
  maxAmount: 300000000,
  minTenor: 6,
  maxTenor: 72,
  minServiceMonths: 6,
  maxConcurrent: 1,
  reapplyCoolingMonths: 6,
  topUpAllowed: true,
  contractStaffAllowed: false,
  eligibleCategories: ['Management', 'Non-management'],
  repaymentMethods: ['payroll', 'account'],
  requiredDocuments: [],
  optionalDocuments: ['Latest salary slip'],
  fields: [],
  disbursementConditions: [],
  agreementTemplateId: null,
};

const version = (over = {}) => ({
  id: 'v2',
  version: 2,
  state: 'pending_approval',
  changeType: 'change',
  effectiveFrom: '2026-11-02',
  liveFrom: null,
  note: 'Policy allows 72 months.',
  maker: { name: 'Peter Lyimo' },
  editors: [{ name: 'Peter Lyimo' }],
  checker: null,
  values: baseValues,
  product: { id: 'p1', code: 'PL', status: 'active' },
  comparison: { liveVersion: { version: 1, liveFrom: '2026-10-01T00:00:00Z' }, scheduledVersion: null, changes: [{ field: 'maxTenor', label: 'Maximum tenor (months)', before: 60, after: 72 }] },
  canEdit: false,
  canSubmit: false,
  canRecall: false,
  canCheck: true,
  isEditor: false,
  ...over,
});

const page = (permissions) => renderAt('/v/v2', '/v/:vid', <VersionPage kind="product" />, { permissions });

describe('product version page (FR-59)', () => {
  it('shows the checker the comparison and approves', async () => {
    const calls = stubHttp({
      'GET /admin/product-versions/v2': () => [200, { data: version() }],
      'POST /admin/product-versions/v2/approve': () => [200, { data: version({ state: 'active', canCheck: false, checker: { name: 'Asha Mfinanga' }, liveFrom: '2026-11-02T00:00:00Z' }) }],
    });
    page(['products.check']);
    const table = await screen.findByRole('table', { name: 'Changes against the live version' });
    expect(within(table).getByText('Maximum tenor (months)')).toBeInTheDocument();
    expect(within(table).getByText('60')).toBeInTheDocument();
    expect(within(table).getByText('72')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Approved.')).toBeInTheDocument();
    expect(calls.map((c) => c.key)).toContain('POST /admin/product-versions/v2/approve');
  });

  it('rejecting needs a reason', async () => {
    const calls = stubHttp({
      'GET /admin/product-versions/v2': () => [200, { data: version() }],
      'POST /admin/product-versions/v2/reject': (config) => [200, { data: version({ state: 'rejected', canCheck: false, rejectionReason: JSON.parse(config.data).reason }) }],
    });
    page(['products.check']);
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(within(dialog).getByText('Give a reason the maker can act on.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Policy caps it at 60 months.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('Rejected and returned to the maker.')).toBeInTheDocument();
    expect(calls.at(-1).key).toBe('POST /admin/product-versions/v2/reject');
  });

  it('tells the maker someone else must approve, and offers no approve button', async () => {
    stubHttp({ 'GET /admin/product-versions/v2': () => [200, { data: version({ canCheck: false, canRecall: true, isEditor: true }) }] });
    page(['products.make']);
    expect(await screen.findByText(/someone else must approve it/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Take back to draft' })).toBeInTheDocument();
  });

  it('shows server validation messages next to the field', async () => {
    stubHttp({
      'GET /admin/product-versions/v2': () => [200, { data: version({ state: 'draft', canEdit: true, canCheck: false, isEditor: true }) }],
      'PATCH /admin/product-versions/v2': () => [400, { code: 'INVALID_VALUES', message: 'Check the highlighted values.', details: { maxAmount: ['The maximum amount must be above the minimum.'] } }],
    });
    page(['products.make']);
    await userEvent.click(await screen.findByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('The maximum amount must be above the minimum.')).toBeInTheDocument();
  });
});

describe('comparison values', () => {
  it('formats money, rates and lists', () => {
    expect(formatCompareValue('maxAmount', 300000000)).toBe('TZS 300,000,000');
    expect(formatCompareValue('interestBps', 600)).toBe('6%');
    expect(formatCompareValue('repaymentMethods', ['payroll'])).toBe('Salary deduction');
    expect(formatCompareValue('topUpAllowed', false)).toBe('No');
  });
});
