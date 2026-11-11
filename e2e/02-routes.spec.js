// One run per approval route (BRD 7.1 to 7.3; prompt 7, milestone 8). The
// non-management route is the guided journey. On every route the Credit Analyst sees
// identity details only (FR-55, D-86), checked here on the screen he works from.

import { test, expect } from '@playwright/test';
import { as, startApplication, signAndSubmit, openFromQueue, decide, approveAll } from './helpers';

/** Juma's identity-only review: first name, surname, NIDA and mobile; bureau result only. */
async function limitedCredit(browser, ref, { amount, purpose }) {
  const juma = await as(browser, 'LFB0233');
  await juma.goto('/queue');
  const row = juma.getByRole('row').filter({ hasText: ref });
  await expect(row.getByText('Limited details')).toBeVisible();
  // D-102 permits requested terms but not salary or payslip information.
  await expect(row).toContainText(amount.toLocaleString('en-US'));
  await openFromQueue(juma, ref);
  await expect(juma.getByText('Details for the credit bureau check')).toBeVisible();
  await expect(juma.getByText(purpose)).toBeVisible();
  await expect(juma.getByText(`TZS ${amount.toLocaleString('en-US')}`)).toBeVisible();
  await expect(juma.getByText('Payslip', { exact: true })).toHaveCount(0);
  await expect(juma.getByText('Basic Pay', { exact: true })).toHaveCount(0);
  await expect(juma.getByLabel(/Recommended/)).toHaveCount(0);
  await decide(juma, { action: 'approve', crb: true, comment: 'Bureau clear on name, mobile and NIDA.' });
  await juma.context().close();
}

async function apply(browser, staffNo, terms) {
  const page = await as(browser, staffNo);
  await startApplication(page, { staffNo, ...terms });
  const out = await signAndSubmit(page);
  return { ...out, page };
}

test('management staff: Credit Analyst (limited), Head of HR, CEO', async ({ browser }) => {
  const terms = { product: 'Personal Loan', amount: 12000000, tenor: 36, purpose: 'Solar installation at home' };
  const { ref, url, page: daniel } = await apply(browser, 'LFB0067', terms);
  await limitedCredit(browser, ref, terms);
  await approveAll(browser, ref, [
    { staffNo: 'LFB0051', hrChecks: true, comment: 'Employment confirmed.' },
    { staffNo: 'LFB0002', comment: 'Approved.' },
  ]);
  await daniel.goto(url);
  await expect(daniel.getByText('Pending Disbursement').first()).toBeVisible();
});

test("CEO's own application: Credit Analyst (limited), then the Head of HR gives final approval", async ({ browser }) => {
  const terms = { product: 'Salary Advance', amount: 1500000, tenor: 2, purpose: 'Family event' };
  const { ref, url, page: joseph } = await apply(browser, 'LFB0002', terms);
  // The CEO never reviews his own application.
  await joseph.goto('/queue');
  await expect(joseph.getByRole('cell', { name: ref, exact: true })).toHaveCount(0);
  await limitedCredit(browser, ref, terms);
  const grace = await as(browser, 'LFB0051');
  await openFromQueue(grace, ref);
  await expect(grace.getByText(/final approval/i).first()).toBeVisible();
  await decide(grace, { action: 'approve', hrChecks: true, comment: 'Approved on behalf of the Board policy.' });
  await joseph.goto(url);
  await expect(joseph.getByText('Pending Disbursement').first()).toBeVisible();
});

test('Head of People and Culture: Credit Analyst (limited), P&C Manager, CEO', async ({ browser }) => {
  const terms = { product: 'Personal Loan', amount: 9000000, tenor: 24, purpose: 'Postgraduate fees' };
  const { ref, url, page: grace } = await apply(browser, 'LFB0051', terms);
  await grace.goto('/queue');
  await expect(grace.getByRole('cell', { name: ref, exact: true })).toHaveCount(0);
  await limitedCredit(browser, ref, terms);
  await approveAll(browser, ref, [
    { staffNo: 'LFB0129', hrChecks: true, comment: 'Employment and salary confirmed.' },
    { staffNo: 'LFB0002', comment: 'Approved.' },
  ]);
  await grace.goto(url);
  await expect(grace.getByText('Pending Disbursement').first()).toBeVisible();
});
