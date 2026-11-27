/* global document */
// Layout checks across roles: no sideways scrolling on a 390px phone, and the primary
// action on a page is the brand yellow rather than a grey that reads as disabled.
import { test, expect } from '@playwright/test';
import { signIn, as, startApplication, signAndSubmit, openFromQueue, decide } from './helpers';

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

// The decision button's label (D-113: "Recommend approval and send to People and Culture",
// longer in Swahili) wraps inside the button at every width; the page never scrolls sideways.
const WIDTHS = [1280, 1024, 768, 375];

async function setLanguage(page, lang) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const name = lang === 'sw' ? 'Kiswahili' : 'English';
  const direct = page.getByRole('button', { name, exact: true });
  if (await direct.first().isVisible()) await direct.first().click();
  else {
    await page.getByRole('button', { name: /Account menu for|akaunti/i }).click();
    await page.getByRole('menu').getByRole('button', { name, exact: true }).click();
    await page.keyboard.press('Escape');
  }
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
}

/** Chooses each decision in turn, at each width and in both languages, and measures the button. */
async function labelsFit(page, count) {
  const seen = [];
  for (const lang of ['en', 'sw']) {
    await setLanguage(page, lang);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const choices = page.locator('input[name="decision"]');
      await expect(choices).toHaveCount(count);
      for (let i = 0; i < count; i += 1) {
        await choices.nth(i).check();
        const button = page.locator('form button[type="submit"]').last();
        await expect(button).toBeVisible();
        const m = await button.evaluate((el) => ({ label: el.textContent, scroll: el.scrollWidth, client: el.clientWidth }));
        seen.push(m.label);
        expect(m.scroll, `"${m.label}" (${lang}, ${width}px) is ${m.scroll}px in a ${m.client}px button`).toBeLessThanOrEqual(m.client + 1);
        const [doc, view] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        expect(doc, `review page scrolls sideways at ${width}px (${lang})`).toBeLessThanOrEqual(view + 1);
      }
    }
  }
  await setLanguage(page, 'en');
  // A language change re-opens the page; start the decision from a settled screen.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your decision', exact: true })).toBeVisible();
  return seen;
}

test('decision button labels stay inside the button at 1280, 1024, 768 and 375px, in English and Swahili', async ({ browser }) => {
  test.setTimeout(240_000);
  // Daniel (management route): Credit Underwriting, People and Culture, CEO.
  const daniel = await as(browser, 'LFB0067');
  await startApplication(daniel, { staffNo: 'LFB0067', product: 'Personal Loan', amount: 12000000, tenor: 36, purpose: 'Solar installation at home' });
  const { ref } = await signAndSubmit(daniel);
  await daniel.context().close();

  // Credit Underwriting: Return to applicant, Recommend approval / rejection and send to People and Culture.
  const juma = await as(browser, 'LFB0233');
  await openFromQueue(juma, ref);
  const credit = await labelsFit(juma, 3);
  expect(credit).toContain('Recommend approval and send to People and Culture');
  await decide(juma, { action: 'approve', crb: true });
  await juma.context().close();

  // People and Culture: Approve and send to CEO, Return, Reject.
  const grace = await as(browser, 'LFB0051');
  await openFromQueue(grace, ref);
  expect(await labelsFit(grace, 3)).toContain('Approve and send to CEO');
  await decide(grace, { action: 'approve', hrChecks: true });
  await grace.context().close();

  // CEO: Approve (final approval).
  const joseph = await as(browser, 'LFB0002');
  await openFromQueue(joseph, ref);
  expect(await labelsFit(joseph, 3)).toContain('Approve (final approval)');
  await joseph.context().close();
});
