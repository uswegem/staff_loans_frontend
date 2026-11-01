// Shared steps for the end-to-end runs. People sign in through the real screens,
// including first-time authenticator enrolment: the secret shown on screen is kept
// for later sign-ins and codes are computed as an authenticator app would (RFC 6238).

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { expect } from '@playwright/test';

export const PASSWORD = process.env.E2E_PASSWORD || 'Sample#2026';

// The backend's fictional people and payslip generator, so each applicant attaches a
// payslip that matches their seeded salary (D-79).
const backend = createRequire(path.join(process.env.E2E_BACKEND_DIR || path.resolve('..', 'staff_loans_backend'), 'package.json'));
const { PEOPLE } = backend('./seed/data/people.js');
const { PRICING } = backend('./seed/products.js');
const { samplePayslip } = backend('./seed/samplePayslip.js');

/** A payslip PDF for a seeded person, dated a few days ago. */
export async function payslipFor(staffNo, { lfbLines = [] } = {}) {
  const p = PEOPLE.find((x) => x.staffNo === staffNo);
  const payDate = new Date(Date.now() - 5 * 86400000 + 3 * 3600000).toISOString().slice(0, 10);
  return samplePayslip({ staff: { fullName: p.name, staffNo, title: p.title, department: p.department }, basic: p.pay.basic, allowances: p.pay.allowances || 0, payDate, lfbLines, pricing: PRICING });
}
const STORE = path.join(os.tmpdir(), `slas-e2e-mfa-${process.env.E2E_API_PORT || 4100}.json`);

// ---------- TOTP ----------

function base32Decode(s) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret, step) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, '0');
}

const readStore = () => {
  try {
    return JSON.parse(fs.readFileSync(STORE, 'utf8'));
  } catch {
    return {};
  }
};
const writeStore = (s) => fs.writeFileSync(STORE, JSON.stringify(s));
const step = () => Math.floor(Date.now() / 30_000);

/** A code for this person that has not been used yet (the API accepts each code once). */
async function freshCode(staffNo, secret) {
  const store = readStore();
  const last = store[staffNo]?.lastStep ?? -1;
  while (step() <= last) await new Promise((r) => setTimeout(r, 1000));
  const now = step();
  writeStore({ ...readStore(), [staffNo]: { secret, lastStep: now } });
  return totp(secret, now);
}

async function typeCode(page, code) {
  await page.getByLabel('Digit 1').click();
  await page.keyboard.type(code);
}

// ---------- people ----------

/** Opens a fresh browser context for one person and signs them in. */
export async function as(browser, staffNo) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, staffNo);
  return page;
}

