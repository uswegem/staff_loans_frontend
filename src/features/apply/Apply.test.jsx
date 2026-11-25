import { describe, expect, it } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
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
    const q = quote({ amount: 4500000, tenor: 36, pay: { basic: 1850000, lfbDeductions: 0 }, pricing: PRICING, startDay: '2026-10-29', maxTenor: 60, maxAmountCap: 300000000 });
    expect([q.instalment, q.maxInstalment, q.totalInterest, q.processingFee, q.insuranceFee, q.maxAmount]).toEqual([136900, 668750, 428351, 45000, 81000, 34588000]);
  });
});

describe('loan route', () => {
  const route = { stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] };
  const cls = (status) => routeSteps({ route, status }).map((s) => s.cls);
  it.each([
    ['draft', ['now', '', '', '', '', '']],
    ['pending_credit', ['done', 'now', '', '', '', '']],
    ['pending_ceo', ['done', 'done', 'done', 'now', '', '']],
    ['returned', ['back', '', '', '', '', '']],
    // D-107: booked by People and Culture, then disbursed by OPS.
    ['pending_booking', ['done', 'done', 'done', 'done', 'now', '']],
    ['pending_disbursement', ['done', 'done', 'done', 'done', 'done', 'now']],
    ['disbursed', ['done', 'done', 'done', 'done', 'done', 'done']],
  ])('%s', (status, expected) => {
    expect(cls(status)).toEqual(expected);
  });
  it('adds the revised-terms step when terms changed', () => {
    expect(routeSteps({ route, status: 'pending_reaccept' }).map((s) => s.key)).toEqual(['submit', 'credit', 'hr', 'ceo', 'reaccept', 'book', 'disburse']);
  });
});

const app = {
  id: 'a1',
  ref: 'SL-2026-00032',
  status: 'draft',
  statusLabel: 'Draft',
  editable: true,
  route: { key: 'nonmgmt', stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] },
  product: { name: 'Personal Loan', available: true, minAmount: 500000, maxAmount: 300000000, minTenor: 6, maxTenor: 60, topUpAllowed: true, repaymentMethods: ['payroll', 'account'], fields: [], requiredDocuments: [], optionalDocuments: [] },
  pricing: PRICING,
  payInputs: { basic: 1850000, lfbDeductions: 0 },
  payslip: { fileId: 'f1', originalName: 'payslip-oct.pdf', payDate: '2026-10-25', basic: 1850000, lfbDeductions: 0, lfbLines: [] },
  payslipMaxAgeDays: 45,
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
  quote: { maxTenor: 60 },
};

const preview = {
  blocks: [
    { type: 'h1', parts: [{ text: 'MKATABA WA MKOPO WA MWAJIRIWA' }] },
    { type: 'p', parts: [{ text: 'Mwajiriwa ameomba kukopeshwa ' }, { text: 'Tshs 4,500,000', fill: true }] },
  ],
  textSha256: 'f'.repeat(64),
  template: { version: '2026.11', sample: false, language: 'sw' },
  language: 'sw',
  languageNotice: null,
  terms: { amount: 4500000, tenor: 36, instalment: 136900, fees: 126000, totalRepayable: 4928351 },
  // D-108: the data protection notice with its own box.
  dataProtection: { version: 'DP-2026-1', language: 'sw', title: 'Ulinzi wa taarifa binafsi', body: 'Ninaridhia Letshego Faidika Bank kukusanya taarifa zangu.', checkbox: 'Nimesoma na ninakubali tamko la ulinzi wa taarifa binafsi.', fallbackNotice: null },
};

async function toSignStep() {
  await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Continue to agreement' }));
  await screen.findByLabelText('Loan agreement text');
}

