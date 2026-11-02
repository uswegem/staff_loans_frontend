// The latest payslip (D-78, D-79). The API reads Basic Pay, the staff loan deductions and
// the pay month from the PDF; the staff member sees what was read and can attach a newer
// one, by drag and drop or the file picker (§1b).

import { useState } from 'react';
import { Alert, Link } from '@mui/material';
import { applicationsApi } from '../../api/applications';
import { downloadFile } from '../../api/staff';
import { apiError } from '../../api/client';
import { formatDate, formatNumber } from '../../lib/format';
import FileDrop from '../../components/FileDrop';
import s from './apply.module.css';
import { useT } from '../../i18n';

export const PAYSLIP_HINT = 'The PDF from the Seamless HR System, not older than 45 days. Your limit is worked out from your salary slip.';

export default function PayslipCard({ app, error, onChanged }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const slip = app.payslip;

  const upload = async (file) => {
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
      <h4 id="payslip-h" style={{ margin: '0 0 8px' }}>{t('Latest payslip')}{' '}<span className="small" style={{ color: 'var(--bad)' }}>{t('(required)')}</span></h4>
      <FileDrop accept=".pdf" label={t('Your payslip')} inputLabel={t('Choose payslip PDF')} buttonLabel={slip ? t('Attach a newer payslip') : t('Choose payslip PDF')} hint={t(PAYSLIP_HINT)} busy={busy} error={problem || error} onFile={upload} />
      {slip && (
        <dl className={s.kv} style={{ marginTop: 12 }}>
          <dt>{t('Payslip')}</dt>
          <dd>
            <Link component="button" type="button" onClick={() => downloadFile(`/files/${slip.fileId}`, slip.originalName).catch(() => {})}>{slip.originalName}</Link>, {t('dated {date}', { date: formatDate(slip.payDate) })}
          </dd>
          <dt>{t('Basic Pay')}</dt>
          <dd>TZS {formatNumber(slip.basic)}</dd>
          <dt>{t('Staff loan deductions')}</dt>
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
