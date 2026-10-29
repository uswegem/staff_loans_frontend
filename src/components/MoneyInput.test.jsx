import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoneyInput from './MoneyInput';
import { pct } from '../lib/dates';

function Harness() {
  const [v, setV] = useState(null);
  return (
    <>
      <MoneyInput label="Amount" value={v} onChange={setV} />
      <output>{JSON.stringify(v)}</output>
    </>
  );
}

describe('MoneyInput', () => {
  it('shows thousands separators and keeps whole shillings', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('Amount'), '4500000');
    expect(screen.getByLabelText('Amount')).toHaveValue('4,500,000');
    expect(screen.getByRole('status')).toHaveTextContent('4500000');
  });

  it('ignores letters and clears to null', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('Amount'), '12a3');
    expect(screen.getByLabelText('Amount')).toHaveValue('123');
    await userEvent.clear(screen.getByLabelText('Amount'));
    expect(screen.getByRole('status')).toHaveTextContent('null');
  });
});

describe('pct', () => {
  it('formats basis points', () => {
    expect([pct(600), pct(60), pct(50), pct(5000, 0), pct(10000, 0)]).toEqual(['6%', '0.6%', '0.5%', '50%', '100%']);
  });
});
