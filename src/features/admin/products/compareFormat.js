// Readable values for the field-by-field comparison (FR-58, FR-59).

const MONEY = new Set(['minAmount', 'maxAmount', 'instalmentRounding']);
const BPS = new Set(['interestBps', 'processingFeeBps', 'processingFeeTopUpBps', 'insuranceBps', 'affordabilityBps', 'pensionBps']);
const METHODS = { payroll: 'Payroll deduction', account: 'Account debit' };

const n = (v) => Number(v).toLocaleString('en-US');

export function formatCompareValue(field, v) {
  if (v == null || (Array.isArray(v) && !v.length)) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (MONEY.has(field)) return `TZS ${n(v)}`;
  if (BPS.has(field)) return `${v / 100}%`;
  if (field === 'repaymentMethods') return v.map((m) => METHODS[m] || m).join(', ');
  if (field === 'fields') return v.map((f) => `${f.label} (${f.type}${f.mandatory ? ', mandatory' : ''}${f.options?.length ? `: ${f.options.join(' / ')}` : ''})`).join('; ');
  if (field === 'payeBands') return v.map((b) => `from ${n(b.from)}: ${n(b.base)} + ${b.rateBps / 100}%`).join('; ');
  if (Array.isArray(v)) return v.join('; ');
  return String(v);
}
