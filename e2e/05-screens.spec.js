// Visual check of the changed screens in English and Swahili, light and dark (D-93,
// D-94, D-96). Saves screenshots to test-results/screens for review; the assertions
// check that the language and theme apply and that the switches persist.
// Run on its own: npx playwright test e2e/05-screens.spec.js

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { as } from './helpers';

const OUT = path.resolve('test-results', 'screens');
fs.mkdirSync(OUT, { recursive: true });
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true, ...opts });

const MODES = [
  { lang: 'en', theme: 'light' },
  { lang: 'sw', theme: 'light' },
  { lang: 'en', theme: 'dark' },
  { lang: 'sw', theme: 'dark' },
];

async function choose(page, { lang, theme }) {
  await page.getByRole('button', { name: lang === 'sw' ? 'Kiswahili' : 'English' }).click();
  const toDark = page.getByRole('button', { name: /Switch to dark mode|Badili kwenda hali ya giza/ });
  const toLight = page.getByRole('button', { name: /Switch to light mode|Badili kwenda hali ya mwanga/ });
  if (theme === 'dark' && (await toDark.count())) await toDark.click();
  if (theme === 'light' && (await toLight.count())) await toLight.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
}

test.describe.configure({ mode: 'serial' });

test('sign-in screen in both languages and themes, desktop and phone', async ({ browser }) => {
  for (const m of MODES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await choose(page, m);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.lang === 'sw' ? 'Mfumo wa Maombi ya Mikopo ya Wafanyakazi' : 'Staff Loan Application System');
    await expect(page.getByText(m.lang === 'sw' ? 'Kwa matumizi ya ndani tu | Wasiliana na TEHAMA kwa msaada' : 'Internal use only | Contact IT for Support')).toBeVisible();
    await shot(page, `login-${m.lang}-${m.theme}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, `login-${m.lang}-${m.theme}-phone`);
    // The choice survives a refresh.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', m.theme);
    await expect(page.locator('html')).toHaveAttribute('lang', m.lang);
    await context.close();
  }
});

test('profile, reports and staff screens in both languages and themes', async ({ browser }) => {
  for (const m of MODES) {
    // Rehema's profile is incomplete, so the validation states show.
    const rehema = await as(browser, 'LFB0596');
    await choose(rehema, m);
    await rehema.goto('/profile');
    await expect(rehema.getByRole('heading', { level: 1 })).toHaveText(m.lang === 'sw' ? 'Wasifu wangu' : 'My profile');
    await shot(rehema, `profile-personal-${m.lang}-${m.theme}`);
    await rehema.getByRole('combobox', { name: /^(Region|Mkoa)/ }).click();
    await shot(rehema, `profile-region-open-${m.lang}-${m.theme}`, { fullPage: false });
    await rehema.keyboard.press('Escape');
    await rehema.getByRole('tab', { name: m.lang === 'sw' ? /Taarifa za benki/ : /Bank details/ }).click();
    await shot(rehema, `profile-bank-${m.lang}-${m.theme}`);
    await rehema.context().close();

    // Reports (Head of Risk holds the reports view).
    const daniel = await as(browser, 'LFB0067');
    await choose(daniel, m);
    await daniel.goto('/reports');
    await daniel.getByRole('tab', { name: m.lang === 'sw' ? 'Kichujio cha Ripoti' : 'Report Filter' }).click();
    await expect(daniel.getByRole('heading', { name: /RP-05/ })).toContainText(m.lang === 'sw' ? 'Kichujio cha Ripoti' : 'Report Filter');
    await expect(daniel.getByRole('table')).toBeVisible();
    await shot(daniel, `reports-${m.lang}-${m.theme}`);
    await daniel.context().close();

    // People and Culture: the staff form with phone fields, and a dialog.
    const grace = await as(browser, 'LFB0051');
    await choose(grace, m);
    await grace.goto('/staff/new');
    await expect(grace.getByRole('heading', { level: 1 })).toHaveText(m.lang === 'sw' ? 'Ongeza mfanyakazi' : 'Add a staff member');
    await shot(grace, `staff-new-${m.lang}-${m.theme}`);
    await grace.goto('/staff');
    await expect(grace.getByRole('table')).toBeVisible();
    await shot(grace, `staff-list-${m.lang}-${m.theme}`);
    await grace.context().close();
  }
});

test('the account keeps the choice for the next sign-in', async ({ browser }) => {
  const first = await as(browser, 'LFB0412');
  await choose(first, { lang: 'sw', theme: 'dark' });
  await first.context().close();
  // A new browser (no saved preference) signs in and gets the account's choice.
  const again = await as(browser, 'LFB0412');
  await expect(again.locator('html')).toHaveAttribute('lang', 'sw');
  await expect(again.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shot(again, 'home-sw-dark');
  await choose(again, { lang: 'en', theme: 'light' });
  await again.context().close();
});
