// Formats checked as people type (D-93). The API applies the same rules in
// src/utils/formats.js; keep the two in step.

/** NIDA number as stored: YYYYMMDD-XXXXX-XXXXX-XX. */
export const NIDA = /^\d{8}-\d{5}-\d{5}-\d{2}$/;
export const NIDA_MESSAGE = 'Enter the 20-digit NIDA number, for example 19800630-13140-00004-20.';

/** Tanzanian phone number as stored: +255 and nine digits. */
export const PHONE = /^\+255\d{9}$/;
export const PHONE_MESSAGE = 'Enter nine digits after +255, for example +255 712 345 678.';

/** Bank account number: 6 to 20 digits; spaces and hyphens between groups are allowed. */
export const ACCOUNT_NO = /^$|^(?=(?:\D*\d){6,20}\D*$)\d[\d -]*\d$/;
export const ACCOUNT_NO_MESSAGE = 'Enter the account number: 6 to 20 digits.';
export const BRANCH_MESSAGE = 'Enter the branch name, for example Mlimani City.';

/**
 * What the NIDA field shows while typing or pasting: digits only, at most 20, with the
 * hyphens put in after the 8th, 13th and 18th digit.
 */
export function nidaInput(raw) {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 20);
  return [d.slice(0, 8), d.slice(8, 13), d.slice(13, 18), d.slice(18, 20)].filter(Boolean).join('-');
}

/** A complete NIDA number whose first eight digits are a real date. */
export function isNida(value) {
  if (!NIDA.test(value || '')) return false;
  const y = +value.slice(0, 4);
  const m = +value.slice(4, 6);
  const d = +value.slice(6, 8);
  const date = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * The nine digits after +255 from what was typed or pasted: 0712345678, 255712345678,
 * +255712345678 and 712345678 all give 712345678. Anything else gives its digits as
 * they are, so a wrong number stays visibly wrong instead of being cut short.
 */
export function phoneDigits(raw) {
  const t = String(raw || '').trim();
  let d = t.replace(/\D/g, '');
  if (d.startsWith('255') && d.length === 12) d = d.slice(3);
  else if (d.startsWith('0') && d.length === 10) d = d.slice(1);
  return d;
}

/** Stored form (+255XXXXXXXXX) from the nine digits; '' when empty. */
export const phoneValue = (digits) => (digits ? `+255${digits}` : '');

/** Nine digits shown as 712 345 678. */
export const groupPhone = (digits) => [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join(' ');

/** A complete Tanzanian number in the stored form. */
export const isPhone = (value) => PHONE.test(value || '') && value[4] !== '0';

/** +255712345678 shown as +255 712 345 678; other values as they are. */
export const formatPhone = (value) => (isPhone(value) ? `+255 ${groupPhone(value.slice(4))}` : value || '');

/** Earlier free-text nationality as the country on the list (Tanzanian → Tanzania). */
export const countryOf = (v) => (/^\s*(tanzanian|united republic of tanzania)\s*$/i.test(v || '') ? 'Tanzania' : v);
