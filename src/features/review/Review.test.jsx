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
  panel: { stage: 'credit', stageLabel: 'Credit Analyst', isFinal: false, nextStageLabel: 'Head of HR', needsCrb: true, canRecommend: false, needsHrChecks: false, needsProbationCheck: false, crbOutcomes: ['Clear', 'Adverse: minor', 'Adverse: serious', 'No record found'] },
};

describe('review screen', () => {
  it('the Credit Analyst sees first name, surname, NIDA and mobile only (D-86)', async () => {
    stubHttp({ 'GET /review/r1': () => [200, { data: limited }] });
    renderAt('/review/r1', '/review/:id', <ReviewPage />, { permissions: ['review.credit'] });
    expect(await screen.findByText('Identity details for the credit bureau check')).toBeInTheDocument();
    expect(screen.getByText('Daniel')).toBeInTheDocument();
    expect(screen.getByText('Mrema')).toBeInTheDocument();
    expect(screen.queryByText(/route/i)).toBeNull();
    expect(screen.getByText('+255 754 067 390')).toBeInTheDocument();
    expect(screen.getByText('19801211-10067-00007-27')).toBeInTheDocument();
    expect(screen.getByText('Product, amount, tenor, instalment and purpose')).toBeInTheDocument();
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
    await userEvent.click(within(screen.getByRole('listbox')).getByText('Clear'));
    await userEvent.click(screen.getByRole('button', { name: 'Approve application' }));
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
    const body = JSON.parse(calls.find((c) => c.key === 'POST /review/r1/decision').config.data);
    expect(body).toMatchObject({ action: 'approve', crb: { outcome: 'Clear' } });
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
    await userEvent.click(within(screen.getByRole('listbox')).getByText('Clear'));
    expect(screen.queryByText('Record the credit bureau outcome before approving.')).toBeNull();
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
