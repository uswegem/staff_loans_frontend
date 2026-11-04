// Regression: a new staff identity must never inherit the previous user's draft.
import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

test('switching staff accounts in the same browser denies the previous draft', async ({ page }) => {
  // Fictional seeded staff accounts, not production employee records.
  await signIn(page, 'LFB0377');
  await page.goto('/apply');
  await page.getByRole('button', { name: /^Personal Loan/ }).click();
  await expect(page).toHaveURL(/\/apply\/[0-9a-f]{24}/);
  const previousDraftUrl = page.url();

  await page.getByRole('button', { name: /Account menu for/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, 'LFB0067');
  await page.goto(previousDraftUrl);
  await expect(page.getByRole('heading', { name: /Page not found|Application not found/i }).or(page.getByRole('alert'))).toBeVisible();
  await expect(page.getByText('LFB0377')).toHaveCount(0);
});
