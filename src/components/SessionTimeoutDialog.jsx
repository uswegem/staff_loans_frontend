// Inactivity warning (NFR-04): counts down the last WARNING_SECONDS before sign-out.
// It cannot be dismissed by Escape or a click outside; the user chooses to stay or leave.

import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useT } from '../i18n';

const mmss = (seconds) => {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function SessionTimeoutDialog({ remaining, onStay, onLogOut }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  if (remaining == null) return null;

  const stay = async () => {
    setBusy(true);
    try {
      await onStay();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open disableEscapeKeyDown onClose={() => {}} maxWidth="xs" fullWidth aria-labelledby="idle-title" aria-describedby="idle-text">
      <DialogTitle id="idle-title" sx={{ fontSize: 22, fontWeight: 700 }}>{t('Your session is about to expire')}</DialogTitle>
      <DialogContent>
        <p id="idle-text" style={{ marginTop: 0 }}>{t('For your security, you will be signed out automatically because of inactivity.')}</p>
        <p style={{ margin: 0 }}>
          {t('Time remaining:')}{' '}
          <b role="timer" aria-live="off" style={{ fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>{mmss(remaining)}</b>
        </p>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onLogOut} disabled={busy}>{t('Log out now')}</Button>
        <Button variant="contained" autoFocus onClick={stay} disabled={busy}>{busy ? t('Checking…') : t('Stay signed in')}</Button>
      </DialogActions>
    </Dialog>
  );
}
