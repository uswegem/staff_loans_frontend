import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import WorkflowPage from './WorkflowPage';
import { renderAt } from '../../../test/render';
import { stubHttp } from '../../../test/http';

const settings = {
  version: 1, stageTargetHours: 16, ceoTargetHours: 24, revisedTermsExpiryDays: 7, approvalSlaDays: 5, probationMonths: 6, firstDueDay: 25, payslipMaxAgeDays: 30,
  retirementAge: 60, retirementBufferDays: 30, dobMinAge: 18, dobMaxAge: 65, maxUploadMb: 10, inactivityTimeoutMin: 15, lockoutThreshold: 5,
  workingDays: [1, 2, 3, 4, 5], dayStartMinutes: 480, dayEndMinutes: 1020, payslipRules: { basicLabels: ['Basic Pay'], lfbLabels: ['LFB'], dateLabels: ['Pay date'] },
};

describe('Workflow and calendar', () => {
  it('has four sections (routes, calendar, payslips, agreement logo) and the new introduction', async () => {
    stubHttp({
      'GET /admin/settings': () => [200, { data: { settings, holidays: [], routes: [{ key: 'staff', label: 'Non-management staff', stages: ['Line manager'], limitedCredit: false }] } }],
      'GET /admin/settings/agreement-logo': () => [200, { data: { custom: false, fileId: null, originalName: 'lfb-logo.png', uploadedAt: null } }],
      'GET /admin/settings/agreement-logo/image': () => [200, new Blob(['png'], { type: 'image/png' })],
    });
    renderAt('/admin/workflow', '/admin/workflow', <WorkflowPage />, { permissions: ['admin.workflow'] });
    expect(await screen.findByText('The four approval routes. Targets count working hours on this calendar.')).toBeInTheDocument();
    const sections = screen.getAllByRole('region');
    expect(sections.map((s) => s.getAttribute('aria-labelledby'))).toEqual(['wf-routes', 'wf-calendar', 'wf-payslips', 'wf-logo']);
    expect(await screen.findByText('The default Letshego Faidika Bank logo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Replace logo/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Payslip reading' })).toBeInTheDocument();
    expect(screen.queryByText(/fixed by the BRD/)).toBeNull();
  });
});

describe('payslip age limit (D-111)', () => {
  it('the settings field allows at most 30 days and says so', async () => {
    const { screen: s } = await import('@testing-library/react');
    const userEvent = (await import('@testing-library/user-event')).default;
    stubHttp({
      'GET /admin/settings': () => [200, { data: { settings, holidays: [], routes: [] } }],
      'GET /admin/settings/agreement-logo': () => [200, { data: { custom: false } }],
      'GET /admin/settings/agreement-logo/image': () => [200, new Blob(['png'], { type: 'image/png' })],
    });
    renderAt('/admin/workflow', '/admin/workflow', <WorkflowPage />, { permissions: ['admin.workflow'] });
    expect(await s.findByText('Not older than 30 days at submission')).toBeInTheDocument();
    await userEvent.click(s.getByRole('button', { name: /^Edit/ }));
    const field = s.getByRole('spinbutton', { name: 'Payslip must not be older than (days)' });
    expect(field).toHaveAttribute('max', '30');
    expect(s.getByText('At most 30 days (policy).')).toBeInTheDocument();
  });
});
