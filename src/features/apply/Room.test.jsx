import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { quote, roomInputs } from '../../lib/calc/loanCalculator';
import ApplyWizardPage from './ApplyWizardPage';
import { Breakdown } from './CalculatorPanel';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

// Room (D-101): combined limit less payslip deductions and SLAS loans not yet on the payslip.
const PRICING = {
  interestBps: 600,
  processingFeeBps: 100,
  processingFeeTopUpBps: 50,
  insuranceBps: 60,
  affordabilityBps: 5000,
  pensionBps: 1000,
  instalmentRounding: 100,
  payeBands: [
    { from: 0, base: 0, rateBps: 0 },
    { from: 270000, base: 0, rateBps: 800 },
    { from: 520000, base: 20000, rateBps: 2000 },
    { from: 760000, base: 68000, rateBps: 2500 },
    { from: 1000000, base: 128000, rateBps: 3000 },
  ],
};

const lines = [
  { label: 'Staff Loan - Personal', amount: 150000, productId: 'pl', product: 'Personal Loan' },
  { label: 'Staff Loan - Vehicle', amount: 100000, productId: 'vl', product: 'Vehicle Loan' },
  { label: 'Staff Loan', amount: 70000, productId: null, product: null },
];
const slas = [{ applicationId: 'x1', ref: 'SL-2026-00040', productId: 'vl', product: 'Vehicle Loan', status: 'pending_disbursement', instalment: 60000, firstDue: '2026-12-25' }];

const app = (over = {}) => ({
  id: 'a1',
  ref: 'SL-2026-00050',
  status: 'draft',
  statusLabel: 'Draft',
  editable: true,
  route: { key: 'nonmgmt', stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] },
  product: { name: 'Personal Loan', available: true, minAmount: 500000, maxAmount: 300000000, minTenor: 6, maxTenor: 60, topUpAllowed: true, payslipLabel: 'Staff Loan - Personal', fields: [] },
  pricing: PRICING,
  payInputs: { basic: 1850000 },
  payslip: { fileId: 'f1', originalName: 'payslip.pdf', payDate: '2026-10-31', basic: 1850000, lfbDeductions: 320000, lfbLines: lines.map(({ label, amount }) => ({ label, amount })) },
  payslipMaxAgeDays: 45,
  firstDueDay: 25,
  amount: 1000000,
  tenor: 12,
  purpose: 'School fees',
  productFields: {},
  topUp: { on: false },
  probation: { onProbation: false },
  documents: [],
  agreements: [],
  history: [],
  checks: { eligibility: [], fieldErrors: {}, checks: [], canSubmit: true },
  quote: { maxTenor: 60 },
  deductions: { lines, ownLines: [0], topUpLine: -1, topUpLoan: null, topUpCandidate: null, slas },
  ...over,
});

const open = async (data) => {
  stubHttp({ 'GET /applications/a1': () => [200, { data }], 'PATCH /applications/a1': () => [200, { data }] });
  renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
  await screen.findByText('How your limit is worked out');
  await userEvent.click(screen.getByText('How your limit is worked out'));
};
const row = (label) => screen.getByText(label).closest('div');

