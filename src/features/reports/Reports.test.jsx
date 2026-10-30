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
  it('requires a successful preview and Legal approval before loading', async () => {
    const calls = stubHttp({
      'GET /admin/templates': () => [200, { data: { items: [{ id: 't1', version: '2026.11', state: 'current', sample: true, effectiveFrom: '2026-10-01', legalApproved: true, note: '', loadedAt: '2026-10-01T08:00:00Z', loadedBy: 'Peter Lyimo', agreements: 14 }], required: [] } }],
      'POST /admin/templates/preview': () => [200, { data: { blocks: [{ type: 'h1', parts: [{ text: 'MKATABA' }] }], textSha256: 'a'.repeat(64), placeholders: [] } }],
      'POST /admin/templates': () => [201, { message: 'Version 2027.01 loaded.', data: { id: 't2', version: '2027.01' } }],
    });
    renderAt('/admin/templates', '/admin/templates', <TemplatesPage />, { permissions: ['admin.templates'] });
    expect(await screen.findByText(/sample clauses/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load new version' }));
    const dialog = await screen.findByRole('dialog');
    const load = within(dialog).getByRole('button', { name: 'Load version' });
    expect(load).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Version/), '2027.01');
    await userEvent.type(within(dialog).getByLabelText(/Agreement text/), '# MKATABA');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Check and preview' }));
    expect(await within(dialog).findByText('Renders correctly with a sample applicant.')).toBeInTheDocument();
    await userEvent.click(load);
    expect(within(dialog).getByText('Legal must approve the text before it is loaded.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Legal has approved this text' }));
    await userEvent.click(load);
    expect(await screen.findByText('Version 2027.01 loaded.')).toBeInTheDocument();
    const body = JSON.parse(calls.find((c) => c.key === 'POST /admin/templates').config.data);
    expect(body).toMatchObject({ version: '2027.01', body: '# MKATABA', legalApproved: true });
  });
});
