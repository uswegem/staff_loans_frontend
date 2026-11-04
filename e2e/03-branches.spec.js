// The return branch (FR-15, FR-11). Recommendations, and with them revised terms, are gone (D-86).

import { test, expect } from '@playwright/test';
import { as, startApplication, signAndSubmit, openFromQueue, decide } from './helpers';

test('returned for correction, corrected and resubmitted with a new agreement', async ({ browser }) => {
  const salma = await as(browser, 'LFB0377');
  await startApplication(salma, { staffNo: 'LFB0377', product: 'Personal Loan', amount: 5000000, tenor: 24, purpose: 'Kitchen renovation' });
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
  await expect(juma.getByText('Details for the credit bureau check')).toBeVisible();
});
