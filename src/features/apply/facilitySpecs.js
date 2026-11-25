// What a loan facility card shows (Apply, step 1), from the live product version
// (GET /products) and the live pricing (GET /pricing). Nothing is invented: a value that is
// not configured, or is not a number, leaves its row (or the rate pill) out.
//
// Pricing applies to every product. Its rates are yearly (interestBps "Interest a year",
// insuranceBps "Insurance a year") and the processing fees are percentages of the amount
// (processingFeeBps for a new loan, processingFeeTopUpBps for a top-up). Instalments are
// worked out on the reducing balance (loanCalculator), the only method the system has.
// Insurance collection timing is not configured, so it is not shown.

import { formatTzs } from '../../lib/format';
import { pct } from '../../lib/dates';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The rate pill: { rate: '6% p.a.', method: 'Reducing Balance' }, or null without pricing. */
export function ratePill(pricing, t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k]) : s)) {
  const bps = num(pricing?.interestBps);
  if (bps === null) return null;
  return { rate: t('{rate} p.a.', { rate: pct(bps) }), method: t('Reducing Balance') };
}

/** The tenor as one value: "6–60", or "12" when the minimum and maximum are the same. */
export function termRange(min, max) {
  const a = num(min);
  const b = num(max);
  if (a === null && b === null) return null;
  if (a === null || b === null || a === b) return String(a ?? b);
  return `${a}–${b}`;
}

/**
 * The specification rows, in order: Maximum Amount, Minimum Amount, Term (Months),
 * Processing Fee, Insurance. Returns [{ key, label, value, strong }] without rows whose
 * value is not configured. A configured zero is shown ("0%").
 */
export function facilitySpecs(product, pricing, t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k]) : s)) {
  const rows = [];
  const max = num(product?.maxAmount);
  const min = num(product?.minAmount);
  if (max !== null) rows.push({ key: 'max', label: t('Maximum Amount'), value: formatTzs(max), strong: true });
  if (min !== null) rows.push({ key: 'min', label: t('Minimum Amount'), value: formatTzs(min) });
  const term = termRange(product?.minTenor, product?.maxTenor);
  if (term !== null) rows.push({ key: 'term', label: t('Term (Months)'), value: term });
  const fee = num(pricing?.processingFeeBps);
  if (fee !== null) {
    const topUp = num(pricing?.processingFeeTopUpBps);
    const value = product?.topUpAllowed && topUp !== null && topUp !== fee ? t('{rate} (top-up {topUp})', { rate: pct(fee), topUp: pct(topUp) }) : pct(fee);
    rows.push({ key: 'fee', label: t('Processing Fee'), value });
  }
  const insurance = num(pricing?.insuranceBps);
  if (insurance !== null) rows.push({ key: 'insurance', label: t('Insurance'), value: t('{rate} p.a.', { rate: pct(insurance) }) });
  return rows;
}
