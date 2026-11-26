import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ScheduleDownload from './ScheduleDownload';
import { renderAt } from '../test/render';

// D-110: Operations and Credit give the repayment schedule on request; nobody else sees the button.
describe('repayment schedule on request', () => {
  it.each([['disb.confirm'], ['review.credit'], ['products.approveCredit']])('%s sees it for an approved or disbursed loan', (perm) => {
    for (const status of ['pending_disbursement', 'disbursed']) {
      const { unmount } = renderAt('/x', '/x', <ScheduleDownload id="a1" reference="SL-1" status={status} />, { permissions: [perm] });
      expect(screen.getByRole('button', { name: 'Download repayment schedule' })).toBeInTheDocument();
      unmount();
    }
  });

  it('is not offered before final approval, to other roles, or to the applicant', () => {
    const { unmount } = renderAt('/x', '/x', <ScheduleDownload id="a1" reference="SL-1" status="pending_ceo" />, { permissions: ['disb.confirm'] });
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    const other = renderAt('/x', '/x', <ScheduleDownload id="a1" reference="SL-1" status="disbursed" />, { permissions: ['loan.apply', 'review.hr'] });
    expect(screen.queryByRole('button')).toBeNull();
    other.unmount();
    renderAt('/x', '/x', <ScheduleDownload id="a1" reference="SL-1" status="disbursed" applicantUserId="u-test" />, { permissions: ['review.credit'] });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
