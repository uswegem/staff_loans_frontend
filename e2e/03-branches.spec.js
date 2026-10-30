// The return branch (FR-15, FR-11) and the revised-terms branch (FR-16, FR-54).

import { test, expect } from '@playwright/test';
import { as, startApplication, signAndSubmit, openFromQueue, decide, approveAll, readAndSign, disburse } from './helpers';

test('returned for correction, corrected and resubmitted with a new agreement', async ({ browser }) => {
  const salma = await as(browser, 'LFB0377');
  await startApplication(salma, { product: 'Personal Loan', amount: 5000000, tenor: 24, purpose: 'Kitchen renovation' });
  const { ref, url } = await signAndSubmit(salma);

  const juma = await as(browser, 'LFB0233');
  await openFromQueue(juma, ref);
  await decide(juma, { action: 'return', comment: 'Lower the amount to TZS 4,000,000 to stay within your limit.' });

  await salma.goto(url);
  await expect(salma.getByText('Returned for correction').first()).toBeVisible();
  await expect(salma.getByText('Lower the amount to TZS 4,000,000 to stay within your limit.').first()).toBeVisible();
  await salma.getByRole('link', { name: 'Correct application' }).click();
  await salma.getByLabel('Amount').fill('4000000');
  const again = await signAndSubmit(salma, { resubmit: true });
  expect(again.ref).toBe(ref);
  await expect(salma.getByText('Pending Credit Review').first()).toBeVisible();
  // The first agreement is void; the new one is signed.
  await expect(salma.getByText(/void/).first()).toBeVisible();

  // Back at the first stage for the Credit Analyst.
  await openFromQueue(juma, ref);
  await expect(juma.getByText('4,000,000').first()).toBeVisible();
});

test('approved at revised terms: the applicant accepts a revised agreement, then OPS disburses', async ({ browser }) => {
  const faraji = await as(browser, 'LFB0188');
  await startApplication(faraji, { product: 'Personal Loan', amount: 8000000, tenor: 36, purpose: 'Plot purchase in Arusha' });
  const { ref, url } = await signAndSubmit(faraji);

  const juma = await as(browser, 'LFB0233');
  await openFromQueue(juma, ref);
  await decide(juma, { action: 'approve', crb: true, recommend: { amount: 6000000, reason: 'Keeps headroom for the running vehicle loan.' }, comment: 'Recommended at TZS 6,000,000.' });
  await approveAll(browser, ref, [
    { staffNo: 'LFB0051', hrChecks: true, comment: 'Employment confirmed.' },
    { staffNo: 'LFB0002', comment: 'Approved at the recommended amount.' },
  ]);

  await faraji.goto(url);
  await expect(faraji.getByText('Approved at revised terms')).toBeVisible();
  await faraji.getByRole('link', { name: 'Review revised terms' }).click();
  await expect(faraji.getByText('Keeps headroom for the running vehicle loan.').first()).toBeVisible();
  await readAndSign(faraji, 'Accept and sign');
  // The page moves to the application once the acceptance is saved.
  await expect(faraji).toHaveURL(/\/applications\/[0-9a-f]{24}$/);
  await expect(faraji.getByText('Pending Disbursement').first()).toBeVisible();
  await expect(faraji.getByText('TZS 6,000,000').first()).toBeVisible();

  await disburse(browser, ref, 'FT26303FN07');
  await faraji.goto(url);
  await expect(faraji.getByText(/Disbursed on/)).toBeVisible();
});
