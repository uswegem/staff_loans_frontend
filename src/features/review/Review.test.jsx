import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewPage from './ReviewPage';
import QueuePage from './QueuePage';
import { renderAt } from '../../test/render';
import { stubHttp } from '../../test/http';

const limited = {
  id: 'r1',
  ref: 'SL-2026-00028',
  limited: true,
  status: 'pending_credit',
  statusLabel: 'Pending Credit Review',
  currentStage: 'credit',
  due: { overdue: false, hoursLeft: 6.8, hoursOverdue: 0, targetHours: 8 },
  submittedAt: '2026-10-29T08:00:00Z',
  applicant: { firstName: 'Daniel', lastName: 'Mrema', mobile: '+255 754 067 390', nida: '19801211-10067-00007-27' },
  crb: null,
  myDecisions: [],
  panel: { stage: 'credit', stageLabel: 'Credit Analyst', isFinal: false, nextStageLabel: 'Head of HR', needsCrb: true, canRecommend: false, needsHrChecks: false, needsProbationCheck: false, crbOutcomes: ['Low Risk', 'Average Risk', 'High Risk', 'No Record Found'] },
};

// An application at the Head of HR, decided by Credit before D-99: an old outcome and both notes.
const full = {
  id: 'r2',
  ref: 'SL-2026-00031',
  limited: false,
  status: 'pending_hr',
  statusLabel: 'Pending HR Review',
  currentStage: 'hr',
  due: { overdue: false, hoursLeft: 5, hoursOverdue: 0, targetHours: 8 },
  route: { key: 'nonmgmt', label: 'Non-management staff', stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'], limitedCredit: false },
  cycle: 1,
  submittedAt: '2026-10-29T08:00:00Z',
  product: { name: 'Personal Loan', version: 1, fields: [] },
  amount: 4500000,
  tenor: 36,
  purpose: 'Furniture',
  productFields: {},
  topUp: { on: false },
  probation: { onProbation: false },
  recommended: null,
  calcAtSubmission: null,
  checks: [],
  ruleFlags: [],
  crb: { outcome: 'Adverse: minor', reportDate: '2026-10-28', fileId: null },
  appraisalNote: 'Stable repayment history.',
  arrearsNote: 'One month in arrears on the 2024 loan, now cleared.',
  hrChecks: null,
  applicant: { fullName: 'Neema Mushi', staffNo: 'LFB0412', title: 'Customer Service Officer', department: 'Branch Network', station: 'Mwanza Branch', category: 'Non-management', employmentType: null, dateJoined: '2019-03-04', retirementDate: '2049-07-12', nida: '19890712-14112-00004-21', mobile: '+255713448902', nextOfKin: null, existingLfbLoans: [], runningLoans: [] },
  documents: [],
  payslip: { fileId: 'f1', originalName: 'payslip.pdf', payDate: '2026-10-25', basic: 1850000, lfbDeductions: 0, lfbLines: [] },
  crbReport: null,
  agreements: [],
  history: [],
  panel: { stage: 'hr', stageLabel: 'Head of HR', isFinal: false, nextStageLabel: 'CEO', needsCrb: false, canRecommend: false, needsHrChecks: true, needsProbationCheck: false, crbOutcomes: ['Low Risk', 'Average Risk', 'High Risk', 'No Record Found'] },
};

describe('review screen', () => {
  it('the Credit Analyst sees first name, surname, NIDA and mobile only (D-86)', async () => {
    stubHttp({ 'GET /review/r1': () => [200, { data: limited }] });
    renderAt('/review/r1', '/review/:id', <ReviewPage />, { permissions: ['review.credit'] });
    expect(await screen.findByText('Details for the credit bureau check')).toBeInTheDocument();
    // D-99: no explanation card and no "not shared" list; the API still sends identity only.
    expect(screen.queryByText('Identity details for the credit bureau check')).toBeNull();
    expect(screen.queryByText('Not shared with the Credit Analyst')).toBeNull();
    expect(screen.getByText('Daniel')).toBeInTheDocument();
    expect(screen.getByText('Mrema')).toBeInTheDocument();
    expect(screen.queryByText(/route/i)).toBeNull();
    expect(screen.getByText('+255 754 067 390')).toBeInTheDocument();
    expect(screen.getByText('19801211-10067-00007-27')).toBeInTheDocument();
    expect(screen.queryByText('Product, amount, tenor, instalment and purpose')).toBeNull();
    expect(screen.queryByLabelText(/Recommended amount/)).toBeNull();
    expect(screen.queryByText(/Affordability/)).toBeNull();
  });

  it('the Credit Analyst must record the bureau outcome to approve, and comment to return', async () => {
    const calls = stubHttp({
      'GET /review/r1': () => [200, { data: limited }],
      'POST /review/r1/decision': () => [200, { data: { outcome: 'moved', application: limited } }],
    });
    renderAt('/review/r1', '/review/:id', <ReviewPage />, { permissions: ['review.credit'] });
    await screen.findByText('Your decision');
    await userEvent.click(screen.getByRole('radio', { name: /Return for correction/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Return to applicant' }));
    expect(screen.getByText('Add a comment so the applicant knows what to do.')).toHaveAttribute('role', 'alert');
    await userEvent.click(screen.getByRole('radio', { name: /^Approve/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Approve application' }));
    expect(screen.getByText('Record the credit bureau outcome before approving.')).toHaveAttribute('role', 'alert');
    await userEvent.click(screen.getByRole('combobox', { name: /Outcome/ }));
    await userEvent.click(within(screen.getByRole('listbox')).getByText('Low Risk'));
    await userEvent.click(screen.getByRole('button', { name: 'Approve application' }));
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
    const body = JSON.parse(calls.find((c) => c.key === 'POST /review/r1/decision').config.data);
    expect(body).toMatchObject({ action: 'approve', crb: { outcome: 'Low Risk' } });
    expect(body.recommended).toBeUndefined();
  });

  it('a decision message follows the choices: it goes once what it asks for is done (reactive)', async () => {
    stubHttp({ 'GET /review/r1': () => [200, { data: limited }] });
    renderAt('/review/r1', '/review/:id', <ReviewPage />, { permissions: ['review.credit'] });
    await screen.findByText('Your decision');
    await userEvent.click(screen.getByRole('radio', { name: /Return for correction/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Return to applicant' }));
    expect(screen.getByText('Add a comment so the applicant knows what to do.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Comment/), 'Attach a newer payslip.');
    expect(screen.queryByText('Add a comment so the applicant knows what to do.')).toBeNull();
    // A different choice brings up its own requirement straight away.
    await userEvent.click(screen.getByRole('radio', { name: /^Approve/ }));
    expect(screen.getByText('Record the credit bureau outcome before approving.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: /Outcome/ }));
    await userEvent.click(within(screen.getByRole('listbox')).getByText('Low Risk'));
    expect(screen.queryByText('Record the credit bureau outcome before approving.')).toBeNull();
  });

  it('offers exactly the four outcomes and no appraisal or arrears note, and sends neither (D-99)', async () => {
    const calls = stubHttp({
      'GET /review/r1': () => [200, { data: { ...limited, crb: { outcome: 'Clear', reportDate: '2026-10-20' } } }],
      'POST /review/r1/decision': () => [200, { data: { outcome: 'moved', application: limited } }],
    });
    renderAt('/review/r1', '/review/:id', <ReviewPage />, { permissions: ['review.credit'] });
    await screen.findByText('Your decision');
    expect(screen.queryByLabelText(/Appraisal note/)).toBeNull();
    expect(screen.queryByLabelText(/Arrears/)).toBeNull();
    expect(screen.getByText('Report (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Report date/)).toBeInTheDocument();
    // An outcome recorded before D-99 is not offered again.
    expect(screen.getByRole('combobox', { name: /Outcome/ })).not.toHaveTextContent('Clear');
    await userEvent.click(screen.getByRole('combobox', { name: /Outcome/ }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Low Risk', 'Average Risk', 'High Risk', 'No Record Found']);
    await userEvent.click(within(screen.getByRole('listbox')).getByText('High Risk'));
    await userEvent.click(screen.getByRole('radio', { name: /^Approve/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Approve application' }));
    await screen.findByText('Elsewhere');
    const body = JSON.parse(calls.find((c) => c.key === 'POST /review/r1/decision').config.data);
    expect(body.crb.outcome).toBe('High Risk');
    expect(body).not.toHaveProperty('appraisalNote');
    expect(body).not.toHaveProperty('arrearsNote');
  });

  it('a later approver still sees an outcome and notes recorded before D-99, and confirms Basic Pay from the payslip (D-100)', async () => {
    stubHttp({ 'GET /review/r2': () => [200, { data: full }] });
    renderAt('/review/r2', '/review/:id', <ReviewPage />, { permissions: ['review.hr'] });
    expect(await screen.findByText('Adverse: minor, 28 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Stable repayment history.')).toBeInTheDocument();
    expect(screen.getByText('One month in arrears on the 2024 loan, now cleared.')).toBeInTheDocument();
    expect(screen.getByLabelText('Basic Pay of TZS 1,850,000 confirmed from the attached payslip')).toBeInTheDocument();
    expect(screen.getByLabelText('Employment is active')).toBeInTheDocument();
    expect(screen.queryByText(/staff record:/)).toBeNull();
  });

  it('explains when the reviewer is the applicant', async () => {
    stubHttp({ 'GET /review/r1': () => [403, { code: 'SELF_REVIEW', message: 'You cannot review your own application.' }] });
    renderAt('/review/r1', '/review/:id', <ReviewPage />, { permissions: ['review.ceo'] });
    expect(await screen.findByText('This is your own application')).toBeInTheDocument();
  });
});

describe('review queue', () => {
  it('limited rows hide the terms', async () => {
    stubHttp({
      'GET /queue': () => [
        200,
        {
          data: {
            tab: 'waiting',
            counts: { waiting: 2, overdue: 1 },
            covering: [],
            items: [
              { id: 'r1', ref: 'SL-2026-00028', limited: true, stageLabel: 'Credit Analyst', route: { key: 'mgmt', label: 'Management staff' }, applicant: { fullName: 'Daniel Mrema' }, due: { overdue: false, hoursLeft: 6.8 } },
              { id: 'r2', ref: 'SL-2026-00030', limited: false, stageLabel: 'Credit Analyst', route: { key: 'nonmgmt', label: 'Non-management staff' }, applicant: { fullName: 'Salma Hamisi', title: 'Senior Teller', category: 'Non-management' }, product: 'Salary Advance', amount: 600000, tenor: 3, due: { overdue: true, hoursOverdue: 1.5 } },
            ],
          },
        },
      ],
    });
    renderAt('/queue', '/queue', <QueuePage />, { permissions: ['review.credit'] });
    const limitedRow = (await screen.findByText('SL-2026-00028')).closest('tr');
    expect(within(limitedRow).getByText('Limited details')).toBeInTheDocument();
    expect(within(limitedRow).queryByText(/TZS|\d{1,3},\d{3}/)).toBeNull();
    const row = screen.getByText('SL-2026-00030').closest('tr');
    expect(within(row).getByText('600,000')).toBeInTheDocument();
    expect(within(row).getByText('Overdue by 1 h 30 min')).toBeInTheDocument();
  });
});
