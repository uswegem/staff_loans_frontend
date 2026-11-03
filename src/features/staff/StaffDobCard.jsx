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

  // A refusal of a proposed date is about that date: it goes once the date is changed.
  const [sentDob, setSentDob] = useState(null);
  const [busy, setBusy] = useState(false);
  const shownError = error && (sentDob === null || sentDob === dob) ? error : null;
  const propose = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setStatus(await dobApi.propose(staffId, dob));
      setDob('');
      setSentDob(null);
      setToast('Sent for verification. Another verifier must approve it.');
    } catch (err) {
      setSentDob(dob);
      setError(apiError(err).message);
    }
    setBusy(false);
  };

  return (
    <Card>
      <CardContent sx={{ p: 3, display: 'grid', gap: 1.5 }}>
        <h3 style={{ margin: 0 }}>{t('Date of birth')}</h3>
        {toast && <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert>}
        <DobStatus
          status={status}
          canWithdraw={!!status?.pending && status.pending.submittedById === myId}
          onWithdraw={() => dobApi.withdraw(status.pending.id).then(load).catch((e) => { setSentDob(null); setError(apiError(e).message); })}
        />
        {canManage && status && !status.pending && (
          <form onSubmit={propose} className="row" noValidate>
            <TextField size="small" type="date" label={t('New date of birth')} value={dob} onChange={(e) => setDob(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button type="submit" size="small" disabled={!dob || busy}>{t('Send for verification')}</Button>
          </form>
        )}
        {shownError && <Alert severity="error" role="alert">{shownError}</Alert>}
      </CardContent>
    </Card>
  );
}
