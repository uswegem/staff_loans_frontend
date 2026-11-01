// The latest payslip (D-78, D-79). The API reads Basic Pay, LFB deductions and the pay
// date from the PDF; the staff member sees what was read and can attach a newer one.

import { useRef, useState } from 'react';
import { Alert, Button, Link } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatNumber } from '../../lib/format';
import s from './apply.module.css';

export default function PayslipCard({ app, error, onChanged }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const slip = app.payslip;

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setProblem(null);
    try {
      onChanged(await applicationsApi.setPayslip(app.id, file));
    } catch (err) {
      setProblem(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={s.payslip} aria-labelledby="payslip-h">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h4 id="payslip-h" style={{ margin: 0 }}>Latest payslip <span className="small" style={{ color: 'var(--bad)' }}>(required)</span></h4>
          <p className="xs muted" style={{ margin: '2px 0 0' }}>The PDF from the payroll system, not older than {app.payslipMaxAgeDays} days. Your limit is worked out from its Basic Pay and LFB deductions.</p>
        </div>
        <Button variant={slip ? 'outlined' : 'contained'} size="small" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Reading…' : slip ? 'Attach a newer payslip' : 'Attach payslip'}
        </Button>
        <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={choose} aria-label="Choose payslip PDF" />
      </div>
      {slip && (
        <dl className={s.kv} style={{ marginTop: 12 }}>
          <dt>Payslip</dt>
          <dd>
            <Link component="button" type="button" onClick={() => downloadFile(`/files/${slip.fileId}`, slip.originalName).catch(() => {})}>{slip.originalName}</Link>, dated {formatDate(slip.payDate)}
          </dd>
          <dt>Basic Pay</dt>
          <dd>TZS {formatNumber(slip.basic)}</dd>
          <dt>LFB deductions</dt>
          <dd>
            TZS {formatNumber(slip.lfbDeductions)}
            {slip.lfbLines.length > 0 && <span className="xs muted"> ({slip.lfbLines.map((l) => `${l.label} ${formatNumber(l.amount)}`).join('; ')})</span>}
          </dd>
        </dl>
      )}
      {(problem || error) && <Alert severity="error" role="alert" sx={{ mt: 1.5 }}>{problem || error}</Alert>}
    </section>
  );
}
