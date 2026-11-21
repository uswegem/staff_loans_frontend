// Display formats from the prototype: "12 Nov 2026", "12 Nov 2026, 14:05", "TZS 4,500,000".
// Month names follow the chosen language (D-94).

import { currentLanguage } from '../i18n';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_SW = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const months = currentLanguage() === 'sw' ? MONTHS_SW : MONTHS;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${formatDate(d)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const formatNumber = (n) => (n == null || Number.isNaN(n) ? '—' : Math.round(n).toLocaleString('en-US'));
export const formatTzs = (n) => (n == null || Number.isNaN(n) ? '—' : `TZS ${formatNumber(n)}`);

/** yyyy-mm-dd for <input type="date"> from an ISO date. */
export const isoDay = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

/** A calendar day (yyyy-mm-dd) shown as "25 Dec 2026", without a time-zone shift. */
export function formatDay(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || ''));
  if (!m) return formatDate(day);
  const months = currentLanguage() === 'sw' ? MONTHS_SW : MONTHS;
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

const pad = (n) => String(n).padStart(2, '0');
const monthIndex = (word) => {
  const w = word.slice(0, 3).toLowerCase();
  const i = MONTHS.findIndex((x) => x.toLowerCase() === w);
  return i >= 0 ? i : MONTHS_SW.findIndex((x) => x.toLowerCase() === w);
};

/**
 * A typed date as yyyy-mm-dd, or null when it is not a real date. Accepts "21 Nov 2026",
 * "21 Des 2026", "21/11/2026", "21-11-2026" and "2026-11-21": day first, as staff write it.
 */
export function parseDay(text) {
  const s = String(text || '').trim();
  let y;
  let mo;
  let d;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) [, y, mo, d] = m.map(Number);
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s))) [, d, mo, y] = m.map(Number);
  else if ((m = /^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/.exec(s))) {
    d = Number(m[1]);
    mo = monthIndex(m[2]) + 1;
    y = Number(m[3]);
  } else return null;
  if (!mo || mo < 1 || mo > 12 || d < 1) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}
