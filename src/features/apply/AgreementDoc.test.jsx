import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import AgreementDoc from './AgreementDoc';
import { renderAt } from '../../test/render';

// The Employee party names the staff member in capitals and bold; other filled values are
// highlighted but not bold, and the clauses keep the defined term "Employee".
const blocks = [
  { type: 'h1', parts: [{ text: 'STAFF LOAN AGREEMENT' }] },
  { type: 'p', parts: [{ text: '(2) ' }, { text: 'NEEMA MUSHI', fill: true, strong: true }, { text: ', whose personal details are recorded in the System and shown in the Loan Details (the "Employee").' }] },
  { type: 'ul', items: [[{ text: 'Employee: ' }, { text: 'Neema Mushi', fill: true }]] },
  { type: 'p', parts: [{ text: 'The Employee shall repay the loan by the monthly instalments shown in the Loan Details.' }] },
];

describe('agreement text', () => {
  it('shows the Employee party name in bold; other filled values are not bold', () => {
    renderAt('/x', '/x', <AgreementDoc blocks={blocks} lang="en" />);
    const party = screen.getByText('NEEMA MUSHI');
    expect(party.tagName).toBe('B');
    expect(party.closest('p')).toHaveTextContent('(2) NEEMA MUSHI, whose personal details are recorded in the System and shown in the Loan Details (the "Employee").');
    const detail = screen.getByText('Neema Mushi');
    expect(detail.tagName).toBe('SPAN');
    expect(detail.querySelector('b')).toBeNull();
    expect(screen.getByText(/The Employee shall repay/)).toBeInTheDocument();
  });
});
