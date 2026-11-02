import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from './ReportsPage';
import TemplatesPage from '../admin/templates/TemplatesPage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const options = { products: [{ id: 'p1', name: 'Personal Loan' }], departments: ['Risk'], branches: ['Head Office'], categories: ['Management', 'Non-management'], statuses: [{ value: 'disbursed', label: 'Disbursed' }] };
const catalogue = { reports: [{ key: 'register', id: 'RP-01', name: 'Application register', filters: ['dates', 'product', 'category', 'status'], canExport: true }], options };
const register = {
  key: 'register',
  id: 'RP-01',
  name: 'Application register',
  columns: [{ label: 'Reference', type: 'text' }, { label: 'Applicant', type: 'text' }, { label: 'Product', type: 'text' }, { label: 'Amount', type: 'money' }, { label: 'Status', type: 'text' }],
  rows: [['SL-2026-00028', 'Daniel Mrema', 'Limited details', '', 'Pending Credit Review'], ['SL-2026-00030', 'Salma Hamisi', 'Salary Advance', 600000, 'Pending Credit Review']],
  total: 2,
  truncated: false,
  limitedCount: 1,
  excluded: 0,
  filters: {},
};

describe('reports', () => {
  it('shows limited rows as the API sends them, and passes filters to the API', async () => {
    const calls = stubHttp({
      'GET /reports': () => [200, { data: catalogue }],
      'GET /reports/register': () => [200, { data: register }],
    });
    renderAt('/reports', '/reports', <ReportsPage />, { permissions: ['review.credit'] });
    expect(await screen.findByText(/1 management-route row shows limited details only/, {}, { timeout: 8000 })).toBeInTheDocument();
    const limited = screen.getByText('SL-2026-00028').closest('tr');
    expect(within(limited).getByText('Limited details')).toBeInTheDocument();
    expect(within(screen.getByText('SL-2026-00030').closest('tr')).getByText('600,000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excel' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Category' }));
    await userEvent.click(within(screen.getByRole('listbox')).getByText('Management'));
    await screen.findByText('SL-2026-00028');
    await new Promise((r) => { setTimeout(r, 400); });
    expect(calls.filter((c) => c.key === 'GET /reports/register').at(-1).config.params).toEqual({ category: 'Management', groupBy: 'product' });
  });
});

describe('agreement templates', () => {
  const row = (over) => ({ id: 't1', version: '2026.11', status: 'approved', statusLabel: 'Approved', state: 'current', sample: true, effectiveFrom: '2026-10-01', note: '', loadedAt: '2026-10-01T08:00:00Z', loadedBy: 'Peter Lyimo', editorIds: ['u-legal'], approvedBy: 'Grace Mushi', approvedAt: '2026-10-01T09:00:00Z', agreements: 14, ...over });

  it('the Legal Officer uploads a previewed version for Legal approval', async () => {
    const calls = stubHttp({
      'GET /admin/templates': () => [200, { data: { items: [row()], required: [] } }],
      'POST /admin/templates/preview': () => [200, { data: { blocks: [{ type: 'h1', parts: [{ text: 'MKATABA' }] }], textSha256: 'a'.repeat(64), placeholders: [] } }],
      'POST /admin/templates': () => [201, { message: "Version 2027.01 uploaded. It waits for the Head of Legal's approval.", data: { id: 't2', version: '2027.01', status: 'pending_legal_approval' } }],
    });
    renderAt('/admin/templates', '/admin/templates', <TemplatesPage />, { permissions: ['admin.templates'], userId: 'u-legal' });
    expect(await screen.findByText(/sample clauses/)).toBeInTheDocument();
    expect(screen.getByText('Approved, in use')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Upload new version' }));
    const dialog = await screen.findByRole('dialog');
    const send = within(dialog).getByRole('button', { name: 'Send for Legal approval' });
    expect(send).toBeDisabled();
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Version/), '2027.01');
    await userEvent.type(within(dialog).getByLabelText(/Agreement text/), '# MKATABA');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Check and preview' }));
    expect(await within(dialog).findByText('Renders correctly with a sample applicant.')).toBeInTheDocument();
    await userEvent.click(send);
    expect(await screen.findByText(/waits for the Head of Legal's approval/)).toBeInTheDocument();
    const body = JSON.parse(calls.find((c) => c.key === 'POST /admin/templates').config.data);
    expect(body).toMatchObject({ version: '2027.01', body: '# MKATABA' });
    expect(body).not.toHaveProperty('legalApproved');
  });

  it('the Head of Legal rejects a pending version with a reason, but cannot approve their own', async () => {
    const pending = row({ id: 't2', version: '2027.01', status: 'pending_legal_approval', statusLabel: 'Pending Legal Approval', state: 'pending_legal_approval', sample: false, approvedBy: null, approvedAt: null });
    const mine = row({ id: 't3', version: '2027.02', status: 'pending_legal_approval', statusLabel: 'Pending Legal Approval', state: 'pending_legal_approval', sample: false, editorIds: ['u-head'], approvedBy: null, approvedAt: null });
    const calls = stubHttp({
      'GET /admin/templates': () => [200, { data: { items: [mine, pending, row()], required: [] } }],
      'GET /admin/templates/t2': () => [200, { data: { ...pending, body: '# MKATABA', blocks: [{ type: 'h1', parts: [{ text: 'MKATABA' }] }] } }],
      'GET /admin/templates/t3': () => [200, { data: { ...mine, body: '# MKATABA', blocks: [{ type: 'h1', parts: [{ text: 'MKATABA' }] }] } }],
      'POST /admin/templates/t2/reject': () => [200, { message: 'Version 2027.01 rejected.', data: { id: 't2' } }],
    });
    renderAt('/admin/templates', '/admin/templates', <TemplatesPage />, { permissions: ['templates.approve'], userId: 'u-head' });
    expect((await screen.findAllByText('Pending Legal Approval')).length).toBe(2);
    expect(screen.queryByRole('button', { name: 'Upload new version' })).not.toBeInTheDocument();

    // Own version: view only.
    const rows = screen.getAllByRole('row');
    await userEvent.click(within(rows[1]).getByRole('button', { name: 'View' }));
    let dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(/another Head of Legal must approve it/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    await userEvent.click(within(rows[2]).getByRole('button', { name: 'Review' }));
    dialog = await screen.findByRole('dialog');
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Reject' }));
    dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(within(dialog).getByText('Give the reason for rejecting.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Clause 7 cites the old policy.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('Version 2027.01 rejected.')).toBeInTheDocument();
    expect(JSON.parse(calls.find((c) => c.key === 'POST /admin/templates/t2/reject').config.data)).toEqual({ reason: 'Clause 7 cites the old policy.' });
  });
});
