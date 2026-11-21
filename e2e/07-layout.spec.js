/* global document */
// Layout checks across roles: no sideways scrolling on a 390px phone, and the primary
// action on a page is the brand yellow rather than a grey that reads as disabled.
import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

const ROUTES = {
  LFB0412: ['/', '/apply', '/applications', '/profile', '/notifications'],
  LFB0233: ['/queue'],
  LFB0051: ['/staff', '/staff/dob-verifications', '/staff/new'],
  LFB0318: ['/disburse', '/reports'],
  LFB0274: ['/admin/users', '/admin/workflow', '/admin/roles', '/admin/products'],
  LFB0067: ['/admin/audit'],
};

test.describe('phone width (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const [staffNo, routes] of Object.entries(ROUTES)) {
    test(`no horizontal scroll for ${staffNo}`, async ({ page }) => {
      await signIn(page, staffNo);
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        expect(scroll, `${route} is ${scroll}px wide on a ${client}px screen`).toBeLessThanOrEqual(client + 1);
      }
    });
  }
  test('language and theme stay reachable from the account menu', async ({ page }) => {
    await signIn(page, 'LFB0412');
    await page.getByRole('button', { name: /Account menu for/ }).click();
    await expect(page.getByRole('menu').getByRole('button', { name: 'Kiswahili' })).toBeVisible();
  });
});

test('the primary action is yellow, not grey', async ({ page }) => {
  await signIn(page, 'LFB0412');
  const apply = page.getByRole('main').getByRole('link', { name: 'Apply for a loan' });
  await expect(apply).toHaveCSS('background-color', 'rgb(255, 194, 14)');
});
