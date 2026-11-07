// Confirms withdrawing an application (FR-25), with an optional reason. Used on the
// application page and on Apply, where an open application blocks a new one.

import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { useT } from '../i18n';

export default function WithdrawDialog({ app, onClose, onConfirm }) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 22, fontWeight: 700 }}>
        {app ? t('Withdraw {product} application {ref}?', { product: app.product, ref: app.ref }) : t('Withdraw this application?')}
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <p style={{ margin: 0 }}>
          {app?.status === 'draft' ? t('The draft closes and is not sent for review. You can apply again straight away.') : t('Your signed agreement becomes void. You can apply again later.')}
        </p>
        <TextField label={t('Reason (optional)')} value={reason} onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 500 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>{t('Keep it')}</Button>
        <Button variant="contained" onClick={confirm} disabled={busy}>{busy ? t('Withdrawing…') : t('Withdraw')}</Button>
      </DialogActions>
    </Dialog>
  );
}
