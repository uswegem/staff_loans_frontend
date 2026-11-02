// Where a date of birth stands (D-82): verified, waiting for People and Culture, or
// last rejected. Only the verified value is used for loans.

import { Alert, AlertTitle, Button } from '@mui/material';
import { formatDate, formatDateTime } from '../lib/format';
import { useT } from '../i18n';

export default function DobStatus({ status, onWithdraw, canWithdraw }) {
  const t = useT();
  if (!status) return null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="small">
        {status.verified ? (
          <>{t('Verified date of birth:')}{' '}<b>{formatDate(status.verified)}</b>{status.verifiedBy ? ` ${t('(verified by {name}, {date})', { name: status.verifiedBy, date: formatDate(status.verifiedAt) })}` : ''}</>
        ) : (
          <>{t('No verified date of birth yet. Loans cannot be applied for until People and Culture verify one.')}</>
        )}
      </div>
      {status.pending && (
        <Alert severity="info" action={canWithdraw ? <Button size="small" onClick={onWithdraw}>{t('Withdraw')}</Button> : null}>
          <AlertTitle>{t('Waiting for People and Culture')}</AlertTitle>
          {t('{date} was proposed by {name} on {when}.', { date: formatDate(status.pending.proposed), name: status.pending.submittedBy, when: formatDateTime(status.pending.submittedAt) })} {status.verified ? t('The verified date above stays in use until it is approved.') : t('You can apply for a loan once it is approved.')}
        </Alert>
      )}
      {status.lastRejection && (
        <Alert severity="warning">
          <AlertTitle>{t('Not verified')}</AlertTitle>
          {status.lastRejection.by ? t('{date} was rejected by {name}:', { date: formatDate(status.lastRejection.proposed), name: status.lastRejection.by }) : t('{date} was rejected:', { date: formatDate(status.lastRejection.proposed) })} {status.lastRejection.reason}
        </Alert>
      )}
    </div>
  );
}