describe('Room on the apply screen (D-101)', () => {
  it('a new loan: limit, less every payslip deduction, less SLAS loans not yet on it, then Room', async () => {
    await open(app());
    // 668,750 − (150,000 + 100,000 + 70,000) − 60,000 = 288,750
    expect(within(row('Combined limit (50% of Net Pay)')).getByText('668,750')).toBeInTheDocument();
    expect(within(row('Less payslip deductions')).getByText('−320,000')).toBeInTheDocument();
    expect(within(row('Less SLAS loans not yet on the payslip')).getByText('−60,000')).toBeInTheDocument();
    expect(within(screen.getAllByText('Room: the instalment you can afford').at(-1).closest('div')).getByText('288,750')).toBeInTheDocument();
    expect(screen.getByText('Remaining after this loan')).toBeInTheDocument();
    expect(screen.queryByText('Your other loans in Staff Loans')).toBeNull();
    // Each line with its matched product.
    expect(screen.getByText('(Personal Loan)')).toBeInTheDocument();
    expect(screen.getByText('(Vehicle Loan)')).toBeInTheDocument();
    expect(screen.getByText('(matches no product: counted, check with Payroll)')).toBeInTheDocument();
    expect(screen.getByText('(not paid out yet)')).toBeInTheDocument();
  });

  it('a top-up: leaves out the line topped up, and offers no Staff Loans loan to pick', async () => {
    await open(app({ topUp: { on: true }, deductions: { lines, ownLines: [0], topUpLine: 0, topUpLoan: null, topUpCandidate: null, slas } }));
    expect(screen.getByText('Less payslip deductions other than the product being topped up')).toBeInTheDocument();
    expect(within(row('Less payslip deductions other than the product being topped up')).getByText('−170,000')).toBeInTheDocument();
    expect(screen.getByText('(being topped up, not counted)')).toBeInTheDocument();
    expect(screen.getByText('Topping up the payslip deduction Staff Loan - Personal: TZS 150,000 a month.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Loan being topped up/)).toBeNull();
  });

  it('several lines for the product: the applicant chooses the one being topped up', async () => {
    const two = [{ label: 'Staff Loan - Personal', amount: 150000, productId: 'pl', product: 'Personal Loan' }, { label: 'Staff Loan - Personal', amount: 50000, productId: 'pl', product: 'Personal Loan' }];
    await open(app({ topUp: { on: true }, deductions: { lines: two, ownLines: [0, 1], topUpLine: -1, topUpLoan: null, topUpCandidate: null, slas: [] } }));
    await userEvent.click(screen.getByRole('combobox', { name: /Payslip deduction being topped up/ }));
    await userEvent.click(within(screen.getByRole('listbox')).getByText('Staff Loan - Personal: TZS 50,000 a month'));
    // The other line counts: 668,750 − 150,000 = 518,750.
    expect(within(row('Less payslip deductions other than the product being topped up')).getByText('−150,000')).toBeInTheDocument();
  });

  it('a top-up with no deduction for the product shows why it is blocked', async () => {
    const message = 'Your payslip shows no Personal Loan deduction (Staff Loan - Personal), so there is no loan to top up. Untick top-up to apply for a new loan, or attach a payslip that shows it.';
    await open(app({ topUp: { on: true }, deductions: { lines: [lines[1]], ownLines: [], topUpLine: -1, topUpLoan: null, topUpCandidate: null, slas: [] }, checks: { eligibility: [], fieldErrors: { 'topUp.on': message }, checks: [], canSubmit: false } }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue to documents' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('gives the same Room as the shared calculator', () => {
    const q = quote({ amount: 1000000, tenor: 12, pay: { basic: 1850000 }, existing: roomInputs({ lines, slas }), pricing: PRICING, maxTenor: 60 });
    expect(q.combined).toMatchObject({ cap: 668750, payslipDeductions: 320000, slasNotOnPayslip: 60000, available: 288750 });
  });
});

describe('older saved calculations (D-87) still display', () => {
  it('shows other loans in Staff Loans and the deduction added back', () => {
    const q = {
      payslip: { basic: 1850000, pension: 185000, taxable: 1665000, tax: 327500, totalDeductions: 512500, net: 1337500 },
      combined: { basis: 'net', cap: 668750, others: 200000, addBack: 150000, available: 468750, newInstalment: 136900, remaining: 331850 },
      rates: { interestBps: 600, affordabilityBps: 5000, pensionBps: 1000 },
      maxTenor: 60,
      maxAmount: 24000000,
    };
    renderAt('/calc', '/calc', <Breakdown q={q} />);
    expect(screen.getByText('Your other loans in Staff Loans')).toBeInTheDocument();
    expect(screen.getByText('Deduction added back (loan being topped up)')).toBeInTheDocument();
    expect(screen.getByText('468,750')).toBeInTheDocument();
    expect(screen.queryByText('Less payslip deductions')).toBeNull();
  });
});
