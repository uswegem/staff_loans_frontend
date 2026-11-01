// "Your loan" calculator panel (prototype calcPanel, meterHtml, calcBreakdown).
// Uses the same calculator module as the API (generated copy, PLAN 1a); the server
// recomputes on every save and at signing.

import { formatNumber } from '../../lib/format';
import { pct } from '../../lib/dates';
import s from './apply.module.css';

export function Meter({ q }) {
  const cap = Math.max(q.maxInstalment, 1);
  const use = (Math.min(q.instalment / cap, 1.3) / 1.3) * 100;
  const capAt = (1 / 1.3) * 100;
  return (
    <>
      <div className={`${s.meter} ${q.pass ? '' : s.over}`} role="img" aria-label={`Instalment uses ${Math.round((q.instalment / cap) * 100)}% of your limit`}>
        <i style={{ width: `${use}%` }} />
        <span className={s.cap} style={{ left: `${capAt}%` }} />
      </div>
      <div className="row xs" style={{ justifyContent: 'space-between' }}>
        <span style={q.pass ? undefined : { color: 'var(--bad)', fontWeight: 600 }}>{q.pass ? `TZS ${formatNumber(q.headroom)} below your limit` : `TZS ${formatNumber(-q.headroom)} over your limit`}</span>
        <span className="muted">Limit {formatNumber(q.maxInstalment)}</span>
      </div>
    </>
  );
}

/** The affordability steps (D-78), all from the payslip's Basic Pay and LFB deductions. */
export function Breakdown({ q }) {
  const ps = q.payslip;
  return (
    <div className={s.calc}>
      <div className={s.line}><span>Basic Pay</span><b>{formatNumber(ps.basic)}</b></div>
      <div className={s.line}><span>Pension ({pct(q.rates.pensionBps, 0)} of Basic Pay)</span><b>{formatNumber(ps.pension)}</b></div>
      <div className={s.line}><span>Taxable Pay (Basic Pay − Pension)</span><b>{formatNumber(ps.taxable)}</b></div>
      <div className={s.line}><span>PAYE</span><b>{formatNumber(ps.tax)}</b></div>
      <div className={s.line}><span>Total Deductions (Pension + PAYE)</span><b>{formatNumber(ps.totalDeductions)}</b></div>
      <div className={`${s.line} ${s.total}`}><span>Net Pay (Basic Pay − Total Deductions)</span><b>{formatNumber(ps.net)}</b></div>
      <div className={s.line}><span>Add LFB deductions</span><b>+{formatNumber(ps.lfbDeductions)}</b></div>
      <div className={s.line}><span>Adjusted Net Pay</span><b>{formatNumber(ps.adjusted)}</b></div>
      <div className={`${s.line} ${s.total}`}><span>Maximum instalment ({pct(q.rates.affordabilityBps, 0)} of Adjusted Net Pay)</span><b>{formatNumber(q.maxInstalment)}</b></div>
      <div className={s.line}><span>Maximum amount over {q.maxTenor} months at {pct(q.rates.interestBps)}</span><b>{formatNumber(q.maxAmount)}</b></div>
    </div>
  );
}

export default function CalculatorPanel({ q, amount, tenor, topUp, hasPayslip = true }) {
  const ready = amount && tenor && hasPayslip;
  const years = tenor ? Number.parseFloat((tenor / 12).toFixed(2)) : 0;
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
        <h3>Your loan</h3>
        <span className="xs muted">{pct(q.rates.interestBps)} a year, reducing</span>
      </div>
      <div style={{ padding: 24 }} aria-live="polite">
        <div className="small muted">Monthly instalment</div>
        <div className={s.big}>{ready ? formatNumber(q.instalment) : '—'}</div>
        {ready ? <Meter q={q} /> : <p className="small muted">{hasPayslip ? 'Enter an amount and tenor to see your instalment.' : 'Attach your latest payslip to see your limit.'}</p>}
        {hasPayslip && (
          <div className={s.calc} style={{ marginTop: 12 }}>
            <div className={s.line}><span>You can borrow up to</span><b>TZS {formatNumber(q.maxAmount)} over {q.maxTenor} months</b></div>
            {ready && tenor !== q.maxTenor && <div className={s.line}><span>Over {tenor} months, up to</span><b>TZS {formatNumber(q.maxAmountAtTenor)}</b></div>}
          </div>
        )}
        <hr style={{ border: 0, borderTop: '1px solid var(--line-2)', margin: '16px 0' }} />
        <div className={s.calc}>
          <div className={s.line}><span>Total interest</span><b>{formatNumber(q.totalInterest)}</b></div>
          <div className={s.line}><span>Total to repay</span><b>{formatNumber(q.totalRepayable)}</b></div>
          <div className={s.line}><span>Processing fee ({pct(q.rates.processingFeeBps)}{topUp ? ', top-up' : ''})</span><b>{formatNumber(q.processingFee)}</b></div>
          <div className={s.line}><span>Insurance ({pct(q.rates.insuranceBps)} × {years} years)</span><b>{formatNumber(q.insuranceFee)}</b></div>
          {q.firstDueDate && ready && <div className={s.line}><span>First instalment</span><b>{q.firstDueDate.split('-').reverse().join('/')}</b></div>}
        </div>
        {hasPayslip && (
          <details style={{ marginTop: 12 }}>
            <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>How your limit is worked out</summary>
            <div style={{ marginTop: 8 }}><Breakdown q={q} /></div>
          </details>
        )}
      </div>
    </div>
  );
}