export async function signIn(page, staffNo, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Staff number').fill(staffNo);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const enrol = page.getByRole('heading', { name: 'Set up your authenticator app' });
  const code = page.getByRole('heading', { name: 'Enter your one-time code' });
  const home = page.getByRole('navigation').first();
  await expect(enrol.or(code).or(home)).toBeVisible({ timeout: 30_000 });

  if (await enrol.isVisible()) {
    await page.getByRole('button', { name: 'Show my QR code' }).click();
    await page.getByText("Can't scan? Enter this key instead").click();
    const secretEl = page.getByText(/^[A-Z2-7]{16,}$/);
    await expect(secretEl).toBeVisible();
    const secret = (await secretEl.textContent()).trim();
    await typeCode(page, await freshCode(staffNo, secret));
    await page.getByRole('button', { name: 'Confirm and sign in' }).click();
  } else if (await code.isVisible()) {
    const secret = readStore()[staffNo]?.secret;
    if (!secret) throw new Error(`No authenticator secret kept for ${staffNo}; restart the e2e API so the account enrols again.`);
    await typeCode(page, await freshCode(staffNo, secret));
    await page.getByRole('button', { name: 'Verify and continue' }).click();
  }
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

// ---------- apply ----------

/** From Apply: chooses a product, attaches the payslip and fills the loan details. */
export async function startApplication(page, { staffNo, product, amount, tenor, purpose, reason }) {
  await page.goto('/apply');
  await page.getByRole('button', { name: new RegExp(`^${product}`) }).click();
  await expect(page).toHaveURL(/\/apply\/[0-9a-f]{24}/);
  await attachPayslip(page, staffNo);
  await page.getByLabel('Amount').fill(String(amount));
  await page.getByLabel('Tenor (months)').fill(String(tenor));
  await page.getByLabel('Purpose of the loan').fill(purpose);
  if (reason) await page.getByLabel('Reason for applying during probation').fill(reason);
}

/** Attaches the person's latest payslip on the loan details step and waits for it to be read. */
export async function attachPayslip(page, staffNo) {
  await page.getByLabel('Choose payslip PDF').setInputFiles({ name: 'payslip.pdf', mimeType: 'application/pdf', buffer: await payslipFor(staffNo) });
  await expect(page.getByRole('button', { name: 'Attach a newer payslip' })).toBeVisible({ timeout: 30_000 });
}

/** From the loan details step to a signed, submitted application; returns its reference. */
export async function signAndSubmit(page, { resubmit = false } = {}) {
  await page.getByRole('button', { name: 'Continue to documents' }).click();
  await page.getByRole('button', { name: 'Review application' }).click();
  await page.getByRole('button', { name: 'Continue to agreement' }).click();
  await readAndSign(page, resubmit ? 'Sign and resubmit' : 'Sign agreement and submit');
  await expect(page).toHaveURL(/\/applications\/[0-9a-f]{24}/);
  const ref = (await page.getByRole('heading', { level: 1 }).textContent()).trim();
  expect(ref).toMatch(/^SL-\d{4}-\d{5}$/);
  return { ref, url: page.url() };
}

/** Scrolls the agreement to the end, ticks every box and signs with the password. */
export async function readAndSign(page, button) {
  const doc = page.getByLabel('Loan agreement text');
  await expect(doc).toBeVisible();
  await doc.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(page.getByText('You have reached the end of the agreement.')).toBeVisible();
  for (const box of await page.locator('form input[type="checkbox"]').all()) await box.check();
  await page.getByLabel('Enter your password to sign').fill(PASSWORD);
  await page.getByRole('button', { name: button }).click();
}

// ---------- review ----------

/** Opens an application from the reviewer's queue by its reference. */
export async function openFromQueue(page, ref) {
  await page.goto('/queue');
  await page.getByRole('cell', { name: ref, exact: true }).click();
  await expect(page).toHaveURL(/\/review\/[0-9a-f]{24}/);
  await expect(page.getByText('Your decision')).toBeVisible();
}

/**
 * Records a decision on the open review screen.
 * opts: { action: 'approve'|'return'|'reject', comment, crb: true, hrChecks: true, recommend: { amount, tenor, reason } }
 */
export async function decide(page, { action = 'approve', comment, crb, hrChecks, recommend } = {}) {
  if (crb) {
    await page.getByRole('combobox', { name: /Outcome/ }).click();
    await page.getByRole('option', { name: 'Clear' }).click();
    await page.getByLabel(/Report date/).fill(new Date().toISOString().slice(0, 10));
  }
  if (recommend) {
    await page.getByLabel('Recommended amount').fill(String(recommend.amount));
    if (recommend.tenor) await page.getByLabel('Recommended tenor').fill(String(recommend.tenor));
    await page.getByLabel('Why').fill(recommend.reason);
  }
  if (hrChecks) {
    for (const box of await page.getByRole('checkbox', { name: /^(Employment status is|Category is|Basic Pay of|I have verified the probation reason)/ }).all()) await box.check();
  }
  const radio = { approve: /^Approve/, return: /^Return for correction/, reject: /^Reject/ }[action];
  await page.getByRole('radio', { name: radio }).check();
  if (comment) await page.getByLabel('Comment').fill(comment);
  const button = { approve: 'Approve application', return: 'Return to applicant', reject: 'Reject application' }[action];
  await page.getByRole('button', { name: button }).click();
  await expect(page).toHaveURL(/\/queue/);
}

/** Approves through every stage after credit for the given people (stage holders in order). */
export async function approveAll(browser, ref, people) {
  for (const p of people) {
    const page = await as(browser, p.staffNo);
    await openFromQueue(page, ref);
    await decide(page, { action: 'approve', crb: p.crb, hrChecks: p.hrChecks, comment: p.comment });
    await page.context().close();
  }
}

// ---------- OPS ----------

export async function disburse(browser, ref, transactionRef) {
  const page = await as(browser, 'LFB0318');
  await page.goto('/disburse');
  const row = page.getByRole('row').filter({ hasText: ref });
  await row.getByRole('button', { name: 'Confirm disbursement' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(ref)).toBeVisible();
  for (const box of await dialog.getByRole('checkbox').all()) await box.check();
  await dialog.getByLabel('Transaction reference').fill(transactionRef);
  await dialog.getByRole('button', { name: 'Confirm disbursement' }).click();
  await expect(page.getByText(`${ref} disbursed. Journey complete.`)).toBeVisible();
  await page.context().close();
}
