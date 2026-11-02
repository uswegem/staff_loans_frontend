// Readable values for the field-by-field comparison (FR-58, FR-59), in the chosen
// language (D-94).

import { translate } from '../../../i18n';

const MONEY = new Set(['minAmount', 'maxAmount', 'instalmentRounding']);
const BPS = new Set(['interestBps', 'processingFeeBps', 'processingFeeTopUpBps', 'insuranceBps', 'affordabilityBps', 'pensionBps']);
const METHODS = { payroll: 'Salary deduction' };

const n = (v) => Number(v).toLocaleString('en-US');

export function formatCompareValue(field, v) {
  if (v == null || (Array.isArray(v) && !v.length)) return '—';
  if (typeof v === 'boolean') return v ? translate('Yes') : translate('No');
  if (MONEY.has(field)) return `TZS ${n(v)}`;
  if (BPS.has(field)) return `${v / 100}%`;
  if (field === 'repaymentMethods') return v.map((m) => translate(METHODS[m] || m)).join(', ');
  if (field === 'fields') return v.map((f) => `${f.label} (${f.type}${f.mandatory ? `, ${translate('mandatory')}` : ''}${f.options?.length ? `: ${f.options.join(' / ')}` : ''})`).join('; ');
  if (field === 'payeBands') return v.map((b) => translate('from {from}: {base} + {rate}%', { from: n(b.from), base: n(b.base), rate: b.rateBps / 100 })).join('; ');
  if (Array.isArray(v)) return v.join('; ');
  return String(v);
}
