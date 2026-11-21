import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
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
