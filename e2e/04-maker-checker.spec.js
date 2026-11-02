// Product maker-checker in two stages (FR-57 to FR-63, D-89): Peter prepares a change and
// cannot approve it; Asha (Head of Credit) approves first, then Daniel (Head of Risk and
// Compliance) publishes it; it goes live from today.

import { test, expect } from '@playwright/test';
import { as } from './helpers';

test('a product change needs the Head of Credit, then the Head of Risk and Compliance', async ({ browser }) => {
  const peter = await as(browser, 'LFB0274');
  await peter.goto('/admin/products');
  const row = peter.getByRole('row').filter({ hasText: 'Vehicle Loan' });
  await row.getByRole('button', { name: 'Change' }).click();
  const dialog = peter.getByRole('dialog');
  await dialog.getByLabel('Why this change').fill('Longer tenor agreed by the Credit Committee.');
  await dialog.getByRole('button', { name: 'Start draft' }).click();
  await expect(peter).toHaveURL(/\/admin\/products\/versions\/[0-9a-f]{24}/);
  const versionUrl = peter.url();

  await expect(peter.getByLabel(/Minimum number of Months Before Applying for Topup/)).toBeVisible();
  await expect(peter.getByText(/Debit from staff account/)).toHaveCount(0);
  await peter.getByLabel('Maximum tenor (months)').fill('96');
  await peter.getByRole('button', { name: 'Save draft' }).click();
  await expect(peter.getByText(/^Draft saved./)).toBeVisible();
  await expect(peter.getByRole('table', { name: 'Changes against the live version' })).toContainText('96');
  await peter.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(peter.getByText(/Waiting for the Head of Credit\. You prepared or edited this change/)).toBeVisible();
  await expect(peter.getByRole('button', { name: 'Approve' })).toHaveCount(0);

  const asha = await as(browser, 'LFB0010');
  await asha.goto('/admin/products');
  await expect(asha.getByText('Waiting for your approval')).toBeVisible();
  await asha.getByRole('link', { name: /Vehicle Loan \(VL\) version/ }).click();
  await expect(asha).toHaveURL(versionUrl);
  await expect(asha.getByText('Your approval sends it to the Head of Risk and Compliance.')).toBeVisible();
  await asha.getByRole('button', { name: 'Approve' }).click();
  await expect(asha.getByText(/Waiting for the Head of Risk and Compliance/)).toBeVisible();
  await expect(asha.getByRole('button', { name: 'Approve' })).toHaveCount(0);

  // Not live yet: staff still see 60 months.
  const aisha = await as(browser, 'LFB0451');
  await aisha.goto('/apply');
  await expect(aisha.getByRole('button', { name: /^Vehicle Loan/ })).not.toContainText('to 96 months');

  const daniel = await as(browser, 'LFB0067');
  await daniel.goto(versionUrl);
  await expect(daniel.getByText('Your approval publishes it on the effective date.')).toBeVisible();
  await daniel.getByRole('button', { name: 'Approve' }).click();
  await expect(daniel.getByText('Approved.').first()).toBeVisible();

  // Live from today: new applications see the longer tenor.
  await aisha.goto('/apply');
  await expect(aisha.getByRole('button', { name: /^Vehicle Loan/ })).toContainText('to 96 months');
});
