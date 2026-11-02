// "Your loan" calculator panel (prototype calcPanel, meterHtml, calcBreakdown).
// Uses the same calculator module as the API (generated copy, PLAN 1a); the server
// recomputes on every save and at signing.

import { formatNumber } from '../../lib/format';
import { pct } from '../../lib/dates';
import s from './apply.module.css';
import { useT } from '../../i18n';

export function Meter({ q }) {
  const t = useT();
  const cap = Math.max(q.maxInstalment, 1);
  const use = (Math.min(q.instalment / cap, 1.3) / 1.3) * 100;
  const capAt = (1 / 1.3) * 100;
  return (
    <>
      <div className={`${s.meter} ${q.pass ? '' : s.over}`} role="img" aria-label={t('Instalment uses {pct}% of your limit', { pct: Math.round((q.instalment / cap) * 100) })}>
        <i style={{ width: `${use}%` }} />
        <span className={s.cap} style={{ left: `${capAt}%` }} />
      </div>
      <div className="row xs" style={{ justifyContent: 'space-between' }}>
        <span style={q.pass ? undefined : { color: 'var(--bad)', fontWeight: 600 }}>{q.pass ? t('TZS {amount} below your limit', { amount: formatNumber(q.headroom) }) : t('TZS {amount} over your limit', { amount: formatNumber(-q.headroom) })}</span>
        <span className="muted">{t('Limit {amount}', { amount: formatNumber(q.maxInstalment) })}</span>
      </div>
    </>
  );
}

/** The affordability steps (D-78), all from the payslip's Basic Pay and LFB deductions. */
/** The combined cap across all loans in Staff Loans (D-87). */
export function Combined({ q }) {
  const t = useT();
  const c = q.combined;
  if (!c) return null; // applications submitted before D-87
  return (
    <>
      <div className={`${s.line} ${s.total}`}><span>{t('Combined limit ({pct} of Net Pay)', { pct: pct(q.rates.affordabilityBps, 0) })}</span><b>{formatNumber(c.cap)}</b></div>
      <div className={s.line}><span>{t('Your other loans in Staff Loans')}</span><b>−{formatNumber(c.others)}</b></div>
      {c.addBack > 0 && <div className={s.line}><span>{t('Deduction added back (loan being topped up)')}</span><b>{formatNumber(c.addBack)}</b></div>}
      <div className={s.line}><span>{t('Available for this loan')}</span><b>{formatNumber(c.available)}</b></div>
      <div className={s.line}><span>{t('New instalment')}</span><b>−{formatNumber(c.newInstalment)}</b></div>
      <div className={`${s.line} ${s.total}`}><span>{t('Remaining combined capacity')}</span><b style={c.remaining < 0 ? { color: 'var(--bad)' } : undefined}>{formatNumber(c.remaining)}</b></div>
    </>
  );
}

export function Breakdown({ q }) {
  const t = useT();
  const ps = q.payslip;
  return (
    <div className={s.calc}>
      <div className={s.line}><span>{t('Basic Pay')}</span><b>{formatNumber(ps.basic)}</b></div>
      <div className={s.line}><span>{t('Pension ({pct} of Basic Pay)', { pct: pct(q.rates.pensionBps, 0) })}</span><b>{formatNumber(ps.pension)}</b></div>
      <div className={s.line}><span>{t('Taxable Pay (Basic Pay − Pension)')}</span><b>{formatNumber(ps.taxable)}</b></div>
      <div className={s.line}><span>{t('PAYE')}</span><b>{formatNumber(ps.tax)}</b></div>
      <div className={s.line}><span>{t('Total Deductions (Pension + PAYE)')}</span><b>{formatNumber(ps.totalDeductions)}</b></div>
      <div className={`${s.line} ${s.total}`}><span>{t('Net Pay (Basic Pay − Total Deductions)')}</span><b>{formatNumber(ps.net)}</b></div>
      <Combined q={q} />
      <div className={s.line}><span>{t('Maximum amount over {n} months at {rate}', { n: q.maxTenor, rate: pct(q.rates.interestBps) })}</span><b>{formatNumber(q.maxAmount)}</b></div>
    </div>
  );
}

export default function CalculatorPanel({ q, amount, tenor, topUp, hasPayslip = true }) {
  const t = useT();
  const ready = amount && tenor && hasPayslip;
  const years = tenor ? Number.parseFloat((tenor / 12).toFixed(2)) : 0;
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
        <h3>{t('Your loan')}</h3>
        <span className="xs muted">{t('{rate} a year, reducing', { rate: pct(q.rates.interestBps) })}</span>
      </div>
      <div style={{ padding: 24 }} aria-live="polite">
        <div className="small muted">{t('Monthly instalment')}</div>
        <div className={s.big}>{ready ? formatNumber(q.instalment) : '—'}</div>
        {ready ? <Meter q={q} /> : <p className="small muted">{hasPayslip ? t('Enter an amount and tenor to see your instalment.') : t('Attach your latest payslip to see your limit.')}</p>}
        {hasPayslip && (
          <div className={s.calc} style={{ marginTop: 12 }}>
            <div className={s.line}><span>{t('Remaining combined capacity')}</span><b>{t('TZS {amount} a month', { amount: formatNumber(Math.max(0, q.combined.remaining)) })}</b></div>
            <div className={s.line}><span>{t('You can borrow up to')}</span><b>{t('TZS {amount} over {n} months', { amount: formatNumber(q.maxAmount), n: q.maxTenor })}</b></div>
            {ready && tenor !== q.maxTenor && <div className={s.line}><span>{t('Over {n} months, up to', { n: tenor })}</span><b>TZS {formatNumber(q.maxAmountAtTenor)}</b></div>}
          </div>
        )}
        <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', margin: '16px 0' }} />
        <div className={s.calc}>
          <div className={s.line}><span>{t('Total interest')}</span><b>{formatNumber(q.totalInterest)}</b></div>
          <div className={s.line}><span>{t('Total to repay')}</span><b>{formatNumber(q.totalRepayable)}</b></div>
          <div className={s.line}><span>{topUp ? t('Processing fee ({rate}, top-up)', { rate: pct(q.rates.processingFeeBps) }) : t('Processing fee ({rate})', { rate: pct(q.rates.processingFeeBps) })}</span><b>{formatNumber(q.processingFee)}</b></div>
          <div className={s.line}><span>{t('Insurance ({rate} × {n} years)', { rate: pct(q.rates.insuranceBps), n: years })}</span><b>{formatNumber(q.insuranceFee)}</b></div>
          {q.firstDueDate && ready && <div className={s.line}><span>{t('First instalment')}</span><b>{q.firstDueDate.split('-').reverse().join('/')}</b></div>}
        </div>
        {hasPayslip && (
          <details style={{ marginTop: 12 }}>
            <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>{t('How your limit is worked out')}</summary>
            <div style={{ marginTop: 8 }}><Breakdown q={q} /></div>
          </details>
        )}
      </div>
    </div>
  );
}
