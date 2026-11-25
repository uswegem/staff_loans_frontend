// Apply, step 1: the compact loan facility cards. Each card shows its product's own figures,
// one card at a time is chosen, and the chosen product's limits carry into the loan details.

import { test, expect } from '@playwright/test';
import { as } from './helpers';

const ROWS = ['Maximum Amount', 'Minimum Amount', 'Term (Months)', 'Processing Fee', 'Insurance'];

test('facility cards: structure, equal heights, choosing one, and its limits on the next step', async ({ browser }) => {
  const page = await as(browser, 'LFB0318');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/apply');
  const group = page.getByRole('radiogroup', { name: 'Choose a loan' });
  const cards = group.getByRole('radio');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(2);

  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    /* eslint-disable no-await-in-loop */
    await expect(card).toHaveAttribute('aria-checked', 'false');
    await expect(card.locator('svg[data-icon]').first()).toHaveAttribute('aria-hidden', 'true');
    await expect(card.getByText(/^Rate\s+\d+(\.\d+)?% p\.a\.\s+\(Reducing Balance\)$/)).toBeVisible();
    expect(await card.locator('dt').allTextContents()).toEqual(ROWS);
    await expect(card.getByText('Your maximum eligibility is calculated after payslip upload.')).toBeVisible();
    await expect(card).not.toContainText(/undefined|NaN|financing facility/i);
    /* eslint-enable no-await-in-loop */
  }

  // Equal heights along a row of the grid.
  const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(Math.abs(a.height - b.height)).toBeLessThan(2);

  // Choose the Housing / Education Loan: its limits carry into the loan details.
  const housing = group.getByRole('radio', { name: /^Housing \/ Education Loan/ });
  const max = (await housing.locator('dt:text-is("Maximum Amount") + dd').textContent()).replace(/^TZS\s*/, '');
  const term = await housing.locator('dt:text-is("Term (Months)") + dd').textContent();
  const maxTenor = term.split('–').pop();
  await housing.click();
  await expect(page).toHaveURL(/\/apply\/[0-9a-f]{24}/);
  const draftUrl = page.url();
  await expect(page.getByLabel('Amount')).toHaveValue(max);
  await expect(page.getByRole('slider', { name: 'Tenor slider' })).toHaveAttribute('aria-valuemax', maxTenor);

  // Back on step 1 the chosen product is held by the open draft, which continues where it was.
  await page.goto('/apply');
  await expect(group.getByRole('radio', { name: /^Housing \/ Education Loan/ })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('link', { name: 'Continue it' }).click();
  await expect(page).toHaveURL(draftUrl);
  await expect(page.getByLabel('Amount')).toHaveValue(max);
});

test('facility cards fit a phone without sideways scrolling', async ({ browser }) => {
  const page = await as(browser, 'LFB0318');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/apply');
  await expect(page.getByRole('radiogroup', { name: 'Choose a loan' }).getByRole('radio').first()).toBeVisible();
  const overflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // One column: every card is as wide as the first.
  const widths = await page.getByRole('radiogroup', { name: 'Choose a loan' }).getByRole('radio').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(new Set(widths).size).toBe(1);
});
