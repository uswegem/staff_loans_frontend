import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StaffImportPage from './StaffImportPage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const preview = {
  id: 'imp1',
  fileName: 'Staff_records_Nov_2026.xlsx',
  status: 'previewed',
  summary: { new: 1, update: 1, unchanged: 1, error: 1 },
  rows: [
    { rowNo: 2, staffNo: 'LFB0412', name: 'Neema Mushi', outcome: 'update', problems: [], changes: ['salary from 2026-11-01: basic 1,850,000 → 1,950,000'] },
    { rowNo: 3, staffNo: 'LFB0612', name: 'Baraka Mwakyusa', outcome: 'new', problems: [], changes: ['Teller, Mbeya Branch; Non-management; basic 1,150,000'] },
    { rowNo: 4, staffNo: 'LFB0188', name: 'Faraji Nyoni', outcome: 'unchanged', problems: [], changes: [] },
    { rowNo: 5, staffNo: 'LFB06O2', name: 'Zawadi Said', outcome: 'error', problems: ['Staff number must be the employee code on the payslip, for example AT637'], changes: [] },
  ],
};

describe('Upload staff records (FR-02)', () => {
  it('shows the checked rows and applies only the valid ones', async () => {
    const calls = stubHttp({
      'POST /staff/import': () => [201, { data: preview }],
      'POST /staff/import/imp1/commit': () => [200, { data: { ...preview, status: 'committed', result: { created: 1, updated: 1, skipped: 2 } } }],
    });
    renderAt('/staff/import', '/staff/import', <StaffImportPage />, { permissions: ['staff.manage'] });
    const file = new File(['x'], 'Staff_records_Nov_2026.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await userEvent.upload(screen.getByLabelText('Choose an Excel file'), file);
    expect(await screen.findByText('4 rows checked')).toBeInTheDocument();
    expect(screen.getByText('Staff number must be the employee code on the payslip, for example AT637')).toBeInTheDocument();
    expect(screen.getByText(/basic 1,850,000 → 1,950,000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download them with the reasons' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Apply 2 valid rows' }));
    expect(await screen.findByText(/1 new staff added, 1 records updated, 2 rows skipped/)).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /staff/import').config.data).toBeInstanceOf(FormData);
  });

  it('explains an unreadable file', async () => {
    stubHttp({ 'POST /staff/import': () => [400, { code: 'FILE_UNREADABLE', message: 'There is no "Staff number" column. Use the Excel template.' }] });
    renderAt('/staff/import', '/staff/import', <StaffImportPage />);
    await userEvent.upload(screen.getByLabelText('Choose an Excel file'), new File(['x'], 'staff.xlsx'));
    expect(await screen.findByText('There is no "Staff number" column. Use the Excel template.')).toBeInTheDocument();
  });
});
