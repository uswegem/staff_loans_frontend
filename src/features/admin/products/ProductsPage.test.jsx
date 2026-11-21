import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsPage from './ProductsPage';
import { renderAt } from '../../../test/render';
import { stubHttp } from '../../../test/http';

const product = (over = {}) => ({
  id: 'p1',
  code: 'VL',
  name: 'Vehicle Loan',
  status: 'active',
  configuration: { ready: true, missing: [] },
  live: { id: 'v1', version: 1, state: 'active', liveFrom: '2026-10-01T00:00:00Z', minAmount: 500000, maxAmount: 300000000, minTenor: 6, maxTenor: 60 },
  scheduled: null,
  openChange: null,
  ...over,
});

const pending = (canCheck) => ({ id: 'v2', version: 2, state: 'pending_approval', stage: 'credit', stageLabel: 'Head of Credit', canCheck });

const stub = (rows) => stubHttp({
  'GET /admin/products': () => [200, { data: rows }],
  'GET /admin/pricing': () => [200, { data: { live: null, openChange: null, versions: [] } }],
  'GET /admin/products/config-readiness': () => [200, { data: { ready: rows.length, total: rows.length, incomplete: 0, enforcementEnabled: false } }],
});

const page = (permissions) => renderAt('/admin/products', '/admin/products', <ProductsPage />, { permissions });

describe('products workspace', () => {
  it('lists only changes the user can approve now in the approval center', async () => {
    stub([product({ openChange: pending(true) }), product({ id: 'p2', code: 'PL', name: 'Personal Loan', openChange: pending(false) })]);
    page(['products.approveCredit']);
    expect(await screen.findByRole('heading', { name: 'Approval center' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Review changes to Vehicle Loan (VL) version 2' });
    expect(link).toHaveAttribute('href', '/admin/products/versions/v2');
    expect(screen.queryByRole('link', { name: /Review changes to Personal Loan/ })).toBeNull();
  });

  it('hides the approval center when nothing is actionable', async () => {
    stub([product({ openChange: pending(false) })]);
    page(['products.approveCredit']);
    await screen.findByRole('button', { name: 'Actions for Vehicle Loan' });
    expect(screen.queryByRole('heading', { name: 'Approval center' })).toBeNull();
  });

  it('starts a product change from the row actions menu', async () => {
    stub([product()]);
    page(['products.make']);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Vehicle Loan' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Change product' }));
    expect(await screen.findByLabelText(/Why this change/)).toBeInTheDocument();
  });

  it('offers no change action to a user without maker permission', async () => {
    stub([product()]);
    page(['products.approveCredit']);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Vehicle Loan' }));
    expect(screen.getByRole('menuitem', { name: 'View change history' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Change product' })).toBeNull();
  });
});
