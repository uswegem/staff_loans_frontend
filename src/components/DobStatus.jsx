// Where a date of birth stands (D-82): verified, waiting for People and Culture, or
// last rejected. Only the verified value is used for loans.

import { Alert, AlertTitle, Button } from '@mui/material';
import { formatDate, formatDateTime } from '../lib/format';

export default function DobStatus({ status, onWithdraw, canWithdraw }) {
  if (!status) return null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="small">
        {status.verified ? (
          <>Verified date of birth: <b>{formatDate(status.verified)}</b>{status.verifiedBy ? ` (verified by ${status.verifiedBy}, ${formatDate(status.verifiedAt)})` : ''}</>
        ) : (
          <>No verified date of birth yet. Loans cannot be applied for until People and Culture verify one.</>
        )}
      </div>
      {status.pending && (
        <Alert severity="info" action={canWithdraw ? <Button size="small" onClick={onWithdraw}>Withdraw</Button> : null}>
          <AlertTitle>Waiting for People and Culture</AlertTitle>
          {formatDate(status.pending.proposed)} was proposed by {status.pending.submittedBy} on {formatDateTime(status.pending.submittedAt)}. {status.verified ? 'The verified date above stays in use until it is approved.' : 'You can apply for a loan once it is approved.'}
        </Alert>
      )}
      {status.lastRejection && (
        <Alert severity="warning">
          <AlertTitle>Not verified</AlertTitle>
          {formatDate(status.lastRejection.proposed)} was rejected{status.lastRejection.by ? ` by ${status.lastRejection.by}` : ''}: {status.lastRejection.reason}
        </Alert>
      )}
    </div>
  );
}