describe('product-aware loan defaults', () => {
  const fresh = (maxAmount, maxTenor, overrides = {}) => ({
    ...app, amount: null, tenor: null, payslip: null, payInputs: { basic: 0 },
    product: { ...app.product, maxAmount, maxTenor }, quote: { maxTenor }, ...overrides,
  });
  const open = (a, uploaded = a) => {
    stubHttp({
      'GET /applications/a1': () => [200, { data: a }],
      'PATCH /applications/a1': (config) => [200, { data: { ...a, ...JSON.parse(config.data) } }],
      'POST /applications/a1/payslip': () => [201, { data: uploaded }],
    });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
  };
  const amount = () => screen.getByRole('textbox', { name: /Amount/ });
  const tenor = () => screen.getByRole('spinbutton', { name: /Tenor/ });
  const slider = () => screen.getByRole('slider', { name: 'Tenor slider' });
  it.each([[200000000, 60], [300000000, 120]])('defaults to product cap %s and %s months', async (cap, months) => {
    open(fresh(cap, months));
    await screen.findByRole('textbox', { name: /Amount/ });
    expect(amount().value.replace(/,/g, '')).toBe(String(cap));
    expect(tenor()).toHaveValue(months);
    expect(slider()).toHaveAttribute('aria-valuenow', String(months));
  });
  it('updates untouched fields after payslip upload', async () => {
    const a = fresh(200000000, 60);
    const uploaded = { ...a, payslip: app.payslip, payInputs: app.payInputs, quote: { maxTenor: 36 } };
    open(a, uploaded);
    await screen.findByRole('textbox', { name: /Amount/ });
    await userEvent.upload(screen.getByLabelText('Choose payslip PDF'), new File(['%PDF-1.7'], 'payslip.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(tenor()).toHaveValue(36));
    expect(slider()).toHaveAttribute('aria-valuenow', '36');
    expect(Number(amount().value.replace(/,/g, ''))).toBeLessThan(200000000);
    expect(Number(amount().value.replace(/,/g, ''))).toBeGreaterThan(500000);
  });
  it('preserves manual amount and synchronizes tenor controls', async () => {
    open(fresh(300000000, 120));
    await screen.findByRole('textbox', { name: /Amount/ });
    await userEvent.clear(amount());
    await userEvent.type(amount(), '4500000');
    await userEvent.clear(tenor());
    await userEvent.type(tenor(), '24');
    expect(slider()).toHaveAttribute('aria-valuenow', '24');
    // jsdom does not implement native range-input keyboard stepping; dispatch the
    // resulting input change here, and exercise real keyboard/mouse in Playwright.
    fireEvent.change(slider(), { target: { value: '25' } });
    expect(tenor()).toHaveValue(25);
    expect(slider()).toHaveAttribute('aria-valuenow', '25');
    expect(amount().value.replace(/,/g, '')).toBe('4500000');
  });
  it('does not invent borrowing capacity below the product minimum', async () => {
    open(fresh(200000000, 60, { payslip: app.payslip, payInputs: { basic: 0 } }));
    expect(await screen.findByText('Your eligible amount is below the product minimum of TZS 500,000.')).toBeInTheDocument();
    expect(amount()).toHaveValue('');
  });
});

describe('apply wizard', () => {
  it('shows the retirement cutoff and the longest tenor allowed (D-82)', async () => {
    stubHttp({ 'GET /applications/a1': () => [200, { data: { ...app, retirement: { dateOfBirth: '1969-01-29', cutoff: '2028-11-30', maxTenor: 24, age: 60, bufferDays: 60 } } }] });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('30 Nov 2028')).toBeInTheDocument();
    expect(screen.getByText('24 months')).toBeInTheDocument();
    expect(screen.getByText(/the product allows 60/)).toBeInTheDocument();
    expect(screen.getByText('6 to 24 months')).toBeInTheDocument();
  });

  it('shows the live instalment for the request', async () => {
    stubHttp({ 'GET /applications/a1': () => [200, { data: app }] });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('136,900')).toBeInTheDocument();
    expect(screen.getByText('TZS 531,850 below your limit')).toBeInTheDocument();
    expect(screen.getByText('TZS 34,588,000 over 60 months')).toBeInTheDocument();
    expect(screen.getByText('payslip-oct.pdf')).toBeInTheDocument();
  });

  it('asks for the payslip before showing a limit, and shows what the API read from it', async () => {
    const noSlip = { ...app, payslip: null, payInputs: { basic: 0, lfbDeductions: 0 }, checks: { ...app.checks, fieldErrors: { payslip: 'Attach your latest payslip. Basic Pay and LFB deductions are read from it.' } } };
    const calls = stubHttp({
      'GET /applications/a1': () => [200, { data: noSlip }],
      'POST /applications/a1/payslip': () => [201, { data: { ...app, payslip: { ...app.payslip, lfbDeductions: 150000, lfbLines: [{ label: 'LFB Staff Loan', amount: 150000 }] }, payInputs: { basic: 1850000, lfbDeductions: 150000 } } }],
    });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('Attach your latest payslip to see your limit.')).toBeInTheDocument();
    expect(screen.getByText('Upload your latest payslip to calculate your eligible loan amount.')).toBeInTheDocument();
    expect(screen.getByText('PDF · From the Seamless HR System · Not older than 45 days')).toBeInTheDocument();
    // A missing payslip is not an error until Continue is pressed.
    expect(screen.queryByText('Attach your latest payslip. Basic Pay and LFB deductions are read from it.')).not.toBeInTheDocument();
    const file = new File(['%PDF-1.7'], 'payslip.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('Choose payslip PDF'), file);
    expect(await screen.findByText('TZS 150,000')).toBeInTheDocument();
    // Combined cap (D-87): 50% of Net Pay 1,337,500 = 668,750, less other Staff Loans loans (none).
    expect(screen.getByText('Limit 668,750')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /applications/a1/payslip')).toBe(true);
  });

  describe('progressive validation', () => {
    const blankErrors = { amount: 'Enter the amount you want to borrow.', tenor: 'Enter the tenor in months.', purpose: 'Say what the loan is for.', payslip: 'Attach your latest payslip. Basic Pay and LFB deductions are read from it.' };
    const blank = { ...app, payslip: null, payInputs: { basic: 0, lfbDeductions: 0 }, amount: null, tenor: null, purpose: '', checks: { eligibility: [], fieldErrors: blankErrors, checks: [], canSubmit: false } };
    const ERRORS = Object.values(blankErrors);

    it('opens calm: no field errors, no red payslip box, and no zero estimate', async () => {
      stubHttp({ 'GET /applications/a1': () => [200, { data: blank }] });
      renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
      expect(await screen.findByText(/will appear here once you enter your loan amount/)).toBeInTheDocument();
      for (const m of ERRORS) expect(screen.queryByText(m)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Amount/ })).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByRole('textbox', { name: /Purpose of the loan/ })).toHaveAttribute('aria-invalid', 'false');
      expect(screen.queryByText('Total interest')).not.toBeInTheDocument();
      expect(screen.queryByText('—')).not.toBeInTheDocument();
    });

    it('shows a field error after leaving it, and clears it as soon as the value changes', async () => {
      stubHttp({ 'GET /applications/a1': () => [200, { data: blank }], 'PATCH /applications/a1': () => [200, { data: blank }] });
      renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
      const purpose = await screen.findByRole('textbox', { name: /Purpose of the loan/ });
      await userEvent.click(purpose);
      await userEvent.tab();
      expect(screen.getByText('Say what the loan is for.')).toBeInTheDocument();
      expect(screen.queryByText('Enter the amount you want to borrow.')).not.toBeInTheDocument();
      await userEvent.type(purpose, 'C');
      expect(screen.queryByText('Say what the loan is for.')).not.toBeInTheDocument();
    });

    it('on Continue shows every missing field, says so once, and focuses the first problem', async () => {
      stubHttp({ 'GET /applications/a1': () => [200, { data: blank }], 'PATCH /applications/a1': () => [200, { data: blank }] });
      renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
      await userEvent.clear(await screen.findByRole('textbox', { name: /Amount/ }));
      await userEvent.clear(screen.getByRole('spinbutton', { name: /Tenor/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(await screen.findByText('Fill in the required fields.')).toBeInTheDocument();
      for (const m of ['Enter the amount you want to borrow.', 'Say what the loan is for.']) expect(screen.getByText(m)).toBeInTheDocument();
      expect(screen.getAllByText(blankErrors.payslip).length).toBeGreaterThan(0);
      expect(document.activeElement).toHaveAttribute('aria-labelledby', 'payslip-h');
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument(); // still on step 2
    });

    it('explains the longest tenor when a longer one is typed (D-82)', async () => {
      stubHttp({ 'GET /applications/a1': () => [200, { data: { ...app, retirement: { dateOfBirth: '1969-01-29', cutoff: '2028-11-30', maxTenor: 24, age: 60, bufferDays: 60 } } }] });
      renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
      const tenor = await screen.findByRole('spinbutton', { name: /Tenor/ });
      expect(screen.queryByText('The longest tenor you can take is 24 months.')).not.toBeInTheDocument();
      await userEvent.clear(tenor);
      await userEvent.type(tenor, '30');
      await userEvent.tab();
      expect(screen.getByText('The longest tenor you can take is 24 months.')).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: 'Tenor slider' })).toHaveAttribute('aria-valuenow', '24');
    });
  });

  describe('reactive checks: the box always describes the values on screen', () => {
    // A stand-in for the API: the same calculator, and checks for exactly the values sent.
    const MAX = app.product.maxAmount;
    const evaluate = (body) => {
      const q = quote({ amount: body.amount || 0, tenor: body.tenor || 0, pay: app.payInputs, pricing: PRICING, startDay: '2026-11-03', maxTenor: 60, maxAmountCap: MAX });
      const checks = [];
      if (body.amount > MAX) checks.push(`The maximum for Personal Loan is TZS ${MAX.toLocaleString('en-US')}.`);
      if (body.tenor && (body.tenor < 6 || body.tenor > 60)) checks.push('Choose a tenor between 6 and 60 months.');
      if (body.amount && body.tenor && !q.pass) checks.push(`The instalment of TZS ${q.instalment.toLocaleString('en-US')} is above what your combined limit leaves.`);
      return { ...app, amount: body.amount, tenor: body.tenor, purpose: body.purpose, checks: { eligibility: [], fieldErrors: {}, checks, canSubmit: !checks.length } };
    };
    const patch = (config) => [200, { data: evaluate(JSON.parse(config.data)) }];
    const WAIT = { timeout: 3000 };
    // The box, whether its checks are current or being redone.
    const box = () => screen.queryByText('Fix this before you continue') || screen.queryByText('Checking your changes…');
    const setAmount = async (n) => {
      const amount = screen.getByRole('textbox', { name: /Amount/ });
      await userEvent.clear(amount);
      await userEvent.type(amount, String(n));
    };
    const setTenor = async (n) => {
      const tenor = screen.getByRole('spinbutton', { name: /Tenor/ });
      await userEvent.clear(tenor);
      await userEvent.type(tenor, String(n));
    };
    const open = async (routes = {}) => {
      const calls = stubHttp({ 'GET /applications/a1': () => [200, { data: app }], 'PATCH /applications/a1': patch, ...routes });
      renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
      await screen.findByText('136,900');
      return calls;
    };

    it('1: an amount over the product maximum is flagged, and the message goes once it is lowered', async () => {
      await open();
      await setAmount(350000000);
      expect(await screen.findByText('The maximum for Personal Loan is TZS 300,000,000.', {}, WAIT)).toBeInTheDocument();
      await setAmount(4500000);
      await waitFor(() => expect(box()).not.toBeInTheDocument(), WAIT);
      expect(screen.queryByText(/The maximum for Personal Loan/)).not.toBeInTheDocument();
    });

    it('2: an unaffordable instalment is flagged, and recalculated away by a longer tenor', async () => {
      await open();
      await setAmount(20000000);
      await setTenor(12);
      expect(await screen.findByText(/^The instalment of TZS/, {}, WAIT)).toBeInTheDocument();
      await setTenor(60);
      await waitFor(() => expect(box()).not.toBeInTheDocument(), WAIT);
      expect(screen.getByText(/below your limit/)).toBeInTheDocument();
    });

    it('3: a tenor outside the range is flagged, and cleared when corrected', async () => {
      await open();
      await setTenor(72);
      await userEvent.tab();
      expect(await screen.findByText('Choose a tenor between 6 and 60 months.', {}, WAIT)).toBeInTheDocument();
      expect(screen.getByText('The longest tenor you can take is 60 months.')).toBeInTheDocument();
      await setTenor(24);
      await waitFor(() => expect(box()).not.toBeInTheDocument(), WAIT);
      expect(screen.queryByText('The longest tenor you can take is 60 months.')).not.toBeInTheDocument();
    });

    it('4: with two problems, fixing one leaves the other; fixing both removes the box', async () => {
      await open();
      await setAmount(350000000);
      await setTenor(72);
      expect(await screen.findByText('Choose a tenor between 6 and 60 months.', {}, WAIT)).toBeInTheDocument();
      expect(screen.getByText('The maximum for Personal Loan is TZS 300,000,000.')).toBeInTheDocument();
      await setTenor(60);
      await waitFor(() => expect(screen.queryByText('Choose a tenor between 6 and 60 months.')).not.toBeInTheDocument(), WAIT);
      expect(screen.getByText('The maximum for Personal Loan is TZS 300,000,000.')).toBeInTheDocument();
      await waitFor(() => expect(box()).toBeInTheDocument(), WAIT);
      await setAmount(4500000);
      await waitFor(() => expect(box()).not.toBeInTheDocument(), WAIT);
    });

    it('5: Continue is refused while a check fails and goes through once corrected', async () => {
      await open();
      await setAmount(350000000);
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(await screen.findByText('Fix this before you continue')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Supporting documents' })).not.toBeInTheDocument();
      await setAmount(4500000);
      const go = screen.getByRole('button', { name: 'Continue' });
      expect(go).toBeEnabled();
      await userEvent.click(go);
      expect(await screen.findByRole('button', { name: 'Continue to agreement' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Supporting documents' })).not.toBeInTheDocument();
    });

    it('6: a slow answer for older values never replaces the answer for newer ones', async () => {
      let release;
      const slow = new Promise((r) => { release = r; });
      let n = 0;
      await open({
        'PATCH /applications/a1': async (config) => {
          n += 1;
          if (n === 1) await slow; // the answer for 350,000,000 arrives last
          return patch(config);
        },
      });
      await setAmount(350000000);
      await waitFor(() => expect(n).toBe(1), WAIT);
      await setAmount(4500000);
      await waitFor(() => expect(n).toBe(2), WAIT);
      release();
      await new Promise((r) => { setTimeout(r, 100); });
      expect(screen.queryByText(/The maximum for Personal Loan/)).not.toBeInTheDocument();
      expect(box()).not.toBeInTheDocument();
    });

    it('a save that fails is reported, not hidden behind the last checks, and can be retried', async () => {
      let down = true;
      await open({ 'PATCH /applications/a1': (config) => (down ? [503, { message: 'The database is not available.', code: 'UNAVAILABLE' }] : patch(config)) });
      await setAmount(350000000);
      expect(await screen.findByText('Your latest changes are not saved or checked yet', {}, WAIT)).toBeInTheDocument();
      expect(box()).not.toBeInTheDocument();
      down = false;
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('The maximum for Personal Loan is TZS 300,000,000.', {}, WAIT)).toBeInTheDocument();
      expect(screen.queryByText('Your latest changes are not saved or checked yet')).not.toBeInTheDocument();
    });
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
    expect(sign).toBeEnabled();
    await userEvent.click(sign);
    const body = JSON.parse(calls.find((c) => c.key === 'POST /applications/a1/sign-and-submit').config.data);
    expect(body).not.toHaveProperty('password');
    expect(body).toMatchObject({ consents: { truth: true, deduct: true, crb: true, sms: true }, accepted: true, dataProtection: true, dataProtectionVersion: 'DP-2026-1', scrolledToEnd: true, textSha256: 'f'.repeat(64) });
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('an agreement with its own declarations is signed by ticking exactly those', async () => {
    const english = {
      ...preview,
      template: { version: '2026.12', sample: false, language: 'en' },
      language: 'en',
      dataProtection: { version: 'DP-2026-1', language: 'en', title: 'Data protection', body: 'I consent to Letshego Faidika Bank collecting my data.', checkbox: 'I have read and accept the data protection notice.', fallbackNotice: null },
      blocks: [
        { type: 'h1', parts: [{ text: 'STAFF LOAN AGREEMENT' }] },
        { type: 'h2', parts: [{ text: 'DECLARATIONS' }] },
        { type: 'declaration', parts: [{ text: 'I have read this Staff Loan Agreement in full.' }] },
        { type: 'declaration', parts: [{ text: 'I agree to sign this Agreement electronically.' }] },
      ],
    };
    const calls = stubHttp({
      'GET /applications/a1': () => [200, { data: app }],
      'PATCH /applications/a1': () => [200, { data: app }],
      'GET /applications/a1/agreement/preview': () => [200, { data: english }],
      'POST /applications/a1/sign-and-submit': () => [200, { data: { ...app, status: 'pending_credit' } }],
    });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    await toSignStep();
    expect(screen.getByLabelText('Loan agreement text')).toHaveAttribute('lang', 'en');
    // The two declarations, the acceptance and the data protection notice; the four standard statements are not shown.
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(screen.getByRole('checkbox', { name: 'I have read this Staff Loan Agreement in full.' })).toBeInTheDocument();
    expect(screen.queryByText(/receive SMS/)).toBeNull();
    const sign = screen.getByRole('button', { name: 'Sign agreement and submit' });
    await userEvent.click(screen.getByRole('checkbox', { name: 'I have read this Staff Loan Agreement in full.' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /I have read, understood and accept/ }));
    expect(sign).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'I agree to sign this Agreement electronically.' }));
    // D-108: signing waits for the data protection notice's own box.
    expect(sign).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'I have read and accept the data protection notice.' }));
    expect(sign).toBeEnabled();
    // D-109: an English agreement shows its statements in English only.
    expect(screen.queryByText(/Nimesoma/)).toBeNull();
    await userEvent.click(sign);
    const body = JSON.parse(calls.find((c) => c.key === 'POST /applications/a1/sign-and-submit').config.data);
    expect(body).toMatchObject({ declarations: [true, true], accepted: true, dataProtection: true, textSha256: 'f'.repeat(64) });
    expect(body).not.toHaveProperty('consents');
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

  it('shows submission errors without requiring a second password', async () => {
    stubHttp({
      'GET /applications/a1': () => [200, { data: app }],
      'PATCH /applications/a1': () => [200, { data: app }],
      'GET /applications/a1/agreement/preview': () => [200, { data: preview }],
      'POST /applications/a1/sign-and-submit': () => [409, { code: 'AGREEMENT_CHANGED', message: 'The agreement changed. Read it again.' }],
    });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    await toSignStep();
    for (const cb of screen.getAllByRole('checkbox')) await userEvent.click(cb);
    await userEvent.click(screen.getByRole('button', { name: 'Sign agreement and submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The agreement changed. Read it again.');
    expect(within(screen.getByLabelText('Loan agreement text')).getByText('Tshs 4,500,000')).toBeInTheDocument();
  });
});

describe('draft cancellation failure handling (SLAS-003)', () => {
  it('stays on the draft and shows an error when withdrawal fails', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    try {
      const calls = stubHttp({
        'GET /applications/a1': () => [200, { data: app }],
        'POST /applications/a1/withdraw': () => [500, { message: 'Withdrawal unavailable' }],
      });
      renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
      await userEvent.click(await screen.findByRole('button', { name: 'Cancel application' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/Withdrawal unavailable|Request failed/i);
      expect(screen.getByRole('button', { name: 'Cancel application' })).toBeInTheDocument();
      expect(calls.some((c) => c.key === 'POST /applications/a1/withdraw')).toBe(true);
    } finally {
      window.confirm = originalConfirm;
    }
  });
});

describe('documents only for products that need them', () => {
  const INVOICE = { code: 'invoice', name: 'Invoice', description: '', mandatory: true, minFiles: 1, maxFiles: 2, allowedTypes: ['pdf'], maxFileMb: 10, displayOrder: 0, active: true };
  const carLoan = {
    ...app,
    product: { ...app.product, name: 'Staff Car Loan', topUpAllowed: false, requiredDocuments: [INVOICE] },
    documents: [{ id: 'd1', originalName: 'invoice.pdf', documentCode: 'invoice', size: 1000, mime: 'application/pdf' }],
  };
  const open = (data) => {
    stubHttp({ 'GET /applications/a1': () => [200, { data }], 'PATCH /applications/a1': () => [200, { data }] });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
  };
  const documentsCard = () => screen.queryByRole('heading', { name: 'Documents' });

  it('a product without required documents: Continue goes straight to a Review with no Documents card', async () => {
    open(app);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('button', { name: 'Continue to documents' })).toBeNull();
    expect(await screen.findByRole('button', { name: 'Continue to agreement' })).toBeInTheDocument();
    expect(documentsCard()).toBeNull();
    expect(screen.queryByText('None attached')).toBeNull();
  });

  it('documents: says what is needed and flags a missing one only after Review application', async () => {
    open({ ...carLoan, documents: [] });
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to documents' }));
    expect(await screen.findByText('Add at least 1 file (up to 2)')).toBeInTheDocument();
    expect(screen.getByText('Add Invoice to continue.')).toBeInTheDocument();
    expect(screen.queryByText('Required document missing')).toBeNull();
    expect(screen.queryByText('No supporting documents attached.')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Review application' }));
    expect(screen.getByText('Required document missing')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue to agreement' })).toBeNull();
  });

  it('documents: each file is listed once, under its requirement', async () => {
    open(carLoan);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to documents' }));
    expect(await screen.findByText('1 file added ✓ (up to 2)')).toBeInTheDocument();
    expect(screen.getAllByText('invoice.pdf')).toHaveLength(1);
    expect(screen.queryByRole('columnheader', { name: 'Uploaded by' })).toBeNull();
  });

  it('a product with required documents keeps the documents step and the Documents card', async () => {
    open(carLoan);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to documents' }));
    expect(await screen.findByText('Supporting documents')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Review application' }));
    await screen.findByRole('button', { name: 'Continue to agreement' });
    const card = documentsCard().closest('.MuiCard-root');
    expect(within(card).getByText('invoice.pdf')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});

describe('correcting a returned application', () => {
  it('shows what the reviewer asked for at the top of the form', async () => {
    const returned = {
      ...app,
      status: 'returned',
      route: { key: 'nonmgmt', stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] },
      history: [{ action: 'return', stage: 'credit', at: '2026-11-20T06:00:00Z', comment: 'Add the CRDB loan under other loans.' }],
    };
    stubHttp({ 'GET /applications/a1': () => [200, { data: returned }], 'PATCH /applications/a1': () => [200, { data: returned }] });
    renderAt('/apply/a1', '/apply/:id', <ApplyWizardPage />, { permissions: ['loan.apply'] });
    expect(await screen.findByText('Returned by the Credit Analyst on 20 Nov 2026')).toBeInTheDocument();
    expect(screen.getByText('Add the CRDB loan under other loans.')).toBeInTheDocument();
  });
});
