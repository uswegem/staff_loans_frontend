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
