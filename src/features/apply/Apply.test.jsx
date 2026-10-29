import { describe, expect, it } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { quote } from '../../lib/calc/loanCalculator';
import { routeSteps } from '../../components/LoanRoute';
import ApplyWizardPage from './ApplyWizardPage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

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

describe('calculator copy (same module as the API)', () => {
  it('matches the prototype worked example', () => {
    const q = quote({ amount: 4500000, tenor: 36, pay: { basic: 1850000, allowances: 220000 }, pricing: PRICING, startDay: '2026-10-29' });
    expect([q.instalment, q.maxInstalment, q.totalInterest, q.processingFee, q.insuranceFee]).toEqual([136900, 668750, 428351, 45000, 81000]);
  });
});

describe('loan route', () => {
  const route = { stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] };
  const cls = (status) => routeSteps({ route, status }).map((s) => s.cls);
  it.each([
    ['draft', ['now', '', '', '', '']],
    ['pending_credit', ['done', 'now', '', '', '']],
    ['pending_ceo', ['done', 'done', 'done', 'now', '']],
    ['returned', ['back', '', '', '', '']],
    ['pending_disbursement', ['done', 'done', 'done', 'done', 'now']],
    ['disbursed', ['done', 'done', 'done', 'done', 'done']],
  ])('%s', (status, expected) => {
    expect(cls(status)).toEqual(expected);
  });
  it('adds the revised-terms step when terms changed', () => {
    expect(routeSteps({ route, status: 'pending_reaccept' }).map((s) => s.key)).toEqual(['submit', 'credit', 'hr', 'ceo', 'reaccept', 'disburse']);
  });
});

const app = {
  id: 'a1',
  ref: 'SL-2026-00032',
  status: 'draft',
  statusLabel: 'Draft',
  editable: true,
  route: { key: 'nonmgmt', stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] },
  product: { name: 'Personal Loan', available: true, minAmount: 500000, maxAmount: 300000000, salaryMultiple: 8, minTenor: 6, maxTenor: 60, topUpAllowed: true, repaymentMethods: ['payroll', 'account'], fields: [], requiredDocuments: [], optionalDocuments: ['Latest salary slip'] },
  pricing: PRICING,
  payInputs: { basic: 1850000, allowances: 220000 },
  firstDueDay: 25,
  amount: 4500000,
  tenor: 36,
  purpose: 'Furniture',
  productFields: {},
  repayment: { method: 'payroll' },
  topUp: { on: false },
  probation: { onProbation: false },
  documents: [],
  agreements: [],
  history: [],
  bank: { bank: 'Letshego Faidika Bank', branch: 'Mwanza', accountNo: '4010 2283 1170' },
  checks: { eligibility: [], fieldErrors: {}, checks: [], canSubmit: true },
  quote: {},
};

const preview = {
  blocks: [
    { type: 'h1', parts: [{ text: 'MKATABA WA MKOPO WA MWAJIRIWA' }] },
    { type: 'p', parts: [{ text: 'Mwajiriwa ameomba kukopeshwa ' }, { text: 'Tshs 4,500,000', fill: true }] },
  ],
  textSha256: 'f'.repeat(64),
  template: { version: '2026.11', sample: false },
  terms: { amount: 4500000, tenor: 36, instalment: 136900, fees: 126000, totalRepayable: 4928351 },
};

async function toSignStep() {
  await userEvent.click(await screen.findByRole('button', { name: 'Continue to documents' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Review application' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Continue to agreement' }));
  await screen.findByLabelText('Loan agreement text');
}

describe('apply wizard', () => {
  it('shows the live instalment for the request', async () => {
    stubHttp({ 'GET /applications/a1': () => [200, { data: app }] });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('136,900')).toBeInTheDocument();
    expect(screen.getByText('TZS 531,850 below your limit')).toBeInTheDocument();
  });

  it('consents unlock only after reading to the end; signing sends the fingerprint read', async () => {
    const calls = stubHttp({
      'GET /applications/a1': () => [200, { data: app }],
      'PATCH /applications/a1': () => [200, { data: app }],
      'GET /applications/a1/agreement/preview': () => [200, { data: preview }],
      'POST /applications/a1/sign-and-submit': () => [200, { data: { ...app, status: 'pending_credit' } }],
    });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    await toSignStep();
    const sign = screen.getByRole('button', { name: 'Sign agreement and submit' });
    expect(sign).toBeDisabled();
    // jsdom has no layout, so the document counts as fully visible: the consents unlock.
    for (const cb of screen.getAllByRole('checkbox')) await userEvent.click(cb);
    await userEvent.type(screen.getByLabelText(/Enter your password to sign/), 'Sample#2026');
    expect(sign).toBeEnabled();
    await userEvent.click(sign);
    const body = JSON.parse(calls.find((c) => c.key === 'POST /applications/a1/sign-and-submit').config.data);
    expect(body).toMatchObject({ consents: { truth: true, deduct: true, crb: true, sms: true }, accepted: true, scrolledToEnd: true, textSha256: 'f'.repeat(64) });
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('keeps the consents locked while the agreement is not read', async () => {
    stubHttp({
      'GET /applications/a1': () => [200, { data: app }],
      'PATCH /applications/a1': () => [200, { data: app }],
      'GET /applications/a1/agreement/preview': () => [200, { data: preview }],
    });
    const scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 2000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 400 });
    try {
      renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
      await toSignStep();
      expect(screen.getAllByRole('checkbox')[0]).toBeDisabled();
      expect(screen.getByText('Scroll to the end of the agreement to sign it.')).toBeInTheDocument();
      const doc = screen.getByLabelText('Loan agreement text');
      doc.scrollTop = 1600;
      fireEvent.scroll(doc);
      expect(screen.getAllByRole('checkbox')[0]).toBeEnabled();
    } finally {
      // jsdom defines both on Element.prototype; removing the overrides restores them.
      if (scrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeight);
      else delete HTMLElement.prototype.scrollHeight;
      delete HTMLElement.prototype.clientHeight;
    }
  });

  it('shows the attempts left after a wrong password', async () => {
    stubHttp({
      'GET /applications/a1': () => [200, { data: app }],
      'PATCH /applications/a1': () => [200, { data: app }],
      'GET /applications/a1/agreement/preview': () => [200, { data: preview }],
      'POST /applications/a1/sign-and-submit': () => [401, { code: 'PASSWORD_WRONG', message: 'Your password is not right.', details: { remainingAttempts: 3 } }],
    });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    await toSignStep();
    for (const cb of screen.getAllByRole('checkbox')) await userEvent.click(cb);
    await userEvent.type(screen.getByLabelText(/Enter your password to sign/), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign agreement and submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your password is not right. 3 attempts left before the account locks.');
    expect(within(screen.getByLabelText('Loan agreement text')).getByText('Tshs 4,500,000')).toBeInTheDocument();
  });
});
