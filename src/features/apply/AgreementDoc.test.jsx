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

// D-110: the same layout as the PDF.
const numbered = [
  { type: 'h1', parts: [{ text: 'STAFF LOAN AGREEMENT' }] },
  { type: 'h2', number: null, parts: [{ text: 'LOAN DETAILS' }] },
  { type: 'details', rows: [{ label: [{ text: 'Loan amount' }], value: [{ text: 'TZS 4,500,000', fill: true }] }, { label: [{ text: 'Period' }], value: [{ text: '36 months' }] }] },
  { type: 'h2', number: '4.', parts: [{ text: 'REPAYMENT AND SALARY DEDUCTION' }] },
  { type: 'clause', number: '4.2', parts: [{ text: 'Salary deduction:', strong: true }, { text: ' The Employee agrees.' }] },
  { type: 'sub', number: '(a)', parts: [{ text: 'failure to pay;' }] },
];

describe('numbered agreement (D-110)', () => {
  it('shows the letterhead, numbers in their own column and the Loan Details table; no schedule', () => {
    const { container } = renderAt('/x', '/x', <AgreementDoc blocks={numbered} lang="en" />);
    expect(screen.getByTestId('agreement-letterhead')).toHaveTextContent('Letshego Faidika Bank Limited');
    expect(screen.getByTestId('agreement-letterhead')).toHaveTextContent('P.O. Box 34459, Dar es Salaam');
    expect(screen.getByAltText('Letshego Faidika Bank')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Loan amount' }).closest('tr')).toHaveTextContent('TZS 4,500,000');
    expect(screen.getByText('4.').closest('h4')).toHaveTextContent('4.REPAYMENT AND SALARY DEDUCTION');
    expect(screen.getByText('4.2').closest('p')).toHaveTextContent('4.2Salary deduction: The Employee agrees.');
    expect(screen.getByText('Salary deduction:').tagName).toBe('B');
    expect(screen.getByText('(a)').closest('p')).toHaveTextContent('(a)failure to pay;');
    expect(container.querySelectorAll('thead')).toHaveLength(0);
  });

  it('in Swahili the letterhead address is Swahili', () => {
    renderAt('/x', '/x', <AgreementDoc blocks={numbered} lang="sw" />);
    expect(screen.getByTestId('agreement-letterhead')).toHaveTextContent('S.L.P. 34459, Dar es Salaam');
  });

  it('rebuilds the numbered structure from stored text when blocks were not kept', async () => {
    const { textToBlocks } = await import('./AgreementDoc');
    const blocks = textToBlocks('# T\n##* LOAN DETAILS\n| Period | 36 months\n## 1. THE LOAN\n1.1 First.\n  (a) one;\n  - bullet\n[ ] I agree.', 2);
    expect(blocks.map((b) => [b.type, b.number || null])).toEqual([['h1', null], ['h2', null], ['details', null], ['h2', '1.'], ['clause', '1.1'], ['sub', '(a)'], ['ul', null], ['declaration', null]]);
    expect(blocks[6].level).toBe(1);
  });
});
