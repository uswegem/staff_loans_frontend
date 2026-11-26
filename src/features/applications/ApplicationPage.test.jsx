import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplicationPage from './ApplicationPage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const submitted = (over = {}) => ({
  id: 'a1',
  ref: 'SL-2026-00060',
  status: 'credit_review',
  statusLabel: 'With the Credit Analyst',
  editable: false,
  route: { key: 'nonmgmt', stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] },
  currentStage: 'credit',
  product: { name: 'Staff Personal Loan', topUpAllowed: true, fields: [], requiredDocuments: [] },
  amount: 1000000,
  tenor: 12,
  purpose: 'School fees',
  quote: { instalment: 92000 },
  submittedAt: '2026-11-20T08:00:00Z',
  documents: [],
  agreements: [],
  history: [],
  approved: null,
  schedule: null,
  ...over,
});

const open = async (data) => {
  stubHttp({ 'GET /applications/a1': () => [200, { data }] });
  renderAt('/applications/a1', '/applications/:id', <ApplicationPage />, { permissions: ['loan.viewOwn'] });
  await screen.findByText(data.ref);
};

describe('submitted application: Documents card (FR-09)', () => {
  it('is left out for a product that needs no documents', async () => {
    await open(submitted());
    expect(screen.queryByRole('heading', { name: 'Documents' })).toBeNull();
    expect(screen.queryByText('None attached')).toBeNull();
  });

  it('lists the documents for a product that needs them', async () => {
    await open(submitted({
      product: { name: 'Staff Car Loan', topUpAllowed: false, fields: [], requiredDocuments: [{ code: 'invoice', name: 'Invoice', active: true }] },
      documents: [{ id: 'd1', originalName: 'invoice.pdf' }],
    }));
    expect(screen.getByRole('heading', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'invoice.pdf' })).toBeInTheDocument();
  });
});

describe('application page: terms, history and withdrawing', () => {
  const route = { key: 'nonmgmt', stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] };

  it('shows the approved terms, with what was signed for underneath', async () => {
    await open(submitted({ status: 'pending_reaccept', amount: 5000000, tenor: 36, approved: { amount: 4500000, tenor: 36, instalment: 136900 }, route }));
    expect(screen.getAllByText('TZS 4,500,000').length).toBeGreaterThan(0);
    expect(screen.getByText('TZS 136,900')).toBeInTheDocument();
    expect(screen.getByText('Signed for')).toBeInTheDocument();
    expect(screen.getByText('TZS 5,000,000 over 36 months')).toBeInTheDocument();
  });

  it('names the stage that decided', async () => {
    await open(submitted({ route, history: [{ action: 'approve', stage: 'credit', at: '2026-11-20T07:00:00Z' }, { action: 'approve', stage: 'hr', at: '2026-11-21T07:00:00Z' }] }));
    expect(screen.getByText('Approved by Credit Analyst')).toBeInTheDocument();
    expect(screen.getByText('Approved by Head of HR')).toBeInTheDocument();
  });

  it("shows Credit Underwriting's review without its recommendation (D-113)", async () => {
    await open(submitted({ route, history: [{ action: 'reviewed', stage: 'credit', comment: null, at: '2026-11-20T07:00:00Z' }] }));
    expect(screen.getByText('Reviewed by Credit Underwriting')).toBeInTheDocument();
    expect(screen.queryByText(/recommend/i)).toBeNull();
  });

  it('keeps Withdraw one step away, under More', async () => {
    await open(submitted({ withdrawable: true, route }));
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('menuitem', { name: 'Withdraw application' })).toBeInTheDocument();
  });
});
