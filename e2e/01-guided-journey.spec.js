// The prototype's guided journey (#/ "run the guided journey"): Rehema Ally goes from
// an incomplete profile to a disbursed loan on the non-management route (BRD 7.1).

import { test, expect } from '@playwright/test';
import { as, startApplication, signAndSubmit, openFromQueue, decide, disburse } from './helpers';

test('Rehema: complete profile, apply and sign, three approvals, disbursement', async ({ browser }) => {
  // 1. Complete the profile: Apply stays locked until every required detail is in (FR-05).
  const rehema = await as(browser, 'LFB0596');
  await rehema.goto('/apply');
  await expect(rehema.getByRole('link', { name: 'Complete profile' })).toBeVisible();
  await rehema.goto('/profile');

  await rehema.getByRole('combobox', { name: /Marital status/ }).click();
  await rehema.getByRole('option', { name: 'Single' }).click();
  await rehema.getByLabel(/Date of birth/).fill('1998-04-17');
  await rehema.getByLabel(/NIDA number/).fill('19980417-41101-00002-15');
  await rehema.getByLabel(/P\.O\. Box/).fill('P.O. Box 1120, Dodoma');
  await rehema.getByLabel(/Residence/).fill('Area D, Dodoma');
  await rehema.getByRole('button', { name: 'Save personal details' }).click();
  await expect(rehema.getByText('Saved.', { exact: true })).toBeVisible();

  await rehema.getByRole('tab', { name: /Bank details/ }).click();
  await rehema.getByLabel(/Account number/).fill('0170345678');
  await rehema.getByRole('button', { name: 'Save bank details' }).click();
  await expect(rehema.getByText('Saved.', { exact: true })).toBeVisible();

  await rehema.getByRole('tab', { name: /Next of kin/ }).click();
  await rehema.getByLabel(/Full name/).last().fill('Mariam Ally');
  await rehema.getByRole('combobox', { name: /Relationship/ }).click();
  await rehema.getByRole('option', { name: 'Parent' }).click();
  await rehema.getByLabel(/^Phone/).fill('+255 754 330 112');
  await rehema.getByLabel(/Residential address/).fill('Kikuyu, Dodoma');
  await rehema.getByRole('button', { name: 'Save next of kin' }).click();
  // Pay figures now come from the payslip attached when applying (D-80).
  await expect(rehema.getByText('Profile complete. You can now apply for a loan.')).toBeVisible();

  // 2. Apply for a Personal Loan of TZS 3,000,000 over 12 months: attach the payslip,
  //    see the limit worked out from it, and sign the agreement.
  await startApplication(rehema, { staffNo: 'LFB0596', product: 'Personal Loan', amount: 3000000, tenor: 12, purpose: 'Furniture for a new home' });
  await expect(rehema.getByText(/below your limit/).first()).toBeVisible();
  const { ref, url } = await signAndSubmit(rehema);
  await expect(rehema.getByText('Pending Credit Review').first()).toBeVisible();

  // 3. Credit Analyst, Head of People and Culture, CEO.
  const juma = await as(browser, 'LFB0233');
  await openFromQueue(juma, ref);
  await expect(juma.getByText('Rehema Ally').first()).toBeVisible();
  await decide(juma, { action: 'approve', crb: true, comment: 'Affordable; bureau clear.' });

  const grace = await as(browser, 'LFB0051');
  await openFromQueue(grace, ref);
  await decide(grace, { action: 'approve', hrChecks: true, comment: 'Employment and salary confirmed.' });

  const joseph = await as(browser, 'LFB0002');
  await openFromQueue(joseph, ref);
  await decide(joseph, { action: 'approve', comment: 'Approved.' });

  // The signed agreement is in force; OPS is told.
  await rehema.goto(url);
  await expect(rehema.getByText('in force').first()).toBeVisible();

  // 4. OPS disburses and confirms; the journey ends.
  await disburse(browser, ref, 'FT26303RA41');
  await rehema.goto(url);
  await expect(rehema.getByText(/Disbursed on/)).toBeVisible();
  await expect(rehema.getByRole('table', { name: 'Repayment schedule' })).toBeVisible();
  await rehema.goto('/notifications');
  await expect(rehema.getByText(`${ref}: your loan of TZS 3,000,000 has been disbursed`, { exact: false })).toBeVisible();
});
