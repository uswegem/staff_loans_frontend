import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileDrop from './FileDrop';
import { renderAt } from '../test/render';

describe('FileDrop', () => {
  it('accepts a permitted document through drag-and-drop', () => {
    const onFile = vi.fn();
    renderAt('/', '/', <FileDrop label="Vehicle invoice" accept=".pdf" onFile={onFile} />);
    const file = new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' });
    fireEvent.drop(screen.getByRole('group', { name: 'Vehicle invoice' }), { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('rejects an unsupported file through drag-and-drop', () => {
    const onFile = vi.fn();
    renderAt('/', '/', <FileDrop label="Vehicle photo" accept=".jpg,.png" onFile={onFile} />);
    fireEvent.drop(screen.getByRole('group', { name: 'Vehicle photo' }), { dataTransfer: { files: [new File(['x'], 'report.pdf')] } });
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/only/i);
  });

  it('retains accessible browsing as an alternative to dragging', async () => {
    const onFile = vi.fn();
    renderAt('/', '/', <FileDrop label="Payslip" accept=".pdf" inputLabel="Choose payslip PDF" onFile={onFile} />);
    const file = new File(['%PDF'], 'payslip.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('Choose payslip PDF'), file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('prevents drag-and-drop and browsing while busy', () => {
    const onFile = vi.fn();
    renderAt('/', '/', <FileDrop label="Staff import" accept=".xlsx" busy onFile={onFile} />);
    expect(screen.getByLabelText('Staff import', { selector: 'input' })).toBeDisabled();
    fireEvent.drop(screen.getByRole('group', { name: 'Staff import' }), { dataTransfer: { files: [new File(['x'], 'staff.xlsx')] } });
    expect(onFile).not.toHaveBeenCalled();
  });
});
