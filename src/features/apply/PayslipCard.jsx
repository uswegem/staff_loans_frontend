// The latest payslip (D-78, D-79). The API reads Basic Pay, the staff loan deductions and
// the pay month from the PDF; the staff member sees what was read and can attach a newer
// one, by drag and drop or the file picker (§1b).

import { useState } from 'react';
import { Alert, Button, Link } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatNumber } from '../../lib/format';
import FileDrop from '../../components/FileDrop';
import s from './apply.module.css';
import { useT } from '../../i18n';

export const PAYSLIP_HINT = 'PDF · From the Seamless HR System · Not older than {n} days';

/** error: the API's problem with the payslip, passed only once it should be shown. */
export default function PayslipCard({ app, error, onChanged }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const slip = app.payslip;
  const shown = problem || error;

  const upload = async (file) => {
    setBusy(true);
    setProblem(null);
    try {
      onChanged(await applicationsApi.setPayslip(app.id, file));
      setReplacing(false);
    } catch (err) {
      setProblem(apiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const drop = <FileDrop accept=".pdf" label={t('Your payslip')} inputLabel={t('Choose payslip PDF')} buttonLabel={slip ? t('Attach a newer payslip') : t('Choose payslip PDF')} hint={t(PAYSLIP_HINT, { n: app.payslipMaxAgeDays || 45 })} busy={busy} error={shown} onFile={upload} />;

  return (
    <section className={s.payslip} aria-labelledby="payslip-h" data-invalid={shown ? 'true' : undefined} tabIndex={-1}>
      <h4 id="payslip-h" style={{ margin: '0 0 4px' }}>
        {t('Latest payslip')}
        <span aria-hidden="true" style={{ color: 'var(--bad)' }}> *</span>
        <span className="visually-hidden"> {t('(required)')}</span>
      </h4>
      {slip ? (
        <>
          <div className={s.slipOk}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            <span>
              <Link component="button" type="button" onClick={() => downloadFile(`/files/${slip.fileId}`, slip.originalName).catch(() => {})}>{slip.originalName}</Link>
              <span className="muted">, {t('dated {date}', { date: formatDate(slip.payDate) })}</span>
            </span>
            {!replacing && <Button size="small" variant="text" sx={{ ml: 'auto' }} onClick={() => setReplacing(true)}>{t('Replace')}</Button>}
          </div>
          <dl className={s.kv} style={{ marginTop: 12 }}>
            <dt>{t('Basic Pay')}</dt>
            <dd>TZS {formatNumber(slip.basic)}</dd>
            <dt>{t('Staff loan deductions')}</dt>
            <dd>
              TZS {formatNumber(slip.lfbDeductions)}
              {slip.lfbLines.length > 0 && <span className="xs muted"> ({slip.lfbLines.map((l) => `${l.label} ${formatNumber(l.amount)}`).join('; ')})</span>}
            </dd>
          </dl>
          {(replacing || shown) && <div style={{ marginTop: 12 }}>{drop}</div>}
        </>
      ) : (
        <>
          <p className="small muted" style={{ margin: '0 0 12px' }}>{t('Upload your latest payslip to calculate your eligible loan amount.')}</p>
          {drop}
        </>
      )}
      {shown && <Alert severity="error" role="alert" sx={{ mt: 1.5 }}>{shown}</Alert>}
    </section>
  );
}
