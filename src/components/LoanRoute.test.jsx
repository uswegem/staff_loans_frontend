import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import LoanRoute, { routeSteps } from './LoanRoute';
import { renderAt } from '../test/render';
import { statusLabel } from '../lib/statuses';

// D-103: the People and Culture stage, decided by the P&C Manager or the Head of P&C.
const route = { key: 'nonmgmt', stages: ['credit', 'pc', 'ceo'], stageLabels: ['Credit Analyst', 'People and Culture', 'CEO'] };

describe('loan route with the People and Culture stage', () => {
  it('marks the People and Culture stage as current while it waits there', () => {
    const steps = routeSteps({ route, status: 'pending_pc' });
    expect(steps.map((s) => [s.label, s.cls])).toEqual([
      ['Signed and submitted', 'done'],
      ['Credit Analyst', 'done'],
      ['People and Culture', 'now'],
      ['CEO', ''],
      ['Disbursed', ''],
    ]);
  });

  it('labels the new status', () => {
    expect(statusLabel('pending_pc')).toBe('Pending People and Culture Review');
  });

  it('still shows an application on the old route at the Head of HR', () => {
    const old = { key: 'nonmgmt', stages: ['credit', 'hr', 'ceo'], stageLabels: ['Credit Analyst', 'Head of HR', 'CEO'] };
    expect(routeSteps({ route: old, status: 'pending_hr' }).find((s) => s.cls === 'now').label).toBe('Head of HR');
  });
});

// D-112: after final approval the loan is in the Disbursement queue.
describe('loan route after final approval', () => {
  it.each(['pending_disbursement', 'pending_booking'])('%s shows "Disbursement" under the current step', (status) => {
    renderAt('/x', '/x', <LoanRoute app={{ route, status }} />);
    expect(screen.getByText('Disbursement')).toBeInTheDocument();
    expect(screen.queryByText('With OPS')).toBeNull();
  });
});
