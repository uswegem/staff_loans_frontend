// Date of birth on a staff record (D-82): its verification status, and a proposal by
// People and Culture that another verifier must approve.

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, Card, CardContent, TextField } from '@mui/material';
import { dobApi } from '../../api/staff';
import { apiError } from '../../api/client';
import DobStatus from '../../components/DobStatus';
import { useT } from '../../i18n';

export default function StaffDobCard({ staffId, canManage }) {
  const t = useT();
  const myId = useSelector((st) => st.auth.user?.id);
  const [status, setStatus] = useState(null);
  const [dob, setDob] = useState('');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    dobApi.forStaff(staffId).then(setStatus).catch((e) => setError(apiError(e).message));
  }, [staffId]);
  useEffect(load, [load]);

  const propose = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setStatus(await dobApi.propose(staffId, dob));
      setDob('');
      setToast('Sent for verification. Another verifier must approve it.');
    } catch (err) {
      setError(apiError(err).message);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3, display: 'grid', gap: 1.5 }}>
        <h3 style={{ margin: 0 }}>{t('Date of birth')}</h3>
        {toast && <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert>}
        <DobStatus
          status={status}
          canWithdraw={!!status?.pending && status.pending.submittedById === myId}
          onWithdraw={() => dobApi.withdraw(status.pending.id).then(load).catch((e) => setError(apiError(e).message))}
        />
        {canManage && status && !status.pending && (
          <form onSubmit={propose} className="row" noValidate>
            <TextField size="small" type="date" label={t('New date of birth')} value={dob} onChange={(e) => setDob(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button type="submit" size="small" disabled={!dob}>{t('Send for verification')}</Button>
          </form>
        )}
        {error && <Alert severity="error" role="alert">{error}</Alert>}
      </CardContent>
    </Card>
  );
}
