import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateField from './DateField';
import { formatDay, parseDay, payslipDate } from '../../lib/format';

function Harness({ initial = '', min, max }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <DateField label="Report date" value={v} onChange={(e) => setV(e.target.value)} inputProps={{ min, max }} />
      <output>{JSON.stringify(v)}</output>
    </>
  );
}

describe('DateField', () => {
  it('shows a stored date as 21 Nov 2026, never mm/dd/yyyy', () => {
    render(<Harness initial="2026-11-21" />);
    expect(screen.getByLabelText('Report date')).toHaveValue('21 Nov 2026');
  });

  it('accepts a typed day-first date and hands back yyyy-mm-dd', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Report date');
    await userEvent.type(input, '5/12/2026');
    await userEvent.tab();
    expect(screen.getByText('"2026-12-05"')).toBeInTheDocument();
    expect(input).toHaveValue('5 Dec 2026');
  });

  it('says how to write a date it cannot read, and keeps the old value', async () => {
    render(<Harness initial="2026-11-21" />);
    const input = screen.getByLabelText('Report date');
    await userEvent.clear(input);
    await userEvent.type(input, '31/02/2026');
    await userEvent.tab();
    expect(screen.getByText('Enter a date like 21 Nov 2026.')).toBeInTheDocument();
    expect(screen.getByText('"2026-11-21"')).toBeInTheDocument();
  });

  it('keeps to the earliest date allowed', async () => {
    render(<Harness min="2026-11-21" />);
    await userEvent.type(screen.getByLabelText('Report date'), '20 Nov 2026');
    await userEvent.tab();
    expect(screen.getByText('Choose 21 Nov 2026 or later.')).toBeInTheDocument();
    expect(screen.getByText('""')).toBeInTheDocument();
  });

  it('clearing the field clears the value', async () => {
    render(<Harness initial="2026-11-21" />);
    await userEvent.clear(screen.getByLabelText('Report date'));
    await userEvent.tab();
    expect(screen.getByText('""')).toBeInTheDocument();
  });
});

describe('parseDay and formatDay', () => {
  it('reads the ways staff write dates', () => {
    expect(parseDay('21 Nov 2026')).toBe('2026-11-21');
    expect(parseDay('21 Des 2026')).toBe('2026-12-21');
    expect(parseDay('21-11-2026')).toBe('2026-11-21');
    expect(parseDay('2026-11-21')).toBe('2026-11-21');
    expect(parseDay('11/31/2026')).toBeNull();
    expect(parseDay('soon')).toBeNull();
  });
  it('formats a calendar day without shifting it', () => {
    expect(formatDay('2026-12-25')).toBe('25 Dec 2026');
  });
});

describe('payslipDate', () => {
  it('shows a month-only payslip read as a month end still ahead as its month', () => {
    expect(payslipDate('2026-11-30', '2026-11-21')).toEqual({ month: true, text: 'November 2026' });
    expect(payslipDate('2026-10-31', '2026-11-21')).toEqual({ month: false, text: '31 Oct 2026' });
  });
});
