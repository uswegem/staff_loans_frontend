import { describe, expect, it } from 'vitest';
import { routeSteps } from './LoanRoute';
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
      ['Booked', ''],
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
